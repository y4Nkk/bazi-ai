"use client";

import type { ReactNode } from "react";
import { BrandMark } from "./brand-mark";

/**
 * App shell: translucent header with one primary action (passed in as
 * headerAction — the birth form submit or the edit toggle, depending on
 * the workbench state) and a slow liquid-light field entering from the
 * page edges. The field sits behind all content (z-background) and
 * animates transform and opacity only; prefers-reduced-motion collapses
 * it to a static frame.
 */
export function AppShell({
  children,
  headerAction,
}: {
  children: ReactNode;
  headerAction?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-background overflow-hidden">
        <div
          className="absolute -left-32 -top-32 size-96 rounded-full blur-xl"
          style={{
            background: "var(--bazi-glow-primary)",
            animation: "bazi-drift-a var(--bazi-motion-ambient) var(--bazi-ease-standard) infinite alternate",
          }}
        />
        <div
          className="absolute -bottom-40 -right-24 size-96 rounded-full blur-xl"
          style={{
            background: "var(--bazi-glow-cool)",
            animation: "bazi-drift-b var(--bazi-motion-ambient) var(--bazi-ease-standard) infinite alternate",
          }}
        />
        <div
          className="absolute -bottom-24 left-1/3 size-80 rounded-full blur-xl"
          style={{
            background: "var(--bazi-glow-warm)",
            opacity: 0.5,
            animation: "bazi-drift-a var(--bazi-motion-ambient) var(--bazi-ease-standard) infinite alternate-reverse",
          }}
        />
      </div>

      <header className="sticky top-0 z-sticky border-b border-bazi-border bg-bazi-surface-glass backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-3 sm:px-6">
          <p className="flex items-center gap-2 text-title-sm font-semibold tracking-tight text-bazi-ink">
            <BrandMark className="size-8 text-bazi-primary" />
            命轨
          </p>
          {headerAction ? <div className="ml-auto">{headerAction}</div> : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6">{children}</main>

      <footer className="border-t border-bazi-border bg-bazi-surface-glass px-4 py-4 text-center sm:px-6">
        <p className="text-caption text-bazi-ink-muted">
          传统命理趋势指数为文化娱乐内容，不构成医疗、法律、投资建议。排盘结果由确定性引擎计算，可复现。
        </p>
      </footer>
    </div>
  );
}
