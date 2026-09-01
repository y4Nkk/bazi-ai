"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { Button, Select } from "./controls";
import { DatePicker } from "./date-picker";
import { TEXT } from "@/lib/typography";
import { RULE_CATALOG_MANIFEST } from "@/domain/bazi/rules";
import {
  DIMENSION_LABELS,
  RESOLUTION_LABELS,
  TREND_INDEX_RANGE,
  TREND_RANGE_LIMITS,
  type Dimension,
  type Resolution,
  type RuleHit,
  type TrendPeriod,
  type TrendRange,
  type TrendSeries,
} from "@/domain/bazi/contract";

const VIEW_WIDTH = 960;
const MAIN_TOP = 22;
const MAIN_HEIGHT = 282;
const LOWER_GAP = 26;
const LOWER_HEIGHT = 70;
const AXIS_SPACE = 34;
const PADDING = { left: 48, right: 16 };
const DEFAULT_VISIBLE: Record<Resolution, number> = { shichen: 36, day: 31, month: 24, year: 12 };

const SUBJECT_LABELS: Record<string, string> = { year: "流年", month: "流月", day: "流日", hour: "流时" };
const RULE_SUBJECT_VOCABULARIES: Record<string, Record<string, string>> = {
  QI_MONTH_COMMAND: { early: "初段", middle: "中段", late: "末段" },
  QI_ROOT: { main: "本气根", middle: "中气根", residual: "余气根", prosperous: "旺根" },
  QI_ROOT_DISRUPTED: { formed: "成立", blocked: "受阻", contested: "争用", untransformed: "未化", broken: "被破" },
  QI_FLOW: { continuous: "全通", partial: "半通", blocked: "受阻" },
};

function reasonText(reason: RuleHit): string {
  const vocabulary = RULE_SUBJECT_VOCABULARIES[reason.code.split(":")[0]];
  return reason.subjects.map((subject) => {
    if (vocabulary?.[subject]) return vocabulary[subject];
    if (SUBJECT_LABELS[subject]) return SUBJECT_LABELS[subject];
    if (Object.values(SUBJECT_LABELS).includes(subject)) return subject;
    const [ruleCode, ...params] = subject.split(":");
    const label = RULE_CATALOG_MANIFEST.ruleLabels[ruleCode];
    return label ? `${label}·${params.join("")}` : subject;
  }).join("／");
}

function periodValue(period: TrendPeriod): number {
  return period.kind === "point" ? period.value : period.close;
}

