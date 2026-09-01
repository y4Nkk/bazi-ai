"use client";

import { useMemo, useState } from "react";
import { DIMENSION_LABELS, type ChartSnapshot, type RuleHit, type TrendPeriod } from "@/domain/bazi/contract";
import { professionalDetailOf, type ProfessionalPillarFact } from "@/domain/bazi/professional";
import { TEXT } from "@/lib/typography";
import { Button } from "./controls";
import { ELEMENT_TEXT } from "./bazi-presentation";

type DetailTab = "natal" | "temporal" | "shensha" | "evidence";

const TABS: Array<{ id: DetailTab; label: string }> = [
  { id: "natal", label: "命盘总览" },
  { id: "temporal", label: "岁运细盘" },
  { id: "shensha", label: "神煞注记" },
  { id: "evidence", label: "规则依据" },
];

export function ProfessionalPanel({
  snapshot,
  selectedPeriod,
}: {
  snapshot: ChartSnapshot;
  selectedPeriod: TrendPeriod | null;
}) {
  const [tab, setTab] = useState<DetailTab>("natal");
  const detail = useMemo(
    () => selectedPeriod ? professionalDetailOf(snapshot, selectedPeriod) : null,
    [snapshot, selectedPeriod],
  );

  if (!detail) {
    return (
      <section className="rounded-lg border border-bazi-border bg-bazi-surface p-5" aria-label="专业细盘">
        <h2 className={TEXT.sectionTitle}>专业细盘</h2>
        <p className={TEXT.caption}>请先在命轨中选择一个周期，再查看对应岁运事实。</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-bazi-border bg-bazi-surface p-5" aria-label="专业细盘">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className={TEXT.sectionTitle}>专业细盘</h2>
          <p className={TEXT.caption}>
            {detail.periodLabel} · 周期终点（出生地时区）{formatProfessionalEndpoint(detail.endpointInstant, snapshot.input.timezone)}
          </p>
        </div>
        <p className={TEXT.micro}>所有内容来自当前算法快照</p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4" role="tablist" aria-label="专业细盘栏目">
        {TABS.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={tab === item.id ? "primary" : "secondary"}
            className="min-h-touch px-3"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "natal" ? (
          <div className="flex flex-col gap-5">
            <PillarGrid title="四柱细盘" pillars={detail.natalPillars} />
            <section className="flex flex-col gap-2 border-t border-bazi-border-soft pt-4">
              <h3 className={TEXT.overline}>胎元 · 胎息 · 命宫 · 身宫</h3>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {detail.auxiliaryPillars.map((pillar) => (
                  <div key={pillar.name} className="rounded-sm border border-bazi-border-soft bg-bazi-surface-muted p-3">
                    <p className={TEXT.micro}>{pillar.name}</p>
                    <p className={`${TEXT.panelTitle} font-mono tabular-nums`}>{pillar.ganzhi}</p>
                    <p className={TEXT.caption}>{pillar.nayin}</p>
                  </div>
                ))}
              </div>
            </section>
            <RelationList title="原局关系" relations={detail.natalRelations.map((edge) => ({
              id: edge.id,
              label: edge.label,
              subjects: edge.subjects,
              suffix: relationStateLabel(edge.state),
            }))} />
          </div>
        ) : null}

        {tab === "temporal" ? (
          <div className="flex flex-col gap-5">
            <PillarGrid title="所选周期末盘" pillars={detail.temporalPillars} />
            <RelationList
              title="岁运关系"
              relations={detail.periodRelations.map((hit) => ({
                id: hit.id,
                label: hit.label,
                subjects: hit.subjects,
                suffix: hit.temporalLayer,
              }))}
            />
            <p className={TEXT.caption}>
              年、月、日 K 线展示的是区间聚合；这里明确展示该区间收盘时刻对应的大运、流年、流月、流日与流时，不把整段区间伪装成一个瞬时命盘。
            </p>
          </div>
        ) : null}

        {tab === "shensha" ? (
          <div className="flex flex-col gap-4">
            <ShenshaRows title="四柱神煞" pillars={detail.natalPillars} />
            <ShenshaRows title="岁运神煞" pillars={detail.temporalPillars} />
            <p className={`${TEXT.caption} rounded-sm border border-bazi-info bg-bazi-info-soft p-3`}>
              神煞目录按冻结查表规则生成，只作传统注记；它不参与日主旺衰、格局、喜忌、领域结论或趋势指数。
            </p>
          </div>
        ) : null}

        {tab === "evidence" ? (
          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Fact label="主格" value={`${snapshot.judgment.primaryStructure} · ${structureStatus(snapshot.judgment.structureStatus)}`} />
              <Fact label="格局锚点" value={snapshot.judgment.structureAnchor} />
              <Fact label="调候所需" value={snapshot.judgment.climateNeed ?? "无"} />
            </dl>
            <EvidenceList evidence={detail.evidence} />
            <div className="rounded-sm border border-bazi-border-soft bg-bazi-surface-muted p-3">
              <p className={TEXT.label}>古籍规则边界</p>
              <p className={TEXT.caption}>
                神煞查表参考《三命通会》卷三的明确条目；ZP-1 的判断主链仍是月令、根气、透干、关系裁决、格局与喜忌。页面不复制未经校核的断语，也不把古籍人生结论自动套到个人身上。
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PillarGrid({ title, pillars }: { title: string; pillars: ProfessionalPillarFact[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className={TEXT.overline}>{title}</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map((pillar) => (
          <article key={pillar.key} className="flex flex-col gap-3 rounded-sm border border-bazi-border-soft bg-bazi-surface-muted p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={TEXT.micro}>{pillar.label}</p>
                <p className={TEXT.caption}>{pillar.stemTenGod}</p>
              </div>
              <div className="flex gap-1 font-mono text-title-md font-semibold">
                <span className={ELEMENT_TEXT[pillar.stemElement]}>{pillar.stem}</span>
                <span className={ELEMENT_TEXT[pillar.branchElement]}>{pillar.branch}</span>
              </div>
            </div>
            <dl className="flex flex-col gap-1">
              <FactRow label="藏干" value={pillar.hiddenStemFacts.map((hidden) => `${hidden.stem}${hidden.tenGod}`).join(" · ")} />
              <FactRow label="星运" value={pillar.lifeStage} />
              <FactRow label="纳音" value={pillar.nayin} />
              <FactRow label="旬空" value={pillar.voidBranches.join("")} />
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function ShenshaRows({ title, pillars }: { title: string; pillars: ProfessionalPillarFact[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className={TEXT.overline}>{title}</h3>
      <div className="divide-y divide-bazi-border-soft rounded-sm border border-bazi-border-soft bg-bazi-surface-muted">
        {pillars.map((pillar) => (
          <div key={pillar.key} className="grid grid-cols-4 gap-3 p-3">
            <div className="col-span-1">
              <p className={`${TEXT.label} font-mono`}>{pillar.ganzhi}</p>
              <p className={TEXT.micro}>{pillar.label}</p>
            </div>
            <div className="col-span-3 flex flex-wrap gap-1.5">
              {pillar.shensha.length > 0 ? pillar.shensha.map((fact) => (
                <span
                  key={`${fact.code}-${fact.target}`}
                  className="rounded-sm border border-bazi-border bg-bazi-surface px-2 py-1"
                >
                  <span className={`${TEXT.caption} block text-bazi-ink-secondary`}>{fact.label}</span>
                  <span className={`${TEXT.micro} block`}>{fact.reference} → {fact.target}</span>
                  <span className={TEXT.micro}>证据：{fact.evidence.grade}</span>
                  {fact.evidence.url ? (
                    <a className={`${TEXT.micro} block underline`} href={fact.evidence.url} target="_blank" rel="noreferrer">
                      {fact.evidence.work}·{fact.evidence.section}
                    </a>
                  ) : <span className={`${TEXT.micro} block`}>出处：待补原典定位</span>}
                </span>
              )) : <span className={TEXT.caption}>无</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RelationList({
  title,
  relations,
}: {
  title: string;
  relations: Array<{ id: string; label: string; subjects: string[]; suffix: string }>;
}) {
  return (
    <section className="flex flex-col gap-2 border-t border-bazi-border-soft pt-4">
      <h3 className={TEXT.overline}>{title}</h3>
      {relations.length > 0 ? (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {relations.map((relation) => (
            <li key={relation.id} className="rounded-sm border border-bazi-border-soft bg-bazi-surface-muted p-3">
              <div className="flex items-center justify-between gap-2">
                <span className={TEXT.label}>{relation.label}</span>
                <span className={TEXT.micro}>{relation.suffix}</span>
              </div>
              <p className={TEXT.caption}>涉及：{formatProfessionalSubjects(relation.subjects)}</p>
            </li>
          ))}
        </ul>
      ) : <p className={TEXT.caption}>当前范围没有触发可列出的干支关系。</p>}
    </section>
  );
}

function EvidenceList({ evidence }: { evidence: RuleHit[] }) {
  if (evidence.length === 0) return <p className={TEXT.caption}>当前规则无法确定。</p>;
  return (
    <section className="flex flex-col gap-2">
      <h3 className={TEXT.overline}>所选周期规则证据</h3>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {evidence.map((hit) => (
          <li key={hit.id} className="rounded-sm border border-bazi-border-soft bg-bazi-surface-muted p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={TEXT.label}>{hit.label}</span>
              <span className={`${TEXT.micro} ${polarityClass(hit.polarity)}`}>{polarityLabel(hit.polarity)} · {hit.temporalLayer}</span>
            </div>
            <p className={TEXT.caption}>涉及：{formatProfessionalSubjects(hit.subjects)}</p>
            <p className={TEXT.micro}>作用范围：{hit.domainRelevance.map((domain) => DIMENSION_LABELS[domain]).join("、") || "综合"}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-bazi-border-soft bg-bazi-surface-muted p-3">
      <dt className={TEXT.micro}>{label}</dt>
      <dd className={TEXT.bodySm}>{value}</dd>
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <dt className={TEXT.micro}>{label}</dt>
      <dd className={`${TEXT.caption} col-span-3 text-bazi-ink-secondary`}>{value}</dd>
    </div>
  );
}

const SUBJECT_LABELS: Record<string, string> = {
  year: "年柱",
  month: "月柱",
  day: "日柱",
  hour: "时柱",
  luck: "大运",
  transitYear: "流年",
  transitMonth: "流月",
  transitDay: "流日",
  transitHour: "流时",
  early: "节初",
  middle: "节中",
  late: "节后",
  main: "本气",
  residual: "余气",
  prosperous: "旺根",
  cold: "偏寒",
  balanced: "中和",
  warm: "偏暖",
  dry: "偏燥",
  wet: "偏湿",
};

export function formatProfessionalSubjects(subjects: string[]): string {
  return subjects
    .map((subject) => subject.replace(/\b(year|month|day|hour|luck|transitYear|transitMonth|transitDay|transitHour|early|middle|late|main|residual|prosperous|cold|balanced|warm|dry|wet)\b/g, (token) => SUBJECT_LABELS[token]))
    .join(" · ");
}

export function formatProfessionalEndpoint(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    dateStyle: "long",
    timeStyle: "medium",
    hourCycle: "h23",
  }).format(new Date(value));
}

function relationStateLabel(state: ChartSnapshot["relations"][number]["state"]): string {
  return { formed: "已成", blocked: "受阻", contested: "争合", untransformed: "未化", broken: "被破" }[state];
}

function structureStatus(status: ChartSnapshot["judgment"]["structureStatus"]): string {
  return { formed: "成格", impaired: "受损", candidate: "候选" }[status];
}

function polarityLabel(polarity: RuleHit["polarity"]): string {
  return { support: "扶助", pressure: "施压", context: "背景" }[polarity];
}

function polarityClass(polarity: RuleHit["polarity"]): string {
  return polarity === "support" ? "text-bazi-success" : polarity === "pressure" ? "text-bazi-danger" : "text-bazi-ink-muted";
}
