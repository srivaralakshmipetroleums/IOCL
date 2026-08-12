import type { InvoiceExtractor } from "./types";
import { ClaudeInvoiceExtractor } from "./claude-extractor";
import { LocalInvoiceExtractor } from "./local-extractor";

export type ExtractorMode = "claude" | "local" | "auto";

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export function getExtractionConfig() {
  const claudeConfigured = isClaudeConfigured();
  return {
    claudeConfigured,
    defaultMode: claudeConfigured ? ("claude" as const) : ("local" as const),
    providerLabel: claudeConfigured ? "Claude API" : "Local (sample data)",
  };
}

export function getExtractor(mode: ExtractorMode = "auto"): InvoiceExtractor {
  if (mode === "local") {
    return new LocalInvoiceExtractor();
  }

  if (mode === "claude") {
    if (!isClaudeConfigured()) {
      throw new Error(
        "Claude API key is not configured. Add ANTHROPIC_API_KEY to .env.local and restart the dev server."
      );
    }
    return new ClaudeInvoiceExtractor();
  }

  // auto: use Claude when key is available
  if (isClaudeConfigured()) {
    return new ClaudeInvoiceExtractor();
  }
  return new LocalInvoiceExtractor();
}

export function resolveExtractorMode(
  requested?: string | null
): ExtractorMode {
  if (requested === "claude" || requested === "local" || requested === "auto") {
    return requested;
  }
  return "auto";
}
