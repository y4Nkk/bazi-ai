/** Domain-owned facts for the professional-detail renderer. */
import { BRANCH_ELEMENTS, STEM_ELEMENTS, type EarthlyBranch, type Element, type HeavenlyStem } from "./constants";
import type { ChartSnapshot, HiddenStemFact, RuleHit, ShenshaFact, TrendPeriod } from "./contract";
import { HIDDEN_STEM_WEIGHTS, hiddenStemRank, lifeStageOf, nayinOf, tenGodOf, voidBranchesOf } from "./rules";
import { shenshaForGanzhi, type ShenshaContext } from "./shensha";

export type ProfessionalPillarKey = "year" | "month" | "day" | "hour" | "luck" | "transitYear" | "transitMonth" | "transitDay" | "transitHour";

export interface ProfessionalPillarFact {
  key: ProfessionalPillarKey;
  label: string;
  ganzhi: string;
  stem: string;
  branch: string;
  stemElement: Element;
  branchElement: Element;
  stemTenGod: string;
  hiddenStemFacts: HiddenStemFact[];
  lifeStage: string;
  nayin: string;
  voidBranches: string[];
  shensha: ShenshaFact[];
}
export interface ProfessionalDetail {
  periodId: string;
  periodLabel: string;
  endpointInstant: string;
  natalPillars: ProfessionalPillarFact[];
  temporalPillars: ProfessionalPillarFact[];
  auxiliaryPillars: ChartSnapshot["natal"]["auxiliaryPillars"];
  natalRelations: ChartSnapshot["relations"];
  periodRelations: RuleHit[];
  evidence: RuleHit[];
}

export function professionalDetailOf(snapshot: ChartSnapshot, period: TrendPeriod): ProfessionalDetail {
  const context = contextOf(snapshot);
  const natalPillars = snapshot.natal.pillars.map((pillar) => ({
    key: pillar.name,
    label: { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" }[pillar.name],
    ganzhi: pillar.ganzhi,
    stem: pillar.stem,
    branch: pillar.branch,
    stemElement: pillar.stemElement,
    branchElement: pillar.branchElement,
    stemTenGod: pillar.stemTenGod,
    hiddenStemFacts: pillar.hiddenStemFacts,
    lifeStage: pillar.lifeStage,
    nayin: pillar.nayin,
    voidBranches: voidBranchesOf(pillar.ganzhi),
    shensha: pillar.shensha,
  }));
  const moving = [
    ...(period.transit.luck ? [["luck", "大运", period.transit.luck] as const] : []),
    ["transitYear", "流年", period.transit.year] as const,
    ["transitMonth", "流月", period.transit.month] as const,
    ["transitDay", "流日", period.transit.day] as const,
    ["transitHour", "流时", period.transit.hour] as const,
  ];
  const endpointInstant = period.kind === "point" ? period.instant : period.closeInstant;
  return {
    periodId: period.id,
    periodLabel: period.timestamp,
    endpointInstant,
    natalPillars,
    temporalPillars: moving.map(([key, label, ganzhi]) => pillarFact(key, label, ganzhi, snapshot.natal.dayMaster.stem, context)),
    auxiliaryPillars: snapshot.natal.auxiliaryPillars,
    natalRelations: snapshot.relations,
    periodRelations: period.reasons.filter((hit) => /^(GAN_|ZHI_|FUYIN|FANYIN|TIANKEDICHONG|SUIYUN_BINLIN)/.test(hit.code)),
    evidence: period.reasons,
  };
}

function contextOf(snapshot: ChartSnapshot): ShenshaContext {
  return {
    dayStem: snapshot.natal.dayMaster.stem as HeavenlyStem,
    dayBranch: snapshot.natal.pillars[2].branch as EarthlyBranch,
    monthBranch: snapshot.natal.pillars[1].branch as EarthlyBranch,
    yearBranch: snapshot.natal.pillars[0].branch as EarthlyBranch,
    voidBranches: snapshot.natal.voidBranches as EarthlyBranch[],
  };
}

function pillarFact(
  key: ProfessionalPillarKey,
  label: string,
  ganzhi: string,
  dayMaster: string,
  context: ShenshaContext,
): ProfessionalPillarFact {
  const stem = ganzhi[0] as HeavenlyStem;
  const branch = ganzhi[1] as EarthlyBranch;
  const hiddenStemFacts = HIDDEN_STEM_WEIGHTS[branch].map(([hiddenStem, qiWeight], index) => ({
    stem: hiddenStem,
    element: STEM_ELEMENTS[hiddenStem],
    tenGod: tenGodOf(dayMaster, hiddenStem),
    rank: hiddenStemRank(index),
    qiWeight,
  }));
  return {
    key,
    label,
    ganzhi,
    stem,
    branch,
    stemElement: STEM_ELEMENTS[stem],
    branchElement: BRANCH_ELEMENTS[branch],
    stemTenGod: tenGodOf(dayMaster, stem),
    hiddenStemFacts,
    lifeStage: lifeStageOf(dayMaster, branch),
    nayin: nayinOf(ganzhi),
    voidBranches: voidBranchesOf(ganzhi),
    shensha: shenshaForGanzhi(context, ganzhi),
  };
}
