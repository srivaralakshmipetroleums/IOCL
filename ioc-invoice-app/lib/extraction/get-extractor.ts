import type { InvoiceExtractor } from "./types";
import { ClaudeInvoiceExtractor } from "./claude-extractor";
import { LocalInvoiceExtractor } from "./local-extractor";

export type ExtractorMode = "claude" | "local" | "auto";

export { DEFAULT_CLAUDE_MODEL, getClaudeModel } from "./claude-config";

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export function getExtractionConfig() {
  const claudeConfigured = isClaudeConfigured();
  return {
    claudeConfigured,
    defaultMode: "claude" as const,
    providerLabel: claudeConfigured ? "Claude API" : "Claude API (not configured)",
  };
}

export function getExtractor(mode: ExtractorMode = "auto"): InvoiceExtractor {
  if (mode === "local") {
    return new LocalInvoiceExtractor();
  }

  if (!isClaudeConfigured()) {
    throw new Error(
      "Claude API key is not configured. Add ANTHROPIC_API_KEY to your environment variables."
    );
  }

  return new ClaudeInvoiceExtractor();
}

export function resolveExtractorMode(
  requested?: string | null
): ExtractorMode {
  if (requested === "claude" || requested === "local" || requested === "auto") {
    return requested;
  }
  return "auto";
}
