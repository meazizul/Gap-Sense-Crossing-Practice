// scripts/lib/checks/readme.mjs — README guard check.
// Fires when staged files match repo-configured trigger patterns.
// New behavior: override requires README_REVIEWED=yes AND README_REVIEWED_REASON='...'.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { AGENT_CONTEXT, renderAgentExamples } from "../agent-context.mjs";

export const CHECK = "readme";
export const NAME = "README guard";

export function getHelp(agentContext = AGENT_CONTEXT.unknown) {
  return `README guard — fires when staged files affect tracked content.

Rule: When you stage files that can change the ownership map, route shape, or
agent-ops guidance documented in README.md, that file must also be staged OR
you must confirm you reviewed it and it remains accurate.

Why: README.md is the primary agent navigation document. Stale ownership maps
cause agents to edit the wrong files or miss coordination requirements.

Override (when README.md genuinely does not need updating):
  You MUST read README.md and confirm it is accurate before using the override.
  You MUST NOT use the override if your changes affect tracked content.

  Required — both env vars must be set:
    README_REVIEWED=yes
    README_REVIEWED_REASON='brief explanation of why no README update is needed'

${renderAgentExamples(
  agentContext,
  {
    claude: `README_REVIEWED=yes README_REVIEWED_REASON='reason' git commit -m "..."`,
    codex: `$env:README_REVIEWED="yes"; $env:README_REVIEWED_REASON="reason"; git commit -m "..."`,
  },
  "  ",
)}

Override is logged to .preflight.log with timestamp, reason, and staged files.
`;
}

export const HELP = getHelp();

/**
 * @param {string[]} stagedFiles
 * @param {{ triggerPatterns: RegExp[], readmePath?: string, agentContext?: string }} config
 * @param {string} repoRoot
 * @returns {import("../reporter.mjs").CheckResult}
 */
export function check(stagedFiles, config, repoRoot) {
  const {
    triggerPatterns,
    readmePath = "README.md",
    readmeOkEnv = "README_REVIEWED",
    readmeReasonEnv = "README_REVIEWED_REASON",
    agentContext = AGENT_CONTEXT.unknown,
  } = config;

  const triggeredFiles = stagedFiles.filter((f) => triggerPatterns.some((p) => p.test(f)));
  const readmeStaged = stagedFiles.some((f) => f === readmePath || f.endsWith(`/${readmePath}`));

  if (triggeredFiles.length === 0 || readmeStaged) {
    return { check: CHECK, name: NAME, ok: true };
  }

  const reviewed = process.env[readmeOkEnv];
  const reason = process.env[readmeReasonEnv]?.trim();

  if (reviewed === "yes" || reviewed === "1") {
    if (!reason) {
      return {
        check: CHECK,
        name: NAME,
        ok: false,
        message: `${readmeOkEnv} is set but ${readmeReasonEnv} is empty.`,
        why: "Override requires documented justification so bypass patterns can be audited.",
        fix: `Set ${readmeReasonEnv}='brief explanation' alongside ${readmeOkEnv}=yes`,
      };
    }
    // Valid bypass
    return {
      check: CHECK,
      name: NAME,
      ok: true,
      bypassed: true,
      bypassReason: reason,
    };
  }

  // Read README inline so agent has it without a separate read step
  const readmeAbsPath = path.join(repoRoot, readmePath);
  let readmeExcerpt = [];
  if (existsSync(readmeAbsPath)) {
    const lines = readFileSync(readmeAbsPath, "utf8").split(/\r?\n/);
    readmeExcerpt = [`--- ${readmePath} (first 120 lines) ---`, ...lines.slice(0, 120)];
  }

  return {
    check: CHECK,
    name: NAME,
    ok: false,
    message: `${readmePath} must be reviewed — staged files affect tracked content.`,
    why: "README.md is the agent navigation document. Stale content causes agents to edit wrong files.",
    fixable: false,
    fix: [
      `1. Read ${readmePath} now.`,
      `2. If it needs updating — stage the changes and commit.`,
      `3. If it is accurate and no tracked content changed — MAY use override:`,
      renderAgentExamples(
        agentContext,
        {
          claude: `README_REVIEWED=yes README_REVIEWED_REASON='why no update needed' git commit -m "..."`,
          codex: `$env:README_REVIEWED="yes"; $env:README_REVIEWED_REASON="why no update needed"; git commit -m "..."`,
        },
        "     ",
      ),
      `   MUST NOT use override if your changes affect tracked content.`,
    ].join("\n"),
    details: ["Triggered by:", ...triggeredFiles.map((f) => `  - ${f}`)],
    verboseDetails: readmeExcerpt, // inline README excerpt — verbose only
  };
}
