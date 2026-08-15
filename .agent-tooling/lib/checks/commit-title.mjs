// scripts/lib/checks/commit-title.mjs — unified commit title check.
// Validates conventional format, title length, and bead ID together.
// All three constraints apply to the same string and cascade — agents must
// see them all at once to write a passing title on the first attempt.
//
// Budget: 50 chars for "type: description" + up to 15 for " (prefix-xxxxx)" = 65 total.

export const CHECK = "commit-title";
export const NAME = "Commit title";

// Max chars for the description portion (before bead ID)
const DESC_MAX = 50;
// Max chars for the full title including bead ID
const TITLE_MAX = 65;
// Estimated bead ID length for budget warnings when bead is absent: " (pt-xxxxx)"
const BEAD_BUDGET = 11;

export const HELP = `Commit title — format, length, and bead ID checked together.

Format:
  type: description (prefix-xxxxx)

Rules:
  - Conventional Commit type prefix required (feat, fix, chore, docs, refactor, test, etc.)
  - Description portion: ≤ 50 chars  (before the bead ID)
  - Full title:          ≤ 65 chars  (description + space + bead ID in parens)
  - Bead ID at the END in parens — not in the type scope:
      CORRECT:  fix: short description (at-xxx)
      WRONG:    fix(at-xxx): short description

Why: 65-char limit keeps titles readable in terminals, git log, and PR views.
     The bead ID budget (up to 15 chars) is reserved so adding it never
     forces a rewrite. 50+15 = 65 with wiggle room for longer hashes.

Examples:
  feat: add README guard to preflight (at-ui9)       ← 44 chars ✓
  fix: wrap body lines at 72 chars (pt-ab123)        ← 46 chars ✓

If your description is too long:
  Shorten it first, then add the bead ID.
  The bead ID takes up to 15 chars (" (prefix-xxxxx)") — budget for that upfront.
`;

const CONVENTIONAL_PATTERN = /^[a-z]+(\([^)]+\))?!?: .+/;

/**
 * Extract the bead ID portion from a title, if present.
 * Returns the match or null.
 *
 * @param {string} title
 * @param {RegExp} beadPattern
 */
function extractBead(title, beadPattern) {
  const match = title.match(beadPattern);
  return match ? match[0] : null;
}

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
      message: "No commit title provided.",
      why: "Cannot validate title without a subject line.",
      fix: `Pass --message "type: description (${repoPrefix}-xxx)"`,
    };
  }

  const issues = [];
  const bead = extractBead(subject, beadPattern);
  const titleLen = subject.trim().length;

  // 1. Conventional format
  if (!CONVENTIONAL_PATTERN.test(subject.trim())) {
    issues.push(`Non-conventional format — expected: type: description (${repoPrefix}-xxx)`);
  }

  // 2. Bead ID presence
  if (!bead) {
    issues.push(`Missing bead ID — add (${repoPrefix}-xxx) at the end`);

    // Preemptive budget check: will adding a bead ID breach the limit?
    const remaining = TITLE_MAX - titleLen - BEAD_BUDGET;
    if (remaining < 0) {
      issues.push(
        `Title is ${titleLen} chars — adding bead ID (~${BEAD_BUDGET} chars) would exceed ${TITLE_MAX}-char limit by ${Math.abs(remaining)} chars`,
      );
      issues.push(`Shorten description to ≤${DESC_MAX} chars before adding bead ID`);
    } else {
      issues.push(
        `Title is ${titleLen} chars — ${remaining} chars remaining after adding bead ID (budget: ${BEAD_BUDGET} chars for " (${repoPrefix}-xxxxx)")`,
      );
    }
  } else {
    // Bead present — check full title length
    if (titleLen > TITLE_MAX) {
      issues.push(
        `Title is ${titleLen} chars, exceeds ${TITLE_MAX}-char limit by ${titleLen - TITLE_MAX} chars`,
      );

      // Also check description portion
      const descPart = subject.trim().replace(beadPattern, "").trim();
      if (descPart.length > DESC_MAX) {
        issues.push(
          `Description (without bead) is ${descPart.length} chars, max is ${DESC_MAX} chars`,
        );
      }
    }
  }

  if (issues.length === 0) {
    return { check: CHECK, name: NAME, ok: true };
  }

  const isOverBudget = issues.some((i) => i.includes("exceed") || i.includes("Shorten"));

  return {
    check: CHECK,
    name: NAME,
    ok: false,
    message: issues.length === 1 ? issues[0] : `${issues.length} issues with commit title:`,
    why: `65-char limit (50 for description + 15 for bead ID) keeps titles readable and reserves space for the bead ID so adding it never forces a rewrite.`,
    fixable: false,
    fix: isOverBudget
      ? `Shorten description to ≤${DESC_MAX} chars, then add (${repoPrefix}-xxx) at the end\n  Format: type: short description (${repoPrefix}-xxx)   [≤${TITLE_MAX} chars total]`
      : `Add (${repoPrefix}-xxx) at the end\n  Format: type: description (${repoPrefix}-xxx)`,
    details: issues.length > 1 ? issues.map((i) => `  - ${i}`) : [],
  };
}
