#!/usr/bin/env node

// scripts/commit-preflight.mjs — canonical pre-commit preflight for agent-tooling.
// Agents run this before git commit to see all failures in one pass.
// Product repos reference this as the canonical source; pass a config file via --config.
//
// Usage:
//   node scripts/commit-preflight.mjs --message "type: desc (at-xxx)" --body "Why..." --trailer "Co-Authored-By: ..."
//   node scripts/commit-preflight.mjs --check --verbose
//   node scripts/commit-preflight.mjs --check --json
//   node scripts/commit-preflight.mjs --diagnostic --verbose
//   node scripts/commit-preflight.mjs --help [check]
//   node scripts/commit-preflight.mjs --fix-all --message "..." --body "..."
//   node scripts/commit-preflight.mjs --config ./scripts/preflight.config.mjs

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { detectAgentContext, renderAgentExamples } from "./lib/agent-context.mjs";
import * as biomeCheck from "./lib/checks/biome.mjs";
import { fix as biomeFix, format as biomeFormat } from "./lib/checks/biome-format.mjs";
import * as bodyCheck from "./lib/checks/body.mjs";
import { wrapBodyLines } from "./lib/checks/body.mjs";
import * as commitTitleCheck from "./lib/checks/commit-title.mjs";
import * as docsReadmeCheck from "./lib/checks/docs-readme.mjs";
import * as gitleaksCheck from "./lib/checks/gitleaks.mjs";
import * as readmeCheck from "./lib/checks/readme.mjs";
import * as structureCheck from "./lib/checks/structure.mjs";
import * as subjectCheck from "./lib/checks/subject.mjs";
import * as trailerCheck from "./lib/checks/trailer.mjs";
import { logEvent } from "./lib/logger.mjs";
import { reportBrief, reportJson, reportJsonVerbose, reportVerbose } from "./lib/reporter.mjs";

const SCRIPT_PATH = "scripts/commit-preflight.mjs";
const repoRoot = process.cwd();

// ---------------------------------------------------------------------------
// Default config — agent-tooling's own preflight rules.
// Product repos override by providing a preflight.config.mjs (see --config).
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG = {
  repoPrefix: "at",
  beadPattern: /\((at-[a-z0-9][a-z0-9.-]*)(,\s*at-[a-z0-9][a-z0-9.-]*)*\)/i,

  // README guard
  readmeTriggerPatterns: [/^scripts\/.+/, /^\.claude\/.+/, /^package\.json$/],
  readmePath: "README.md",

  // Docs README guard
  docsTriggerPatterns: [/^docs\/.+/],
  docsIgnorePatterns: [
    /^docs\/README\.md$/,
    /^docs\/AI_CONTEXT\.md$/,
    /^docs\/BEADS_QUICKREF\.md$/,
  ],
  docsReadmePath: "docs/README.md",

  // Structure check — null means skip (agent-tooling has no Next.js layer rules)
  structureScriptPath: null,
  structureRulesDoc: null,

  // Biome bypass — disabled by default; enable in product repo configs if needed
  biomeBypassConfig: { skipEnv: "BIOME_SKIP_AUTOWRITE" },

  // docsLinks — repo-local doc references surfaced in failure output.
  // Keyed by check ID. Config value wins over any default set by the check module.
  // Agents follow these links when they hit a failure — point them at the right doc.
  // Example: { structure: "docs/NEXTJS_CODE_STRUCTURE.md", biome: "docs/STYLE_GUIDE.md" }
  docsLinks: {},
};

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const HELP_TOPICS = [
  "readme",
  "docs-readme",
  "biome",
  "gitleaks",
  "structure",
  "commit-title",
  "commit-body",
  "trailer",
  "commitlint",
  "envvars",
];

