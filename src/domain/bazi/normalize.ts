/** BirthInput is the only V1 input contract; this module is its single owner. */
import { z } from "zod";
import { assertInstantMatchesTimezone, instantMillisOf, isValidTimezone } from "./astronomy";

const BIRTH_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;

export const BirthInputSchema = z
  .strictObject({
    /** Optional display/AI salutation metadata. It is never a calculation factor. */
    subjectName: z.string().trim().min(1, "姓名不能为空").max(40, "姓名不能超过 40 个字符").optional(),
    /** Optional place label for display only; longitude is the calculation input. */
    birthplace: z.string().trim().min(1, "出生地不能为空").max(80, "出生地不能超过 80 个字符").optional(),
    birthInstant: z.string().regex(BIRTH_INSTANT_PATTERN, "birthInstant 必须是带秒和 UTC 偏移的 ISO-8601 时刻"),
    chartGender: z.enum(["male", "female"]),
    timezone: z.string(),
    longitude: z.number().min(-180).max(180),
    /** Display/location metadata; current ZP-1 calculations do not use latitude. */
    latitude: z.number().min(-90).max(90),
    timeStandard: z.enum(["civil", "trueSolar"]),
  })
  .superRefine((value, ctx) => {
    if (!isValidTimezone(value.timezone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["timezone"],
        message: "timezone 必须是有效的 IANA 时区标识",
      });
      return;
    }
    try {
      instantMillisOf(value.birthInstant);
      assertInstantMatchesTimezone(value.birthInstant, value.timezone);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["birthInstant"],
        message: error instanceof Error ? error.message : "birthInstant 无效",
      });
    }
  });

export type BirthInput = z.infer<typeof BirthInputSchema>;

/** Validates and canonicalizes raw request input; throws z.ZodError on rejection. */
export function normalizeBirthInput(raw: unknown): BirthInput {
  return BirthInputSchema.parse(raw);
}
