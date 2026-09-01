/**
 * The only owner of relation-graph construction and adjudication. A visible
 * combination is deliberately not reported as a successful transformation
 * until seasonal support, transform visibility, and absence of a clash agree.
 */
import { BRANCH_ELEMENTS, EARTHLY_BRANCHES, STEM_ELEMENTS, controls, generates, type EarthlyBranch, type Element, type HeavenlyStem } from "./constants";
import { CHONG, GAN_CHONG, GAN_WUHE, HAI, LIUHE, PO, SANHE, SANHUI, TRUE_TRANSFORM_MONTHS, XING, ruleDomains, ruleLabel } from "./rules";
import type { NatalChart, RelationEdge, RelationState, RuleHit } from "./contract";
import type { TemporalLayer, TransitPillars } from "./contract";

const SANHE_ELEMENT: Record<string, Element> = { 寅午戌: "火", 巳酉丑: "金", 申子辰: "水", 亥卯未: "木" };
const SANHUI_ELEMENT: Record<string, Element> = { 寅卯辰: "木", 巳午未: "火", 申酉戌: "金", 亥子丑: "水" };
const LIUHE_ELEMENT: Record<string, Element> = { 子丑: "土", 寅亥: "木", 卯戌: "火", 辰酉: "金", 巳申: "水", 午未: "火" };
const GANHE_ELEMENT: Record<string, Element> = { 甲己: "土", 乙庚: "金", 丙辛: "水", 丁壬: "木", 戊癸: "火" };

interface Subject {
  id: string;
  layer: "原局";
  stem: string;
  branch: EarthlyBranch;
}

function transformMonthsFor(stemA: string, stemB: string): readonly EarthlyBranch[] {
  const pair = Object.keys(TRUE_TRANSFORM_MONTHS).find((candidate) => candidate.includes(stemA) && candidate.includes(stemB));
  if (!pair) throw new Error(`缺少天干五合月令表项: ${stemA}${stemB}`);
  return TRUE_TRANSFORM_MONTHS[pair];
}

function mappedPair<T>(table: Record<string, T>, a: string, b: string): T {
  const value = Object.entries(table).find(([key]) => key.includes(a) && key.includes(b))?.[1];
  if (value === undefined) throw new Error(`缺少关系表项: ${a}${b}`);
  return value;
}

function hasTransformVisibility(natal: NatalChart, element: Element): boolean {
  return natal.pillars.some((pillar) => pillar.stemElement === element || pillar.hiddenStemFacts.some((hidden) => hidden.element === element));
}

function stateForTransform(args: {
  natal: NatalChart;
  members: EarthlyBranch[];
  availableBranches: EarthlyBranch[];
  seasonalBranch: EarthlyBranch;
  visibleStems?: string[];
  target: Element;
  competing: boolean;
  seasonalSupport?: boolean;
  ignoreInternalSoftBlockers?: boolean;
}): { state: RelationState; blockers: string[] } {
  const breakBlockers = args.members.flatMap((member) => {
    const opponent = CHONG[member];
    return opponent && args.availableBranches.includes(opponent) ? [`${member}冲${opponent}`] : [];
  });
  if (breakBlockers.length > 0) return { state: "broken", blockers: breakBlockers };
  const softBlockers = args.members.flatMap((member) => {
    const breaker = [PO[member], HAI[member]].find((branch) => branch
      && args.availableBranches.includes(branch)
      && (!args.ignoreInternalSoftBlockers || !args.members.includes(branch)));
    if (breaker) return [`${member}${PO[member] === breaker ? "破" : "害"}${breaker}`];
    return EARTHLY_BRANCHES
      .filter((branch) => XING.has(member + branch) && args.availableBranches.includes(branch))
      .filter((branch) => !args.ignoreInternalSoftBlockers || !args.members.includes(branch))
      .filter((branch) => branch !== member || args.availableBranches.filter((candidate) => candidate === member).length >= 2)
      .map((branch) => `${member}刑${branch}`);
  });
  if (args.competing) return { state: "contested", blockers: ["同一支同时参与合局与六合", ...softBlockers] };
  if (softBlockers.length > 0) return { state: "blocked", blockers: softBlockers };
  const seasonalSupport = args.seasonalSupport ?? BRANCH_ELEMENTS[args.seasonalBranch] === args.target;
  const visibleInTransit = args.visibleStems?.some((stem) => STEM_ELEMENTS[stem as HeavenlyStem] === args.target) ?? false;
  return seasonalSupport && (hasTransformVisibility(args.natal, args.target) || visibleInTransit)
    ? { state: "formed", blockers: [] }
    : { state: "untransformed", blockers: ["化神或月令支持不足"] };
}

