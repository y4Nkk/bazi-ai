"use client";

import { useMemo } from "react";
import { Button, Checkbox, Field, Input, Segmented, Select } from "./controls";
import { PlaceInput } from "./place-input";
import { TEXT } from "@/lib/typography";
import type { Place } from "@/lib/places";
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

/** Curated IANA zones; must stay a superset of every PLACES timezone. */
export const TIMEZONE_OPTIONS = [
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Macau",
  "Asia/Taipei",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Bangkok",
  "Asia/Ho_Chi_Minh",
  "Asia/Manila",
  "Asia/Jakarta",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Madrid",
  "Europe/Amsterdam",
  "Europe/Zurich",
  "Europe/Stockholm",
  "Africa/Cairo",
  "America/New_York",
  "America/Toronto",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Vancouver",
  "America/Sao_Paulo",
  "Pacific/Honolulu",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Pacific/Auckland",
  "UTC",
];

export function BirthForm({
  formState,
  onFieldChange,
  onPlaceSelect,
  onSubmit,
  loading,
  snapshot,
  boundaryAcknowledged,
  onBoundaryAckChange,
}: {
  formState: BirthFormState;
  onFieldChange: (field: keyof BirthFormState, value: string) => void;
  onPlaceSelect: (place: Place) => void;
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
          <Input
            id="birth-date"
            type="date"
            required
            min="1900-01-01"
            max="2100-12-31"
            value={formState.localDate}
            onChange={(event) => onFieldChange("localDate", event.target.value)}
          />
        </Field>
        <Field label="出生时刻（当地钟表时间）" htmlFor="birth-time">
          <Input
            id="birth-time"
            type="time"
            required
            step={60}
            value={formState.localTime}
            onChange={(event) => onFieldChange("localTime", event.target.value)}
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
        <Field
          label="出生地（显示名称）"
          helper="输入名称搜索，选中后自动填写经纬度与时区。"
          htmlFor="birthplace"
        >
          <PlaceInput
            id="birthplace"
            placeholder="如：南宁、上海、东京"
            value={formState.birthplace}
            onChangeText={(text) => onFieldChange("birthplace", text)}
            onPlaceSelect={onPlaceSelect}
          />
        </Field>
        <Field label="时区" htmlFor="timezone">
          <Select
            id="timezone"
            value={formState.timezone}
            onValueChange={(value) => onFieldChange("timezone", value)}
            options={TIMEZONE_OPTIONS.map((zone) => ({ value: zone, label: zone }))}
          />
        </Field>
        <Field label="经度（东经为正）" htmlFor="longitude">
          <Input
            id="longitude"
            type="number"
            required
            step={0.01}
            min={-180}
            max={180}
            placeholder="如：108.32"
            value={formState.longitude}
            onChange={(event) => onFieldChange("longitude", event.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="纬度（北纬为正）" htmlFor="latitude">
          <Input
            id="latitude"
            type="number"
            required
            step={0.01}
            min={-90}
            max={90}
            placeholder="如：22.82"
            value={formState.latitude}
            onChange={(event) => onFieldChange("latitude", event.target.value)}
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
          <Checkbox
            checked={boundaryAcknowledged}
            onCheckedChange={onBoundaryAckChange}
            label="我已了解修正跨界，按当前所选标准排盘"
            className={`${TEXT.bodySm} mt-3 min-h-touch font-medium text-bazi-ink`}
          >
            我已了解修正跨界，按当前所选标准排盘
          </Checkbox>
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
