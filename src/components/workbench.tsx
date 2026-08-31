"use client";

import { useCallback, useMemo, useState } from "react";
import { AppShell } from "./app-shell";
import { BirthForm, type BirthFormState } from "./birth-form";
import { TrendChart } from "./trend-chart";
import { PillarPanel } from "./pillar-panel";
import { LuckPanel } from "./luck-panel";
import { AnalysisPanel, type AnalysisState } from "./analysis-panel";
import { TEXT } from "@/lib/typography";
import { fetchAnalysis, fetchChartSnapshot } from "@/lib/client";
import type { Place } from "@/lib/places";
import { selectionFromSnapshot } from "@/ai/schema";
import type { ProviderId } from "@/ai/providers";
import type { BirthInput } from "@/domain/bazi/normalize";
import type { ChartSnapshot, Dimension, Resolution, TrendRange } from "@/domain/fortune/types";

interface ChartControls {
  dimension: Dimension;
  resolution: Resolution;
  /** First day of the current window; the window derives from it. */
  anchor: string;
}

const INITIAL_FORM: BirthFormState = {
  localDate: "",
  localTime: "",
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
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle", output: null, error: null });
  const [lastInput, setLastInput] = useState<BirthInput | null>(null);

  const loadChart = useCallback(
    async (input: BirthInput | null, next: ChartControls) => {
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
    const input: BirthInput = {
      calendar: "gregorian",
      localDateTime,
      chartGender: formState.chartGender,
      timezone: formState.timezone,
      birthplace: formState.birthplace,
      longitude: Number(formState.longitude),
      latitude: Number(formState.latitude),
      timeStandard: formState.timeStandard,
    };
    setLastInput(input);
    setBoundaryAcknowledged(false);
    void loadChart(input, controls);
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
    <AppShell>
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
        </div>

        <aside className="flex min-w-0 flex-col gap-6" aria-label="命盘详情与解读">
          {snapshot ? (
            <>
              <PillarPanel snapshot={snapshot} />
              <LuckPanel snapshot={snapshot} anchorYear={anchorYear} />
            </>
          ) : (
            <section className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-bazi-border bg-bazi-surface p-6 text-center">
              <p className={TEXT.bodyLg}>命盘将在这里生成</p>
              <p className={TEXT.caption}>四柱、五行、大运与 AI 解读都在等待你的出生信息。</p>
            </section>
          )}
          <AnalysisPanel
            hasSnapshot={snapshot !== null}
            boundaryBlocked={boundaryBlocked}
            selectedTimestamp={snapshot?.series.candles[selectedCandle]?.timestamp ?? null}
            selectedResolution={snapshot?.series.resolution ?? null}
            selectedDimension={snapshot?.series.dimension ?? null}
            state={analysis}
            onRequest={(args) => void handleAnalyze(args)}
          />
        </aside>
      </div>
    </AppShell>
  );
}
