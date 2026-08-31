/**
 * Browser-local persistence of the last workbench result, so a refresh (or a
 * return visit) restores the chart and the AI analysis without recomputation
 * or a second paid AI call. Single owner of the localStorage contract. The
 * API key and the boundary acknowledgement are never cached.
 */
import { ALGORITHM_VERSION } from "@/domain/bazi/version";
import { BirthInputSchema, type BirthInput } from "@/domain/bazi/normalize";
import { AnalysisOutputSchema, type AnalysisOutput } from "@/ai/schema";
import type { ChartSnapshot } from "@/domain/bazi/contract";

const STORAGE_KEY = "bazi.workbench.zp1";

export interface WorkbenchCache {
  input: BirthInput;
  snapshot: ChartSnapshot;
  selectedCandle: number;
  analysisOutput: AnalysisOutput | null;
}

export function saveWorkbenchCache(cache: WorkbenchCache): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Private mode or quota exceeded: caching is best-effort.
  }
}

export function loadWorkbenchCache(): WorkbenchCache | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cache = parseWorkbenchCache(JSON.parse(raw));
    if (!cache) window.localStorage.removeItem(STORAGE_KEY);
    return cache;
  } catch {
    return null;
  }
}

/** Strictly accepts only a cache whose snapshot was produced for its stored input. */
export function parseWorkbenchCache(value: unknown): WorkbenchCache | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as {
    input?: unknown;
    snapshot?: unknown;
    selectedCandle?: unknown;
    analysisOutput?: unknown;
  };

  const input = BirthInputSchema.safeParse(candidate.input);
  if (!input.success) return null;

  const snapshot = usableSnapshot(candidate.snapshot, input.data);
  if (!snapshot) return null;

  const selectedCandle =
    typeof candidate.selectedCandle === "number" &&
    Number.isInteger(candidate.selectedCandle) &&
    candidate.selectedCandle >= 0 &&
    candidate.selectedCandle < snapshot.series.candles.length
      ? candidate.selectedCandle
      : Math.floor(snapshot.series.candles.length / 2);

  const analysis =
    candidate.analysisOutput == null
      ? null
      : AnalysisOutputSchema.safeParse(candidate.analysisOutput);
  const analysisOutput = analysis && analysis.success ? analysis.data : null;

  return { input: input.data, snapshot, selectedCandle, analysisOutput };
}

/**
 * Structural guard pinned to ZP-1. Older snapshots are never converted or read.
 */
function usableSnapshot(value: unknown, input: BirthInput): ChartSnapshot | null {
  if (typeof value !== "object" || value === null) return null;
  const snapshot = value as ChartSnapshot;
  const snapshotInput = BirthInputSchema.safeParse(snapshot.input);
  const candlesOk =
    Array.isArray(snapshot.series?.candles) &&
    snapshot.series.candles.length > 0 &&
    snapshot.series.candles.every(
      (candle) =>
        typeof candle?.timestamp === "string" &&
        [candle.open, candle.high, candle.low, candle.close].every(
          (n) => typeof n === "number",
        ),
    );
  if (
    snapshot.algorithmVersion !== ALGORITHM_VERSION ||
    !snapshotInput.success ||
    JSON.stringify(snapshotInput.data) !== JSON.stringify(input) ||
    typeof snapshot.snapshotKey !== "string" ||
    !Array.isArray(snapshot.natal?.pillars) ||
    snapshot.natal.pillars.length !== 4 ||
    !Array.isArray(snapshot.luck?.cycles) ||
    !snapshot.judgment ||
    !candlesOk
  ) {
    return null;
  }
  return snapshot;
}
