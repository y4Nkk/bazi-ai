/** Shared control primitives; all targets are at least 44px tall.
 *
 * Input, Textarea, Checkbox, and Select are ported from SpiralCoder's
 * ui/ components (web/src/components/ui), re-tokenized to --bazi-* and
 * sized to the 44px touch contract. Local deviations from the source,
 * required by DESIGN.md: rounded-sm controls (not rounded-xl), a visible
 * keyboard focus ring, and min-h-touch instead of the 36-40px source rows.
 */
import type { ReactNode } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
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

/** Shared control-surface treatment (Input/Textarea/Select/DatePicker/TimePicker
 * triggers). Width is not part of the surface: each control states its own, so
 * inline triggers can pass w-auto without fighting a baked-in w-full. */
export const CONTROL_SURFACE =
  "min-w-0 rounded-sm border border-bazi-input bg-bazi-surface text-body-sm text-bazi-ink outline-none transition-[border-color] duration-fast placeholder:text-bazi-ink-placeholder focus-visible:ring-2 focus-visible:ring-bazi-primary aria-[invalid=true]:border-bazi-danger disabled:cursor-not-allowed disabled:opacity-50";

/** SpiralCoder Input (surface appearance). */
export function Input({
  type = "text",
  className = "",
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">) {
  return (
    <input
      type={type}
      {...rest}
      className={`${CONTROL_SURFACE} min-h-touch w-full px-4 ${className}`}
    />
  );
}

/** SpiralCoder Textarea (surface appearance). */
export function Textarea({
  className = "",
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={`${CONTROL_SURFACE} min-h-touch w-full resize-y px-4 py-3 ${className}`}
    />
  );
}

/** SpiralCoder Checkbox: an sr-only input drives a glass check square via
 * peer states; label hover/active travel through the group class. */
export function Checkbox({
  checked,
  onCheckedChange,
  label,
  disabled,
  className = "",
  children,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Accessible name used when no visible children are provided. */
  label: string;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <label
      className={`group inline-flex cursor-pointer touch-manipulation select-none items-center gap-2.5 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-45 ${className}`}
      data-disabled={disabled ? "true" : undefined}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={children ? undefined : label}
        onChange={(event) => onCheckedChange(event.currentTarget.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="flex size-5 flex-none items-center justify-center rounded-control border border-bazi-border-strong bg-bazi-surface text-bazi-primary-foreground shadow-control transition duration-fast ease-smooth-out group-active:scale-95 motion-reduce:transition-none peer-checked:border-bazi-primary peer-checked:bg-bazi-primary peer-checked:shadow-control-checked peer-focus-visible:ring-2 peer-focus-visible:ring-bazi-primary group-hover:border-bazi-primary/62"
      >
        <Check
          strokeWidth={3}
          aria-hidden
          className={`size-3.5 transition-[opacity,transform] duration-fast ease-spring motion-reduce:transition-none ${
            checked ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
        />
      </span>
      {children ? <span className="min-w-0">{children}</span> : null}
    </label>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

/** SpiralCoder Select (field variant) on Radix primitives: a glass popper
 * with a check indicator. Options are a flat list, matching bazi usage. */
export function Select({
  id,
  value,
  onValueChange,
  options,
  disabled,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={`${CONTROL_SURFACE} group min-h-touch w-full inline-flex justify-between gap-2 px-4 [&>span]:line-clamp-1`}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon>
          <ChevronDown
            className="size-4 opacity-50 transition-transform duration-fast ease-smooth-out group-data-[state=open]:rotate-180 motion-reduce:transition-none"
            aria-hidden
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="relative z-popup max-h-96 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-bazi-border-soft bg-bazi-surface-elevated text-bazi-ink shadow-bazi-lg backdrop-blur-xl data-[state=open]:animate-select-in"
        >
          <SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1">
            <ChevronUp className="size-4" aria-hidden />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={`${TEXT.label} relative flex min-h-touch w-full cursor-pointer select-none items-center justify-between gap-2 rounded-sm py-2 pl-4 pr-4 outline-none transition-colors duration-fast data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-bazi-surface-tinted data-[highlighted]:text-bazi-ink`}
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check className="size-4 animate-pop-in" aria-hidden />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1">
            <ChevronDown className="size-4" aria-hidden />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
