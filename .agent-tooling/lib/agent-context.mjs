export const AGENT_CONTEXT = {
  claude: "claude",
  codex: "codex",
  unknown: "unknown",
};

const CLAUDE_TRAILER_PATTERN = /<noreply@anthropic\.com>/i;
const CODEX_TRAILER_PATTERN = /<codex@openai\.com>/i;

export function detectAgentContext({ trailers = [], env = process.env } = {}) {
  for (const trailer of trailers) {
    if (CODEX_TRAILER_PATTERN.test(trailer)) return AGENT_CONTEXT.codex;
    if (CLAUDE_TRAILER_PATTERN.test(trailer)) return AGENT_CONTEXT.claude;
  }

  if (env.CODEX_THREAD_ID) return AGENT_CONTEXT.codex;
  if (env.CLAUDECODE === "1") return AGENT_CONTEXT.claude;

  return AGENT_CONTEXT.unknown;
}

export function renderAgentExamples(agentContext, examples, indent = "") {
  const lines = [];
  if (agentContext === AGENT_CONTEXT.claude) {
    lines.push(`${indent}Claude: ${examples.claude}`);
  } else if (agentContext === AGENT_CONTEXT.codex) {
    lines.push(`${indent}Codex:  ${examples.codex}`);
  } else {
    lines.push(`${indent}Claude: ${examples.claude}`);
    lines.push(`${indent}Codex:  ${examples.codex}`);
  }
  return lines.join("\n");
}
