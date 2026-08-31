/**
 * SpiralCoder DatePicker (single date) ported to --bazi-* tokens.
 *
 * Local deviations from the source, required by the bazi contract:
 * day and nav buttons are sized to the 44px touch contract (source uses
 * 36px), day/nav buttons get a visible keyboard focus ring, the trigger
 * uses the shared CONTROL_SURFACE treatment so it reads like an Input in
 * form rows, and the selected caption is formatted without a direct
 * date-fns dependency (locale comes from react-day-picker/locale). The
 * caption toggles to a year panel for quick year jumps instead of
 * month-by-month paging; fromDate/toDate bound both day selection and
 * month navigation. Only the single-date variant is ported; the range
 * variant has no bazi use.
 */
import { useCallback, useMemo, useState, type HTMLAttributes } from "react";
import { CalendarClock, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DayFlag, DayPicker, SelectionState, UI } from "react-day-picker";
import { zhCN } from "react-day-picker/locale";

import { Button, CONTROL_SURFACE } from "./controls";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { TEXT } from "@/lib/typography";

interface DatePickerProps {
  id?: string;
  /** ISO date (YYYY-MM-DD) or empty before a date is chosen. */
  value: string | null | undefined;
  onValueChange: (value: string | null) => void;
  ariaLabel: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** ISO date (YYYY-MM-DD); earlier dates are not selectable. */
  minDate?: string;
  /** ISO date (YYYY-MM-DD); later dates are not selectable. */
  maxDate?: string;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const NAV_BUTTON_CLASS =
  "flex size-11 items-center justify-center rounded-full text-bazi-ink-muted transition-colors duration-fast hover:bg-bazi-surface-tinted hover:text-bazi-ink focus-visible:ring-2 focus-visible:ring-bazi-primary focus-visible:outline-none disabled:opacity-30";

/* 4 cells of 44px separated by 44px gaps equal the 7x44 day grid (308px),
   so the popover keeps one width across calendar and year views. */
const YEAR_GRID_CLASS = "mt-3 grid grid-cols-4 gap-x-11 gap-y-2";

const YEAR_CELL_CLASS =
  "flex size-11 items-center justify-center rounded-full text-body-sm font-medium tabular-nums transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-bazi-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30";

const CALENDAR_CLASS_NAMES = {
  [UI.Root]: "relative select-none",
  [UI.Months]: "flex",
  [UI.Month]: "space-y-3",
  [UI.MonthCaption]: "flex min-h-touch items-center justify-center px-10",
  [UI.CaptionLabel]: "text-body-sm font-semibold text-bazi-ink",
  [UI.Nav]: "absolute inset-x-0 top-0 flex items-center justify-between",
  [UI.PreviousMonthButton]: NAV_BUTTON_CLASS,
  [UI.NextMonthButton]: NAV_BUTTON_CLASS,
  [UI.Chevron]: "size-4 fill-current",
  [UI.MonthGrid]: "w-full border-collapse",
  [UI.Weekdays]: "border-b border-bazi-border-soft",
  [UI.Weekday]: "h-8 w-11 text-center text-micro font-semibold text-bazi-ink-muted",
  [UI.Day]: "p-0 text-center",
  [UI.DayButton]:
    "relative size-11 rounded-full text-body-sm font-medium text-bazi-ink transition-colors duration-fast hover:bg-bazi-surface-tinted focus-visible:ring-2 focus-visible:ring-bazi-primary focus-visible:outline-none",
  [DayFlag.today]:
    "[&>button]:bg-bazi-primary/10 [&>button]:font-semibold [&>button]:text-bazi-primary",
  [DayFlag.outside]: "[&>button]:text-bazi-ink-muted/40",
  [DayFlag.disabled]: "[&>button]:cursor-not-allowed [&>button]:opacity-30",
  [SelectionState.selected]:
    "[&>button]:!bg-bazi-primary [&>button]:!text-bazi-primary-foreground [&>button]:hover:!bg-bazi-primary/90",
} as const;

function parseIsoDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) throw new Error(`DatePicker value must use YYYY-MM-DD: ${value}`);
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const valid =
    date.getFullYear() === Number(match[1]) &&
    date.getMonth() === Number(match[2]) - 1 &&
    date.getDate() === Number(match[3]);
  if (!valid) throw new Error(`DatePicker value is not a valid date: ${value}`);
  return date;
}

function toIsoDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** First of the month, pulled into the selectable min/max month range. */
function clampMonth(date: Date, minDate?: Date, maxDate?: Date): Date {
  const month = new Date(date.getFullYear(), date.getMonth(), 1);
  if (maxDate && month > new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)) {
    return new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
  }
  if (minDate && month < new Date(minDate.getFullYear(), minDate.getMonth(), 1)) {
    return new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  }
  return month;
}

