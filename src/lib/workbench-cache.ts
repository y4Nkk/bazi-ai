/**
 * Browser-local owner for saved workbench history. Each record is a complete
 * validated result tuple, so reopening one never recalculates a chart or
 * repeats a paid AI invocation. API keys and boundary acknowledgement stay
 * outside this contract.
 */
import { ALGORITHM_VERSION } from "@/domain/bazi/version";
import { BirthInputSchema, type BirthInput } from "@/domain/bazi/normalize";
import { AnalysisOutputSchema, type AnalysisOutput } from "@/ai/schema";
import type { ChartSnapshot } from "@/domain/bazi/contract";

const STORAGE_KEY = "bazi.workbench.zp1";
export const HISTORY_LIMIT = 8;

export interface WorkbenchCache {
  input: BirthInput;
  snapshot: ChartSnapshot;
  /** Domain-issued period identity; never a volatile viewport array index. */
  selectedPeriodId: string;
  analysisOutput: AnalysisOutput | null;
}

export interface WorkbenchHistoryRecord extends WorkbenchCache {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** A newly submitted chart receives one id; later chart/AI updates replace it. */
export function createWorkbenchHistoryId(): string {
  return crypto.randomUUID();
}

export function saveWorkbenchHistory(records: WorkbenchHistoryRecord[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ records }));
  } catch {
    // Private mode or quota exceeded: local history is best-effort.
  }
}

export function loadWorkbenchHistory(): WorkbenchHistoryRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const records = parseWorkbenchHistory(JSON.parse(raw));
    if (!records) window.localStorage.removeItem(STORAGE_KEY);
    return records ?? [];
  } catch {
    return [];
  }
}

/** New history schema only: the obsolete single-result payload is discarded. */
export function parseWorkbenchHistory(value: unknown): WorkbenchHistoryRecord[] | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as { records?: unknown };
  if (!Array.isArray(candidate.records) || candidate.records.length > HISTORY_LIMIT) return null;

  const records = candidate.records.map(parseWorkbenchHistoryRecord);
  if (records.some((record) => record === null)) return null;

  const validRecords = records as WorkbenchHistoryRecord[];
  if (new Set(validRecords.map((record) => record.id)).size !== validRecords.length) return null;

  return [...validRecords].sort(
    (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
  );
}

/** Creates or refreshes one record while retaining its original creation time. */
export function upsertWorkbenchHistory(
  records: WorkbenchHistoryRecord[],
  id: string,
  cache: WorkbenchCache,
  now: string,
): WorkbenchHistoryRecord[] {
  const previous = records.find((record) => record.id === id);
  const next: WorkbenchHistoryRecord = {
    ...cache,
    id,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
  return [next, ...records.filter((record) => record.id !== id)].slice(0, HISTORY_LIMIT);
}

function parseWorkbenchHistoryRecord(value: unknown): WorkbenchHistoryRecord | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as {
    id?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };
  const cache = parseWorkbenchCache(value);
  if (
    !cache ||
    typeof candidate.id !== "string" ||
    candidate.id.length === 0 ||
    !isTimestamp(candidate.createdAt) ||
    !isTimestamp(candidate.updatedAt)
  ) {
    return null;
  }
  return { ...cache, id: candidate.id, createdAt: candidate.createdAt, updatedAt: candidate.updatedAt };
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

/** Strictly accepts only a cache whose snapshot was produced for its stored input. */
function parseWorkbenchCache(value: unknown): WorkbenchCache | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as {
    input?: unknown;
    snapshot?: unknown;
    selectedPeriodId?: unknown;
    analysisOutput?: unknown;
  };

  const input = BirthInputSchema.safeParse(candidate.input);
  if (!input.success) return null;

  const snapshot = usableSnapshot(candidate.snapshot, input.data);
  if (!snapshot) return null;

  if (
    typeof candidate.selectedPeriodId !== "string" ||
    !snapshot.series.periods.some((period) => period.id === candidate.selectedPeriodId)
  ) {
    return null;
  }

  const analysis =
    candidate.analysisOutput == null
      ? null
      : AnalysisOutputSchema.safeParse(candidate.analysisOutput);
  const analysisOutput = analysis && analysis.success ? analysis.data : null;

  return { input: input.data, snapshot, selectedPeriodId: candidate.selectedPeriodId, analysisOutput };
}

