import { describe, expect, it } from "vitest";
import { DEFAULT_PROVIDER_ID, PROVIDER_PRESETS } from "../src/ai/providers";

describe("BYOK provider presets", () => {
  it("defaults to DeepSeek", () => {
    expect(DEFAULT_PROVIDER_ID).toBe("deepseek");
    expect(PROVIDER_PRESETS[DEFAULT_PROVIDER_ID].label).toBe("DeepSeek");
  });

  it("gives every fixed provider its official API-key page", () => {
    expect(
      Object.fromEntries(
        Object.entries(PROVIDER_PRESETS).map(([id, preset]) => [id, preset.apiKeyUrl]),
      ),
    ).toEqual({
      openai: "https://platform.openai.com/api-keys",
      anthropic: "https://platform.claude.com/settings/keys",
      google: "https://aistudio.google.com/apikey",
      deepseek: "https://platform.deepseek.com/api_keys",
    });
  });
});
