"use client";

import { TEXT } from "@/lib/typography";
import { STEM_ELEMENTS } from "@/domain/bazi/constants";
import type { Element, HeavenlyStem } from "@/domain/bazi/constants";
import type { ChartSnapshot } from "@/domain/bazi/contract";
import { ELEMENT_TEXT, elementOfGanzhiChar, gradientInk } from "./bazi-presentation";
import { FiveElementRadar } from "./five-element-radar";

const PILLAR_TITLES = ["年柱", "月柱", "日柱", "时柱"];

export function PillarPanel({ snapshot }: { snapshot: ChartSnapshot }) {
  const { natal, civilCandidate, trueSolarCandidate, selectedStandard, qi, judgment } = snapshot;

  const candidates = [
    { name: "民用时", standard: "civil" as const, candidate: civilCandidate },
    { name: "真太阳时", standard: "trueSolar" as const, candidate: trueSolarCandidate },
  ];

  return (
    <section
      className="flex flex-col gap-4 rounded-lg border border-bazi-border bg-bazi-surface p-5"
      aria-label="命盘"
    >
      <div>
        <h2 className={TEXT.sectionTitle}>命盘四柱</h2>
        <p className={TEXT.caption}>
          按{selectedStandard === "trueSolar" ? "真太阳时" : "民用时"}计算；日主{" "}
          <span className={`font-medium ${ELEMENT_TEXT[natal.dayMaster.element]}`}>
            {natal.dayMaster.stem}（{natal.dayMaster.element}）
          </span>
          。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="table" aria-label="四柱明细">
        {natal.pillars.map((pillar, index) => (
          <div
            key={pillar.name}
            className="flex flex-col items-center gap-1 rounded-sm border border-bazi-border-soft bg-bazi-surface-muted px-1 py-3"
            role="cell"
          >
            <p className={TEXT.micro}>{PILLAR_TITLES[index]}</p>
            <p className="text-title-md font-semibold" style={gradientInk(pillar.stemElement)}>
              {pillar.stem}
              <span className={TEXT.caption}>（{pillar.stemTenGod}）</span>
            </p>
            <p className="text-title-md font-semibold" style={gradientInk(pillar.branchElement)}>
              {pillar.branch}
              <span className={`text-caption ${ELEMENT_TEXT[pillar.branchElement]}`}>
                （{pillar.branchElement}）
              </span>
            </p>
            <div className="flex flex-col items-center gap-0.5">
              <span className={TEXT.micro}>藏干</span>
              <span className={`${TEXT.caption} whitespace-nowrap font-medium text-bazi-ink-secondary`}>
                {pillar.hiddenStems.map((stem) => (
                  <span key={stem} className={ELEMENT_TEXT[STEM_ELEMENTS[stem as HeavenlyStem]]}>
                    {stem}{" "}
                  </span>
                ))}
              </span>
            </div>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-2 border-t border-bazi-border-soft pt-4">
        <h3 className={TEXT.overline}>五行分布</h3>
        <FiveElementRadar counts={natal.elementCounts} />
      </section>

      <section className="flex flex-col gap-2 border-t border-bazi-border-soft pt-4">
        <h3 className={TEXT.overline}>命局判断</h3>
        <dl className="grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
          <div>
            <dt className={TEXT.micro}>主格</dt>
            <dd className={TEXT.bodySm}>{judgment.primaryStructure}（{judgment.structureStatus === "formed" ? "成格" : judgment.structureStatus === "impaired" ? "受损" : "候选"}）</dd>
          </div>
          <div>
            <dt className={TEXT.micro}>日主气势</dt>
            <dd className={TEXT.bodySm}>{strengthLabel(qi.dayMasterStrength)}</dd>
          </div>
          <div>
            <dt className={TEXT.micro}>调候主取</dt>
            <dd className={`${TEXT.bodySm} flex gap-1`}>
              {judgment.climate.primaryStems.map((stem) => <span key={stem} className={ELEMENT_TEXT[STEM_ELEMENTS[stem]]}>{stem}</span>)}
            </dd>
          </div>
          <div>
            <dt className={TEXT.micro}>调候次取</dt>
            <dd className={`${TEXT.bodySm} flex gap-1`}>
              {judgment.climate.secondaryStems.length
                ? judgment.climate.secondaryStems.map((stem) => <span key={stem} className={ELEMENT_TEXT[STEM_ELEMENTS[stem]]}>{stem}</span>)
                : "无"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className={TEXT.micro}>五行取用指令</dt>
            <dd className={`${TEXT.bodySm} flex flex-wrap gap-x-2`}>
              {judgment.elementDirectives.map((directive) => <span key={directive.element} className={ELEMENT_TEXT[directive.element]}>{directive.element}（优先级{directive.rank}）</span>)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-1 border-t border-bazi-border-soft pt-4">
        <h3 className={TEXT.overline}>历法事实</h3>
        <p className={TEXT.bodySm}>
          农历{snapshot.civilCandidate.calendar.lunarYearInChinese}年{" "}
          {snapshot.civilCandidate.calendar.lunarMonthLabel}
          {snapshot.civilCandidate.calendar.lunarDayInChinese} · 生肖{" "}
          {snapshot.civilCandidate.calendar.animal}
        </p>
        <p className={TEXT.meta}>
          节气 {snapshot.civilCandidate.calendar.prevJieQi.name}（
          {snapshot.civilCandidate.calendar.prevJieQi.solar.replace("T", " ")}）→{" "}
          {snapshot.civilCandidate.calendar.nextJieQi.name}（
          {snapshot.civilCandidate.calendar.nextJieQi.solar.replace("T", " ")}）
        </p>
      </section>

      <section className="flex flex-col gap-2 border-t border-bazi-border-soft pt-4">
        <h3 className={TEXT.overline}>时间基准对照</h3>
        <div className="flex flex-col gap-1">
          {candidates.map(({ name, standard, candidate }) => {
            const selected = selectedStandard === standard;
            return (
              <div
                key={standard}
                className={`flex min-h-touch flex-wrap items-center gap-x-3 gap-y-1 rounded-sm border px-3 py-2 ${
                  selected
                    ? "border-bazi-primary bg-bazi-surface-tinted"
                    : "border-bazi-border-soft bg-bazi-surface-muted"
                }`}
              >
                <span className={`${TEXT.label} w-14 flex-none`}>{name}</span>
                <span className={`${TEXT.tableCell} tabular-nums`}>
                  {candidate.localDateTime.replace("T", " ")}
                </span>
                <span className={TEXT.tableCell}>{candidate.shichen}时</span>
                <span className={`${TEXT.tableCell} flex flex-wrap gap-x-2 font-medium`}>
                  {candidate.pillars.map((pillar) => (
                    <span key={pillar} className="whitespace-nowrap">
                      {pillar.split("").map((char) => (
                        <span key={char} className={ELEMENT_TEXT[elementOfGanzhiChar(char)]}>
                          {char}
                        </span>
                      ))}
                    </span>
                  ))}
                </span>
                {selected ? (
                  <span className={`${TEXT.micro} ml-auto text-bazi-primary`}>当前基准</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-1 border-t border-bazi-border-soft pt-4">
        <h3 className={TEXT.overline}>复现信息</h3>
        <p className={TEXT.meta}>
          算法版本 {snapshot.algorithmVersion} · 主格 {snapshot.judgment.primaryStructure}
        </p>
        <details className={TEXT.meta}>
          <summary className="cursor-pointer select-none">快照键</summary>
          <p className="mt-1 break-all font-mono">{snapshot.snapshotKey}</p>
        </details>
      </section>
    </section>
  );
}

function strengthLabel(value: ChartSnapshot["qi"]["dayMasterStrength"]): string {
  return {
    extremeStrong: "极旺",
    strong: "偏旺",
    balanced: "中和",
    weak: "偏弱",
    extremeWeak: "极弱",
  }[value];
}
