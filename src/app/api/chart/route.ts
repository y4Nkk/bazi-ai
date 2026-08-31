import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BirthInputSchema, normalizeBirthInput } from "@/domain/bazi/normalize";
import { daysBetween } from "@/domain/bazi/calendar";
import { calculateBaziSnapshot } from "@/domain/bazi/snapshot";
import { DIMENSION_KEYS } from "@/domain/bazi/contract";
import { RANGE_LIMITS, RangeTooLargeError } from "@/domain/bazi/projection";

export const runtime = "nodejs";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const ChartRequestSchema = z
  .strictObject({
    input: BirthInputSchema,
    range: z.strictObject({
      start: z.string().regex(ISO_DATE),
      end: z.string().regex(ISO_DATE),
    }),
    dimension: z.enum(DIMENSION_KEYS),
    resolution: z.enum(["day", "month", "year"]),
  })
  .superRefine((value, ctx) => {
    const { range, resolution } = value;
    if (range.end < range.start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["range", "end"],
        message: "结束日期不能早于开始日期",
      });
      return;
    }
    const dayCount = daysBetween(range.start, range.end) + 1;
    const limit = RANGE_LIMITS[resolution];
    if (dayCount > limit.maxDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["range"],
        message: `${limit.label}，当前请求 ${dayCount} 天`,
      });
    }
  });

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("INVALID_JSON", "请求体不是合法 JSON，请重新提交排盘。");
  }

  const parsed = ChartRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      "VALIDATION",
      "出生信息或范围参数不完整，请检查表单后重试。",
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  try {
    const { input, range, dimension, resolution } = parsed.data;
    const snapshot = calculateBaziSnapshot({
      input: normalizeBirthInput(input),
      range,
      dimension,
      resolution,
    });
    return NextResponse.json({ snapshot });
  } catch (error) {
    if (error instanceof RangeTooLargeError) {
      return badRequest("RANGE_TOO_LARGE", error.message);
    }
    if (error instanceof z.ZodError) {
      return badRequest("VALIDATION", "出生信息未通过校验，请检查后重试。");
    }
    console.error("chart calculation failed", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: { code: "ENGINE_ERROR", message: "排盘计算失败，请稍后重试。" } },
      { status: 500 },
    );
  }
}

function badRequest(code: string, message: string, issues?: unknown): NextResponse {
  return NextResponse.json({ error: { code, message, issues } }, { status: 400 });
}
