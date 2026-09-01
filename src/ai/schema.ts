/**
 * Output and selection contracts for the AI layer.
 *
 * AnalysisOutput deliberately contains no numeric fields: the strict object
 * rejects any injected unknown key (including scores or candle values), so a
 * malformed model response fails validation instead of being rendered.
 */
import { z } from "zod";
import { DIMENSION_KEYS, RESOLUTION_KEYS } from "../domain/bazi/contract";
import type { ChartSnapshot } from "../domain/bazi/contract";

const dimensionEnum = z.enum(DIMENSION_KEYS);

/**
 * 一个选中周期可携带的确定性规则上限，输入 reasons 与输出引用数组共用；
 * 引用上限若低于它，模型如实引用全部规则就会被结构校验拒绝。
 */
const MAX_PERIOD_RULES = 24;

const PeriodReasonsSchema = z.array(z.strictObject({
  code: z.string().min(1).max(80),
  id: z.string().min(1).max(180),
  label: z.string().min(1).max(40),
  polarity: z.enum(["support", "pressure", "context"]),
  direction: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
  temporalLayer: z.enum(["原局", "大运", "流年", "流月", "流日", "流时"]),
  domainRelevance: z.array(dimensionEnum).min(1).max(10),
})).max(MAX_PERIOD_RULES);

/** The AI sees exactly the selected domain period: an aggregate candle or an atomic 时辰 point. */
const SelectedPeriodSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("candle"),
    timestamp: z.string().min(4).max(10),
    open: z.number().min(0).max(100),
    high: z.number().min(0).max(100),
    low: z.number().min(0).max(100),
    close: z.number().min(0).max(100),
    reasons: PeriodReasonsSchema,
  }),
  z.strictObject({
    kind: z.literal("point"),
    timestamp: z.string().min(10).max(16),
    instant: z.string().min(20).max(40),
    value: z.number().min(0).max(100),
    reasons: PeriodReasonsSchema,
  }),
]);

export const AnalysisOutputSchema = z
  .strictObject({
    /** A response without any active deterministic rule must say so explicitly. */
    evidenceStatus: z.enum(["cited", "insufficient"]),
    summary: z.string().min(20).max(800),
    summaryRuleIds: z.array(z.string().min(1).max(180)).max(MAX_PERIOD_RULES),
    dimensionInterpretations: z
      .array(
        z.strictObject({
          dimension: dimensionEnum,
          interpretation: z.string().min(10).max(600),
          ruleIds: z.array(z.string().min(1).max(180)).max(MAX_PERIOD_RULES),
        }),
      )
      .max(10)
      .refine((items) => {
        const keys = new Set(items.map((item) => item.dimension));
        return keys.size === items.length;
      }, "dimension 不得重复"),
    opportunities: z.array(z.string().min(4).max(200)).max(6),
    cautions: z.array(z.string().min(4).max(200)).max(6),
    selectedPeriod: z.strictObject({
      explanation: z.string().min(30).max(1200),
      ruleIds: z.array(z.string().min(1).max(180)).max(MAX_PERIOD_RULES),
    }),
    disclaimer: z.string().min(10).max(400),
  })
  .superRefine((output, ctx) => {
    const citations = [
      ...output.summaryRuleIds,
      ...output.dimensionInterpretations.flatMap((item) => item.ruleIds),
      ...output.selectedPeriod.ruleIds,
    ];
    if (output.evidenceStatus === "cited" && citations.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["evidenceStatus"], message: "有依据解读必须引用至少一条 ruleId" });
    }
    if (output.evidenceStatus === "insufficient") {
      if (citations.length > 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["evidenceStatus"], message: "证据不足解读不得伪造或引用 ruleId" });
      }
      if (!output.summary.includes("当前规则无法确定") || !output.selectedPeriod.explanation.includes("当前规则无法确定")) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["summary"], message: "证据不足解读必须明确说明当前规则无法确定" });
      }
    }
  });

export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;

