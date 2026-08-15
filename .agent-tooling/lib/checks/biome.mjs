// scripts/lib/checks/biome.mjs — Biome lint check (read-only).
// Reports what Biome would flag on staged files. Does NOT auto-format.
// Auto-format lives in biome-format.mjs — orchestrator decides when to run it.

import { execFileSync } from "node:child_process";
import { AGENT_CONTEXT, renderAgentExamples } from "../agent-context.mjs";
import { resolveBiomeBin } from "../tool-bins.mjs";

// Resolve Biome from agent-tooling's own node_modules so product repos that
// run this script via sibling path don't need a local Biome install.
const DEFAULT_BIOME_BIN = resolveBiomeBin(import.meta.url);

export const CHECK = "biome";
export const NAME = "Biome";

export function getHelp(agentContext = AGENT_CONTEXT.unknown) {
  return `Biome — format and lint checks on staged files.

In hook mode: Biome auto-formats staged files before this check runs.
In --check mode: reports what would fail without modifying files.

If output shows FIXABLE:
  Run: node scripts/commit-preflight.mjs --fix-all
  Or:  npx biome check --write <staged-files> && git add <those-files>

If errors are not auto-fixable (real lint violations):
  Fix the code, re-stage, and rerun.

Partially-staged files:
  Biome stops if a staged file also has unstaged changes.
  Stage the full file or stash unstaged changes first.

Emergency bypass (requires user approval — all four vars required):
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
`;
}

export const HELP = getHelp();

/**
 * Parse Biome failure output into fixable vs manual categories.
 * Ported from pttracker — streets needs this added.
 *
 * @param {string[]} lines
 * @returns {{ fixable: string[], manual: string[] }}
 */
export function parseBiomeFailure(lines) {
  const fixable = new Set();
  const manual = new Set();
  for (const line of lines) {
    if (!line.includes("━")) continue;
    const isFixable = line.includes(" FIXABLE ");
    const ruleMatch = line.match(/[\w]+\/[\w/]+/);
    if (ruleMatch) {
      if (isFixable) fixable.add(ruleMatch[0]);
      else manual.add(ruleMatch[0]);
    } else if (/ format ━/.test(line)) {
      fixable.add("format");
    }
  }
  return { fixable: [...fixable], manual: [...manual] };
}

/**
 * Run Biome check (lint only, no write) on staged files and return result.
 *
 * @param {string[]} stagedFiles
 * @param {{ repoRoot: string, biomeBin?: string }} config
 * @returns {import("../reporter.mjs").CheckResult}
 */
export function check(stagedFiles, config) {
  const { repoRoot } = config;
  const biomeBin = config.biomeBin ?? DEFAULT_BIOME_BIN;

  if (stagedFiles.length === 0) {
    return { check: CHECK, name: NAME, ok: true };
  }

  try {
    execFileSync(
      process.execPath,
      [
        biomeBin,
        "check",
        "--files-ignore-unknown=true",
        "--no-errors-on-unmatched",
        ...stagedFiles,
      ],
      { cwd: repoRoot, stdio: "pipe" },
    );
    return { check: CHECK, name: NAME, ok: true };
  } catch (error) {
    const stdout = (error.stdout ?? "").toString().trim();
    const stderr = (error.stderr ?? "").toString().trim();
    const combined = [stdout, stderr].filter(Boolean).join("\n");
    const rawLines = combined.split(/\r?\n/).filter(Boolean);

    const { fixable, manual } = parseBiomeFailure(rawLines);
    const summary = [];

    if (fixable.length > 0) {
      summary.push(
        `FIXABLE (${fixable.length}) — run --fix-all or: npx biome check --write <staged-files>`,
      );
      for (const rule of fixable) summary.push(`  ✦ ${rule}`);
    }
    if (manual.length > 0) {
      summary.push(`MANUAL FIX REQUIRED (${manual.length}) — edit the code:`);
      for (const rule of manual) summary.push(`  ✖ ${rule}`);
    }

    return {
      check: CHECK,
      name: NAME,
      ok: false,
      message: `Biome found ${fixable.length + manual.length} issue(s) on staged files.`,
      why: "Consistent formatting and lint rules prevent style drift across agent sessions.",
      fixable: fixable.length > 0,
      fix:
        fixable.length > 0
          ? "node scripts/commit-preflight.mjs --fix-all"
          : "Fix lint violations manually, re-stage, then rerun.",
      details: [...summary, ...rawLines],
    };
  }
}