function edge(args: Omit<RelationEdge, "id" | "label" | "temporalLayer">): RelationEdge {
  return {
    ...args,
    id: `${args.code}|原局|${args.subjects.join("|")}`,
    label: ruleLabel(args.code),
    temporalLayer: "原局",
  };
}

function polarityFor(state: RelationState, normal: RuleHit["polarity"]): RuleHit["polarity"] {
  return state === "blocked" || state === "broken" ? "pressure" : state === "contested" || state === "untransformed" ? "context" : normal;
}

/** A complete natal relation graph. Temporal relations reuse the same rule table in temporal.ts. */
export function natalRelationsOf(natal: NatalChart): RelationEdge[] {
  const subjects: Subject[] = natal.pillars.map((pillar) => ({ id: pillar.name, layer: "原局", stem: pillar.stem, branch: pillar.branch as EarthlyBranch }));
  const result: RelationEdge[] = [];
  const usedByCombination = new Map<EarthlyBranch, number>();
  const branches = subjects.map((subject) => subject.branch);

  for (const group of [...SANHE, ...SANHUI]) {
    if (group.every((branch) => branches.includes(branch))) {
      for (const branch of group) usedByCombination.set(branch, (usedByCombination.get(branch) ?? 0) + 1);
    }
  }

  for (let left = 0; left < subjects.length; left += 1) {
    for (let right = left + 1; right < subjects.length; right += 1) {
      const a = subjects[left];
      const b = subjects[right];
      const pairSubjects = [a.id, b.id, `${a.stem}${a.branch}`, `${b.stem}${b.branch}`];
      if (CHONG[a.branch] === b.branch) result.push(edge({ code: `ZHI_CHONG:${a.branch}${b.branch}`, state: "formed", polarity: "pressure", severity: 3, subjects: pairSubjects, transformElement: null, blockers: [] }));
      if (HAI[a.branch] === b.branch) result.push(edge({ code: `ZHI_HAI:${a.branch}${b.branch}`, state: "formed", polarity: "pressure", severity: 2, subjects: pairSubjects, transformElement: null, blockers: [] }));
      if (PO[a.branch] === b.branch) result.push(edge({ code: `ZHI_PO:${a.branch}${b.branch}`, state: "formed", polarity: "pressure", severity: 1, subjects: pairSubjects, transformElement: null, blockers: [] }));
      if (XING.has(a.branch + b.branch)) result.push(edge({ code: `ZHI_XING:${a.branch}${b.branch}`, state: "formed", polarity: "pressure", severity: 2, subjects: pairSubjects, transformElement: null, blockers: [] }));
      if (LIUHE[a.branch] === b.branch) {
        const target = mappedPair(LIUHE_ELEMENT, a.branch, b.branch);
        const resolved = stateForTransform({ natal, members: [a.branch, b.branch], availableBranches: branches, seasonalBranch: natal.pillars[1].branch as EarthlyBranch, target, competing: (usedByCombination.get(a.branch) ?? 0) > 0 || (usedByCombination.get(b.branch) ?? 0) > 0 });
        result.push(edge({ code: `ZHI_LIUHE:${a.branch}${b.branch}`, state: resolved.state, polarity: polarityFor(resolved.state, "support"), severity: 2, subjects: pairSubjects, transformElement: target, blockers: resolved.blockers }));
      }
      if (GAN_WUHE.has(a.stem + b.stem)) {
        const target = mappedPair(GANHE_ELEMENT, a.stem, b.stem);
        const resolved = stateForTransform({ natal, members: [a.branch, b.branch], availableBranches: branches, seasonalBranch: natal.pillars[1].branch as EarthlyBranch, target, competing: false, seasonalSupport: transformMonthsFor(a.stem, b.stem).includes(natal.pillars[1].branch as EarthlyBranch) });
        result.push(edge({ code: `GAN_WUHE:${a.stem}${b.stem}`, state: resolved.state, polarity: polarityFor(resolved.state, "support"), severity: 2, subjects: pairSubjects, transformElement: target, blockers: resolved.blockers }));
      }
      if (GAN_CHONG.has(a.stem + b.stem)) result.push(edge({ code: `GAN_CHONG:${a.stem}${b.stem}`, state: "formed", polarity: "pressure", severity: 2, subjects: pairSubjects, transformElement: null, blockers: [] }));
      const aElement = STEM_ELEMENTS[a.stem as HeavenlyStem];
      const bElement = STEM_ELEMENTS[b.stem as HeavenlyStem];
      if (generates(aElement, bElement) || generates(bElement, aElement)) result.push(edge({ code: `GAN_SHENG:${a.stem}${b.stem}`, state: "formed", polarity: "context", severity: 1, subjects: pairSubjects, transformElement: null, blockers: [] }));
      if (controls(aElement, bElement) || controls(bElement, aElement)) result.push(edge({ code: `GAN_KE:${a.stem}${b.stem}`, state: "formed", polarity: "pressure", severity: 1, subjects: pairSubjects, transformElement: null, blockers: [] }));
    }
  }

  for (const [group, target] of Object.entries(SANHE_ELEMENT)) {
    const members = [...group] as EarthlyBranch[];
    const present = members.filter((member) => branches.includes(member));
    if (present.length >= 2) {
      const incompleteCode = present.length === 2 && present.includes(members[0]) && present.includes(members[2]) ? "ZHI_GONGHE" : "ZHI_BANHE";
      const resolved = present.length === 3
        ? stateForTransform({ natal, members, availableBranches: branches, seasonalBranch: natal.pillars[1].branch as EarthlyBranch, target, competing: false })
        : { state: "untransformed" as const, blockers: [incompleteCode === "ZHI_GONGHE" ? "拱合待中神" : "半合待第三支"] };
      result.push(edge({ code: `${present.length === 3 ? "ZHI_SANHE" : incompleteCode}:${group}`, state: resolved.state, polarity: polarityFor(resolved.state, "support"), severity: present.length === 3 ? 3 : 1, subjects: present, transformElement: target, blockers: resolved.blockers }));
    }
  }
  for (const [group, target] of Object.entries(SANHUI_ELEMENT)) {
    const members = [...group] as EarthlyBranch[];
    if (members.every((member) => branches.includes(member))) {
      const resolved = stateForTransform({ natal, members, availableBranches: branches, seasonalBranch: natal.pillars[1].branch as EarthlyBranch, target, competing: false, ignoreInternalSoftBlockers: true });
      result.push(edge({ code: `ZHI_SANHUI:${group}`, state: resolved.state, polarity: polarityFor(resolved.state, "support"), severity: 3, subjects: members, transformElement: target, blockers: resolved.blockers }));
    }
  }
  return result;
}

