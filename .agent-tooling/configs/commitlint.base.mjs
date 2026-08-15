// Shared commitlint base for all repos. Import this and pass the repo's bead prefix.
//
// Product repos import via the stable root facade:
//   import { makeCommitlintConfig } from '../agent-tooling/commitlint.base.mjs';
//   export default makeCommitlintConfig('uc');   // or 'pt', 'at', etc.
//
// Do not import this file directly from product repos — use the root facade.

export function makeCommitlintConfig(beadPrefix) {
  return {
    // No 'extends' — all rules are inlined so product repos don't need
    // @commitlint/config-conventional in their local node_modules.
    parserPreset: {
      parserOpts: {
        headerPattern: new RegExp(
          `^(\\w*)(?:\\((.*)\\))?(!)?: (.*?)(?: \\((?:${beadPrefix}-[a-z0-9][a-z0-9.-]*)(?:,\\s*${beadPrefix}-[a-z0-9][a-z0-9.-]*)*\\))?$`,
        ),
        headerCorrespondence: ["type", "scope", "breaking", "subject"],
      },
    },
    rules: {
      "header-max-length": [2, "always", 65],
      "type-case": [2, "always", "lowercase"],
      "type-empty": [2, "never"],
      "type-enum": [
        2,
        "always",
        ["feat", "fix", "docs", "style", "refactor", "perf", "test", "chore"],
      ],
      "subject-case": [2, "always", "lowercase"],
      "subject-empty": [2, "never"],
      "subject-full-stop": [2, "never"],
      "body-leading-blank": [2, "always"],
      "body-empty": [2, "never"],
      "body-max-line-length": [2, "always", 72],
      "body-min-length": [2, "always", 10],
      "footer-leading-blank": [2, "always"],
      "footer-max-line-length": [2, "always", 100],
      "header-trim": [2, "always"],
    },
  };
}
