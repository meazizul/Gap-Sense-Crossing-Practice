// scripts/lib/checks/trailer.mjs — AI trailer check.
// All agent commits must include a recognized Co-Authored-By trailer.
// Override requires AI_TRAILER_OK=yes AND AI_TRAILER_OK_REASON='...'.

import { AGENT_CONTEXT, renderAgentExamples } from "../agent-context.mjs";

export const CHECK = "trailer";
export const NAME = "AI trailer";

export function getHelp(agentContext = AGENT_CONTEXT.unknown) {
  return `AI trailer — every commit must include an AI agent attribution trailer.

Accepted domains: noreply@anthropic.com, codex@openai.com

Examples:
  Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
  Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
  Co-Authored-By: Codex <codex@openai.com>

Pass via preflight:
  --trailer "Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

Pass via git commit (heredoc avoids shell quoting issues):
  git commit -m "$(cat <<'EOF'
  type: description (prefix-xxx)

  Body text here.

  Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
  EOF
  )"

Override (when no agent attribution applies — essentially never in agent-maintained repos):
  You MUST NOT bypass without documented justification.

  Required — both env vars:
    AI_TRAILER_OK=yes
    AI_TRAILER_OK_REASON='brief explanation'

${renderAgentExamples(
  agentContext,
  {
    claude: `AI_TRAILER_OK=yes AI_TRAILER_OK_REASON='reason' git commit -m "..."`,
    codex: `$env:AI_TRAILER_OK="yes"; $env:AI_TRAILER_OK_REASON="reason"; git commit -m "..."`,
  },
  "  ",
)}

Override is logged to .preflight.log.
`;
}

export const HELP = getHelp();

const TRAILER_PATTERN = /^Co-Authored-By: .+<(codex@openai\.com|noreply@anthropic\.com)>$/i;

/**
 * @param {string[]} trailers
 * @param {{ trailerOkEnv?: string, trailerReasonEnv?: string }} [config]
 * @returns {import("../reporter.mjs").CheckResult}
 */
export function check(trailers, config = {}) {
  const { trailerOkEnv = "AI_TRAILER_OK", trailerReasonEnv = "AI_TRAILER_OK_REASON" } = config;

  const hasRecognized = trailers.some((t) => TRAILER_PATTERN.test(t.trim()));
  if (hasRecognized) {
    return { check: CHECK, name: NAME, ok: true };
  }

  const ok = process.env[trailerOkEnv];
  const reason = process.env[trailerReasonEnv]?.trim();

  if (ok === "yes" || ok === "1") {
    if (!reason) {
      return {
        check: CHECK,
        name: NAME,
        ok: false,
        message: `${trailerOkEnv} is set but ${trailerReasonEnv} is empty.`,
        why: "Override requires documented justification. AI attribution must be traceable.",
        fix: `Set ${trailerReasonEnv}='explanation' alongside ${trailerOkEnv}=yes`,
      };
    }
    return { check: CHECK, name: NAME, ok: true, bypassed: true, bypassReason: reason };
  }

  return {
    check: CHECK,
    name: NAME,
    ok: false,
    message: "No recognized AI trailer found.",
    why: "All agent commits must be attributable. This repo is 100% AI-maintained.",
    fixable: false,
    fix: [
      'Add --trailer "Co-Authored-By: <Agent Name> <noreply@anthropic.com>"',
      "Run with --help trailer for full examples and heredoc syntax.",
    ].join("\n"),
    details:
      trailers.length > 0
        ? [`Supplied trailers (none recognized):`, ...trailers.map((t) => `  ${t}`)]
        : ["No trailers were supplied."],
  };
}
