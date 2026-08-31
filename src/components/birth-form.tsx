"use client";

import { useMemo } from "react";
import { Button, Checkbox, Field, Input, Segmented, Select } from "./controls";
import { DatePicker } from "./date-picker";
import { TimePicker } from "./time-picker";
import { PlaceInput } from "./place-input";
import { TEXT } from "@/lib/typography";
import type { Place } from "@/lib/places";
import type { BirthInput } from "@/domain/bazi/normalize";
import type { ChartSnapshot } from "@/domain/bazi/contract";
import { civilDateTimeOf } from "@/domain/bazi/astronomy";

export interface BirthFormState {
  subjectName: string;
  localDate: string;
  localTime: string;
  utcOffset: string;
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
    if (correction === null) return null;
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

      <Field label="姓名（选填，仅用于称呼）" htmlFor="subject-name">
        <Input
          id="subject-name"
          autoComplete="name"
          maxLength={40}
          placeholder="如：王小明"
          value={formState.subjectName}
          onChange={(event) => onFieldChange("subjectName", event.target.value)}
        />
      </Field>

      {/* 时间口径：日期、时刻、时区、计时标准 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Field label="出生日期" htmlFor="birth-date">
          <DatePicker
            id="birth-date"
            ariaLabel="出生日期"
            value={formState.localDate || null}
            onValueChange={(value) => onFieldChange("localDate", value ?? "")}
            minDate="1900-01-01"
            maxDate="2100-12-31"
          />
        </Field>
        <Field label="出生时刻（当地钟表时间）" htmlFor="birth-time">
          <TimePicker
            id="birth-time"
            ariaLabel="出生时刻"
            value={formState.localTime || null}
            onValueChange={(value) => onFieldChange("localTime", value ?? "")}
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
        <Field label="UTC 偏移（夏令时重复时必填）" htmlFor="utc-offset">
          <Input
            id="utc-offset"
            inputMode="text"
            placeholder="如：+08:00"
            value={formState.utcOffset}
            onChange={(event) => onFieldChange("utcOffset", event.target.value)}
          />
        </Field>
      </div>
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

      {/* 出生地点：地点、经度、纬度 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field
          label="出生地（显示名称）"
          htmlFor="birthplace"
        >
          <PlaceInput
            id="birthplace"
            placeholder="北京、上海、广州"
            value={formState.birthplace}
            onChangeText={(text) => onFieldChange("birthplace", text)}
            onPlaceSelect={onPlaceSelect}
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
            placeholder="如：116.41"
            value={formState.longitude}
            onChange={(event) => onFieldChange("longitude", event.target.value)}
          />
        </Field>
        <Field label="纬度（北纬为正）" htmlFor="latitude">
          <Input
            id="latitude"
            type="number"
            required
            step={0.01}
            min={-90}
            max={90}
            placeholder="如：39.90"
            value={formState.latitude}
            onChange={(event) => onFieldChange("latitude", event.target.value)}
          />
        </Field>
      </div>

      {correctionNote ? <p className={TEXT.meta}>{correctionNote}</p> : null}

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

/** Collapsed one-line birth summary shown while a chart is on screen. */
export function BirthSummary({
  input,
  onEdit,
}: {
  input: BirthInput;
  onEdit: () => void;
}) {
  const civilDateTime = civilDateTimeOf(input.timezone, input.birthInstant);
  return (
    <section
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-bazi-border bg-bazi-surface p-4"
      aria-label="出生信息摘要"
    >
      <p
        className={`${TEXT.bodySm} flex flex-wrap items-center gap-x-2 gap-y-1 text-bazi-ink`}
      >
        {input.subjectName ? <span className="font-semibold">{input.subjectName}</span> : null}
        <span className="font-semibold">
          {input.chartGender === "male" ? "乾造" : "坤造"}
        </span>
        <span className={TEXT.meta}>{civilDateTime.replace("T", " ")}</span>
        <span className={TEXT.meta}>·</span>
        <span className={TEXT.meta}>{input.timezone}</span>
        <span className={TEXT.meta}>·</span>
        {input.birthplace ? (
          <>
            <span className={TEXT.meta}>{input.birthplace}</span>
            <span className={TEXT.meta}>·</span>
          </>
        ) : null}
        <span>{input.timeStandard === "trueSolar" ? "真太阳时" : "民用时"}</span>
      </p>
      <Button
        variant="secondary"
        className="min-h-touch px-5 sm:ml-auto"
        onClick={onEdit}
      >
        修改出生信息
      </Button>
    </section>
  );
}
