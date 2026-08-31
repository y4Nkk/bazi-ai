/** Shared control primitives; all targets are at least 44px tall. */
import type { ReactNode } from "react";
import { TEXT } from "@/lib/typography";

type ButtonVariant = "primary" | "secondary" | "ghost";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-sm font-medium transition duration-fast ease-smooth-out active:scale-[0.95] disabled:pointer-events-none disabled:opacity-50";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-bazi-primary text-bazi-primary-foreground hover:opacity-90",
  secondary:
    "bg-bazi-surface text-bazi-ink border border-bazi-border hover:bg-bazi-surface-muted",
  ghost: "bg-transparent text-bazi-link hover:bg-bazi-link-soft",
};

export function Button({
  variant = "primary",
  type = "button",
  className = "",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type={type}
      className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/** Real radio inputs styled as a segmented control. */
export function Segmented<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className={`${TEXT.label} mb-1 text-bazi-ink-secondary`}>{legend}</legend>
      <div
        className="inline-flex w-full rounded-sm border border-bazi-border bg-bazi-surface p-1"
        role="radiogroup"
        aria-label={legend}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <label
              key={option.value}
              className={`flex min-h-touch flex-1 cursor-pointer items-center justify-center rounded-sm text-body-sm font-medium transition duration-fast ease-smooth-out ${
                active
                  ? "bg-bazi-primary text-bazi-primary-foreground"
                  : "text-bazi-ink-secondary hover:bg-bazi-surface-muted"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={active}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Field({
  label,
  helper,
  htmlFor,
  children,
}: {
  label: string;
  helper?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className={`${TEXT.label} text-bazi-ink-secondary`}>
        {label}
      </label>
      {children}
      {helper ? <p className={TEXT.caption}>{helper}</p> : null}
    </div>
  );
}

export const inputClass =
  "min-h-touch w-full rounded-sm border border-bazi-input bg-bazi-surface px-3 text-body-sm text-bazi-ink placeholder:text-bazi-ink-placeholder";
