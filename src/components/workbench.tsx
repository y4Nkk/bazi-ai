"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "./app-shell";
import { BirthForm, BirthSummary, type BirthFormState } from "./birth-form";
import { Button } from "./controls";
import { TrendChart } from "./trend-chart";
import { PillarPanel } from "./pillar-panel";
import { LuckPanel } from "./luck-panel";
import { AnalysisPanel, type AnalysisState } from "./analysis-panel";
import { HistoryPanel } from "./history-panel";
import { ProfessionalPanel } from "./professional-panel";
import { TEXT } from "@/lib/typography";
import { fetchAnalysis, fetchChartSnapshot } from "@/lib/client";
import {
  createWorkbenchHistoryId,
  loadWorkbenchHistory,
  saveWorkbenchHistory,
  upsertWorkbenchHistory,
  type WorkbenchHistoryRecord,
} from "@/lib/workbench-cache";
import type { Place } from "@/lib/places";
import { selectionFromSnapshot } from "@/ai/schema";
import type { ProviderId } from "@/ai/providers";
import type { BirthInput } from "@/domain/bazi/normalize";
import { TREND_RANGE_LIMITS, type ChartSnapshot, type Dimension, type Resolution, type TrendRange } from "@/domain/bazi/contract";
import { birthInstantFromCivil, civilDateTimeOf } from "@/domain/bazi/astronomy";

interface ChartControls {
  dimension: Dimension;
  resolution: Resolution;
  range: TrendRange;
}

const INITIAL_FORM: BirthFormState = {
  subjectName: "",
  localDate: "",
  localTime: "",
  utcOffset: "",
  chartGender: "male",
  timezone: "Asia/Shanghai",
  birthplace: "",
  // Empty until a place is picked or the user types coordinates; the native
  // required check blocks submission so stale defaults can never slip through.
  longitude: "",
  latitude: "",
  timeStandard: "civil",
};

function monthFloor(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

function addMonths(day: string, months: number): string {
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7)) - 1 + months;
  const target = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0));
  const dayOfMonth = Math.min(Number(day.slice(8, 10)), lastDay.getUTCDate());
  target.setUTCDate(dayOfMonth);
  return target.toISOString().slice(0, 10);
}

function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Native evidence ranges: 时辰=单日、日=自然月、月=24个月、年=12年。 */
function defaultRangeFor(startDate: string, resolution: Resolution): TrendRange {
  const base = monthFloor(startDate);
  if (resolution === "shichen") return { start: startDate, end: startDate };
  if (resolution === "day") {
    const start = base;
    const rawEnd = addMonths(start, 1);
    const end = new Date(Date.parse(`${rawEnd}T00:00Z`) - 86_400_000).toISOString().slice(0, 10);
    return { start, end };
  }
  if (resolution === "month") {
    const rawEnd = addMonths(base, 23);
    const end = new Date(Date.UTC(Number(rawEnd.slice(0, 4)), Number(rawEnd.slice(5, 7)), 0))
      .toISOString()
      .slice(0, 10);
    return { start: base, end };
  }
  const year = Number(base.slice(0, 4));
  return { start: `${year}-01-01`, end: `${year + 11}-12-31` };
}

/** Moves a custom interval by its own inclusive calendar span. */
function shiftRange(range: TrendRange, direction: -1 | 1): TrendRange {
  const span = rangeDayCount(range);
  return {
    start: addDays(range.start, span * direction),
    end: addDays(range.end, span * direction),
  };
}

function rangeDayCount(range: TrendRange): number {
  return Math.round((Date.parse(`${range.end}T00:00:00Z`) - Date.parse(`${range.start}T00:00:00Z`)) / 86_400_000) + 1;
}

