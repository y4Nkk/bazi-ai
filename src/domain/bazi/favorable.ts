/** Unified structure → climate → balance → remedy favorable-element resolver. */
import { type Element } from "./constants";
import { qiRoleElements } from "./qi";
import { elementGeneratedBy, ruleHit } from "./rules";
import { ruleHitsFromRelations } from "./relations";
import type { NatalChart, NatalJudgment, QiState, RelationEdge, RuleHit } from "./contract";
import type { StructureDecision } from "./structure";

function climateNeedFor(qi: QiState): Element | null {
  if (qi.climate.temperature === "cold") return "火";
  if (qi.climate.temperature === "warm") return "水";
  if (qi.climate.moisture === "dry") return "水";
  if (qi.climate.moisture === "wet") return "火";
  return null;
}

function unique(elements: Element[]): Element[] {
  return [...new Set(elements)];
}

function hit(code: string, polarity: RuleHit["polarity"], severity: RuleHit["severity"], subjects: string[]): RuleHit {
  return ruleHit(code, polarity, severity, "原局", subjects);
}

function specialFavorable(primary: string, roles: ReturnType<typeof qiRoleElements>, dayElement: Element): Element[] | null {
  if (primary === "从强格") return [dayElement, roles.resource];
  if (primary === "从儿格") return [roles.output, roles.wealth];
  if (primary === "从财格") return [roles.wealth, roles.output];
  if (primary === "从官杀格") return [roles.authority, roles.wealth];
  return primary === "化气格" ? null : null;
}

/** No caller may independently select 用神: this is the sole precedence resolver. */
export function resolveFavorable(natal: NatalChart, qi: QiState, structure: StructureDecision, relations: RelationEdge[]): NatalJudgment {
  const dayElement = natal.dayMaster.element;
  const roles = qiRoleElements(dayElement);
  const climateNeed = climateNeedFor(qi);
  const special = specialFavorable(structure.primaryStructure, roles, dayElement);
  const balanceNeed = qi.dayMasterStrength === "weak" || qi.dayMasterStrength === "extremeWeak"
    ? [roles.resource, dayElement]
    : qi.dayMasterStrength === "strong" || qi.dayMasterStrength === "extremeStrong"
      ? [roles.output, roles.wealth, roles.authority]
      : [roles.output, roles.wealth];
  const remedyElement = structure.status === "impaired"
    ? roles.resource
    : qi.flow === "blocked" ? elementGeneratedBy(qi.seasonalElement) : null;
  const favorableElements = unique([
    ...(special ?? []),
    ...(climateNeed ? [climateNeed] : []),
    ...balanceNeed,
    ...(remedyElement ? [remedyElement] : []),
  ]);
  const adverseElements = unique((["木", "火", "土", "金", "水"] as Element[])
    .filter((element) => !favorableElements.includes(element)));
  const evidence = [
    ...qi.evidence,
    ...structure.evidence,
    ...ruleHitsFromRelations(relations),
    ...(climateNeed ? [hit("CLIMATE", "context", 2, [climateNeed])] : []),
    ...(remedyElement ? [hit("REMEDY", "context", 2, [remedyElement])] : []),
  ];
  return {
    primaryStructure: structure.primaryStructure,
    auxiliaryStructure: structure.auxiliaryStructure,
    structureStatus: structure.status,
    structureAnchor: structure.structureAnchor,
    climateNeed,
    balanceNeed: unique(balanceNeed),
    remedyElement,
    favorableElements,
    adverseElements,
    tendency: structure.status === "impaired" ? "mixed" : qi.dayMasterStrength === "balanced" ? "neutral" : "mixed",
    intensity: qi.dayMasterStrength === "extremeStrong" || qi.dayMasterStrength === "extremeWeak" ? "extreme" : qi.dayMasterStrength === "balanced" ? "moderate" : "strong",
    confidence: structure.status === "formed" && qi.evidence.filter((item) => item.code === "QI_ROOT").length >= 2 ? "high" : structure.status === "candidate" ? "low" : "medium",
    evidence,
  };
}