function parseArgs(argv) {
  const args = argv.slice(2);
  const parsed = {
    message: "",
    body: "",
    trailers: [],
    verbose: false,
    write: false,
    check: false,
    diagnostic: false,
    fixAll: false,
    json: false,
    jsonVerbose: false,
    help: false,
    helpTopic: "",
    configPath: "",
    commitMsgFile: "",
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      const next = args[i + 1];
      if (next && !next.startsWith("-")) {
        parsed.helpTopic = next;
        i += 1;
      }
    } else if (arg === "--verbose" || arg === "-v") {
      parsed.verbose = true;
    } else if (arg === "--check") {
      parsed.check = true;
    } else if (arg === "--diagnostic") {
      parsed.diagnostic = true;
    } else if (arg === "--fix-all") {
      parsed.fixAll = true;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--json-verbose") {
      parsed.jsonVerbose = true;
    } else if (arg === "--write") {
      parsed.write = true;
    } else if (arg === "--message" || arg === "-m") {
      parsed.message = args[++i] ?? "";
    } else if (arg.startsWith("--message=")) {
      parsed.message = arg.slice("--message=".length);
    } else if (arg === "--body" || arg === "-b") {
      parsed.body = args[++i] ?? "";
    } else if (arg.startsWith("--body=")) {
      parsed.body = arg.slice("--body=".length);
    } else if (arg === "--trailer") {
      parsed.trailers.push(args[++i] ?? "");
    } else if (arg === "--config") {
      parsed.configPath = args[++i] ?? "";
    } else if (arg.startsWith("--config=")) {
      parsed.configPath = arg.slice("--config=".length);
    } else if (arg === "--commit-msg-file") {
      parsed.commitMsgFile = args[++i] ?? "";
    } else if (arg.startsWith("--commit-msg-file=")) {
      parsed.commitMsgFile = arg.slice("--commit-msg-file=".length);
    }
  }

  // --fix-all implies --check and --write
  if (parsed.fixAll) {
    parsed.check = true;
    parsed.write = true;
  }

  // --diagnostic is a local-only validation mode built on top of check behavior.
  if (parsed.diagnostic) {
    parsed.check = true;
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------

async function loadConfig(configPath) {
  const candidates = [
    configPath,
    path.join(repoRoot, "preflight.config.mjs"),
    path.join(repoRoot, "scripts", "preflight.config.mjs"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const abs = path.isAbsolute(candidate) ? candidate : path.join(repoRoot, candidate);
    if (existsSync(abs)) {
      const mod = await import(pathToFileURL(abs).href);
      return { ...DEFAULT_CONFIG, ...(mod.default ?? mod) };
    }
  }

  return DEFAULT_CONFIG;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelpOverview(config) {
  const { repoPrefix } = config;
  console.log(`Usage:
  node ${SCRIPT_PATH} --message "type: desc (${repoPrefix}-xxx)" --body "Why..." --trailer "Co-Authored-By: ..."
  node ${SCRIPT_PATH} --check --verbose
  node ${SCRIPT_PATH} --diagnostic --verbose
  node ${SCRIPT_PATH} --check --json
  node ${SCRIPT_PATH} --help [topic]
  node ${SCRIPT_PATH} --fix-all --message "..." --body "..."

Options:
  --message <title>     Commit title to validate
  --body <text>         Commit body to validate (suggests line-wrap at 72 chars)
  --trailer <text>      Commit trailer to validate (repeatable)
  --check               Normal agent recovery loop — run all checks and report all failures
  --diagnostic          Local diagnostic run — same checks as --check, but excluded from repeat-failure logging
  --fix-all             Apply all auto-fixable corrections (body wrap, biome format)
  --write               Auto-wrap body lines at 72 chars and print the wrapped body
  --verbose, -v         Full report including passing sections
  --json                Structured output (brief) for programmatic consumption
  --json-verbose        Structured output with full per-check detail
  --help [topic], -h    Overview or per-check detail
  --config <path>       Load repo config from file (default: preflight.config.mjs)

Help topics: ${HELP_TOPICS.join(", ")}

Checks run (all checks run — failures collected before reporting):
  1. readme          staged files matching triggerPatterns → README.md must be staged or reviewed
  2. docs-readme     staged docs/ files → docs/README.md may need staging
  3. biome           format + lint on staged files
  4. structure       file caps and layer rules (if structureScriptPath configured)
  5. gitleaks        secret scan on staged snapshot
  6. commitlint      title length, body required, Conventional-Commit shape
  7. commit-title    format + length (≤65 total, ≤50 desc) + bead ID — all together
  8. commit-body     body present and wrapped at 72 chars
  9. trailer         recognized AI trailer required

Two-phase output:
  Hook fires → brief summary + commands to get detail
  Agent re-runs: --verbose, --json, --json-verbose, --help <check>`);
}

function buildEnvvarsHelp(agentContext) {
  return `Environment variable overrides — set inline for the single command only.

Diagnostic mode
  --diagnostic runs the same validations as --check but does NOT append failure or bypass events
  to .preflight.log. Use it for local verification, smoke tests, and script development.
  Do NOT use it for the normal agent repair loop — AGENTS should use --check so repeated failures
  are counted and visible in the audit trail.

README_REVIEWED + README_REVIEWED_REASON
  MUST read README.md before using this override.
  MUST NOT use if your changes affect tracked content in README.md.
  MAY use only after reading README.md and confirming it remains accurate.
  MUST set README_REVIEWED_REASON explaining why no README update is needed.
${renderAgentExamples(
  agentContext,
  {
    claude: `README_REVIEWED=yes README_REVIEWED_REASON='why no update needed' git commit -m "..."`,
    codex: `$env:README_REVIEWED="yes"; $env:README_REVIEWED_REASON="why no update needed"; git commit -m "..."`,
  },
  "  ",
)}
  Override is logged with timestamp, reason, and staged files.

DOCS_README_REVIEWED + DOCS_README_REVIEWED_REASON
  MUST read docs/README.md before using this override.
  MUST NOT use if your changes affect the docs index.
  MAY use only after reading docs/README.md and confirming it remains accurate.
  MUST set DOCS_README_REVIEWED_REASON explaining why no docs index update is needed.
${renderAgentExamples(
  agentContext,
  {
    claude: `DOCS_README_REVIEWED=yes DOCS_README_REVIEWED_REASON='why no update needed' git commit -m "..."`,
    codex: `$env:DOCS_README_REVIEWED="yes"; $env:DOCS_README_REVIEWED_REASON="why no update needed"; git commit -m "..."`,
  },
  "  ",
)}
  Override is logged with timestamp, reason, and staged files.

AI_TRAILER_OK + AI_TRAILER_OK_REASON
  MUST NOT use for normal agent commits — all agent commits require a recognized trailer.
  MAY use only with explicit user approval for exceptional cases.
  MUST set AI_TRAILER_OK_REASON.
${renderAgentExamples(
  agentContext,
  {
    claude: `AI_TRAILER_OK=yes AI_TRAILER_OK_REASON='reason' git commit -m "..."`,
    codex: `$env:AI_TRAILER_OK="yes"; $env:AI_TRAILER_OK_REASON="reason"; git commit -m "..."`,
  },
  "  ",
)}
  Override is logged with timestamp, reason, and staged files.

BIOME_SKIP_AUTOWRITE=1 (emergency bypass — all four vars required, user approval required):
  BIOME_SKIP_AUTOWRITE=1
  BIOME_SKIP_AUTOWRITE_APPROVED=1
  BIOME_SKIP_AUTOWRITE_REASON='reason'
  BIOME_SKIP_AUTOWRITE_FILE=path/to/exactly-one-file
${renderAgentExamples(
  agentContext,
  {
    claude: `BIOME_SKIP_AUTOWRITE=1 BIOME_SKIP_AUTOWRITE_APPROVED=1 BIOME_SKIP_AUTOWRITE_REASON='reason' BIOME_SKIP_AUTOWRITE_FILE=path git commit -m "..."`,
    codex: `$env:BIOME_SKIP_AUTOWRITE="1"; $env:BIOME_SKIP_AUTOWRITE_APPROVED="1"; ... git commit -m "..."`,
  },
  "  ",
)}

Deprecated prefixes (accepted with warning during transition):
  PT_README_OK, STREETS_README_OK            → README_REVIEWED
  PT_DOCS_README_OK, STREETS_DOCS_README_OK  → DOCS_README_REVIEWED
  PT_AI_TRAILER_OK, STREETS_AI_TRAILER_OK    → AI_TRAILER_OK`;
}

function printHelpTopic(topic, agentContext) {
  const topics = {
    readme: readmeCheck.getHelp(agentContext),
    "docs-readme": docsReadmeCheck.getHelp(agentContext),
    biome: biomeCheck.getHelp(agentContext),
    gitleaks: gitleaksCheck.HELP,
    structure: structureCheck.HELP,
    "commit-body": bodyCheck.HELP,
    "commit-title": commitTitleCheck.HELP,
    trailer: trailerCheck.getHelp(agentContext),
    commitlint: subjectCheck.HELP,
    envvars: buildEnvvarsHelp(agentContext),
  };

  if (!topics[topic]) {
    console.error(`Unknown help topic: "${topic}". Available: ${HELP_TOPICS.join(", ")}`);
    process.exit(1);
  }
  console.log(topics[topic]);
}

// ---------------------------------------------------------------------------
// Staged files
// ---------------------------------------------------------------------------

function getStagedFiles() {
  try {
    const output = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    const gitPrefix = execFileSync("git", ["rev-parse", "--show-prefix"], {
      cwd: repoRoot,
      encoding: "utf8",
    })
      .trim()
      .replace(/\\/g, "/");

    return output
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((f) => f.replace(/\\/g, "/"))
      .map((f) => (gitPrefix && f.startsWith(gitPrefix) ? f.slice(gitPrefix.length) : f));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Deprecation shim — accept old prefixed env vars with a warning
// ---------------------------------------------------------------------------

function applyDeprecatedEnvVars() {
  const mappings = [
    ["PT_README_OK", "README_REVIEWED"],
    ["STREETS_README_OK", "README_REVIEWED"],
    ["PT_DOCS_README_OK", "DOCS_README_REVIEWED"],
    ["STREETS_DOCS_README_OK", "DOCS_README_REVIEWED"],
    ["PT_AI_TRAILER_OK", "AI_TRAILER_OK"],
    ["STREETS_AI_TRAILER_OK", "AI_TRAILER_OK"],
  ];
  for (const [old, next] of mappings) {
    if (process.env[old] && !process.env[next]) {
      console.warn(`[preflight] ${old} is deprecated — use ${next} instead.`);
      process.env[next] = process.env[old];
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const args = parseArgs(process.argv);

// If called from commit-msg hook, parse message/body/trailers from the file.
// This avoids shell quoting issues when the hook passes the file path directly.
if (args.commitMsgFile) {
  const msgPath = path.isAbsolute(args.commitMsgFile)
    ? args.commitMsgFile
    : path.join(repoRoot, args.commitMsgFile);
  if (existsSync(msgPath)) {
    const lines = readFileSync(msgPath, "utf8").split(/\r?\n/);
    args.message = args.message || (lines[0] ?? "");
    const bodyLines = lines.slice(2).filter((l) => !/^[A-Za-z-]+: /.test(l));
    args.body = args.body || bodyLines.join("\n").trim();
    const trailerLines = lines.slice(2).filter((l) => /^[A-Za-z-]+: /.test(l));
    if (args.trailers.length === 0) args.trailers = trailerLines;
  }
}

const agentContext = detectAgentContext({ trailers: args.trailers });

const config = await loadConfig(args.configPath);

applyDeprecatedEnvVars();

if (args.help) {
  if (args.helpTopic) {
    printHelpTopic(args.helpTopic, agentContext);
  } else {
    printHelpOverview(config);
  }
  process.exit(0);
}

const stagedFiles = getStagedFiles();
const hook = args.diagnostic
  ? "diagnostic"
  : args.commitMsgFile
    ? "commit-msg"
    : args.check
      ? "check"
      : "pre-commit";

// In hook mode (not --check), run biome auto-format first
if (!args.check && !args.fixAll && stagedFiles.length > 0) {
  biomeFormat(stagedFiles, {
    repoRoot,
    biomeBin: config.biomeBin,
    bypassConfig: config.biomeBypassConfig,
  });
}

// --fix-all in check mode: run biome check --write + print wrapped body, then exit.
// Uses check --write (format + safe lint fixes). Agents choose when to apply this.
if (args.fixAll && args.check) {
  if (stagedFiles.length > 0) {
    biomeFix(stagedFiles, {
      repoRoot,
      biomeBin: config.biomeBin,
      bypassConfig: config.biomeBypassConfig,
    });
    console.log("Biome check --write applied (format + safe lint fixes). Files re-staged.");
  }
  if (args.body?.trim()) {
    const wrapped = wrapBodyLines(args.body.trim());
    console.log("Wrapped body:");
    console.log(wrapped);
  }
  process.exit(0);
}

// Run all checks — collect all failures before reporting (Single Check Principle)
const results = [];

if (stagedFiles.length > 0) {
  // Pre-commit checks
  results.push(
    readmeCheck.check(
      stagedFiles,
      {
        triggerPatterns: config.readmeTriggerPatterns,
        readmePath: config.readmePath,
        agentContext,
      },
      repoRoot,
    ),
  );
  results.push(
    docsReadmeCheck.check(
      stagedFiles,
      {
        triggerPatterns: config.docsTriggerPatterns,
        ignorePatterns: config.docsIgnorePatterns,
        docsReadmePath: config.docsReadmePath,
        agentContext,
      },
      repoRoot,
    ),
  );
  results.push(biomeCheck.check(stagedFiles, { repoRoot, biomeBin: config.biomeBin }));
  results.push(
    structureCheck.check({
      repoRoot,
      structureScriptPath: config.structureScriptPath,
      structureRulesDoc: config.structureRulesDoc,
    }),
  );
  results.push(gitleaksCheck.check({ repoRoot }));
} else {
  results.push({
    check: "staged-files",
    name: "Staged files",
    ok: false,
    message: "No staged files found.",
    why: "Pre-commit checks require staged files.",
    fix: "Stage files with git add before running preflight.",
  });
}

// Commit-message checks — only run when --message is provided.
// Pre-commit hook calls without --message (message not written yet).
// Commit-msg hook calls with --message parsed from COMMIT_EDITMSG.
if (args.message) {
  results.push(
    commitTitleCheck.check(args.message, {
      beadPattern: config.beadPattern,
      repoPrefix: config.repoPrefix,
    }),
  );
  results.push(subjectCheck.check({ ...args, repoRoot, commitlintBin: config.commitlintBin }));
  results.push(bodyCheck.check(args.body));
  results.push(trailerCheck.check(args.trailers));
}

// Apply repo-local docsLinks — config wins over check module defaults.
// This is the primary mechanism for pointing agents at repo-specific docs.
for (const r of results) {
  if (config.docsLinks?.[r.check]) {
    r.docsLink = config.docsLinks[r.check];
  }
}

// Log hook executions and normal --check recovery attempts.
// Explicit --diagnostic is for local diagnostics and is excluded from the
// repeat-failure signal on purpose.
if (!args.diagnostic) {
  for (const r of results) {
    if (!r.ok) {
      logEvent(repoRoot, {
        hook,
        check: r.check,
        result: "fail",
        stagedFiles,
      });
    }
    if (r.bypassed) {
      logEvent(repoRoot, {
        hook,
        check: r.check,
        result: "bypass",
        stagedFiles,
        bypassReason: r.bypassReason,
      });
    }
  }
}

const failed = results.filter((r) => !r.ok);

// Output
if (args.json) {
  console.log(reportJson(results));
  process.exit(args.check || failed.length === 0 ? 0 : 1);
}

if (args.jsonVerbose) {
  console.log(reportJsonVerbose(results));
  process.exit(args.check || failed.length === 0 ? 0 : 1);
}

if (args.verbose) {
  console.log(reportVerbose(results));
  process.exit(args.check || failed.length === 0 ? 0 : 1);
}

// Default: brief two-phase output
console.log(reportBrief(results, SCRIPT_PATH));
process.exit(args.check || failed.length === 0 ? 0 : 1);
