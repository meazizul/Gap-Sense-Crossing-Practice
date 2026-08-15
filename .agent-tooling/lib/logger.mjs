// scripts/lib/logger.mjs — append-only audit log for preflight events.
// Target reader: agents diagnosing repeated failures and bypass patterns.
// Format: one JSON line per event in the repo-root .preflight.log audit file.

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";

const LOG_FILE = ".preflight.log";
const REPEAT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const COMMIT_MSG_CHECKS = new Set(["commit-title", "commit-body", "trailer", "commitlint"]);

function attemptScopeFor(hook, check) {
  if (hook === "commit-msg") return "commit-msg";
  if (hook === "diagnostic") return "diagnostic";
  if (hook === "check") {
    return COMMIT_MSG_CHECKS.has(check) ? "commit-msg" : "pre-commit";
  }
  return hook;
}

function recentFailureCount(logPath, hook, check) {
  if (!existsSync(logPath)) return 0;
  const now = Date.now();
  const attemptScope = attemptScopeFor(hook, check);
  const lines = readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean);
  let count = 0;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const e = JSON.parse(lines[i]);
      const ageMs = now - new Date(e.ts).getTime();
      if (Number.isNaN(ageMs) || ageMs > REPEAT_WINDOW_MS) {
        break;
      }
      const eventScope = e.attempt_scope ?? attemptScopeFor(e.hook, e.check);
      if (eventScope === attemptScope && e.check === check && e.result === "fail") {
        count++;
      }
    } catch {
      // malformed line — skip
    }
  }
  return count;
}

/**
 * Log a single preflight event.
 *
 * @param {string} repoRoot - absolute repo root path
 * @param {{ hook: string, check: string, result: "pass"|"fail"|"bypass", stagedFiles?: string[], bypassReason?: string }} event
 */
export function logEvent(repoRoot, { hook, check, result, stagedFiles, bypassReason }) {
  const logPath = path.join(repoRoot, LOG_FILE);
  const attemptScope = attemptScopeFor(hook, check);

  let attempt;
  let flag;
  if (result === "fail") {
    attempt = recentFailureCount(logPath, hook, check) + 1;
    if (attempt > 1) flag = "repeat_failure";
  }

  const entry = {
    ts: new Date().toISOString(),
    hook,
    check,
    result,
    ...(hook === "check" && { attempt_scope: attemptScope }),
    ...(attempt !== undefined && { attempt }),
    ...(flag && { flag }),
    ...(stagedFiles?.length && { staged_files: stagedFiles }),
    ...(bypassReason && { bypass_reason: bypassReason }),
  };

  appendFileSync(logPath, JSON.stringify(entry) + "\n", "utf8");
}
