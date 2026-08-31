/** BirthInput is the only V1 input contract; this module is its single owner. */
import { z } from "zod";

const LOCAL_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function isValidLocalDateTime(value: string): boolean {
  if (!LOCAL_DATETIME_PATTERN.test(value)) return false;
  // Round-trip check rejects rolled-over dates such as 2024-02-30.
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day &&
    utc.getUTCHours() === hour &&
    utc.getUTCMinutes() === minute
  );
}

export const BirthInputSchema = z
  .strictObject({
    calendar: z.literal("gregorian"),
    localDateTime: z.string(),
    chartGender: z.enum(["male", "female"]),
    timezone: z.string(),
    birthplace: z.string().trim().min(1).max(60),
    longitude: z.number().min(-180).max(180),
    latitude: z.number().min(-90).max(90),
    timeStandard: z.enum(["civil", "trueSolar"]),
  })
  .superRefine((value, ctx) => {
    if (!isValidLocalDateTime(value.localDateTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["localDateTime"],
        message: "localDateTime 必须是真实存在的 YYYY-MM-DDTHH:mm 本地时间",
      });
    }
    if (!isValidTimezone(value.timezone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["timezone"],
        message: "timezone 必须是有效的 IANA 时区标识",
      });
    }
  });

export type BirthInput = z.infer<typeof BirthInputSchema>;

/** Validates and canonicalizes raw request input; throws z.ZodError on rejection. */
export function normalizeBirthInput(raw: unknown): BirthInput {
  const input = BirthInputSchema.parse(raw);
  return {
    ...input,
    birthplace: input.birthplace.trim(),
  };
}
