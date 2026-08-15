// scripts/lib/checks/subject.mjs — commit subject validation via commitlint.
// Single responsibility: run commitlint on the subject+body and return a CheckResult.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveCommitlintBin } from "../tool-bins.mjs";
import { wrapBodyLines } from "./body.mjs";

// Resolve commitlint from agent-tooling's own node_modules so product repos
// that run this script via sibling path don't need a local commitlint install.
const DEFAULT_COMMITLINT_BIN = resolveCommitlintBin(import.meta.url);

export const CHECK = "commitlint";
export const NAME = "Commitlint";

export const HELP = `Commitlint — commit title and body structure checks.

Rules enforced:
  - Conventional-Commit-style header (type: description)
  - 65-character title max
  - Required body
  - Body-leading blank line
  - Body line wrap at 72 characters
  - Minimum body length

Common workflow:
  1. Draft commit message (title + body)
  2. Run: node scripts/commit-preflight.mjs --message "type: desc (prefix-xxx)" --body "Why..." --trailer "..."
  3. If body lines exceed 72 chars: rerun with --fix-all to get the wrapped version.
  4. Inspect commitlint help: npm run commitlint:help

Note: commitlint validates title/body structure only. Bead ID and AI trailer
are checked separately by the bead-id and trailer checks.
`;

/**
 * @param {{ message: string, body?: string, write?: boolean, trailers?: string[], repoRoot: string, commitlintBin?: string, tmpPrefix?: string }} args
 * @returns {import("../reporter.mjs").CheckResult}
 */
export function check(args) {
  const {
    message,
    body = "",
    write = false,
    trailers = [],
    repoRoot,
    tmpPrefix = "preflight-commitlint-",
  } = args;

  if (!message?.trim()) {
    return {
      check: CHECK,
      name: NAME,
      ok: false,
      message: "No commit subject provided.",
      why: "Cannot validate title structure without a subject line.",
      fix: 'Pass --message "type: description (prefix-xxx)"',
    };
  }

  const commitlintBin = args.commitlintBin ?? DEFAULT_COMMITLINT_BIN;
  const commitlintConfig = path.join(repoRoot, "commitlint.config.mjs");

  const resolvedCommitlintConfig = args.commitlintConfig
    ? path.isAbsolute(args.commitlintConfig)
      ? args.commitlintConfig
      : path.join(repoRoot, args.commitlintConfig)
    : commitlintConfig;

  // Skip gracefully if commitlint config is missing
  if (!existsSync(resolvedCommitlintConfig)) {
    return { check: CHECK, name: NAME, ok: true };
  }

  const normalizedTrailers = trailers.map((t) => t.trim()).filter(Boolean);
  const rawBody =
    body?.trim() || "Explain why the change is needed and which constraint it must preserve.";
  const resolvedBody = write && body?.trim() ? wrapBodyLines(rawBody) : rawBody;
  const sections = [message.trim(), resolvedBody];
  if (normalizedTrailers.length > 0) sections.push(normalizedTrailers.join("\n"));
  const commitText = `${sections.join("\n\n")}\n`;

  const tempDir = mkdtempSync(path.join(os.tmpdir(), tmpPrefix));
  const messagePath = path.join(tempDir, "COMMIT_EDITMSG");
  writeFileSync(messagePath, commitText, "utf8");

  let result;
  try {
    execFileSync(
      process.execPath,
      [commitlintBin, "--config", resolvedCommitlintConfig, "--edit", messagePath],
      { cwd: repoRoot, stdio: "pipe" },
    );
    result = { ok: true };
  } catch (error) {
    const stdout = (error.stdout ?? "").toString().trim();
    const stderr = (error.stderr ?? "").toString().trim();
    result = {
      ok: false,
      lines: [stdout, stderr].filter(Boolean).join("\n").split(/\r?\n/).filter(Boolean),
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  const wrappedBody = body?.trim() ? wrapBodyLines(body.trim()) : null;

  if (result.ok) {
    const details = [];
    if (!body?.trim()) {
      details.push(
        "Title accepted. Pass --body to validate your full commit body before committing.",
      );
    } else if (write && wrappedBody) {
      details.push(
        "Title + wrapped body accepted. Use this body:",
        ...wrappedBody.split("\n").map((l) => `  ${l}`),
      );
    } else {
      details.push("Title + body accepted.");
    }
    return { check: CHECK, name: NAME, ok: true, details };
  }

  const details = [...result.lines];
  if (body?.trim() && result.lines.some((l) => l.includes("body-max-line-length"))) {
    details.push(
      "",
      "Suggested fix — rerun with --fix-all or wrap manually:",
      ...(wrappedBody ?? "").split("\n").map((l) => `  ${l}`),
    );
  }

  return {
    check: CHECK,
    name: NAME,
    ok: false,
    message: "Commitlint found issues with the commit message structure.",
    why: "Consistent commit format enables automated tooling and agent navigation of history.",
    fixable: body?.trim() && result.lines.some((l) => l.includes("body-max-line-length")),
    fix: "node scripts/commit-preflight.mjs --fix-all",
    details,
  };
}