function periodLabel(period: TrendPeriod, resolution: Resolution): string {
  if (resolution === "shichen") return period.timestamp.slice(11);
  if (resolution === "day") return period.timestamp.slice(5);
  return period.timestamp;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

interface ChartLayout {
  height: number;
  mainBottom: number;
  lowerTop: number | null;
  lowerBottom: number | null;
  tickY: number;
  step: number;
  x: (index: number) => number;
  y: (value: number) => number;
  grid: Array<{ value: number; y: number }>;
  ticks: Array<{ index: number; x: number; label: string }>;
  intensityY: (value: number) => number;
}

function layout(periods: TrendPeriod[], trendCenter: number[], intensity: number[], resolution: Resolution, showIntensity: boolean): ChartLayout {
  const lowerTop = showIntensity ? MAIN_TOP + MAIN_HEIGHT + LOWER_GAP : null;
  const lowerBottom = lowerTop === null ? null : lowerTop + LOWER_HEIGHT;
  const mainBottom = MAIN_TOP + MAIN_HEIGHT;
  const height = (lowerBottom ?? mainBottom) + AXIS_SPACE;
  const innerWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
  const step = innerWidth / periods.length;
  const lows = periods.map((period) => period.kind === "point" ? period.value : period.low);
  const highs = periods.map((period) => period.kind === "point" ? period.value : period.high);
  const allValues = [...lows, ...highs, ...trendCenter];
  const low = Math.min(...allValues);
  const high = Math.max(...allValues);
  const padding = Math.max((high - low) * 0.15, 1.5);
  let min = Math.max(TREND_INDEX_RANGE.min, low - padding);
  let max = Math.min(TREND_INDEX_RANGE.max, high + padding);
  if (max - min < 8) {
    const center = (min + max) / 2;
    min = Math.max(TREND_INDEX_RANGE.min, center - 4);
    max = Math.min(TREND_INDEX_RANGE.max, center + 4);
  }
  const rawStep = (max - min) / 5;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const gridStep = [1, 2, 5, 10].map((multiple) => multiple * magnitude).find((candidate) => candidate >= rawStep) ?? 10 * magnitude;
  const y = (value: number) => mainBottom - ((value - min) / (max - min)) * MAIN_HEIGHT;
  const grid: Array<{ value: number; y: number }> = [];
  for (let value = Math.ceil(min / gridStep) * gridStep; value <= max + 1e-9; value += gridStep) grid.push({ value: Math.round(value * 1e6) / 1e6, y: y(value) });
  const tickCount = Math.min(7, periods.length);
  const tickIndexes = Array.from(new Set(Array.from({ length: tickCount }, (_, index) => Math.round(index * (periods.length - 1) / Math.max(1, tickCount - 1)))));
  const maxIntensity = Math.max(1, ...intensity);
  return {
    height,
    mainBottom,
    lowerTop,
    lowerBottom,
    tickY: (lowerBottom ?? mainBottom) + 18,
    step,
    x: (index) => PADDING.left + step * (index + 0.5),
    y,
    grid,
    ticks: tickIndexes.map((index) => ({ index, x: PADDING.left + step * (index + 0.5), label: periodLabel(periods[index], resolution) })),
    intensityY: (value) => (lowerBottom ?? mainBottom) - (value / maxIntensity) * LOWER_HEIGHT,
  };
}

export function TrendChart({
  series,
  dimension,
  resolution,
  range,
  selectedPeriodId,
  onSelectPeriod,
  onDimensionChange,
  onResolutionChange,
  onRangeChange,
  onShiftWindow,
  loading,
  error,
}: {
  series: TrendSeries | null;
  dimension: Dimension;
  resolution: Resolution;
  range: TrendRange;
  selectedPeriodId: string | null;
  onSelectPeriod: (id: string) => void;
  onDimensionChange: (dimension: Dimension) => void;
  onResolutionChange: (resolution: Resolution) => void;
  onRangeChange: (boundary: keyof TrendRange, value: string) => void;
  onShiftWindow: (direction: -1 | 1) => void;
  loading: boolean;
  error: string | null;
}) {
  const periods = series?.periods ?? [];
  const [showTrendCenter, setShowTrendCenter] = useState(true);
  const [showIntensity, setShowIntensity] = useState(true);
  const [visibleCount, setVisibleCount] = useState(0);
  const [windowStart, setWindowStart] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const drag = useRef<{ pointerId: number; x: number; windowStart: number; moved: boolean } | null>(null);
  const selectedIndex = Math.max(0, periods.findIndex((period) => period.id === selectedPeriodId));

  useEffect(() => {
    if (!periods.length) return;
    const count = Math.min(periods.length, DEFAULT_VISIBLE[resolution]);
    setVisibleCount(count);
    setWindowStart(clamp(selectedIndex - Math.floor(count / 2), 0, periods.length - count));
    setHoveredIndex(null);
  }, [resolution, series?.range.start, series?.range.end, periods.length]);

  useEffect(() => {
    if (!visibleCount || selectedIndex < windowStart || selectedIndex >= windowStart + visibleCount) {
      setWindowStart(clamp(selectedIndex - Math.floor(visibleCount / 2), 0, Math.max(0, periods.length - visibleCount)));
    }
  }, [periods.length, selectedIndex, visibleCount, windowStart]);

  const count = Math.min(periods.length, Math.max(1, visibleCount || DEFAULT_VISIBLE[resolution]));
  const visible = periods.slice(windowStart, windowStart + count);
  const allTrendCenter = series?.indicators.trendCenter ?? [];
  const allIntensity = series?.indicators.intensity ?? [];
  const trendCenter = allTrendCenter.slice(windowStart, windowStart + count);
  const intensity = allIntensity.slice(windowStart, windowStart + count);
  const chart = useMemo(() => visible.length ? layout(visible, trendCenter, intensity, resolution, showIntensity) : null, [visible, trendCenter, intensity, resolution, showIntensity]);
  const activeIndex = hoveredIndex ?? selectedIndex;
  const activeVisibleIndex = activeIndex - windowStart;
  const selected = periods[selectedIndex];

  const pan = (amount: number) => {
    const maxStart = Math.max(0, periods.length - count);
    const next = windowStart + amount;
    if (next < 0) return onShiftWindow(-1);
    if (next > maxStart) return onShiftWindow(1);
    setWindowStart(next);
  };
  const zoom = (direction: -1 | 1) => {
    if (!periods.length) return;
    const min = Math.min(periods.length, resolution === "shichen" ? 12 : 6);
    const next = clamp(Math.round(count * (direction === -1 ? 0.65 : 1.55)), min, periods.length);
    const offsetRatio = count ? (selectedIndex - windowStart) / count : 0.5;
    setVisibleCount(next);
    setWindowStart(clamp(selectedIndex - Math.round(offsetRatio * next), 0, periods.length - next));
  };
  const resetViewport = () => {
    const next = Math.min(periods.length, DEFAULT_VISIBLE[resolution]);
    setVisibleCount(next);
    setWindowStart(clamp(selectedIndex - Math.floor(next / 2), 0, Math.max(0, periods.length - next)));
  };
  const localIndexAt = (event: ReactPointerEvent<SVGSVGElement>): number | null => {
    if (!chart || !visible.length) return null;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * VIEW_WIDTH / bounds.width;
    if (x < PADDING.left || x > VIEW_WIDTH - PADDING.right) return null;
    return clamp(Math.floor((x - PADDING.left) / chart.step), 0, visible.length - 1);
  };
  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (localIndexAt(event) === null || event.pointerType === "touch") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, x: event.clientX, windowStart, moved: false };
  };
  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const index = localIndexAt(event);
    if (index !== null) setHoveredIndex(windowStart + index);
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId || !chart) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const movement = Math.round((event.clientX - state.x) * VIEW_WIDTH / bounds.width / chart.step);
    if (Math.abs(event.clientX - state.x) > 5) state.moved = true;
    setWindowStart(clamp(state.windowStart - movement, 0, Math.max(0, periods.length - count)));
  };
  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const state = drag.current;
    const index = localIndexAt(event);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
    if ((!state || !state.moved) && index !== null) onSelectPeriod(visible[index].id);
  };
  const onWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    if (!event.shiftKey) return;
    event.preventDefault();
    zoom(event.deltaY > 0 ? 1 : -1);
  };

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-bazi-border bg-bazi-surface p-5" aria-label="命理时间证据工作台" aria-busy={loading}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><p className={TEXT.overline}>可复现时间证据</p><h2 className={TEXT.sectionTitle}>命轨图表工作台</h2></div>
        <div className="flex flex-wrap items-center justify-end gap-2" aria-label="图表区间">
          <Button type="button" variant="secondary" aria-label="上一个时间窗口" onClick={() => onShiftWindow(-1)} disabled={loading} className="min-h-touch min-w-11 px-2">‹</Button>
          <DatePicker value={range.start} onValueChange={(value) => value && onRangeChange("start", value)} ariaLabel="趋势起始日期" clearable={false} disabled={loading} className="w-auto" />
          <span className={TEXT.caption}>至</span>
          <DatePicker value={range.end} onValueChange={(value) => value && onRangeChange("end", value)} ariaLabel="趋势结束日期" clearable={false} disabled={loading} className="w-auto" />
          <Button type="button" variant="secondary" aria-label="下一个时间窗口" onClick={() => onShiftWindow(1)} disabled={loading} className="min-h-touch min-w-11 px-2">›</Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-sm border border-bazi-border bg-bazi-surface p-1" role="radiogroup" aria-label="时间粒度">
          {(["shichen", "day", "month", "year"] as Resolution[]).map((option) => <label key={option} className={`flex min-h-touch cursor-pointer items-center rounded-sm px-3 text-body-sm font-medium transition duration-fast ${option === resolution ? "bg-bazi-primary text-bazi-primary-foreground" : "text-bazi-ink-secondary hover:bg-bazi-surface-muted"}`}><input type="radio" name="resolution" value={option} checked={option === resolution} onChange={() => onResolutionChange(option)} className="sr-only" />{RESOLUTION_LABELS[option]}</label>)}
        </div>
        <label htmlFor="dimension-select" className={`${TEXT.label} text-bazi-ink-secondary`}>查看维度</label>
        <Select id="dimension-select" value={dimension} onValueChange={(value) => onDimensionChange(value as Dimension)} disabled={loading} options={(Object.keys(DIMENSION_LABELS) as Dimension[]).map((key) => ({ value: key, label: DIMENSION_LABELS[key] }))} />
        <div className="flex flex-wrap items-center gap-2" aria-label="证据图层">
          <Button type="button" variant={showTrendCenter ? "primary" : "secondary"} aria-pressed={showTrendCenter} onClick={() => setShowTrendCenter((value) => !value)} className="min-h-touch px-3">命势中轴</Button>
          <Button type="button" variant={showIntensity ? "primary" : "secondary"} aria-pressed={showIntensity} onClick={() => setShowIntensity((value) => !value)} className="min-h-touch px-3">变势强度</Button>
        </div>
        <div className="ml-auto flex items-center gap-2" aria-label="局部缩放">
          <Button type="button" variant="secondary" aria-label="放大图表" onClick={() => zoom(-1)} disabled={!periods.length || count <= (resolution === "shichen" ? 12 : 6)} className="min-h-touch min-w-11 px-2">＋</Button>
          <Button type="button" variant="secondary" aria-label="重置图表缩放" onClick={resetViewport} disabled={!periods.length} className="min-h-touch px-3">适配</Button>
          <Button type="button" variant="secondary" aria-label="缩小图表" onClick={() => zoom(1)} disabled={!periods.length || count >= periods.length} className="min-h-touch min-w-11 px-2">－</Button>
        </div>
      </div>

      <div className={`${TEXT.micro} flex flex-wrap items-center gap-x-4 gap-y-1`}>
        <span>指数 0–100；{TREND_RANGE_LIMITS[resolution].label}</span>
        {resolution === "shichen" ? <span>时辰按命理日时序排列，23 时起；它是原子命势点，不伪造 OHLC。</span> : <span>日、月、年为确定性 OHLC 聚合。</span>}
        <span>拖移查看已加载时段；按 Shift + 滚轮或使用缩放按钮调整密度。</span>
      </div>

      {loading ? <ChartLoading resolution={resolution} range={range} /> : error ? <ChartError error={error} /> : !chart || !selected ? <EmptyChart /> : (
        <>
          <svg viewBox={`0 0 ${VIEW_WIDTH} ${chart.height}`} className="h-auto w-full touch-pan-y select-none" role="group" tabIndex={0} aria-label={`${RESOLUTION_LABELS[resolution]}命理时间证据图，共 ${periods.length} 个周期；可用左右方向键选择周期，PageUp 与 PageDown 平移视窗。`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={() => { if (!drag.current) setHoveredIndex(null); }} onWheel={onWheel} onKeyDown={(event) => {
            if (event.key === "ArrowLeft") { event.preventDefault(); onSelectPeriod(periods[Math.max(0, selectedIndex - 1)].id); }
            else if (event.key === "ArrowRight") { event.preventDefault(); onSelectPeriod(periods[Math.min(periods.length - 1, selectedIndex + 1)].id); }
            else if (event.key === "Home") { event.preventDefault(); onSelectPeriod(periods[0].id); }
            else if (event.key === "End") { event.preventDefault(); onSelectPeriod(periods.at(-1)!.id); }
            else if (event.key === "PageUp") { event.preventDefault(); pan(-Math.max(1, Math.floor(count * 0.7))); }
            else if (event.key === "PageDown") { event.preventDefault(); pan(Math.max(1, Math.floor(count * 0.7))); }
          }}>
            {chart.grid.map((line) => <g key={line.value} aria-hidden><line x1={PADDING.left} x2={VIEW_WIDTH - PADDING.right} y1={line.y} y2={line.y} className="stroke-bazi-border-soft" strokeWidth={1} /><text x={PADDING.left - 8} y={line.y + 4} textAnchor="end" className="fill-bazi-ink-muted text-micro">{Number.isInteger(line.value) ? line.value : line.value.toFixed(1)}</text></g>)}
            <line x1={PADDING.left} x2={VIEW_WIDTH - PADDING.right} y1={chart.mainBottom} y2={chart.mainBottom} className="stroke-bazi-border-soft" strokeWidth={1} />
            {activeVisibleIndex >= 0 && activeVisibleIndex < visible.length ? <g aria-hidden className="pointer-events-none"><rect x={chart.x(activeVisibleIndex) - chart.step / 2} y={MAIN_TOP} width={chart.step} height={chart.mainBottom - MAIN_TOP} className="fill-bazi-surface-tinted-strong" /><line x1={chart.x(activeVisibleIndex)} x2={chart.x(activeVisibleIndex)} y1={MAIN_TOP} y2={chart.lowerBottom ?? chart.mainBottom} className="stroke-bazi-primary" strokeWidth={1} strokeDasharray="3 3" /></g> : null}
            {visible.map((period, index) => {
              const x = chart.x(index);
              if (period.kind === "point") return <circle key={period.id} cx={x} cy={chart.y(period.value)} r={Math.max(2.5, Math.min(5, chart.step * 0.22))} className="fill-bazi-primary" aria-hidden />;
              const up = period.close >= period.open;
              return <g key={period.id} aria-hidden><line x1={x} x2={x} y1={chart.y(period.high)} y2={chart.y(period.low)} className={up ? "stroke-bazi-success" : "stroke-bazi-danger"} strokeWidth={1.5} /><rect x={x - Math.max(2.5, chart.step * 0.32)} y={Math.min(chart.y(period.open), chart.y(period.close))} width={Math.max(5, chart.step * 0.64)} height={Math.max(2, Math.abs(chart.y(period.close) - chart.y(period.open)))} className={up ? "fill-bazi-success" : "fill-bazi-danger"} rx={2} /></g>;
            })}
            {showTrendCenter ? <polyline points={trendCenter.map((value, index) => `${chart.x(index)},${chart.y(value)}`).join(" ")} className="pointer-events-none fill-none stroke-bazi-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" /> : null}
            {showIntensity && chart.lowerTop !== null && chart.lowerBottom !== null ? <g aria-label="变势强度副图"><line x1={PADDING.left} x2={VIEW_WIDTH - PADDING.right} y1={chart.lowerTop - 12} y2={chart.lowerTop - 12} className="stroke-bazi-border-soft" strokeWidth={1} /><text x={PADDING.left} y={chart.lowerTop - 16} className="fill-bazi-ink-muted text-micro">变势强度</text>{intensity.map((value, index) => <rect key={`${visible[index].id}-intensity`} x={chart.x(index) - Math.max(1.5, chart.step * 0.28)} y={chart.intensityY(value)} width={Math.max(3, chart.step * 0.56)} height={Math.max(1, (chart.lowerBottom ?? chart.mainBottom) - chart.intensityY(value))} className="fill-bazi-info" aria-hidden />)}</g> : null}
            {chart.ticks.map((tick) => <text key={tick.index} x={tick.x} y={chart.tickY} textAnchor="middle" className="fill-bazi-ink-muted text-micro">{tick.label}</text>)}
          </svg>
          <p className="sr-only" aria-live="polite">{periodAriaSummary(selected, resolution, dimension)}</p>
          <EvidenceInspector period={selected} trendCenter={allTrendCenter[selectedIndex] ?? periodValue(selected)} intensity={allIntensity[selectedIndex] ?? 0} resolution={resolution} dimension={dimension} />
        </>
      )}
    </section>
  );
}

