"use client";

import { useMemo } from "react";
import { Button, Field, Segmented, inputClass } from "./controls";
import { TEXT } from "@/lib/typography";
import type { ChartSnapshot } from "@/domain/fortune/types";

export interface BirthFormState {
  localDate: string;
  localTime: string;
  chartGender: "male" | "female";
  timezone: string;
  birthplace: string;
  longitude: string;
  latitude: string;
  timeStandard: "civil" | "trueSolar";
}

const TIMEZONE_OPTIONS = [
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Taipei",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Bangkok",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
];

export function BirthForm({
  formState,
  onFieldChange,
  onSubmit,
  loading,
  snapshot,
  boundaryAcknowledged,
  onBoundaryAckChange,
}: {
  formState: BirthFormState;
  onFieldChange: (field: keyof BirthFormState, value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  snapshot: ChartSnapshot | null;
  boundaryAcknowledged: boolean;
  onBoundaryAckChange: (acknowledged: boolean) => void;
}) {
  const boundary = snapshot?.boundary ?? null;
  const correction = snapshot?.trueSolarCandidate.correctionMinutes ?? null;

  const correctionNote = useMemo(() => {
    if (correction === null) return "生成命盘后显示经度与均时差修正。";
    const sign = correction >= 0 ? "+" : "−";
    return `真太阳时修正 ${sign}${Math.abs(correction).toFixed(1)} 分钟（经度差 + 均时差），修正后 ${snapshot?.trueSolarCandidate.localDateTime.replace("T", " ") ?? ""}。`;
  }, [correction, snapshot]);

  return (
    <form
      id="birth-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-4 rounded-lg border border-bazi-border bg-bazi-surface p-5"
      aria-label="出生信息"
    >
      <h2 className={TEXT.sectionTitle}>出生信息</h2>
      <p className={TEXT.caption}>
        排盘需要完整的出生时刻与出生地经纬度。四柱手动输入不在本产品范围内。
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="出生日期" htmlFor="birth-date">
          <input
            id="birth-date"
            type="date"
            required
            min="1900-01-01"
            max="2100-12-31"
            value={formState.localDate}
            onChange={(event) => onFieldChange("localDate", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="出生时刻（当地钟表时间）" htmlFor="birth-time">
          <input
            id="birth-time"
            type="time"
            required
            step={60}
            value={formState.localTime}
            onChange={(event) => onFieldChange("localTime", event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Segmented
        name="chart-gender"
        legend="传统命盘性别（决定大运顺逆）"
        value={formState.chartGender}
        onChange={(value) => onFieldChange("chartGender", value)}
        options={[
          { value: "male", label: "男（乾造）" },
          { value: "female", label: "女（坤造）" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="出生地（显示名称）" htmlFor="birthplace">
          <input
            id="birthplace"
            type="text"
            required
            maxLength={60}
            placeholder="如：上海"
            value={formState.birthplace}
            onChange={(event) => onFieldChange("birthplace", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="时区" htmlFor="timezone">
          <select
            id="timezone"
            value={formState.timezone}
            onChange={(event) => onFieldChange("timezone", event.target.value)}
            className={inputClass}
          >
            {TIMEZONE_OPTIONS.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </Field>
        <Field label="经度（东经为正）" htmlFor="longitude">
          <input
            id="longitude"
            type="number"
            required
            step={0.01}
            min={-180}
            max={180}
            value={formState.longitude}
            onChange={(event) => onFieldChange("longitude", event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="纬度（北纬为正）" htmlFor="latitude">
          <input
            id="latitude"
            type="number"
            required
            step={0.01}
            min={-90}
            max={90}
            value={formState.latitude}
            onChange={(event) => onFieldChange("latitude", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Segmented
          name="time-standard"
          legend="计时标准（排盘依据）"
          value={formState.timeStandard}
          onChange={(value) => onFieldChange("timeStandard", value)}
          options={[
            { value: "civil", label: "民用时" },
            { value: "trueSolar", label: "真太阳时" },
          ]}
        />
      </div>

      <p className={TEXT.meta}>{correctionNote}</p>

      {boundary ? (
        <div
          className="rounded-sm border border-bazi-warning bg-bazi-warning-soft p-4"
          role="alert"
        >
          <p className={`${TEXT.bodySm} font-medium text-bazi-ink`}>
            真太阳时修正跨越了
            {boundary.changedDay ? "日界" : ""}
            {boundary.changedDay && boundary.changedShichen ? "与" : ""}
            {boundary.changedShichen ? "时辰" : ""}：
            民用时 {boundary.civilDay} {boundary.civilShichen}时 → 真太阳时{" "}
            {boundary.trueSolarDay} {boundary.trueSolarShichen}时。
          </p>
          <p className={`${TEXT.caption} mt-1`}>
            两种候选四柱不同，请确认后按所选标准继续；确认前无法请求 AI 解读。
          </p>
          <label className={`${TEXT.bodySm} mt-3 flex min-h-touch items-center gap-2`}>
            <input
              type="checkbox"
              checked={boundaryAcknowledged}
              onChange={(event) => onBoundaryAckChange(event.target.checked)}
              className="size-6 accent-bazi-primary"
            />
            我已了解修正跨界，按当前所选标准排盘
          </label>
        </div>
      ) : null}

      <Button
        type="submit"
        aria-busy={loading}
        className="min-h-touch px-6"
        disabled={loading}
      >
        {loading ? "计算中…" : "生成命盘"}
      </Button>
    </form>
  );
}
