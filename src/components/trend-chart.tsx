"use client";

import { useMemo } from "react";
import { Select } from "./controls";
import { TEXT } from "@/lib/typography";
import { factorLabel } from "@/domain/fortune/factors";
import {
  DIMENSION_LABELS,
  RESOLUTION_LABELS,
  type Candle,
  type Dimension,
  type Resolution,
} from "@/domain/fortune/types";

const VIEW_WIDTH = 820;
const VIEW_HEIGHT = 320;
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 };

export function TrendChart({
  candles,
  dimension,
  resolution,
  rangeLabel,
  selectedCandle,
  onSelectCandle,
  onDimensionChange,
  onResolutionChange,
  onShiftWindow,
  loading,
}: {
  candles: Candle[];
  dimension: Dimension;
  resolution: Resolution;
  rangeLabel: string;
  selectedCandle: number;
  onSelectCandle: (index: number) => void;
  onDimensionChange: (dimension: Dimension) => void;
  onResolutionChange: (resolution: Resolution) => void;
  onShiftWindow: (direction: -1 | 1) => void;
  loading: boolean;
}) {
  const chart = useMemo(() => layout(candles), [candles]);
  const selected = candles[selectedCandle];

  return (
    <section
      className="flex flex-col gap-4 rounded-lg border border-bazi-border bg-bazi-surface p-5"
      aria-label="传统命理趋势指数"
      aria-busy={loading}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={TEXT.sectionTitle}>命轨趋势 · 传统命理趋势指数</h2>
          <p className={TEXT.caption}>
            0–100 文化娱乐指数，由确定性引擎聚合时辰数据得出，非市场价格或概率。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button42 label="上一窗口" onClick={() => onShiftWindow(-1)} disabled={loading}>
            ‹
          </Button42>
          <span className={`${TEXT.meta} min-w-32 text-center`}>{rangeLabel}</span>
          <Button42 label="下一窗口" onClick={() => onShiftWindow(1)} disabled={loading}>
            ›
          </Button42>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div
          className="inline-flex rounded-sm border border-bazi-border bg-bazi-surface p-1"
          role="radiogroup"
          aria-label="周期粒度"
        >
          {(["day", "month", "year"] as Resolution[]).map((option) => (
            <label
              key={option}
              className={`flex min-h-touch cursor-pointer items-center rounded-sm px-4 text-body-sm font-medium transition duration-fast ${
                option === resolution
                  ? "bg-bazi-primary text-bazi-primary-foreground"
                  : "text-bazi-ink-secondary hover:bg-bazi-surface-muted"
              }`}
            >
              <input
                type="radio"
                name="resolution"
                value={option}
                checked={option === resolution}
                onChange={() => onResolutionChange(option)}
                className="sr-only"
              />
              {RESOLUTION_LABELS[option]}视图
            </label>
          ))}
        </div>
        <label htmlFor="dimension-select" className={`${TEXT.label} text-bazi-ink-secondary`}>
          解读维度
        </label>
        <Select
          id="dimension-select"
          value={dimension}
          onValueChange={(value) => onDimensionChange(value as Dimension)}
          disabled={loading}
          options={(Object.keys(DIMENSION_LABELS) as Dimension[]).map((key) => ({
            value: key,
            label: DIMENSION_LABELS[key],
          }))}
        />
        <p className={`${TEXT.micro} ml-auto flex items-center gap-3`}>
          <span className="flex items-center gap-1">
            <span aria-hidden className="inline-block size-2 rounded-full bg-bazi-success" />
            指数上升
          </span>
          <span className="flex items-center gap-1">
            <span aria-hidden className="inline-block size-2 rounded-full bg-bazi-danger" />
            指数下降
          </span>
        </p>
      </div>

      {candles.length === 0 ? (
        <EmptyChart />
      ) : (
        <>
          <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="h-64 w-full sm:h-80"
            role="img"
            aria-label={`${RESOLUTION_LABELS[resolution]}视图，${DIMENSION_LABELS[dimension]}维度，共 ${candles.length} 根K线`}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                onSelectCandle(Math.max(0, selectedCandle - 1));
              } else if (event.key === "ArrowRight") {
                event.preventDefault();
                onSelectCandle(Math.min(candles.length - 1, selectedCandle + 1));
              }
            }}
          >
            {chart.gridLines.map((line) => (
              <g key={line.y}>
                <line
                  x1={PADDING.left}
                  x2={VIEW_WIDTH - PADDING.right}
                  y1={line.y}
                  y2={line.y}
                  className="stroke-bazi-border-soft"
                  strokeWidth={1}
                />
                <text
                  x={PADDING.left - 8}
                  y={line.y + 4}
                  textAnchor="end"
                  className="fill-bazi-ink-muted text-micro"
                >
                  {line.label}
                </text>
              </g>
            ))}

            {chart.geometry[selectedCandle] ? (
              <rect
                x={chart.geometry[selectedCandle].x - chart.step / 2}
                y={PADDING.top}
                width={chart.step}
                height={VIEW_HEIGHT - PADDING.top - PADDING.bottom}
                className="fill-bazi-surface-tinted-strong"
              />
            ) : null}

            {candles.map((candle, index) => {
              const geometry = chart.geometry[index];
              const up = candle.close >= candle.open;
              const isSelected = index === selectedCandle;
              const colorClass = up ? "stroke-bazi-success" : "stroke-bazi-danger";
              const fillClass = up ? "fill-bazi-success-soft" : "fill-bazi-danger-soft";
              return (
                <g
                  key={candle.timestamp}
                  tabIndex={0}
                  role="button"
                  aria-label={`${candle.timestamp}，开 ${candle.open}，收 ${candle.close}，高 ${candle.high}，低 ${candle.low}`}
                  className="cursor-pointer outline-none focus-visible:stroke-bazi-primary"
                  onClick={() => onSelectCandle(index)}
                  onFocus={() => onSelectCandle(index)}
                >
                  <line
                    x1={geometry.x}
                    x2={geometry.x}
                    y1={geometry.highY}
                    y2={geometry.lowY}
                    className={colorClass}
                    strokeWidth={1.5}
                  />
                  <rect
                    x={geometry.x - Math.max(2, chart.step * 0.28)}
                    y={geometry.openY}
                    width={Math.max(4, chart.step * 0.56)}
                    height={Math.max(1.5, geometry.closeY - geometry.openY)}
                    className={`${fillClass} ${isSelected ? "stroke-bazi-primary" : "stroke-transparent"}`}
                    strokeWidth={isSelected ? 2 : 0}
                    rx={2}
                  />
                  <rect
                    x={geometry.x - chart.step / 2}
                    y={PADDING.top}
                    width={chart.step}
                    height={VIEW_HEIGHT - PADDING.top - PADDING.bottom}
                    className="fill-transparent"
                  />
                </g>
              );
            })}
          </svg>

          <div className="flex items-baseline justify-between rounded-sm border border-bazi-border bg-bazi-surface-muted px-4 py-3">
            <div>
              <p className={TEXT.kpiLabel}>
                {RESOLUTION_LABELS[resolution]} · {DIMENSION_LABELS[dimension]} · {selected.timestamp}
              </p>
              <p className={`${TEXT.kpiValueMd} text-bazi-ink`}>
                {selected.close}
                <span className={`${TEXT.label} ml-2 align-middle`}>收盘指数</span>
              </p>
            </div>
            <dl className={`${TEXT.tableCell} grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4`}>
              {(
                [
                  ["开", selected.open],
                  ["高", selected.high],
                  ["低", selected.low],
                  ["收", selected.close],
                ] as Array<[string, number]>
              ).map(([label, value]) => (
                <div key={label} className="flex items-baseline gap-1">
                  <dt className={TEXT.caption}>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex flex-wrap gap-2" aria-label="确定性因子码">
            {selected.factors.length === 0 ? (
              <p className={TEXT.caption}>该周期无命盘互动因子。</p>
            ) : (
              selected.factors.map((code) => (
                <span
                  key={code}
                  className={`${TEXT.micro} rounded-full border border-bazi-border bg-bazi-surface-muted px-3 py-1 text-bazi-ink-secondary`}
                >
                  {factorLabel(code)}
                </span>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}

function EmptyChart() {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-sm border border-bazi-border-soft bg-bazi-surface-muted p-8 text-center">
      <p className={TEXT.bodyLg}>填写出生信息，生成可复现的命轨趋势。</p>
      <p className={TEXT.caption}>生成后可切换年、月、日粒度并选择解读维度。</p>
    </div>
  );
}

function Button42({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-touch min-w-11 items-center justify-center rounded-sm border border-bazi-border bg-bazi-surface text-body text-bazi-ink-secondary transition duration-fast hover:bg-bazi-surface-muted active:scale-[0.95] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

interface ChartLayout {
  gridLines: Array<{ y: number; label: string }>;
  geometry: Array<{ x: number; openY: number; closeY: number; highY: number; lowY: number }>;
  step: number;
}

function layout(candles: Candle[]): ChartLayout {
  if (candles.length === 0) {
    return { gridLines: [], geometry: [], step: 0 };
  }
  const innerWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = VIEW_HEIGHT - PADDING.top - PADDING.bottom;
  const lows = candles.map((c) => c.low);
  const highs = candles.map((c) => c.high);
  const domainMin = Math.min(...lows);
  const domainMax = Math.max(...highs);
  const span = Math.max(4, domainMax - domainMin);
  const y = (value: number): number =>
    PADDING.top + innerHeight - ((value - (domainMin - span * 0.08)) / (span * 1.16)) * innerHeight;

  const step = innerWidth / candles.length;
  const geometry = candles.map((candle, index) => ({
    x: PADDING.left + step * (index + 0.5),
    openY: y(Math.max(candle.open, candle.close)),
    closeY: y(Math.min(candle.open, candle.close)),
    highY: y(candle.high),
    lowY: y(candle.low),
  }));

  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const value = Math.round(
      domainMin - span * 0.08 + ((span * 1.16) / gridCount) * i,
    );
    return { y: y(value), label: String(value) };
  });

  return { gridLines, geometry, step };
}
