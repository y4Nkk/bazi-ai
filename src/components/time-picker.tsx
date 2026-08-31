/**
 * TimePicker: the time counterpart of date-picker.tsx. It shares the
 * DatePicker trigger treatment (CONTROL_SURFACE + icon in the raised-glass
 * popover) so date and time read as one control family in form rows.
 *
 * Local deviations required by the bazi contract: hour and minute options
 * are 44px rows with a visible keyboard focus ring, and both columns
 * commit live — the value updates behind the popover, closing is explicit
 * (完成 / 此刻 / 清除 or outside click). Emits "HH:mm" or null, so empty
 * times stay catchable by explicit submit validation.
 */
import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

import { Button, CONTROL_SURFACE } from "./controls";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { TEXT } from "@/lib/typography";

interface TimePickerProps {
  id?: string;
  /** Local clock time (HH:mm) or empty before a time is chosen. */
  value: string | null | undefined;
  onValueChange: (value: string | null) => void;
  ariaLabel: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTES = Array.from({ length: 60 }, (_, minute) => minute);

const COLUMN_LIST_CLASS =
  "max-h-64 w-16 flex-1 overflow-y-auto py-1";
const OPTION_CLASS =
  "flex h-11 w-full items-center justify-center rounded-full text-body-sm font-medium tabular-nums text-bazi-ink transition-colors duration-fast hover:bg-bazi-surface-tinted focus-visible:ring-2 focus-visible:ring-bazi-primary focus-visible:outline-none";

function parseTime(value: string | null | undefined): { hour: number; minute: number } | undefined {
  if (!value) return undefined;
  const match = TIME_PATTERN.exec(value);
  if (!match) throw new Error(`TimePicker value must use HH:mm: ${value}`);
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function toTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function TimeColumn({
  part,
  options,
  selected,
  onSelect,
}: {
  part: "hour" | "minute";
  options: number[];
  selected: number;
  onSelect: (value: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // Center the selected row on open without scrollIntoView, which would
  // also scroll every ancestor (the page behind the popover).
  useEffect(() => {
    const list = listRef.current;
    const selectedRow = list?.querySelector<HTMLElement>('[data-selected="true"]');
    if (list && selectedRow) {
      list.scrollTop =
        selectedRow.offsetTop - list.clientHeight / 2 + selectedRow.offsetHeight / 2;
    }
  }, []);

  return (
    <div role="group" aria-label={part === "hour" ? "小时" : "分钟"} className="flex flex-col gap-2">
      <p
        aria-hidden="true"
        className="border-b border-bazi-border-soft pb-2 text-center text-caption font-semibold text-bazi-ink-muted"
      >
        {part === "hour" ? "时" : "分"}
      </p>
      <div ref={listRef} className={COLUMN_LIST_CLASS}>
        {options.map((option) => {
          const isSelected = option === selected;
          return (
            <button
              key={option}
              type="button"
              data-selected={isSelected ? "true" : undefined}
              aria-pressed={isSelected}
              className={`${OPTION_CLASS} ${
                isSelected
                  ? "bg-bazi-primary font-semibold text-bazi-primary-foreground hover:bg-bazi-primary/90"
                  : ""
              }`}
              onClick={() => onSelect(option)}
            >
              {String(option).padStart(2, "0")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TimePicker({
  id,
  value,
  onValueChange,
  ariaLabel,
  disabled = false,
  placeholder = "选择时间",
  className,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = parseTime(value);
  // The unset column defaults to 00 so the first hour or minute click can
  // commit a complete HH:mm value.
  const hour = parsed?.hour ?? 0;
  const minute = parsed?.minute ?? 0;

  const commit = (nextHour: number, nextMinute: number) => {
    onValueChange(toTime(nextHour, nextMinute));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          className={`${CONTROL_SURFACE} ${TEXT.label} flex min-h-touch items-center gap-2 px-4 text-left font-normal ${
            parsed ? "text-bazi-ink" : "text-bazi-ink-placeholder"
          } ${className ?? ""}`}
        >
          <Clock className="size-4 flex-none text-bazi-ink-muted" aria-hidden="true" />
          <span className="truncate">{parsed ? toTime(hour, minute) : placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <div className="flex gap-3">
          <TimeColumn
            part="hour"
            options={HOURS}
            selected={hour}
            onSelect={(nextHour) => commit(nextHour, minute)}
          />
          <TimeColumn
            part="minute"
            options={MINUTES}
            selected={minute}
            onSelect={(nextMinute) => commit(hour, nextMinute)}
          />
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-bazi-border-soft pt-3">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              className="min-h-touch px-4"
              onClick={() => {
                const now = new Date();
                commit(now.getHours(), now.getMinutes());
              }}
            >
              此刻
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-touch px-4"
              disabled={!parsed}
              onClick={() => onValueChange(null)}
            >
              清除
            </Button>
          </div>
          <Button type="button" className="min-h-touch px-5" onClick={() => setOpen(false)}>
            完成
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type { TimePickerProps };
