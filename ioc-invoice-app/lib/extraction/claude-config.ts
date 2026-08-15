/** Default Claude model for PDF invoice extraction. Override with ANTHROPIC_MODEL. */
export const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-6";

export function getClaudeModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_CLAUDE_MODEL;
}
