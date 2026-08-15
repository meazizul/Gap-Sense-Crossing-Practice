import { createRequire } from "node:module";

function resolveTool(specifier, importMetaUrl) {
  return createRequire(importMetaUrl).resolve(specifier);
}

export function resolveBiomeBin(importMetaUrl) {
  return resolveTool("@biomejs/biome/bin/biome", importMetaUrl);
}

export function resolveCommitlintBin(importMetaUrl) {
  return resolveTool("@commitlint/cli/lib/cli.js", importMetaUrl);
}
