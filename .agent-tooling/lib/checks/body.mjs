// scripts/lib/checks/body.mjs — commit body check and line-wrap utility.
// wrapBodyLines is tightly coupled to body validation (used for fix suggestions).
// Both concerns live here intentionally.

export const CHECK = "commit-body";
export const NAME = "Commit body";

export const HELP = `Commit body — requires a meaningful body on every commit.

Why: This repo is 100% AI-agent maintained. The owner cannot independently verify
correctness. The commit body is the primary audit trail explaining what changed and
why — without it there is no way to review agent decisions after the fact.

Requirements:
  - Body must be present (not empty)
  - Each body line must be 72 chars or fewer
  - Body must be separated from title by a blank line

Auto-fix:
  node scripts/commit-preflight.mjs --fix-all
  (wraps long body lines at 72 chars)

Manual fix:
  Add a body explaining: what changed, why it was needed, what constraint it preserves.
`;

/**
 * Wrap body text to maxLen chars per line, preserving bullet indent and list prefixes.
 *
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
export function wrapBodyLines(text, maxLen = 72) {
  return text
    .split("\n")
    .map((line) => {
      if (line.length <= maxLen) return line;
      const indentMatch = line.match(/^(\s*(?:[-*]\s|\d+\.\s)?)/);
      const prefix = indentMatch ? indentMatch[1] : "";
      const continuation = " ".repeat(prefix.length);
      const words = line.slice(prefix.length).split(" ");
      const wrapped = [];
      let current = prefix;
      for (const word of words) {
        if (current === prefix) {
          current += word;
        } else if (current.length + 1 + word.length <= maxLen) {
          current += ` ${word}`;
        } else {
          wrapped.push(current);
          current = continuation + word;
        }
      }
      if (current) wrapped.push(current);
      return wrapped.join("\n");
    })
    .join("\n");
}

/**
 * @param {string} body
 * @returns {import("../reporter.mjs").CheckResult}
 */
export function check(body) {
  if (!body?.trim()) {
    return {
      check: CHECK,
      name: NAME,
      ok: false,
      message: "Commit body is missing.",
      why: "Body is the primary audit trail for AI-agent decisions. Required on every commit.",
      fixable: false,
      fix: 'Pass --body "Explain why this change is needed and what constraint it preserves."',
    };
  }

  const longLines = body
    .split("\n")
    .map((line, i) => ({ line, i: i + 1, len: line.length }))
    .filter(({ len }) => len > 72);

  if (longLines.length > 0) {
    const wrapped = wrapBodyLines(body.trim());
    return {
      check: CHECK,
      name: NAME,
      ok: false,
      message: `${longLines.length} body line(s) exceed 72 chars.`,
      why: "72-char wrap is enforced by commitlint and aids readability in terminals and code review.",
      fixable: true,
      fix: "node scripts/commit-preflight.mjs --fix-all",
      details: [
        ...longLines.map(({ i, len }) => `  Line ${i}: ${len} chars`),
        "",
        "Suggested wrapped body:",
        ...wrapped.split("\n").map((l) => `  ${l}`),
      ],
    };
  }

  return { check: CHECK, name: NAME, ok: true };
}
