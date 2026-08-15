// scripts/lib/reporter.mjs — format preflight results for output.
// Supports four modes: brief (hook default), verbose, json, json-verbose.
//
// JSON output contract — schema_version: 1
// All JSON shapes carry the same fields. Agents should consume JSON; text is for humans.
// Field names (check, message, why, fixable, fix, details, docsLink) are stable API.
// Product repos depend on this shape — changes require a schema_version bump and docs update.

const HELP_TOPICS = new Set([
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
]);

/**
 * Phase 1 output — always brief. Shown when hook fires.
 * On all-pass: one line listing passing checks.
 * On any fail: summary + fix commands.
 *
 * @param {CheckResult[]} results
 * @param {string} scriptPath - e.g. "scripts/commit-preflight.mjs"
 */
export function reportBrief(results, scriptPath) {
  const failed = results.filter((r) => !r.ok);
  const passed = results.filter((r) => r.ok);

  if (failed.length === 0) {
    return `✓ ${passed.map((r) => r.check).join("  ✓ ")}`;
  }

  const lines = [`✗ ${failed.length} failed  ✓ ${passed.length} passed`, ""];

  // Per-failure: what failed, why, specific issues, fix, docs link, --help pointer.
  // details always show. verboseDetails only show with --verbose.
  for (const r of failed) {
    lines.push(`[${r.check}] ${r.message ?? r.name}`);
    if (r.why) lines.push(`  Why: ${r.why}`);
    if (r.details?.length) {
      for (const d of r.details) lines.push(`  ${d.trimStart()}`);
    }
    if (r.fixable) {
      lines.push(`  Auto-fix: node ${scriptPath} --fix-all`);
    } else if (r.fix) {
      const [firstLine, ...rest] = r.fix.split("\n");
      lines.push(`  Fix: ${firstLine}`);
      for (const l of rest) lines.push(`       ${l.trim()}`);
    }
    if (r.docsLink) lines.push(`  Docs: ${r.docsLink}`);
    if (HELP_TOPICS.has(r.check)) {
      lines.push(`  More info: node ${scriptPath} --help ${r.check}`);
    }
    lines.push("");
  }

  // Full-detail commands for when agent wants everything (biome traces, inline README, etc.)
  lines.push(`Full detail: node ${scriptPath} --check --verbose`);
  lines.push(`             node ${scriptPath} --check --json`);

  return lines.join("\n");
}

/**
 * Phase 2 verbose output — FAIL section first, then PASS section. Never mixed.
 *
 * @param {CheckResult[]} results
 */
export function reportVerbose(results) {
  const failed = results.filter((r) => !r.ok);
  const passed = results.filter((r) => r.ok);
  const lines = [];

  if (failed.length > 0) {
    lines.push(`FAILED (${failed.length})`);
    for (const r of failed) {
      lines.push("");
      lines.push(`  [${r.check}] ${r.name}`);
      if (r.message) lines.push(`  ${r.message}`);
      if (r.why) lines.push(`  Why: ${r.why}`);
      if (r.details?.length) {
        for (const d of r.details) lines.push(`    ${d}`);
      }
      if (r.verboseDetails?.length) {
        for (const d of r.verboseDetails) lines.push(`    ${d}`);
      }
      if (r.fix) lines.push(`  Fix: ${r.fix}`);
      if (r.docsLink) lines.push(`  Docs: ${r.docsLink}`);
    }
    lines.push("");
  }

  if (passed.length > 0) {
    lines.push(`PASSED (${passed.length})`);
    for (const r of passed) {
      if (r.bypassed) {
        lines.push(`  [${r.check}] bypassed — ${r.bypassReason ?? "no reason recorded"}`);
      } else {
        lines.push(`  ✓ ${r.check}`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * Brief structured output for programmatic agent consumption.
 * Carries the same fields as json-verbose minus verboseDetails.
 *
 * @param {CheckResult[]} results
 * @returns {string} JSON
 */
export function reportJson(results) {
  return JSON.stringify(
    {
      schema_version: 1,
      passed: results
        .filter((r) => r.ok)
        .map((r) => ({
          check: r.check,
          bypassed: r.bypassed ?? false,
          bypassReason: r.bypassReason ?? "",
        })),
      failed: results
        .filter((r) => !r.ok)
        .map((r) => ({
          check: r.check,
          message: r.message ?? "",
          why: r.why ?? "",
          fixable: r.fixable ?? false,
          fix: r.fix ?? "",
          details: r.details ?? [],
          docsLink: r.docsLink ?? "",
        })),
    },
    null,
    2,
  );
}

/**
 * Full structured output with per-check detail including verboseDetails.
 * Feature-parallel with verbose text output.
 *
 * @param {CheckResult[]} results
 * @returns {string} JSON
 */
export function reportJsonVerbose(results) {
  return JSON.stringify(
    {
      schema_version: 1,
      passed: results
        .filter((r) => r.ok)
        .map((r) => ({
          check: r.check,
          name: r.name,
          bypassed: r.bypassed ?? false,
          bypassReason: r.bypassReason ?? "",
        })),
      failed: results
        .filter((r) => !r.ok)
        .map((r) => ({
          check: r.check,
          name: r.name,
          message: r.message ?? "",
          why: r.why ?? "",
          fixable: r.fixable ?? false,
          fix: r.fix ?? "",
          details: r.details ?? [],
          verboseDetails: r.verboseDetails ?? [],
          docsLink: r.docsLink ?? "",
        })),
    },
    null,
    2,
  );
}

/**
 * @typedef {Object} CheckResult
 * @property {string} check      - short ID, stable API — used in CLI flags, JSON, and --help routing
 * @property {string} name       - display name (human-readable)
 * @property {boolean} ok
 * @property {string} [message]       - what failed (specific, not generic)
 * @property {string} [why]           - one-line reason the rule exists
 * @property {boolean} [fixable]      - whether --fix-all can resolve this
 * @property {string} [fix]           - exact fix command or instruction
 * @property {string} [docsLink]      - path or URL to relevant documentation
 * @property {string[]} [details]        - lines always shown in brief and verbose
 * @property {string[]} [verboseDetails] - lines shown only in --verbose / --json-verbose
 * @property {boolean} [bypassed]     - true if check passed via approved env var override
 * @property {string} [bypassReason]  - reason string supplied with the override (required)
 */
