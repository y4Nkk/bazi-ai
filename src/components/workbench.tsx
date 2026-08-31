"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "./app-shell";
import { BirthForm, BirthSummary, type BirthFormState } from "./birth-form";
import { Button } from "./controls";
import { TrendChart } from "./trend-chart";
import { PillarPanel } from "./pillar-panel";
import { LuckPanel } from "./luck-panel";
import { AnalysisPanel, type AnalysisState } from "./analysis-panel";
import { TEXT } from "@/lib/typography";
import { fetchAnalysis, fetchChartSnapshot } from "@/lib/client";
import { loadWorkbenchCache, saveWorkbenchCache } from "@/lib/workbench-cache";
import type { Place } from "@/lib/places";
import { selectionFromSnapshot } from "@/ai/schema";
import type { ProviderId } from "@/ai/providers";
import type { BirthInput } from "@/domain/bazi/normalize";
import type { ChartSnapshot, Dimension, Resolution, TrendRange } from "@/domain/bazi/contract";
import { birthInstantFromCivil, civilDateTimeOf } from "@/domain/bazi/astronomy";

interface ChartControls {
  dimension: Dimension;
  resolution: Resolution;
  /** First day of the current window; the window derives from it. */
  anchor: string;
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

/** Window per DESIGN/V1: 日=自然月（≤62天）、月=24个月、年=12年。 */
function rangeFor(anchor: string, resolution: Resolution): TrendRange {
  const base = monthFloor(anchor);
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

function shiftAnchor(anchor: string, resolution: Resolution, direction: -1 | 1): string {
  if (resolution === "day") return addMonths(anchor, direction);
  if (resolution === "month") return addMonths(anchor, direction * 12);
  return addMonths(anchor, direction * 120);
}

export function Workbench() {
  const [formState, setFormState] = useState<BirthFormState>(INITIAL_FORM);
  const [controls, setControls] = useState<ChartControls>(() => ({
    dimension: "overall",
    resolution: "day",
    anchor: monthFloor(new Date().toISOString().slice(0, 10)),
  }));
  const [snapshot, setSnapshot] = useState<ChartSnapshot | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [selectedCandle, setSelectedCandle] = useState(0);
  const [boundaryAcknowledged, setBoundaryAcknowledged] = useState(false);
  /** Open while editing; collapses into the summary bar after a clean
   * generation so the trend chart owns the first screen. A boundary
   * warning keeps the form open for acknowledgement. */
  const [formOpen, setFormOpen] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle", output: null, error: null });
  const [lastInput, setLastInput] = useState<BirthInput | null>(null);

  /** Restores the last cached result so a refresh loses neither the chart
   * nor a paid AI analysis. Controls are rebuilt from the snapshot itself;
   * the boundary acknowledgement is never cached — a boundary chart reopens
   * the form for acknowledgement, exactly like a fresh generation would. */
  useEffect(() => {
    const cached = loadWorkbenchCache();
    if (!cached) return;
    const { snapshot } = cached;
    const localDateTime = civilDateTimeOf(cached.input.timezone, cached.input.birthInstant);
    setLastInput(cached.input);
    setFormState({
      subjectName: cached.input.subjectName ?? "",
      localDate: localDateTime.slice(0, 10),
      localTime: localDateTime.slice(11, 16),
      utcOffset: cached.input.birthInstant.endsWith("Z") ? "+00:00" : cached.input.birthInstant.slice(-6),
      chartGender: cached.input.chartGender,
      timezone: cached.input.timezone,
      birthplace: cached.input.birthplace ?? "",
      longitude: String(cached.input.longitude),
      latitude: String(cached.input.latitude),
      timeStandard: cached.input.timeStandard,
    });
    setControls({
      dimension: snapshot.series.dimension,
      resolution: snapshot.series.resolution,
      anchor: snapshot.series.range.start,
    });
    setSnapshot(snapshot);
    setSelectedCandle(cached.selectedCandle);
    setAnalysis(
      cached.analysisOutput
        ? { status: "done", output: cached.analysisOutput, error: null }
        : { status: "idle", output: null, error: null },
    );
    setFormOpen(snapshot.boundary !== null);
  }, []);

  /** Persists every committed result tuple; runs after the restore effect so
   * a cacheless first mount writes nothing (snapshot still null). */
  useEffect(() => {
    if (!snapshot || !lastInput) return;
    saveWorkbenchCache({
      input: lastInput,
      snapshot,
      selectedCandle,
      analysisOutput: analysis.output,
    });
  }, [snapshot, lastInput, selectedCandle, analysis.output]);

  const loadChart = useCallback(
    async (input: BirthInput | null, next: ChartControls, collapseAfter = false) => {
      if (!input) return;
      setChartLoading(true);
      setChartError(null);
      try {
        const range = rangeFor(next.anchor, next.resolution);
        const { snapshot: nextSnapshot } = await fetchChartSnapshot({
          input,
          range,
          dimension: next.dimension,
          resolution: next.resolution,
        });
        setSnapshot(nextSnapshot);
        setSelectedCandle(Math.floor(nextSnapshot.series.candles.length / 2));
        setAnalysis({ status: "idle", output: null, error: null });
        if (collapseAfter && nextSnapshot.boundary == null) setFormOpen(false);
      } catch (error) {
        setChartError(error instanceof Error ? error.message : "排盘失败，请重试。");
      } finally {
        setChartLoading(false);
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
    setLastInput(input);
    setBoundaryAcknowledged(false);
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

  const boundaryBlocked = snapshot?.boundary !== null && snapshot?.boundary !== undefined
    ? !boundaryAcknowledged
    : false;

  const handleAnalyze = useCallback(
    async (args: { provider: ProviderId; model: string; apiKey: string; question: string }) => {
      if (!snapshot) return;
      setAnalysis({ status: "loading", output: null, error: null });
      try {
        const selection = selectionFromSnapshot(snapshot, selectedCandle, boundaryAcknowledged);
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
    [snapshot, selectedCandle, boundaryAcknowledged],
  );

  const rangeLabel = useMemo(() => {
    const range = rangeFor(controls.anchor, controls.resolution);
    return `${range.start} ~ ${range.end}`;
  }, [controls.anchor, controls.resolution]);

  const anchorYear = useMemo(() => Number(rangeFor(controls.anchor, controls.resolution).start.slice(0, 4)), [controls.anchor, controls.resolution]);

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
              boundaryAcknowledged={boundaryAcknowledged}
              onBoundaryAckChange={setBoundaryAcknowledged}
            />
          )}
          <TrendChart
            candles={snapshot?.series.candles ?? []}
            dimension={controls.dimension}
            resolution={controls.resolution}
            rangeLabel={rangeLabel}
            selectedCandle={selectedCandle}
            onSelectCandle={setSelectedCandle}
            onDimensionChange={(dimension) => changeControls({ dimension })}
            onResolutionChange={(resolution) => changeControls({ resolution })}
            onShiftWindow={(direction) =>
              changeControls({ anchor: shiftAnchor(controls.anchor, controls.resolution, direction) })
            }
            loading={chartLoading}
          />
          {snapshot ? <PillarPanel snapshot={snapshot} /> : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-6" aria-label="大运与解读">
          {snapshot ? (
            <>
              <LuckPanel snapshot={snapshot} anchorYear={anchorYear} />
              <AnalysisPanel
                boundaryBlocked={boundaryBlocked}
                selectedTimestamp={snapshot.series.candles[selectedCandle]?.timestamp ?? null}
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
                生成后可切换年、月、日粒度，查看四柱与大运，并请求 AI 解读。
              </p>
            </section>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
