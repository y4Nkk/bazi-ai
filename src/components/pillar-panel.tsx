"use client";

import { TEXT } from "@/lib/typography";
import type { ChartSnapshot } from "@/domain/fortune/types";

const PILLAR_TITLES = ["年柱", "月柱", "日柱", "时柱"];

export function PillarPanel({ snapshot }: { snapshot: ChartSnapshot }) {
  const { natal, civilCandidate, trueSolarCandidate, selectedStandard } = snapshot;
  const elementTotal = Object.values(natal.elementCounts).reduce((a, b) => a + b, 0);

  return (
    <section
      className="flex flex-col gap-4 rounded-lg border border-bazi-border bg-bazi-surface p-5"
      aria-label="命盘"
    >
      <div>
        <h2 className={TEXT.sectionTitle}>命盘四柱</h2>
        <p className={TEXT.caption}>
          按{selectedStandard === "trueSolar" ? "真太阳时" : "民用时"}计算；日主{" "}
          {natal.dayMaster.stem}（{natal.dayMaster.element}）。
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2" role="table" aria-label="四柱明细">
        {natal.pillars.map((pillar, index) => (
          <div
            key={pillar.name}
            className="flex flex-col items-center gap-1 rounded-sm border border-bazi-border-soft bg-bazi-surface-muted px-1 py-3"
            role="cell"
          >
            <p className={TEXT.micro}>{PILLAR_TITLES[index]}</p>
            <p className="text-title-md font-semibold text-bazi-ink">
              {pillar.stem}
              <span className={TEXT.caption}>（{pillar.stemTenGod}）</span>
            </p>
            <p className="text-title-md font-semibold text-bazi-ink">
              {pillar.branch}
              <span className={TEXT.caption}>（{pillar.branchElement}）</span>
            </p>
            <p className={`${TEXT.micro} text-center`}>
              藏干 {pillar.hiddenStems.join("、")}
            </p>
          </div>
        ))}
      </div>

      <div>
        <h3 className={`${TEXT.panelTitle} mb-1`}>五行分布</h3>
        <div className="flex flex-col gap-1">
          {(Object.entries(natal.elementCounts) as Array<[string, number]>).map(
            ([element, count]) => (
              <div key={element} className="flex items-center gap-2">
                <span className={`${TEXT.tableCell} w-6 text-bazi-ink-secondary`}>{element}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-bazi-surface-muted">
                  <div
                    className="h-full rounded-full bg-bazi-primary"
                    style={{ width: `${(count / elementTotal) * 100}%` }}
                  />
                </div>
                <span className={`${TEXT.tableCell} text-bazi-ink-muted`}>{count}</span>
              </div>
            ),
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <h3 className={TEXT.panelTitle}>历法事实</h3>
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
      </div>

      <div className="grid grid-cols-1 gap-2">
        <h3 className={TEXT.panelTitle}>时间基准对照</h3>
        <div className={`${TEXT.tableCell} overflow-hidden rounded-sm border border-bazi-border`}>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-bazi-surface-muted">
                <th className={`${TEXT.tableHeader} px-3 py-2 text-left`}>基准</th>
                <th className={`${TEXT.tableHeader} px-3 py-2 text-left`}>时刻</th>
                <th className={`${TEXT.tableHeader} px-3 py-2 text-left`}>时辰</th>
                <th className={`${TEXT.tableHeader} px-3 py-2 text-left`}>四柱</th>
              </tr>
            </thead>
            <tbody>
              <tr className={selectedStandard === "civil" ? "bg-bazi-surface-tinted" : ""}>
                <td className="px-3 py-2">民用时</td>
                <td className="px-3 py-2">{civilCandidate.localDateTime.replace("T", " ")}</td>
                <td className="px-3 py-2">{civilCandidate.shichen}时</td>
                <td className="px-3 py-2">{civilCandidate.pillars.join(" ")}</td>
              </tr>
              <tr className={selectedStandard === "trueSolar" ? "bg-bazi-surface-tinted" : ""}>
                <td className="px-3 py-2">真太阳时</td>
                <td className="px-3 py-2">{trueSolarCandidate.localDateTime.replace("T", " ")}</td>
                <td className="px-3 py-2">{trueSolarCandidate.shichen}时</td>
                <td className="px-3 py-2">{trueSolarCandidate.pillars.join(" ")}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className={TEXT.caption}>
          引擎版本 {snapshot.engineVersion} · 评分配置 {snapshot.scoringProfileVersion} · 快照{" "}
          {snapshot.snapshotKey}
        </p>
      </div>
    </section>
  );
}
