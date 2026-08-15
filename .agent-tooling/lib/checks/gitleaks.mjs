// scripts/lib/checks/gitleaks.mjs — Gitleaks secret scan check.
// Invokes run-gitleaks-staged.ps1 and returns a CheckResult.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export const CHECK = "gitleaks";
export const NAME = "Gitleaks secret scan";

export const HELP = `Gitleaks — scans the git index snapshot for secrets.

Gitleaks checks the staged snapshot (not working tree) for patterns matching
known secret formats (API keys, tokens, credentials).

If a secret is detected:
  1. Remove the secret from the file.
  2. If it was a real credential, rotate it immediately.
  3. Unstage and re-stage the cleaned file.
  4. Rerun preflight.

Gitleaks cannot be bypassed via env var. Fix the violation before committing.
If the detection is a false positive, add an allowlist entry to .gitleaks-strict.toml.
`;

/**
 * @param {{ repoRoot: string, gitleaksScript?: string }} config
 * @returns {import("../reporter.mjs").CheckResult}
 */
export function check(config) {
  const { repoRoot } = config;
  const scriptPath =
    config.gitleaksScript ?? path.join(repoRoot, "scripts", "run-gitleaks-staged.ps1");

  // Skip gracefully if neither the script nor a gitleaks config exists
  const gitleaksConfig = path.join(repoRoot, ".gitleaks-strict.toml");
  if (!existsSync(scriptPath) || !existsSync(gitleaksConfig)) {
    return { check: CHECK, name: NAME, ok: true };
  }

  try {
    execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath], {
      cwd: repoRoot,
      stdio: "pipe",
    });
    return { check: CHECK, name: NAME, ok: true };
  } catch (error) {
    const stdout = (error.stdout ?? "").toString().trim();
    const stderr = (error.stderr ?? "").toString().trim();
    const lines = [stdout, stderr].filter(Boolean).join("\n").split(/\r?\n/).filter(Boolean);

    return {
      check: CHECK,
      name: NAME,
      ok: false,
      message: "Gitleaks detected a potential secret in the staged snapshot.",
      why: "Secrets committed to git are permanently exposed, even if removed later.",
      fixable: false,
      fix: "Remove the secret, rotate the credential if real, re-stage, and rerun.",
      details: lines.slice(0, 20),
      verboseDetails: lines.length > 20 ? lines.slice(20) : [],
    };
  }
}
