"use client";

import { TEXT } from "@/lib/typography";
import type { ChartSnapshot } from "@/domain/bazi/contract";

export function LuckPanel({
  snapshot,
  anchorYear,
}: {
  snapshot: ChartSnapshot;
  anchorYear: number;
}) {
  const { luck } = snapshot;
  return (
    <section
      className="flex flex-col gap-3 rounded-lg border border-bazi-border bg-bazi-surface p-5"
      aria-label="大运"
    >
      <div>
        <h2 className={TEXT.sectionTitle}>大运</h2>
        <p className={TEXT.caption}>
          {luck.startDateTime.replace("T", " ")} {luck.startAgeLabel}，{luck.directionLabel}。
        </p>
      </div>
      {/* 7rem 轨道下限保证「YYYY–YYYY · NN岁」在 3 列最窄轨道（112px）仍单行。 */}
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2">
        {luck.cycles.map((cycle) => {
          const active = anchorYear >= cycle.startYear && anchorYear <= cycle.endYear;
          return (
            <li
              key={cycle.index}
              className={`flex min-h-touch flex-col items-center justify-center rounded-sm border px-2 py-2 ${
                active
                  ? "border-bazi-primary bg-bazi-surface-tinted"
                  : "border-bazi-border bg-bazi-surface-muted"
              }`}
            >
              <span className={`${TEXT.bodySm} font-semibold text-bazi-ink`}>
                {cycle.ganzhi ?? "起运前"}
              </span>
              <span className={TEXT.micro}>
                {cycle.startYear}–{cycle.endYear} · {cycle.startAge}岁
              </span>
            </li>
          );
        })}
      </ol>
      <p className={TEXT.caption}>
        大运方向由年干阴阳与传统命盘性别决定：阳年男命、阴年女命顺行，反之逆行。
      </p>
    </section>
  );
}