/** 12 years per page with the same caption/nav frame as the month grid. */
function YearPanel({
  month,
  minDate,
  maxDate,
  onSelectYear,
}: {
  month: Date;
  minDate?: Date;
  maxDate?: Date;
  onSelectYear: (year: number) => void;
}) {
  const [startYear, setStartYear] = useState(() => Math.floor(month.getFullYear() / 12) * 12);
  const displayedYear = month.getFullYear();
  const thisYear = new Date().getFullYear();
  const minYear = minDate?.getFullYear();
  const maxYear = maxDate?.getFullYear();
  const years = Array.from({ length: 12 }, (_, index) => startYear + index);

  return (
    <div className="relative select-none">
      <div className="flex min-h-touch items-center justify-center px-10">
        <span className="text-body-sm font-semibold tabular-nums text-bazi-ink">
          {startYear}–{startYear + 11}
        </span>
      </div>
      <div className="absolute inset-x-0 top-0 flex items-center justify-between">
        <button
          type="button"
          aria-label="上一组年份"
          className={NAV_BUTTON_CLASS}
          onClick={() => setStartYear(startYear - 12)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="下一组年份"
          className={NAV_BUTTON_CLASS}
          onClick={() => setStartYear(startYear + 12)}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className={YEAR_GRID_CLASS}>
        {years.map((year) => {
          const outOfRange =
            (minYear !== undefined && year < minYear) || (maxYear !== undefined && year > maxYear);
          const stateClass =
            year === displayedYear
              ? "bg-bazi-primary font-semibold text-bazi-primary-foreground hover:bg-bazi-primary/90"
              : year === thisYear
                ? "bg-bazi-primary/10 font-semibold text-bazi-primary"
                : "text-bazi-ink hover:bg-bazi-surface-tinted";
          return (
            <button
              key={year}
              type="button"
              disabled={outOfRange}
              onClick={() => onSelectYear(year)}
              className={`${YEAR_CELL_CLASS} ${stateClass}`}
            >
              {year}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DatePickerCalendar({
  selected,
  onSelect,
  onClear,
  minDate,
  maxDate,
}: {
  selected: Date | undefined;
  onSelect: (date: Date) => void;
  onClear: () => void;
  minDate?: Date;
  maxDate?: Date;
}) {
  const [month, setMonth] = useState(() => clampMonth(selected ?? new Date(), minDate, maxDate));
  const [yearView, setYearView] = useState(false);
  const openYearView = useCallback(() => setYearView(true), []);
  // Stable identity: the caption button must not remount (and lose focus)
  // while the month nav re-renders the calendar.
  const components = useMemo(
    () => ({
      CaptionLabel: function CaptionLabel(props: HTMLAttributes<HTMLSpanElement>) {
        return (
          <button
            type="button"
            {...props}
            onClick={openYearView}
            className="flex min-h-touch items-center gap-1 rounded-full px-3 text-body-sm font-semibold text-bazi-ink transition-colors duration-fast hover:bg-bazi-surface-tinted focus-visible:ring-2 focus-visible:ring-bazi-primary focus-visible:outline-none"
          >
            {props.children}
            <ChevronDown className="size-3.5 text-bazi-ink-muted" aria-hidden="true" />
          </button>
        );
      },
    }),
    [openYearView],
  );

  return (
    <>
      {yearView ? (
        <YearPanel
          month={month}
          minDate={minDate}
          maxDate={maxDate}
          onSelectYear={(year) => {
            setMonth(clampMonth(new Date(year, month.getMonth(), 1), minDate, maxDate));
            setYearView(false);
          }}
        />
      ) : (
        <DayPicker
          mode="single"
          required
          locale={zhCN}
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          showOutsideDays
          fixedWeeks
          classNames={CALENDAR_CLASS_NAMES}
          fromDate={minDate}
          toDate={maxDate}
          onSelect={onSelect}
          components={components}
        />
      )}
      <div className="mt-3 flex items-center justify-between border-t border-bazi-border-soft pt-3">
        <Button
          type="button"
          variant="ghost"
          className="min-h-touch px-4"
          onClick={() => onSelect(new Date())}
        >
          今天
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-touch px-4"
          disabled={!selected}
          onClick={onClear}
        >
          清除
        </Button>
      </div>
    </>
  );
}

export function DatePicker({
  id,
  value,
  onValueChange,
  ariaLabel,
  disabled = false,
  placeholder = "选择日期",
  className,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseIsoDate(value);
  const commit = (date: Date) => {
    onValueChange(toIsoDate(date));
    setOpen(false);
  };
  const clear = () => {
    onValueChange(null);
    setOpen(false);
  };
  const selectedText = selected
    ? `${selected.getFullYear()}年${selected.getMonth() + 1}月${selected.getDate()}日`
    : placeholder;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          className={`${CONTROL_SURFACE} ${TEXT.label} flex min-h-touch items-center gap-2 px-4 text-left font-normal ${
            selected ? "text-bazi-ink" : "text-bazi-ink-placeholder"
          } ${className ?? ""}`}
        >
          <CalendarClock className="size-4 flex-none text-bazi-ink-muted" aria-hidden="true" />
          <span className="truncate">{selectedText}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <DatePickerCalendar
          selected={selected}
          onSelect={commit}
          onClear={clear}
          minDate={minDate ? parseIsoDate(minDate) : undefined}
          maxDate={maxDate ? parseIsoDate(maxDate) : undefined}
        />
      </PopoverContent>
    </Popover>
  );
}

export type { DatePickerProps };