/** Structural guard pinned to ZP-1. Older snapshots are never converted or read. */
function usableSnapshot(value: unknown, input: BirthInput): ChartSnapshot | null {
  if (typeof value !== "object" || value === null) return null;
  const snapshot = value as ChartSnapshot;
  const snapshotInput = BirthInputSchema.safeParse(snapshot.input);
  const periods = snapshot.series?.periods;
  const periodsOk =
    Array.isArray(periods) &&
    periods.length > 0 &&
    periods.every((period) => {
      if (
        typeof period?.id !== "string" ||
        typeof period.timestamp !== "string" ||
        !Array.isArray(period.reasons) ||
        typeof period.intensity !== "number" ||
        period.intensity < 0
      ) {
        return false;
      }
      if (period.kind === "point") {
        return typeof period.instant === "string" && typeof period.value === "number" && usableTransit(period.transit);
      }
      return period.kind === "candle" &&
        typeof period.closeInstant === "string" &&
        usableTransit(period.transit) &&
        [period.open, period.high, period.low, period.close].every((item) => typeof item === "number");
    });
  const indicators = snapshot.series?.indicators;
  const indicatorsOk =
    typeof indicators?.trendCenterWindow === "number" &&
    Number.isInteger(indicators.trendCenterWindow) &&
    indicators.trendCenterWindow > 0 &&
    Array.isArray(indicators.trendCenter) &&
    Array.isArray(indicators.intensity) &&
    indicators.trendCenter.length === periods?.length &&
    indicators.intensity.length === periods?.length &&
    [...indicators.trendCenter, ...indicators.intensity].every((value) => typeof value === "number");
  if (
    snapshot.algorithmVersion !== ALGORITHM_VERSION ||
    !snapshotInput.success ||
    JSON.stringify(snapshotInput.data) !== JSON.stringify(input) ||
    typeof snapshot.snapshotKey !== "string" ||
    !Array.isArray(snapshot.natal?.pillars) ||
    snapshot.natal.pillars.length !== 4 ||
    snapshot.natal.pillars.some((pillar) => !Array.isArray(pillar.shensha) || pillar.shensha.some((fact) =>
      typeof fact.code !== "string" ||
      typeof fact.label !== "string" ||
      typeof fact.reference !== "string" ||
      typeof fact.target !== "string" ||
      !usableShenshaEvidence(fact.evidence),
    )) ||
    !Array.isArray(snapshot.natal.auxiliaryPillars) ||
    snapshot.natal.auxiliaryPillars.length !== 4 ||
    !Array.isArray(snapshot.luck?.cycles) ||
    !snapshot.judgment ||
    !periodsOk ||
    !indicatorsOk
  ) {
    return null;
  }
  return snapshot;
}

function usableShenshaEvidence(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const evidence = value as { grade?: unknown; work?: unknown; section?: unknown; url?: unknown; basis?: unknown };
  return ["原典直引", "流派变体", "待原典核验"].includes(String(evidence.grade)) &&
    typeof evidence.work === "string" &&
    typeof evidence.section === "string" &&
    (evidence.url === null || typeof evidence.url === "string") &&
    typeof evidence.basis === "string";
}

function usableTransit(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const transit = value as { year?: unknown; month?: unknown; day?: unknown; hour?: unknown; luck?: unknown };
  return [transit.year, transit.month, transit.day, transit.hour].every(
    (pillar) => typeof pillar === "string" && pillar.length === 2,
  ) && (transit.luck === null || (typeof transit.luck === "string" && transit.luck.length === 2));
}
