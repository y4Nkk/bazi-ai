"use client";

/** Searchable birthplace combobox; picking a place fills lon/lat/timezone. */
import { useId, useMemo, useRef, useState } from "react";
import { searchPlaces, type Place } from "@/lib/places";
import { TEXT } from "@/lib/typography";
import { Input } from "./controls";

const RESULT_LIMIT = 8;

export function PlaceInput({
  id,
  value,
  placeholder,
  onChangeText,
  onPlaceSelect,
}: {
  id: string;
  value: string;
  placeholder?: string;
  onChangeText: (text: string) => void;
  onPlaceSelect: (place: Place) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const results = useMemo(
    () => (open ? searchPlaces(value, RESULT_LIMIT) : []),
    [open, value],
  );

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const select = (place: Place) => {
    close();
    onPlaceSelect(place);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        required
        maxLength={60}
        role="combobox"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          onChangeText(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          if (!containerRef.current?.contains(event.relatedTarget as Node | null)) close();
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "ArrowDown" && results.length > 0) {
            event.preventDefault();
            setActiveIndex((index) => Math.min(index + 1, results.length - 1));
          } else if (event.key === "ArrowUp" && results.length > 0) {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, -1));
          } else if (event.key === "Enter" && open && activeIndex >= 0) {
            // Without an active option, Enter keeps native form submission.
            event.preventDefault();
            select(results[activeIndex]);
          } else if (event.key === "Escape") {
            close();
          }
        }}
      />
      {open && value.trim() !== "" ? (
        <div
          id={listId}
          role="listbox"
          aria-label="出生地候选"
          className="absolute inset-x-0 top-full z-floating mt-1 max-h-72 overflow-y-auto rounded-sm border border-bazi-border bg-bazi-surface-elevated p-1 shadow-bazi-lg backdrop-blur-sm"
        >
          {results.length > 0 ? (
            results.map((place, index) => (
              <button
                key={`${place.name}-${place.region}`}
                id={`${listId}-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => {
                  event.preventDefault();
                  select(place);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex min-h-touch w-full items-center justify-between gap-2 rounded-sm px-3 text-left text-body-sm transition duration-fast ease-smooth-out ${
                  index === activeIndex ? "bg-bazi-surface-muted text-bazi-ink" : "text-bazi-ink-secondary"
                }`}
              >
                <span className="font-medium text-bazi-ink">{place.name}</span>
                {place.region !== place.name ? <span className={TEXT.meta}>{place.region}</span> : null}
              </button>
            ))
          ) : (
            <p className={`${TEXT.caption} flex min-h-touch items-center px-3`}>
              未收录该地点，可直接手动填写经纬度。
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