function periodAriaSummary(period: TrendPeriod, resolution: Resolution, dimension: Dimension): string {
  const prefix = `${RESOLUTION_LABELS[resolution]}，${DIMENSION_LABELS[dimension]}，${period.timestamp}`;
  return period.kind === "point" ? `${prefix}，时辰命势值 ${period.value}，变势强度 ${period.intensity}` : `${prefix}，开 ${period.open}，高 ${period.high}，低 ${period.low}，收 ${period.close}，变势强度 ${period.intensity}`;
}

function EvidenceInspector({ period, trendCenter, intensity, resolution, dimension }: { period: TrendPeriod; trendCenter: number; intensity: number; resolution: Resolution; dimension: Dimension }) {
  const detail = period.kind === "point" ? [["命势值", period.value], ["精确时刻", period.instant], ["变势强度", intensity]] : [["开", period.open], ["高", period.high], ["低", period.low], ["收", period.close], ["变势强度", intensity]];
  return <section className="flex flex-col gap-3 rounded-sm border border-bazi-border bg-bazi-surface-muted p-4" aria-label="所选周期证据"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className={TEXT.kpiLabel}>{RESOLUTION_LABELS[resolution]} · {DIMENSION_LABELS[dimension]} · {period.timestamp}</p><p className={`${TEXT.kpiValueMd} text-bazi-ink`}>{periodValue(period)}</p></div><dl className={`${TEXT.tableCell} grid grid-cols-2 gap-x-6 gap-y-1 sm:flex sm:flex-wrap`}>{detail.map(([label, value]) => <div key={label} className="flex items-baseline gap-1"><dt className={TEXT.caption}>{label}</dt><dd>{value}</dd></div>)}<div className="flex items-baseline gap-1"><dt className={TEXT.caption}>命势中轴</dt><dd>{trendCenter}</dd></div></dl></div><div className="border-t border-bazi-border-soft pt-3"><p className={TEXT.label}>确定性规则依据（{period.reasons.length} 条）</p>{period.reasons.length ? <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">{period.reasons.map((reason) => <li key={reason.id} className={`${TEXT.bodySm} flex gap-2 text-bazi-ink-secondary`}><span aria-hidden className={`mt-2 size-1.5 shrink-0 rounded-full ${reason.polarity === "support" ? "bg-bazi-success" : reason.polarity === "pressure" ? "bg-bazi-danger" : "bg-bazi-ink-muted"}`} /><span><strong className="font-medium text-bazi-ink">{reason.label}</strong>{reasonText(reason) ? ` · ${reasonText(reason)}` : ""}</span></li>)}</ul> : <p className={`${TEXT.caption} mt-1`}>该周期无额外规则触发。</p>}</div></section>;
}

function EmptyChart() {
  return <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-sm border border-bazi-border-soft bg-bazi-surface-muted p-8 text-center"><p className={TEXT.bodyLg}>填写出生信息，生成可探索的命理时间证据。</p><p className={TEXT.caption}>生成后可切换时辰、日、月、年，并检查每个周期的确定性依据。</p></div>;
}

function ChartLoading({ resolution, range }: { resolution: Resolution; range: TrendRange }) {
  return <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-sm border border-bazi-border-soft bg-bazi-surface-muted p-8 text-center" aria-live="polite"><p className={TEXT.bodyLg}>正在生成{RESOLUTION_LABELS[resolution]}时间证据</p><p className={TEXT.caption}>{range.start} 至 {range.end}</p></div>;
}

function ChartError({ error }: { error: string }) {
  return <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-sm border border-bazi-danger bg-bazi-danger-soft p-8 text-center" role="alert"><p className={TEXT.bodyLg}>当前时间证据无法生成</p><p className={TEXT.caption}>{error}</p></div>;
}
