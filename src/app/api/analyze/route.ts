import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AnalyzeSelectionSchema } from "@/ai/schema";
import { invokeAnalysis, AiInvocationError } from "@/ai/invoke";
import { PROVIDER_PRESETS } from "@/ai/providers";

export const runtime = "nodejs";

const AnalyzeRequestSchema = z.strictObject({
  selection: AnalyzeSelectionSchema,
  provider: z.enum(["openai", "anthropic", "google", "deepseek"]),
  model: z
    .string()
    .regex(/^[A-Za-z0-9._\-]{1,80}$/, "模型标识只能包含字母、数字、点、下划线或连字符"),
  apiKey: z.string().min(8).max(4096),
  question: z.string().trim().max(300).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("INVALID_JSON", "请求体不是合法 JSON，请重新发起解读。");
  }

  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      "VALIDATION",
      "解读请求参数不完整，请检查供应商、模型与密钥后重试。",
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  const { selection, provider, model, apiKey, question } = parsed.data;
  const preset = PROVIDER_PRESETS[provider];
  try {
    const analysis = await invokeAnalysis({ provider, model, apiKey, selection, question });
    return NextResponse.json({ analysis, provider: preset.label, model });
  } catch (error) {
    if (error instanceof AiInvocationError) {
      const status = error.code === "INVALID_OUTPUT" ? 502 : 504;
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status },
      );
    }
    console.error("analysis invocation failed", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: { code: "AI_ERROR", message: "解读请求失败，请稍后重试。" } },
      { status: 500 },
    );
  }
}

function badRequest(code: string, message: string, issues?: unknown): NextResponse {
  return NextResponse.json({ error: { code, message, issues } }, { status: 400 });
}
