// scripts/lib/checks/structure.mjs — Structure check (delegates to repo script).
// Single responsibility: invoke the repo's check-structure.mjs and return a CheckResult.
// Structure rules are repo-specific; this module is the canonical invocation wrapper.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export const CHECK = "structure";
export const NAME = "Structure check";

export const HELP = `Structure check — file caps and import layer rules on staged files.

Rules enforced (machine-checkable subset):
  - Required file header comments
  - File size caps per layer
  - Thin app/**/page constraints (no client state, no direct lib imports)
  - Forbidden import-layer crossings (lib importing hooks/components, etc.)

Structure failures cannot be bypassed via env var.
Fix the violation or consult the user before committing.

Full rules: see the structureRulesDoc path in your repo's preflight config.
`;

/**
 * @param {{ repoRoot: string, structureScriptPath?: string | null, structureRulesDoc?: string }} config
 * @returns {import("../reporter.mjs").CheckResult}
 */
export function check(config) {
  const { repoRoot } = config;
  const scriptPath =
    config.structureScriptPath ?? path.join(repoRoot, "scripts", "check-structure.mjs");

  // If no structure script exists for this repo, skip gracefully
  if (!existsSync(scriptPath)) {
    return { check: CHECK, name: NAME, ok: true };
  }

  try {
    execFileSync(process.execPath, [scriptPath, "--staged"], {
      cwd: repoRoot,
      stdio: "pipe",
    });
    return { check: CHECK, name: NAME, ok: true };
  } catch (error) {
    const stdout = (error.stdout ?? "").toString().trim();
    const stderr = (error.stderr ?? "").toString().trim();
    const lines = [stdout, stderr].filter(Boolean).join("\n").split(/\r?\n/).filter(Boolean);
    const rulesDoc = config.structureRulesDoc ?? "docs/NEXTJS_CODE_STRUCTURE.md";

    return {
      check: CHECK,
      name: NAME,
      ok: false,
      message: "Structure violations found in staged files.",
      why: "Layer boundaries and file caps prevent complexity from compounding across agent sessions.",
      fixable: false,
      fix: `Fix the violations listed below. Full rules: ${rulesDoc}`,
      docsLink: rulesDoc,
      details: lines.slice(0, 20), // first 20 lines always shown
      verboseDetails: lines.length > 20 ? lines.slice(20) : [], // remainder in verbose
    };
  }
}
