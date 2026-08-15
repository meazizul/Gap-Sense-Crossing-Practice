// scripts/lib/checks/docs-readme.mjs — docs/README.md guard check.
// Fires when staged files match docs trigger patterns (excluding ignored paths).

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { AGENT_CONTEXT, renderAgentExamples } from "../agent-context.mjs";

export const CHECK = "docs-readme";
export const NAME = "Docs README guard";

export function getHelp(agentContext = AGENT_CONTEXT.unknown) {
  return `Docs README guard — fires when staged files change the docs index.

Rule: When you stage files under docs/ that add, remove, rename, or repurpose
documents, docs/README.md (the docs index) must also be staged OR you must
confirm it remains accurate.

Why: docs/README.md is how agents discover documentation. An inaccurate index
means agents reference stale or missing docs.

Override (when docs/README.md genuinely does not need updating):
  You MUST read docs/README.md and confirm it is accurate before using the override.
  You MUST NOT use the override if your changes affect the docs index.

  Required — both env vars must be set:
    DOCS_README_REVIEWED=yes
    DOCS_README_REVIEWED_REASON='brief explanation'

${renderAgentExamples(
  agentContext,
  {
    claude: `DOCS_README_REVIEWED=yes DOCS_README_REVIEWED_REASON='reason' git commit -m "..."`,
    codex: `$env:DOCS_README_REVIEWED="yes"; $env:DOCS_README_REVIEWED_REASON="reason"; git commit -m "..."`,
  },
  "  ",
)}

Override is logged to .preflight.log with timestamp, reason, and staged files.
`;
}

export const HELP = getHelp();

/**
 * @param {string[]} stagedFiles
 * @param {{ triggerPatterns: RegExp[], ignorePatterns?: RegExp[], docsReadmePath?: string, agentContext?: string }} config
 * @param {string} repoRoot
 * @returns {import("../reporter.mjs").CheckResult}
 */
export function check(stagedFiles, config, repoRoot) {
  const {
    triggerPatterns,
    ignorePatterns = [],
    docsReadmePath = "docs/README.md",
    docsReadmeOkEnv = "DOCS_README_REVIEWED",
    docsReadmeReasonEnv = "DOCS_README_REVIEWED_REASON",
    agentContext = AGENT_CONTEXT.unknown,
  } = config;

  const triggeredFiles = stagedFiles.filter((f) => {
    if (!triggerPatterns.some((p) => p.test(f))) return false;
    return !ignorePatterns.some((p) => p.test(f));
  });

  const docsReadmeStaged = stagedFiles.some(
    (f) => f === docsReadmePath || f.endsWith(`/${docsReadmePath}`),
  );

  if (triggeredFiles.length === 0 || docsReadmeStaged) {
    return { check: CHECK, name: NAME, ok: true };
  }

  const reviewed = process.env[docsReadmeOkEnv];
  const reason = process.env[docsReadmeReasonEnv]?.trim();

  if (reviewed === "yes" || reviewed === "1") {
    if (!reason) {
      return {
        check: CHECK,
        name: NAME,
        ok: false,
        message: `${docsReadmeOkEnv} is set but ${docsReadmeReasonEnv} is empty.`,
        why: "Override requires documented justification so bypass patterns can be audited.",
        fix: `Set ${docsReadmeReasonEnv}='brief explanation' alongside ${docsReadmeOkEnv}=yes`,
      };
    }
    return {
      check: CHECK,
      name: NAME,
      ok: true,
      bypassed: true,
      bypassReason: reason,
    };
  }

  // Read docs/README.md inline
  const docsReadmeAbsPath = path.join(repoRoot, docsReadmePath);
  let docsExcerpt = [];
  if (existsSync(docsReadmeAbsPath)) {
    const lines = readFileSync(docsReadmeAbsPath, "utf8").split(/\r?\n/);
    docsExcerpt = [`--- ${docsReadmePath} (first 80 lines) ---`, ...lines.slice(0, 80)];
  }

  return {
    check: CHECK,
    name: NAME,
    ok: false,
    message: `${docsReadmePath} must be reviewed — staged docs files may affect the docs index.`,
    why: "docs/README.md is how agents discover documentation. Stale index = agents reference wrong docs.",
    fixable: false,
    fix: [
      `1. Read ${docsReadmePath} now.`,
      `2. If it needs updating — stage the changes and commit.`,
      `3. If it is accurate and the docs index is unchanged — MAY use override:`,
      renderAgentExamples(
        agentContext,
        {
          claude: `DOCS_README_REVIEWED=yes DOCS_README_REVIEWED_REASON='why no update needed' git commit -m "..."`,
          codex: `$env:DOCS_README_REVIEWED="yes"; $env:DOCS_README_REVIEWED_REASON="why no update needed"; git commit -m "..."`,
        },
        "     ",
      ),
      `   MUST NOT use override if your changes affect the docs index.`,
    ].join("\n"),
    details: ["Triggered by:", ...triggeredFiles.map((f) => `  - ${f}`)],
    verboseDetails: docsExcerpt, // inline docs excerpt — verbose only
  };
}
