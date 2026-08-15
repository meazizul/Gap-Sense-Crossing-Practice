// scripts/lib/checks/bead-id.mjs — Beads issue ID check.
// Verifies the commit title ends with a bead ID in parentheses.

export const CHECK = "bead-id";
export const NAME = "Bead ID";

export const HELP = `Bead ID — every commit title must end with a Beads issue ID.

Format:
  type: description (prefix-id)
  type: description (prefix-id, prefix-id2)   ← multiple IDs allowed

Examples:
  feat: add README guard to preflight (at-ui9)
  fix: wrap body lines correctly (pt-abc, pt-def)

The ID goes at the END of the subject line, in parens — NOT in the type scope:
  CORRECT:  fix: wrap body lines (at-xxx)
  WRONG:    fix(at-xxx): wrap body lines

Why: Bead IDs link commits to tracked issues so agents can trace changes back
to decisions and context across sessions.
`;

/**
 * @param {string} subject
 * @param {{ beadPattern: RegExp, repoPrefix: string }} config
 * @returns {import("../reporter.mjs").CheckResult}
 */
export function check(subject, config) {
  const { beadPattern, repoPrefix } = config;

  if (!subject?.trim()) {
    return {
      check: CHECK,
      name: NAME,
      ok: false,
      message: "No commit subject provided.",
      why: "Cannot validate bead ID without a subject line.",
      fix: `Pass --message "type: description (${repoPrefix}-xxx)"`,
    };
  }

  if (!beadPattern.test(subject)) {
    return {
      check: CHECK,
      name: NAME,
      ok: false,
      message: `Commit title is missing a Beads issue ID in parentheses.`,
      why: "Bead IDs link commits to tracked issues for cross-session traceability.",
      fixable: false,
      fix: `Add (${repoPrefix}-xxx) at the end of the title. Example: "fix: description (${repoPrefix}-abc)"`,
      details: [`Subject: ${subject}`, `Expected pattern: ...description (${repoPrefix}-xxx)`],
    };
  }

  return { check: CHECK, name: NAME, ok: true };
}