export function Workbench() {
  const [formState, setFormState] = useState<BirthFormState>(INITIAL_FORM);
  const [controls, setControls] = useState<ChartControls>(() => ({
    dimension: "overall",
    resolution: "day",
    range: defaultRangeFor(new Date().toISOString().slice(0, 10), "day"),
  }));
  const [snapshot, setSnapshot] = useState<ChartSnapshot | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [boundaryAcknowledged, setBoundaryAcknowledged] = useState(false);
  /** Open while editing; collapses into the summary bar after generation so
   * the trend chart owns the first screen. Boundary acknowledgement belongs
   * to the AI analysis that it gates. */
  const [formOpen, setFormOpen] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle", output: null, error: null });
  const [lastInput, setLastInput] = useState<BirthInput | null>(null);
  const [history, setHistory] = useState<WorkbenchHistoryRecord[]>([]);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [historyReady, setHistoryReady] = useState(false);
  const chartRequestVersion = useRef(0);
  const restoredRecordId = useRef<string | null>(null);

  const restoreHistoryRecord = useCallback((record: WorkbenchHistoryRecord) => {
    chartRequestVersion.current += 1;
    const localDateTime = civilDateTimeOf(record.input.timezone, record.input.birthInstant);
    setLastInput(record.input);
    setFormState({
      subjectName: record.input.subjectName ?? "",
      localDate: localDateTime.slice(0, 10),
      localTime: localDateTime.slice(11, 16),
      utcOffset: record.input.birthInstant.endsWith("Z") ? "+00:00" : record.input.birthInstant.slice(-6),
      chartGender: record.input.chartGender,
      timezone: record.input.timezone,
      birthplace: record.input.birthplace ?? "",
      longitude: String(record.input.longitude),
      latitude: String(record.input.latitude),
      timeStandard: record.input.timeStandard,
    });
    setControls({
      dimension: record.snapshot.series.dimension,
      resolution: record.snapshot.series.resolution,
      range: record.snapshot.series.range,
    });
    setSnapshot(record.snapshot);
    setSelectedPeriodId(record.selectedPeriodId);
    setBoundaryAcknowledged(false);
    setAnalysis(
      record.analysisOutput
        ? { status: "done", output: record.analysisOutput, error: null }
        : { status: "idle", output: null, error: null },
    );
    setChartLoading(false);
    setChartError(null);
    setActiveRecordId(record.id);
    restoredRecordId.current = record.id;
    setFormOpen(false);
  }, []);

  /** Restores the newest local record; all records remain selectable in the
   * history panel and boundary acknowledgement is deliberately reset. */
  useEffect(() => {
    const records = loadWorkbenchHistory();
    setHistory(records);
    if (records[0]) restoreHistoryRecord(records[0]);
    setHistoryReady(true);
  }, [restoreHistoryRecord]);

  useEffect(() => () => {
    chartRequestVersion.current += 1;
  }, []);

  useEffect(() => {
    if (historyReady) saveWorkbenchHistory(history);
  }, [history, historyReady]);

  /** Persists the active record after a chart or its AI reading commits. */
  useEffect(() => {
    if (!snapshot || !lastInput || !activeRecordId || !selectedPeriodId) return;
    if (restoredRecordId.current === activeRecordId) {
      restoredRecordId.current = null;
      return;
    }
    setHistory((records) =>
      upsertWorkbenchHistory(
        records,
        activeRecordId,
        { input: lastInput, snapshot, selectedPeriodId, analysisOutput: analysis.output },
        new Date().toISOString(),
      ),
    );
  }, [snapshot, lastInput, activeRecordId, selectedPeriodId, analysis.output]);

  const loadChart = useCallback(
    async (input: BirthInput | null, next: ChartControls, collapseAfter = false) => {
      if (!input) return;
      const requestVersion = chartRequestVersion.current + 1;
      chartRequestVersion.current = requestVersion;
      setChartLoading(true);
      setChartError(null);
      try {
        const { snapshot: nextSnapshot } = await fetchChartSnapshot({
          input,
          range: next.range,
          dimension: next.dimension,
          resolution: next.resolution,
        });
        if (requestVersion !== chartRequestVersion.current) return;
        setSnapshot(nextSnapshot);
        setSelectedPeriodId(nextSnapshot.series.periods[Math.floor(nextSnapshot.series.periods.length / 2)]?.id ?? null);
        setAnalysis({ status: "idle", output: null, error: null });
        if (collapseAfter) setFormOpen(false);
      } catch (error) {
        if (requestVersion !== chartRequestVersion.current) return;
        setChartError(error instanceof Error ? error.message : "排盘失败，请重试。");
      } finally {
        if (requestVersion === chartRequestVersion.current) setChartLoading(false);
      }
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    const localDateTime = `${formState.localDate}T${formState.localTime}`;
    if (!formState.localDate || !formState.localTime) {
      setChartError("请先填写出生日期与时刻，再生成命盘。");
      return;
    }
    let birthInstant: string;
    try {
      birthInstant = birthInstantFromCivil(formState.timezone, localDateTime, formState.utcOffset || undefined);
    } catch (error) {
      setChartError(error instanceof Error ? error.message : "出生时刻无法解析，请重试。");
      return;
    }
    const input: BirthInput = {
      ...(formState.subjectName.trim() ? { subjectName: formState.subjectName.trim() } : {}),
      ...(formState.birthplace.trim() ? { birthplace: formState.birthplace.trim() } : {}),
      birthInstant,
      chartGender: formState.chartGender,
      timezone: formState.timezone,
      longitude: Number(formState.longitude),
      latitude: Number(formState.latitude),
      timeStandard: formState.timeStandard,
    };
    setSnapshot(null);
    setLastInput(input);
    setActiveRecordId(createWorkbenchHistoryId());
    setBoundaryAcknowledged(false);
    setAnalysis({ status: "idle", output: null, error: null });
    void loadChart(input, controls, true);
  }, [formState, controls, loadChart]);

  const changeControls = useCallback(
    (patch: Partial<ChartControls>) => {
      const next = { ...controls, ...patch };
      setControls(next);
      if (lastInput) void loadChart(lastInput, next);
    },
    [controls, lastInput, loadChart],
  );

  const changeResolution = useCallback(
    (resolution: Resolution) => {
      changeControls({
        resolution,
        range: defaultRangeFor(controls.range.start, resolution),
      });
    },
    [changeControls, controls.range.start],
  );

  const changeRangeBoundary = useCallback(
    (boundary: keyof TrendRange, value: string) => {
      const range = boundary === "start"
        ? value <= controls.range.end
          ? { ...controls.range, start: value }
          : { start: value, end: value }
        : value >= controls.range.start
          ? { ...controls.range, end: value }
          : { start: value, end: value };
      const limit = TREND_RANGE_LIMITS[controls.resolution];
      if (rangeDayCount(range) > limit.maxDays) {
        setChartError(`${limit.label}，请缩短起止日期后重试。`);
        return;
      }
      changeControls({ range });
    },
    [changeControls, controls.range],
  );

  const handleFieldChange = useCallback((field: keyof BirthFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handlePlaceSelect = useCallback((place: Place) => {
    setFormState((prev) => ({
      ...prev,
      birthplace: place.name,
      timezone: place.timezone,
      longitude: place.lon.toFixed(2),
      latitude: place.lat.toFixed(2),
    }));
  }, []);

  const handleAnalyze = useCallback(
    async (args: { provider: ProviderId; model: string; apiKey: string; question: string }) => {
      if (!snapshot || !selectedPeriodId) return;
      setAnalysis({ status: "loading", output: null, error: null });
      try {
        const selection = selectionFromSnapshot(snapshot, selectedPeriodId, boundaryAcknowledged);
        const result = (await fetchAnalysis({
          selection,
          provider: args.provider,
          model: args.model,
          apiKey: args.apiKey,
          question: args.question || undefined,
        })) as { analysis: import("@/ai/schema").AnalysisOutput };
        setAnalysis({ status: "done", output: result.analysis, error: null });
      } catch (error) {
        setAnalysis({
          status: "error",
          output: null,
          error: error instanceof Error ? error.message : "解读请求失败，请重试。",
        });
      }
    },
    [snapshot, selectedPeriodId, boundaryAcknowledged],
  );

  /** An AI response belongs to one exact period and must disappear when that evidence changes. */
  const selectPeriod = useCallback((periodId: string) => {
    if (periodId === selectedPeriodId) return;
    setSelectedPeriodId(periodId);
    setAnalysis({ status: "idle", output: null, error: null });
  }, [selectedPeriodId]);

  const anchorYear = useMemo(() => Number(controls.range.start.slice(0, 4)), [controls.range.start]);
  const chartMatchesControls = snapshot !== null
    && snapshot.series.dimension === controls.dimension
    && snapshot.series.resolution === controls.resolution
    && snapshot.series.range.start === controls.range.start
    && snapshot.series.range.end === controls.range.end;
  const selectedPeriod = snapshot?.series.periods.find((period) => period.id === selectedPeriodId) ?? null;

  return (
    <AppShell
      headerAction={
        formOpen ? (
          // Distinct keys: React must replace (not mutate) this node, or a
          // click in flight can activate after the swap turns it into a
          // submit button and re-submits the form.
          <Button key="generate" type="submit" form="birth-form" className="min-h-touch px-5">
            生成命盘
          </Button>
        ) : (
          <Button
            key="edit"
            variant="secondary"
            className="min-h-touch px-5"
            onClick={() => setFormOpen(true)}
          >
            修改出生信息
          </Button>
        )
      }
    >
      {chartError ? (
        <p
          className={`${TEXT.bodySm} mb-6 rounded-sm border border-bazi-danger bg-bazi-danger-soft p-4`}
          role="alert"
        >
          {chartError}
        </p>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          {!formOpen && lastInput ? (
            <BirthSummary input={lastInput} onEdit={() => setFormOpen(true)} />
          ) : (
            <BirthForm
              formState={formState}
              onFieldChange={handleFieldChange}
              onPlaceSelect={handlePlaceSelect}
              onSubmit={handleSubmit}
              loading={chartLoading}
              snapshot={snapshot}
            />
          )}
          <TrendChart
            series={chartMatchesControls ? snapshot.series : null}
            dimension={controls.dimension}
            resolution={controls.resolution}
            range={controls.range}
            selectedPeriodId={selectedPeriodId}
            onSelectPeriod={selectPeriod}
            onDimensionChange={(dimension) => changeControls({ dimension })}
            onResolutionChange={changeResolution}
            onRangeChange={changeRangeBoundary}
            onShiftWindow={(direction) =>
              changeControls({ range: shiftRange(controls.range, direction) })
            }
            loading={chartLoading}
            error={chartMatchesControls ? null : chartError}
          />
          {snapshot ? <PillarPanel snapshot={snapshot} /> : null}
          {snapshot ? <ProfessionalPanel snapshot={snapshot} selectedPeriod={selectedPeriod} /> : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-6" aria-label="大运与解读">
          <HistoryPanel
            records={history}
            activeRecordId={activeRecordId}
            onSelect={restoreHistoryRecord}
          />
          {snapshot ? (
            <>
              <LuckPanel snapshot={snapshot} anchorYear={anchorYear} />
              <AnalysisPanel
                boundary={snapshot.boundary}
                boundaryAcknowledged={boundaryAcknowledged}
                onBoundaryAckChange={setBoundaryAcknowledged}
                selectedTimestamp={snapshot.series.periods.find((period) => period.id === selectedPeriodId)?.timestamp ?? null}
                selectedResolution={snapshot.series.resolution ?? null}
                selectedDimension={snapshot.series.dimension ?? null}
                state={analysis}
                onRequest={(args) => void handleAnalyze(args)}
              />
            </>
          ) : (
            <section className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-bazi-border bg-bazi-surface p-6 text-center">
              <p className={TEXT.bodyLg}>大运与解读将在这里生成</p>
              <p className={TEXT.caption}>
                生成后可切换时辰、日、月、年粒度，查看四柱与大运，并请求 AI 解读。
              </p>
            </section>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
