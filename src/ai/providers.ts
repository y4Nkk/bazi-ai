/**
 * Fixed provider presets. V1 accepts no arbitrary base URLs: each preset owns
 * its endpoint and wire format, and the API key is used for one invocation
 * only (never persisted, logged, or echoed in responses).
 */

export const PROVIDER_PRESETS = {
  openai: {
    id: "openai",
    label: "OpenAI",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    models: ["claude-3-5-haiku-latest", "claude-3-5-sonnet-latest"],
  },
  google: {
    id: "google",
    label: "Google",
    models: ["gemini-1.5-flash", "gemini-1.5-pro"],
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
} as const;

export type ProviderId = keyof typeof PROVIDER_PRESETS;

export function isProviderId(value: string): value is ProviderId {
  return Object.prototype.hasOwnProperty.call(PROVIDER_PRESETS, value);
}

export const PROVIDER_ENDPOINTS: Record<ProviderId, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  google: "https://generativelanguage.googleapis.com/v1beta/models",
  deepseek: "https://api.deepseek.com/chat/completions",
};