function temporalLayerOf(subjects: Array<{ layer: TemporalLayer }>): TemporalLayer {
  const precedence: TemporalLayer[] = ["流时", "流日", "流月", "流年", "大运", "原局"];
  return precedence.find((layer) => subjects.some((subject) => subject.layer === layer)) ?? "原局";
}

function temporalEdge(args: Omit<RelationEdge, "id" | "label" | "temporalLayer">, layer: TemporalLayer): RelationEdge {
  return { ...edge(args), temporalLayer: layer, id: `${args.code}|${layer}|${args.subjects.join("|")}` };
}

/**
 * Re-runs the same relation catalog across the natal chart, active 大运, and
 * every current transit layer. This is deliberately separate from the natal
 * graph so a period never inherits a stale relationship result.
 */
export function temporalRelationsOf(natal: NatalChart, transit: TransitPillars): RelationEdge[] {
  const natalSubjects: Subject[] = natal.pillars.map((pillar) => ({ id: pillar.name, layer: "原局", stem: pillar.stem, branch: pillar.branch as EarthlyBranch }));
  const moving = ([
    ["大运", transit.luck], ["流年", transit.year], ["流月", transit.month], ["流日", transit.day], ["流时", transit.hour],
  ] as Array<[TemporalLayer, string | null]>).flatMap(([layer, ganzhi]) => ganzhi ? [{ id: layer, layer, stem: ganzhi[0], branch: ganzhi[1] as EarthlyBranch }] : []);
  const all = [...natalSubjects, ...moving];
  const result: RelationEdge[] = [];
  const hasMoving = (items: typeof all) => items.some((item) => item.layer !== "原局");
  const combinationLayers = new Map<EarthlyBranch, TemporalLayer>();
  for (const group of [...SANHE, ...SANHUI]) {
    if (!group.every((branch) => all.some((subject) => subject.branch === branch))) continue;
    const groupLayer = temporalLayerOf(all.filter((subject) => group.includes(subject.branch)));
    for (const branch of group) {
      const prior = combinationLayers.get(branch);
      combinationLayers.set(branch, prior ? temporalLayerOf([{ layer: prior }, { layer: groupLayer }]) : groupLayer);
    }
  }

  for (let left = 0; left < all.length; left += 1) {
    for (let right = left + 1; right < all.length; right += 1) {
      const a = all[left];
      const b = all[right];
      const pairHasMoving = hasMoving([a, b]);
      const layer = pairHasMoving ? temporalLayerOf([a, b]) : temporalLayerOf(moving);
      const subjects = [a.id, b.id, `${a.stem}${a.branch}`, `${b.stem}${b.branch}`];
      const brokenLayer = temporalLayerOf(all.filter((subject) => subject.layer !== "原局" && [a.branch, b.branch].some((member) => CHONG[member] === subject.branch)));
      const blockedLayer = temporalLayerOf(all.filter((subject) => subject.layer !== "原局" && [a.branch, b.branch].some((member) => PO[member] === subject.branch || HAI[member] === subject.branch || XING.has(member + subject.branch))));
      const combinationLayer = pairHasMoving ? layer : brokenLayer !== "原局" ? brokenLayer : blockedLayer;
      if (pairHasMoving && a.stem === b.stem && a.branch === b.branch) result.push(temporalEdge({ code: "FUYIN", state: "formed", polarity: "context", severity: 2, subjects, transformElement: null, blockers: [] }, layer));
      if (pairHasMoving && CHONG[a.branch] === b.branch && GAN_CHONG.has(a.stem + b.stem)) result.push(temporalEdge({ code: "FANYIN", state: "formed", polarity: "pressure", severity: 3, subjects, transformElement: null, blockers: [] }, layer));
      if (pairHasMoving && CHONG[a.branch] === b.branch && (controls(STEM_ELEMENTS[a.stem as HeavenlyStem], STEM_ELEMENTS[b.stem as HeavenlyStem]) || controls(STEM_ELEMENTS[b.stem as HeavenlyStem], STEM_ELEMENTS[a.stem as HeavenlyStem]))) result.push(temporalEdge({ code: "TIANKEDICHONG", state: "formed", polarity: "pressure", severity: 3, subjects, transformElement: null, blockers: [] }, layer));
      if (pairHasMoving && CHONG[a.branch] === b.branch) result.push(temporalEdge({ code: `ZHI_CHONG:${a.branch}${b.branch}`, state: "formed", polarity: "pressure", severity: 3, subjects, transformElement: null, blockers: [] }, layer));
      if (pairHasMoving && HAI[a.branch] === b.branch) result.push(temporalEdge({ code: `ZHI_HAI:${a.branch}${b.branch}`, state: "formed", polarity: "pressure", severity: 2, subjects, transformElement: null, blockers: [] }, layer));
      if (pairHasMoving && PO[a.branch] === b.branch) result.push(temporalEdge({ code: `ZHI_PO:${a.branch}${b.branch}`, state: "formed", polarity: "pressure", severity: 1, subjects, transformElement: null, blockers: [] }, layer));
      if (pairHasMoving && XING.has(a.branch + b.branch)) result.push(temporalEdge({ code: `ZHI_XING:${a.branch}${b.branch}`, state: "formed", polarity: "pressure", severity: 2, subjects, transformElement: null, blockers: [] }, layer));
      if (LIUHE[a.branch] === b.branch) {
        const target = mappedPair(LIUHE_ELEMENT, a.branch, b.branch);
        const competitionLayer = combinationLayers.get(a.branch) ?? combinationLayers.get(b.branch);
        const resolved = stateForTransform({ natal, members: [a.branch, b.branch], availableBranches: all.map((subject) => subject.branch), seasonalBranch: natal.pillars[1].branch as EarthlyBranch, visibleStems: all.map((subject) => subject.stem), target, competing: competitionLayer !== undefined });
        const effectiveLayer = resolved.state === "contested" && competitionLayer ? competitionLayer : combinationLayer;
        if (pairHasMoving || resolved.state === "blocked" || resolved.state === "contested" || resolved.state === "broken") result.push(temporalEdge({ code: `ZHI_LIUHE:${a.branch}${b.branch}`, state: resolved.state, polarity: polarityFor(resolved.state, "support"), severity: 2, subjects, transformElement: target, blockers: resolved.blockers }, effectiveLayer));
      }
      if (GAN_WUHE.has(a.stem + b.stem)) {
        const target = mappedPair(GANHE_ELEMENT, a.stem, b.stem);
        const resolved = stateForTransform({ natal, members: [a.branch, b.branch], availableBranches: all.map((subject) => subject.branch), seasonalBranch: natal.pillars[1].branch as EarthlyBranch, visibleStems: all.map((subject) => subject.stem), target, competing: false, seasonalSupport: transformMonthsFor(a.stem, b.stem).includes(natal.pillars[1].branch as EarthlyBranch) });
        if (pairHasMoving || resolved.state === "blocked" || resolved.state === "contested" || resolved.state === "broken") result.push(temporalEdge({ code: `GAN_WUHE:${a.stem}${b.stem}`, state: resolved.state, polarity: polarityFor(resolved.state, "support"), severity: 2, subjects, transformElement: target, blockers: resolved.blockers }, combinationLayer));
      }
      if (pairHasMoving && GAN_CHONG.has(a.stem + b.stem)) result.push(temporalEdge({ code: `GAN_CHONG:${a.stem}${b.stem}`, state: "formed", polarity: "pressure", severity: 2, subjects, transformElement: null, blockers: [] }, layer));
      const aElement = STEM_ELEMENTS[a.stem as HeavenlyStem];
      const bElement = STEM_ELEMENTS[b.stem as HeavenlyStem];
      if (pairHasMoving && (generates(aElement, bElement) || generates(bElement, aElement))) result.push(temporalEdge({ code: `GAN_SHENG:${a.stem}${b.stem}`, state: "formed", polarity: "context", severity: 1, subjects, transformElement: null, blockers: [] }, layer));
      if (pairHasMoving && (controls(aElement, bElement) || controls(bElement, aElement))) result.push(temporalEdge({ code: `GAN_KE:${a.stem}${b.stem}`, state: "formed", polarity: "pressure", severity: 1, subjects, transformElement: null, blockers: [] }, layer));
    }
  }
  if (transit.luck === transit.year) result.push(temporalEdge({ code: "SUIYUN_BINLIN", state: "formed", polarity: "context", severity: 3, subjects: ["大运", "流年", transit.luck], transformElement: null, blockers: [] }, "流年"));
  for (const [group, target] of Object.entries({ ...SANHE_ELEMENT, ...SANHUI_ELEMENT })) {
    const members = [...group] as EarthlyBranch[];
    const groupSubjects = all.filter((subject) => members.includes(subject.branch));
    if (groupSubjects.length < 2 || !hasMoving(groupSubjects)) continue;
    const complete = members.every((member) => groupSubjects.some((subject) => subject.branch === member));
    const present = members.filter((member) => groupSubjects.some((subject) => subject.branch === member));
    const incompleteCode = present.length === 2 && present.includes(members[0]) && present.includes(members[2]) ? "ZHI_GONGHE" : "ZHI_BANHE";
    const resolved = complete
      ? stateForTransform({ natal, members, availableBranches: all.map((subject) => subject.branch), seasonalBranch: natal.pillars[1].branch as EarthlyBranch, visibleStems: all.map((subject) => subject.stem), target, competing: false, ignoreInternalSoftBlockers: true })
      : { state: "untransformed" as const, blockers: ["合局支数不足"] };
    const prefix = complete ? (SANHE_ELEMENT[group] ? "ZHI_SANHE" : "ZHI_SANHUI") : (SANHE_ELEMENT[group] ? incompleteCode : "ZHI_SANHUI");
    result.push(temporalEdge({ code: `${prefix}:${group}`, state: resolved.state, polarity: polarityFor(resolved.state, "support"), severity: complete ? 3 : 1, subjects: groupSubjects.map((subject) => subject.id), transformElement: target, blockers: resolved.blockers }, temporalLayerOf(groupSubjects)));
  }
  return uniqueEdges(result);
}

export function ruleHitsFromRelations(edges: RelationEdge[]): RuleHit[] {
  return edges
    .filter((edge) => edge.state !== "untransformed")
    .map((edge) => ({
      id: edge.id,
      code: edge.state === "blocked" ? `RELATION_BLOCKED:${edge.code}` : edge.state === "broken" ? `RELATION_BROKEN:${edge.code}` : edge.state === "contested" ? `RELATION_CONTESTED:${edge.code}` : edge.code,
      label: edge.state === "blocked" ? "关系受阻" : edge.state === "broken" ? "关系被破" : edge.state === "contested" ? "关系争用" : edge.label,
      polarity: edge.polarity,
      direction: edge.polarity === "support" ? 1 : edge.polarity === "pressure" ? -1 : 0,
      severity: edge.severity,
      temporalLayer: edge.temporalLayer,
      domainRelevance: ruleDomains(edge.code),
      subjects: [...edge.subjects, ...edge.blockers],
    }));
}

function uniqueEdges(edges: RelationEdge[]): RelationEdge[] {
  const seen = new Set<string>();
  return edges.filter((edge) => {
    if (seen.has(edge.id)) return false;
    seen.add(edge.id);
    return true;
  });
}
