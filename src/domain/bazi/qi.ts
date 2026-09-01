/** Five-element qi ledger: season, roots, exposure, and flow. */
import { BRANCH_ELEMENTS, ELEMENTS, generates, type Element } from "./constants";
import { QI_RULES, elementControlledBy, elementGeneratedBy, ruleHit } from "./rules";
import type { NatalChart, QiState, RelationEdge, RuleHit } from "./contract";

function roleElements(dayElement: Element): { resource: Element; output: Element; wealth: Element; authority: Element } {
  const resource = ELEMENTS.find((element) => generates(element, dayElement)) as Element;
  const output = elementGeneratedBy(dayElement);
  const wealth = elementControlledBy(dayElement);
  const authority = ELEMENTS.find((element) => ![dayElement, resource, output, wealth].includes(element)) as Element;
  return { resource, output, wealth, authority };
}

function natalHit(code: string, polarity: RuleHit["polarity"], severity: RuleHit["severity"], subjects: string[]): RuleHit {
  return ruleHit(code, polarity, severity, "原局", subjects);
}

function flowFor(values: Record<Element, number>): QiState["flow"] {
  const present = ELEMENTS.map((element) => values[element] > 0);
  const count = present.filter(Boolean).length;
  if (count <= 2) return "blocked";
  return count === ELEMENTS.length ? "continuous" : "partial";
}

function seasonStage(progressPermille: number): keyof typeof QI_RULES.monthCommand {
  return progressPermille < 334 ? "early" : progressPermille < 667 ? "middle" : "late";
}

/** A true 从格 cannot retain an external 比劫 or 印星 support channel. */
function hasExternalSupport(natal: NatalChart, dayElement: Element, resource: Element): boolean {
  return natal.pillars.some((pillar) => pillar.name !== "day" && (
    pillar.stemElement === dayElement ||
    pillar.stemElement === resource ||
    pillar.hiddenStemFacts.some((hidden) => hidden.element === dayElement || hidden.element === resource)
  ));
}

/** Closed, integer-only ledger used by all later structure and favorable rules. */
export function assessQi(natal: NatalChart, relations: RelationEdge[] = []): QiState {
  const values = Object.fromEntries(ELEMENTS.map((element) => [element, 0])) as Record<Element, number>;
  const dayElement = natal.dayMaster.element;
  const seasonalElement = BRANCH_ELEMENTS[natal.pillars[1].branch as keyof typeof BRANCH_ELEMENTS];
  const roles = roleElements(dayElement);
  const seasonalStage = seasonStage(natal.seasonalProgressPermille);
  const evidence: RuleHit[] = [natalHit("QI_MONTH_COMMAND", "context", 3, [natal.monthCommand.stem, seasonalElement, seasonalStage])];

  for (const pillar of natal.pillars) {
    values[pillar.stemElement] += QI_RULES.exposedStem[pillar.name];
    if (pillar.name !== "day") {
      evidence.push(natalHit("QI_EXPOSED", pillar.stemElement === dayElement || pillar.stemElement === roles.resource ? "support" : "context", 1, [pillar.name, pillar.stem, pillar.stemTenGod]));
    }
    for (const hidden of pillar.hiddenStemFacts) {
      values[hidden.element] += hidden.qiWeight;
    }
  }
  values[seasonalElement] += QI_RULES.monthCommand[seasonalStage];
  for (const root of natal.roots) {
    const weight = QI_RULES.root[root.grade];
    values[dayElement] += weight;
    evidence.push(natalHit("QI_ROOT", "support", weight >= 6 ? 3 : weight >= 3 ? 2 : 1, [root.pillar, root.stem, root.grade]));
  }
  if (natal.roots.length === 0) evidence.push(natalHit("QI_NO_ROOT", "pressure", 3, [dayElement]));
  for (const root of natal.roots) {
    for (const relation of relations.filter((edge) => edge.subjects.includes(root.pillar) && (edge.state === "blocked" || edge.state === "broken" || edge.state === "contested"))) {
      const penalty = relation.state === "broken"
        ? QI_RULES.rootDisruption.broken
        : relation.state === "blocked" ? QI_RULES.rootDisruption.blocked : QI_RULES.rootDisruption.contested;
      values[dayElement] = Math.max(0, values[dayElement] - penalty);
      evidence.push(natalHit("QI_ROOT_DISRUPTED", "pressure", relation.state === "broken" ? 3 : relation.state === "blocked" ? 2 : 1, [root.pillar, root.stem, relation.code, relation.state]));
    }
  }

  const support = values[dayElement] + values[roles.resource];
  const pressure = values[roles.output] + values[roles.wealth] + values[roles.authority];
  const difference = support - pressure;
  const roots = natal.roots.length;
  const dayMasterStrength: QiState["dayMasterStrength"] = roots === 0 && difference <= -QI_RULES.strength.extreme
    ? "extremeWeak"
    : difference <= QI_RULES.strength.weak ? "weak"
      : difference >= QI_RULES.strength.extreme ? "extremeStrong"
        : difference >= QI_RULES.strength.strong ? "strong"
          : "balanced";
  const dominant = ELEMENTS.reduce((best, element) => values[element] > values[best] ? element : best, ELEMENTS[0]);
  const total = ELEMENTS.reduce((sum, element) => sum + values[element], 0);
  const isDominant = total > 0 && values[dominant] * 1000 >= total * QI_RULES.specialDominancePermille;
  const weakFollowCandidate: QiState["followCandidate"] = isDominant && roots === 0 && dayMasterStrength === "extremeWeak"
    ? dominant === roles.output ? "followOutput" : dominant === roles.wealth ? "followWealth" : dominant === roles.authority ? "followAuthority" : "none"
    : "none";
  const followCandidate: QiState["followCandidate"] = weakFollowCandidate !== "none" && hasExternalSupport(natal, dayElement, roles.resource)
    ? "none"
    : weakFollowCandidate !== "none"
      ? weakFollowCandidate
      : isDominant && dayMasterStrength === "extremeStrong" && dominant === dayElement ? "followStrong"
        : "none";
  if (weakFollowCandidate !== "none" && followCandidate === "none") {
    evidence.push(natalHit("QI_FOLLOW_BLOCKED", "context", 2, ["外柱见比劫或印星"]));
  }
  const flow = flowFor(values);
  evidence.push(natalHit("QI_FLOW", flow === "continuous" ? "support" : flow === "blocked" ? "pressure" : "context", flow === "continuous" ? 3 : flow === "blocked" ? 2 : 1, [flow]));

  return {
    seasonalElement,
    dayMasterStrength,
    followCandidate,
    elementStrength: values,
    supportingElements: [dayElement, roles.resource],
    drainingElements: [roles.output, roles.wealth, roles.authority],
    flow,
    evidence,
  };
}

export function qiRoleElements(dayElement: Element): ReturnType<typeof roleElements> {
  return roleElements(dayElement);
}
