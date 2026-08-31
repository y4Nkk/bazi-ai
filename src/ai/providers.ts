/**
 * Fixed provider presets. V1 accepts no arbitrary base URLs: each preset owns
 * its endpoint and wire format, and the API key is used for one invocation
 * only (never persisted, logged, or echoed in responses).
 */

export const PROVIDER_PRESETS = {
  openai: {
    id: "openai",
    label: "OpenAI",
    models: ["gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.6-sol"],
    apiKeyUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    models: ["claude-haiku-4-5", "claude-sonnet-5", "claude-opus-5"],
    apiKeyUrl: "https://platform.claude.com/settings/keys",
  },
  google: {
    id: "google",
    label: "Google",
    models: ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-2.5-pro"],
    apiKeyUrl: "https://aistudio.google.com/apikey",
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    models: ["deepseek-v4-flash", "deepseek-v4-pro"],
    apiKeyUrl: "https://platform.deepseek.com/api_keys",
  },
} as const;

export type ProviderId = keyof typeof PROVIDER_PRESETS;

export const DEFAULT_PROVIDER_ID: ProviderId = "deepseek";

export function isProviderId(value: string): value is ProviderId {
  return Object.prototype.hasOwnProperty.call(PROVIDER_PRESETS, value);
}

export const PROVIDER_ENDPOINTS: Record<ProviderId, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  google: "https://generativelanguage.googleapis.com/v1beta/models",
  deepseek: "https://api.deepseek.com/chat/completions",
};
