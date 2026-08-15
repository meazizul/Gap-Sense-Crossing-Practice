// scripts/lib/checks/biome-format.mjs — Biome auto-format action (write + restage).
// Single responsibility: run biome --write on staged files and restage them.
// Called by the orchestrator in hook mode before the biome check runs.

import { execFileSync } from "node:child_process";
import { resolveBiomeBin } from "../tool-bins.mjs";

const BIOME_LOG_PATH = "node_modules/.cache/biome";

// Resolve Biome from agent-tooling's own node_modules so product repos that
// run this script via sibling path don't need a local Biome install.
const DEFAULT_BIOME_BIN = resolveBiomeBin(import.meta.url);

/**
 * Resolve bypass config from env vars. Returns null if bypass not requested.
 * Returns { file, reason } on valid bypass. Exits process on invalid bypass.
 *
 * @param {string[]} stagedFiles
 * @param {{ enabled?: boolean }} bypassConfig
 */
export function resolveBypass(stagedFiles, bypassConfig = {}) {
  const {
    skipEnv = "BIOME_SKIP_AUTOWRITE",
    approvedEnv = "BIOME_SKIP_AUTOWRITE_APPROVED",
    reasonEnv = "BIOME_SKIP_AUTOWRITE_REASON",
    fileEnv = "BIOME_SKIP_AUTOWRITE_FILE",
  } = bypassConfig;

  if (process.env[skipEnv] !== "1") return null;

  const approval = process.env[approvedEnv];
  const reason = process.env[reasonEnv]?.trim();
  const bypassFile = process.env[fileEnv]?.trim();

  if (approval !== "1") {
    console.error(`Biome bypass requires ${approvedEnv}=1 (user approval required).`);
    process.exit(1);
  }
  if (!reason) {
    console.error(`Biome bypass requires a non-empty ${reasonEnv}.`);
    process.exit(1);
  }
  if (!bypassFile || bypassFile.includes(",")) {
    console.error(`Biome bypass requires exactly one file via ${fileEnv}.`);
    process.exit(1);
  }
  if (!stagedFiles.includes(bypassFile)) {
    console.error(`${fileEnv} points to "${bypassFile}" but that file is not staged.`);
    process.exit(1);
  }

  return { file: bypassFile, reason };
}

/**
 * Return the subset of files that git would reject in a git add (gitignored).
 * git check-ignore exits 1 when no paths are ignored (not an error).
 *
 * @param {string[]} files
 * @param {string} repoRoot
 * @returns {Set<string>}
 */
function getIgnoredFiles(files, repoRoot) {
  if (files.length === 0) return new Set();
  try {
    const out = execFileSync("git", ["check-ignore", "--", ...files], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    return new Set(out.trim().split("\n").filter(Boolean));
  } catch {
    // exit 1 = none ignored, exit 128 = fatal — either way, nothing to skip
    return new Set();
  }
}

/**
 * Run biome --write on files, then restage them.
 * Skips gitignored paths before git add (beads hooks may stage such paths).
 *
 * @param {string[]} files
 * @param {string} repoRoot
 * @param {string} biomeBin
 */
function formatAndRestage(files, repoRoot, biomeBin) {
  execFileSync(
    process.execPath,
    [
      biomeBin,
      "format",
      "--write",
      "--files-ignore-unknown=true",
      "--no-errors-on-unmatched",
      ...files,
    ],
    {
      cwd: repoRoot,
      stdio: "inherit",
      env: { ...process.env, BIOME_LOG_PATH },
    },
  );
  const ignored = getIgnoredFiles(files, repoRoot);
  const addable = files.filter((f) => !ignored.has(f));
  if (addable.length > 0) {
    execFileSync("git", ["add", "--", ...addable], {
      cwd: repoRoot,
      stdio: "inherit",
    });
  }
}

/**
 * Auto-format staged files with Biome and restage.
 * Respects bypass config. Exits on partially-staged files.
 *
 * @param {string[]} stagedFiles
 * @param {{ repoRoot: string, biomeBin?: string, bypassConfig?: object }} config
 * @returns {{ formatted: string[], bypassed: string | null }}
 */
export function format(stagedFiles, config) {
  const { repoRoot } = config;
  const biomeBin = config.biomeBin ?? DEFAULT_BIOME_BIN;

  if (stagedFiles.length === 0) return { formatted: [], bypassed: null };

  // Check for partially staged files
  const partial = stagedFiles.filter((f) => {
    try {
      const out = execFileSync("git", ["diff", "--name-only", "--", f], {
        cwd: repoRoot,
        encoding: "utf8",
      });
      return out.trim().length > 0;
    } catch {
      return false;
    }
  });

  if (partial.length > 0) {
    console.error("Biome stopped: staged files also have unstaged changes:");
    for (const f of partial) console.error(`  - ${f}`);
    console.error("Stage the full file or stash unstaged changes first.");
    process.exit(1);
  }

  const bypass = resolveBypass(stagedFiles, config.bypassConfig ?? {});
  const targets = bypass ? stagedFiles.filter((f) => f !== bypass.file) : stagedFiles;

  if (targets.length > 0) {
    formatAndRestage(targets, repoRoot, biomeBin);
  }

  if (bypass) {
    console.log(
      `Biome auto-write skipped for ${bypass.file} (bypass approved, reason: ${bypass.reason}).`,
    );
    return { formatted: targets, bypassed: bypass.file };
  }

  return { formatted: targets, bypassed: null };
}

/**
 * Run biome check --write on files (format + safe lint fixes) and restage.
 * Called by --fix-all only. Does NOT run automatically in hook mode.
 * Agents decide whether to apply lint fixes — this is not the default.
 *
 * @param {string[]} stagedFiles
 * @param {{ repoRoot: string, biomeBin?: string, bypassConfig?: object }} config
 */
export function fix(stagedFiles, config) {
  const { repoRoot } = config;
  const biomeBin = config.biomeBin ?? DEFAULT_BIOME_BIN;

  if (stagedFiles.length === 0) return;

  // Step 1: apply format fixes. Catch non-zero exit so git add always runs.
  try {
    execFileSync(
      process.execPath,
      [
        biomeBin,
        "format",
        "--write",
        "--files-ignore-unknown=true",
        "--no-errors-on-unmatched",
        ...stagedFiles,
      ],
      { cwd: repoRoot, stdio: "inherit", env: { ...process.env, BIOME_LOG_PATH } },
    );
  } catch {
    // biome exited non-zero — partial fixes may have been written; continue to restage
  }

  // Step 2: apply safe lint fixes. May exit non-zero if unfixable issues remain.
  try {
    execFileSync(
      process.execPath,
      [
        biomeBin,
        "lint",
        "--write",
        "--files-ignore-unknown=true",
        "--no-errors-on-unmatched",
        ...stagedFiles,
      ],
      { cwd: repoRoot, stdio: "inherit", env: { ...process.env, BIOME_LOG_PATH } },
    );
  } catch {
    // unfixable lint issues remain — subsequent biome check will report them
  }

  // Step 3: restage — always runs regardless of biome exit codes.
  // Filter gitignored paths first (beads hooks may have staged such paths).
  const ignored = getIgnoredFiles(stagedFiles, repoRoot);
  const addable = stagedFiles.filter((f) => !ignored.has(f));
  if (addable.length > 0) {
    execFileSync("git", ["add", "--", ...addable], {
      cwd: repoRoot,
      stdio: "inherit",
    });
  }
}
