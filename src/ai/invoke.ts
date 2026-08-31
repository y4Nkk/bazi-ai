/**
 * Provider invocation with one-transient-key semantics. The API key is used
 * for a single upstream request, never logged, never included in error
 * messages or response bodies.
 */
import { AnalysisOutputSchema, type AnalyzeSelection, type AnalysisOutput } from "./schema";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import { PROVIDER_ENDPOINTS, type ProviderId } from "./providers";

const TIMEOUT_MS = 60_000;
const MAX_TOKENS = 2000;

export type AiErrorCode = "PROVIDER_ERROR" | "INVALID_OUTPUT" | "TIMEOUT";

export class AiInvocationError extends Error {
  readonly code: AiErrorCode;
  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.name = "AiInvocationError";
    this.code = code;
  }
}

export interface InvokeArgs {
  provider: ProviderId;
  model: string;
  apiKey: string;
  selection: AnalyzeSelection;
  question?: string;
}

export async function invokeAnalysis(args: InvokeArgs): Promise<AnalysisOutput> {
  const raw = await requestProviderText(args);
  const output = parseAndValidate(raw, args.selection);
  return output;
}

async function requestProviderText(args: InvokeArgs): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchProvider(args, controller.signal);
    if (!response.ok) {
      // Provider error bodies can echo key fragments; never forward them.
      await response.text().catch(() => "");
      throw new AiInvocationError(
        "PROVIDER_ERROR",
        `${args.provider} 返回 ${response.status}：请检查模型标识与 API Key 是否匹配，然后重试。`,
      );
    }
    const payload: unknown = await response.json();
    return extractText(args.provider, payload);
  } catch (error) {
    if (error instanceof AiInvocationError) throw error;
    if (isAbort(error)) {
      throw new AiInvocationError("TIMEOUT", "模型响应超时，请稍后重试或换用更快的模型。");
    }
    throw new AiInvocationError("PROVIDER_ERROR", "无法连接模型服务商，请检查网络后重试。");
  } finally {
    clearTimeout(timer);
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

async function fetchProvider(args: InvokeArgs, signal: AbortSignal): Promise<Response> {
  const { provider, model, apiKey, selection, question } = args;
  const system = buildSystemPrompt();
  const user = buildUserPrompt(selection, question);
  switch (provider) {
    case "openai":
    case "deepseek":
      return fetch(PROVIDER_ENDPOINTS[provider], {
        method: "POST",
        signal,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          // GPT-5.x 系列不接受 max_tokens；DeepSeek 走 OpenAI 兼容接口，保留 max_tokens。
          ...(provider === "openai"
            ? { max_completion_tokens: MAX_TOKENS }
            : { max_tokens: MAX_TOKENS }),
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
    case "anthropic":
      return fetch(PROVIDER_ENDPOINTS.anthropic, {
        method: "POST",
        signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: MAX_TOKENS,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
    case "google":
      return fetch(`${PROVIDER_ENDPOINTS.google}/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        signal,
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: {
            maxOutputTokens: MAX_TOKENS,
            responseMimeType: "application/json",
          },
        }),
      });
    default: {
      const exhaustive: never = provider;
      throw new AiInvocationError("PROVIDER_ERROR", `未知的模型供应商：${String(exhaustive)}`);
    }
  }
}

function extractText(provider: ProviderId, payload: unknown): string {
  if (provider === "openai" || provider === "deepseek") {
    const content = path(payload, ["choices", 0, "message", "content"]);
    if (typeof content === "string" && content.trim()) return content;
    throw new AiInvocationError("INVALID_OUTPUT", "模型未返回文本内容，请重试或更换模型。");
  }
  if (provider === "anthropic") {
    const blocks = path(payload, ["content"]);
    if (Array.isArray(blocks)) {
      const text = blocks
        .map((block) => (isRecord(block) && typeof block.text === "string" ? block.text : ""))
        .join("")
        .trim();
      if (text) return text;
    }
    throw new AiInvocationError("INVALID_OUTPUT", "模型未返回文本内容，请重试或更换模型。");
  }
  const parts = path(payload, ["candidates", 0, "content", "parts"]);
  if (Array.isArray(parts)) {
    const text = parts
      .map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim();
    if (text) return text;
  }
  throw new AiInvocationError("INVALID_OUTPUT", "模型未返回文本内容，请重试或更换模型。");
}

function path(value: unknown, segments: Array<string | number>): unknown {
  let cursor: unknown = value;
  for (const segment of segments) {
    if (typeof segment === "number") {
      if (!Array.isArray(cursor)) return undefined;
      cursor = cursor[segment];
    } else {
      if (!isRecord(cursor)) return undefined;
      cursor = cursor[segment];
    }
  }
  return cursor;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Accepts raw model text (optionally fenced), validates against the schema. */
export function parseAndValidate(raw: string, selection?: AnalyzeSelection): AnalysisOutput {
  const json = stripCodeFence(raw).trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new AiInvocationError(
      "INVALID_OUTPUT",
      "模型输出不是合法 JSON，已拒绝渲染。请重试或更换模型。",
    );
  }
  const result = AnalysisOutputSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("；");
    throw new AiInvocationError("INVALID_OUTPUT", `模型输出未通过结构校验（${issues}），已拒绝渲染。`);
  }
  if (selection) assertCitations(result.data, selection);
  return result.data;
}

function assertCitations(output: AnalysisOutput, selection: AnalyzeSelection): void {
  const allowed = new Set(selection.selectedPeriod.reasons.map((reason) => reason.id));
  const cited = [
    ...output.summaryRuleIds,
    ...output.dimensionInterpretations.flatMap((item) => item.ruleIds),
    ...output.selectedPeriod.ruleIds,
  ];
  if (cited.some((ruleId) => !allowed.has(ruleId))) {
    throw new AiInvocationError("INVALID_OUTPUT", "模型引用了确定性快照中不存在的规则，已拒绝渲染。");
  }
}

function stripCodeFence(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1] : text;
}