/** The compact deterministic facts sent with one analysis request. */
export const AnalyzeSelectionSchema = z
  .strictObject({
    snapshotKey: z.string().regex(/^[0-9a-f]{16}$/),
    algorithmVersion: z.string().min(1),
    /** Optional salutation only; it is not a deterministic chart fact. */
    subjectName: z.string().min(1).max(40).optional(),
    chartGender: z.enum(["male", "female"]),
    timeStandard: z.enum(["civil", "trueSolar"]),
    natalPillars: z.tuple([z.string(), z.string(), z.string(), z.string()]),
    dayMaster: z.string().min(1),
    dayMasterElement: z.string().min(1),
    luckDirection: z.enum(["顺行", "逆行"]),
    primaryStructure: z.string().min(1),
    climate: z.strictObject({
      clauseId: z.string().min(1).max(120),
      primaryStems: z.array(z.enum(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"])).min(1).max(3),
      secondaryStems: z.array(z.enum(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"])).max(3),
      matchedConditions: z.array(z.string().min(1).max(40)).min(1).max(4),
      source: z.strictObject({
        work: z.literal("《穷通宝鉴》"),
        section: z.string().min(1).max(80),
        locator: z.string().min(1).max(80),
      }),
    }),
    elementDirectives: z.array(z.strictObject({
      element: z.enum(["木", "火", "土", "金", "水"]),
      rank: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      sources: z.array(z.enum(["climatePrimary", "climateSecondary", "special", "balance", "remedy"])).min(1).max(5),
    })).min(1).max(5),
    selectedPeriod: z.strictObject({
      resolution: z.enum(RESOLUTION_KEYS),
      dimension: dimensionEnum,
      period: SelectedPeriodSchema,
    }),
    boundaryChanged: z.boolean(),
    boundaryAcknowledged: z.boolean(),
  })
  .refine(
    (selection) => !selection.boundaryChanged || selection.boundaryAcknowledged,
    "真太阳时修正改变了日界或时辰时，必须先确认边界提示",
  );

export type AnalyzeSelection = z.infer<typeof AnalyzeSelectionSchema>;

/** Builds the compact selection from a snapshot and its stable domain period id. */
export function selectionFromSnapshot(
  snapshot: ChartSnapshot,
  periodId: string,
  boundaryAcknowledged: boolean,
): AnalyzeSelection {
  const period = snapshot.series.periods.find((candidate) => candidate.id === periodId);
  if (!period) {
    throw new Error(`选中的周期不存在: ${periodId}`);
  }
  return AnalyzeSelectionSchema.parse({
    snapshotKey: snapshot.snapshotKey,
    algorithmVersion: snapshot.algorithmVersion,
    subjectName: snapshot.input.subjectName,
    chartGender: snapshot.input.chartGender,
    timeStandard: snapshot.selectedStandard,
    natalPillars: snapshot.natal.pillars.map((p) => p.ganzhi) as [
      string, string, string, string,
    ],
    dayMaster: snapshot.natal.dayMaster.stem,
    dayMasterElement: snapshot.natal.dayMaster.element,
    luckDirection: snapshot.luck.directionLabel,
    primaryStructure: snapshot.judgment.primaryStructure,
    climate: {
      clauseId: snapshot.judgment.climate.clauseId,
      primaryStems: snapshot.judgment.climate.primaryStems,
      secondaryStems: snapshot.judgment.climate.secondaryStems,
      matchedConditions: snapshot.judgment.climate.matchedConditions,
      source: {
        work: snapshot.judgment.climate.source.work,
        section: snapshot.judgment.climate.source.section,
        locator: snapshot.judgment.climate.source.locator,
      },
    },
    elementDirectives: snapshot.judgment.elementDirectives,
    selectedPeriod: {
      resolution: snapshot.series.resolution,
      dimension: snapshot.series.dimension,
      period: period.kind === "candle"
        ? {
            kind: period.kind,
            timestamp: period.timestamp,
            open: period.open,
            high: period.high,
            low: period.low,
            close: period.close,
            reasons: period.reasons.map(compactReason),
          }
        : {
            kind: period.kind,
            timestamp: period.timestamp,
            instant: period.instant,
            value: period.value,
            reasons: period.reasons.map(compactReason),
          },
    },
    boundaryChanged: snapshot.boundary !== null,
    boundaryAcknowledged,
  });
}

function compactReason({ id, code, label, polarity, direction, temporalLayer, domainRelevance }: ChartSnapshot["series"]["periods"][number]["reasons"][number]) {
  return { id, code, label, polarity, direction, temporalLayer, domainRelevance };
}
