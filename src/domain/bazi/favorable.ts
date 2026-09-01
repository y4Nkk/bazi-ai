/** One precedence resolver: 《穷通宝鉴》调候 first, then explicit chart directives. */
import { ELEMENTS, type Element } from "./constants";
import { qiongTongClimateOf } from "./qiong-tong-climate";
import { qiRoleElements } from "./qi";
import { elementGeneratedBy, ruleHit } from "./rules";
import { ruleHitsFromRelations } from "./relations";
import type { ElementDirective, NatalChart, NatalJudgment, QiState, RelationEdge, RuleHit } from "./contract";
import type { StructureDecision } from "./structure";

type DirectiveSource = ElementDirective["sources"][number];

function hit(code: string, polarity: RuleHit["polarity"], severity: RuleHit["severity"], subjects: string[]): RuleHit {
  return ruleHit(code, polarity, severity, "原局", subjects);
}

function specialFavorable(primary: string, roles: ReturnType<typeof qiRoleElements>, dayElement: Element): Element[] {
  if (primary === "从强格") return [dayElement, roles.resource];
  if (primary === "从儿格") return [roles.output, roles.wealth];
  if (primary === "从财格") return [roles.wealth, roles.output];
  if (primary === "从官杀格") return [roles.authority, roles.wealth];
  return [];
}

function directiveCode(source: DirectiveSource): string {
  if (source === "climatePrimary") return "CLIMATE_PRIMARY_ELEMENT";
  if (source === "climateSecondary") return "CLIMATE_SECONDARY_ELEMENT";
  if (source === "special") return "SPECIAL_ELEMENT";
  if (source === "balance") return "BALANCE_ELEMENT";
  return "REMEDY_ELEMENT";
}

function resolveDirectives(entries: Array<{ element: Element; rank: 1 | 2 | 3; source: DirectiveSource }>): ElementDirective[] {
  const merged = new Map<Element, ElementDirective>();
  for (const entry of entries) {
    const existing = merged.get(entry.element);
    if (!existing) {
      merged.set(entry.element, { element: entry.element, rank: entry.rank, sources: [entry.source] });
      continue;
    }
    existing.rank = Math.min(existing.rank, entry.rank) as ElementDirective["rank"];
    if (!existing.sources.includes(entry.source)) existing.sources.push(entry.source);
  }
  return [...merged.values()].sort((left, right) => left.rank - right.rank || ELEMENTS.indexOf(left.element) - ELEMENTS.indexOf(right.element));
}

/** No caller may independently select a favorable element: this is the sole precedence resolver. */
export function resolveFavorable(natal: NatalChart, qi: QiState, structure: StructureDecision, relations: RelationEdge[]): NatalJudgment {
  const dayElement = natal.dayMaster.element;
  const roles = qiRoleElements(dayElement);
  const climate = qiongTongClimateOf(natal, qi);
  const balance = qi.dayMasterStrength === "weak" || qi.dayMasterStrength === "extremeWeak"
    ? [roles.resource, dayElement]
    : qi.dayMasterStrength === "strong" || qi.dayMasterStrength === "extremeStrong"
      ? [roles.output, roles.wealth, roles.authority]
      : [roles.output, roles.wealth];
  const remedy = structure.status === "impaired"
    ? [roles.resource]
    : qi.flow === "blocked" ? [elementGeneratedBy(qi.seasonalElement)] : [];
  const directives = resolveDirectives([
    ...climate.primaryElements.map((element) => ({ element, rank: 1 as const, source: "climatePrimary" as const })),
    ...climate.secondaryElements.map((element) => ({ element, rank: 2 as const, source: "climateSecondary" as const })),
    ...specialFavorable(structure.primaryStructure, roles, dayElement).map((element) => ({ element, rank: 2 as const, source: "special" as const })),
    ...balance.map((element) => ({ element, rank: 3 as const, source: "balance" as const })),
    ...remedy.map((element) => ({ element, rank: 3 as const, source: "remedy" as const })),
  ]);
  const directed = new Set(directives.map((directive) => directive.element));
  const adverseElements = ELEMENTS.filter((element) => !directed.has(element));
  const directiveEvidence = directives.flatMap((directive) => directive.sources.map((source) =>
    hit(directiveCode(source), "context", directive.rank === 1 ? 3 : directive.rank === 2 ? 2 : 1, [directive.element, source]),
  ));
  const evidence = [
    ...qi.evidence,
    ...structure.evidence,
    ...ruleHitsFromRelations(relations),
    hit("CLIMATE_RULE", "context", 3, [climate.dayMaster, climate.monthBranch, climate.clauseId, ...climate.matchedConditions]),
    ...directiveEvidence,
  ];
  return {
    primaryStructure: structure.primaryStructure,
    auxiliaryStructure: structure.auxiliaryStructure,
    structureStatus: structure.status,
    structureAnchor: structure.structureAnchor,
    climate,
    elementDirectives: directives,
    adverseElements,
    tendency: structure.status === "impaired" ? "mixed" : qi.dayMasterStrength === "balanced" ? "neutral" : "mixed",
    intensity: qi.dayMasterStrength === "extremeStrong" || qi.dayMasterStrength === "extremeWeak" ? "extreme" : qi.dayMasterStrength === "balanced" ? "moderate" : "strong",
    confidence: structure.status === "formed" && qi.evidence.filter((item) => item.code === "QI_ROOT").length >= 2 ? "high" : structure.status === "candidate" ? "low" : "medium",
    evidence,
  };
}
