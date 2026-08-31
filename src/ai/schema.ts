/**
 * Output and selection contracts for the AI layer.
 *
 * AnalysisOutput deliberately contains no numeric fields: the strict object
 * rejects any injected unknown key (including scores or candle values), so a
 * malformed model response fails validation instead of being rendered.
 */
import { z } from "zod";
import { DIMENSION_KEYS } from "../domain/fortune/types";
import type { ChartSnapshot } from "../domain/fortune/types";

const dimensionEnum = z.enum(DIMENSION_KEYS);

export const AnalysisOutputSchema = z
  .strictObject({
    summary: z.string().min(20).max(800),
    dimensionInterpretations: z
      .array(
        z.strictObject({
          dimension: dimensionEnum,
          interpretation: z.string().min(10).max(600),
        }),
      )
      .min(1)
      .max(8)
      .refine((items) => {
        const keys = new Set(items.map((item) => item.dimension));
        return keys.size === items.length;
      }, "dimension 不得重复"),
    opportunities: z.array(z.string().min(4).max(200)).min(1).max(6),
    cautions: z.array(z.string().min(4).max(200)).min(1).max(6),
    selectedPeriod: z.strictObject({
      explanation: z.string().min(30).max(1200),
    }),
    disclaimer: z.string().min(10).max(400),
  });

export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;

/** The compact deterministic facts sent with one analysis request. */
export const AnalyzeSelectionSchema = z
  .strictObject({
    snapshotKey: z.string().regex(/^[0-9a-f]{16}$/),
    engineVersion: z.string().min(1),
    scoringProfileVersion: z.string().min(1),
    chartGender: z.enum(["male", "female"]),
    timeStandard: z.enum(["civil", "trueSolar"]),
    natalPillars: z.tuple([z.string(), z.string(), z.string(), z.string()]),
    dayMaster: z.string().min(1),
    dayMasterElement: z.string().min(1),
    luckDirection: z.enum(["顺行", "逆行"]),
    selectedPeriod: z.strictObject({
      resolution: z.enum(["day", "month", "year"]),
      dimension: dimensionEnum,
      timestamp: z.string().min(4).max(10),
      open: z.number().min(0).max(100),
      high: z.number().min(0).max(100),
      low: z.number().min(0).max(100),
      close: z.number().min(0).max(100),
      factors: z.array(z.string().min(1).max(60)).max(24),
    }),
    boundaryChanged: z.boolean(),
    boundaryAcknowledged: z.boolean(),
  })
  .refine(
    (selection) => !selection.boundaryChanged || selection.boundaryAcknowledged,
    "真太阳时修正改变了日界或时辰时，必须先确认边界提示",
  );

export type AnalyzeSelection = z.infer<typeof AnalyzeSelectionSchema>;

/** Builds the compact selection from a snapshot and the chosen candle index. */
export function selectionFromSnapshot(
  snapshot: ChartSnapshot,
  candleIndex: number,
  boundaryAcknowledged: boolean,
): AnalyzeSelection {
  const candle = snapshot.series.candles[candleIndex];
  if (!candle) {
    throw new Error(`选中的周期不存在: ${candleIndex}`);
  }
  return AnalyzeSelectionSchema.parse({
    snapshotKey: snapshot.snapshotKey,
    engineVersion: snapshot.engineVersion,
    scoringProfileVersion: snapshot.scoringProfileVersion,
    chartGender: snapshot.input.chartGender,
    timeStandard: snapshot.selectedStandard,
    natalPillars: snapshot.natal.pillars.map((p) => p.ganzhi) as [
      string, string, string, string,
    ],
    dayMaster: snapshot.natal.dayMaster.stem,
    dayMasterElement: snapshot.natal.dayMaster.element,
    luckDirection: snapshot.luck.directionLabel,
    selectedPeriod: {
      resolution: snapshot.series.resolution,
      dimension: snapshot.series.dimension,
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      factors: candle.factors,
    },
    boundaryChanged: snapshot.boundary !== null,
    boundaryAcknowledged,
  });
}
