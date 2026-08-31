/** Single primary-structure adjudication: special first, then month command. */
import { YANG_REN_BRANCH, ruleHit } from "./rules";
import type { NatalChart, QiState, RelationEdge, RuleHit } from "./contract";

export interface StructureDecision {
  primaryStructure: string;
  auxiliaryStructure: string | null;
  status: "formed" | "impaired" | "candidate";
  structureAnchor: string;
  evidence: RuleHit[];
}

const ORDINARY: Record<string, string> = {
  正官: "正官格", 七杀: "七杀格", 正印: "正印格", 偏印: "偏印格",
  正财: "正财格", 偏财: "偏财格", 食神: "食神格", 伤官: "伤官格",
  比肩: "建禄格",
};

function hit(code: string, polarity: RuleHit["polarity"], severity: RuleHit["severity"], subjects: string[]): RuleHit {
  return ruleHit(code, polarity, severity, "原局", subjects);
}

function ordinaryStructure(natal: NatalChart): string {
  if (natal.monthCommand.tenGod === "劫财") {
    return natal.pillars[1].branch === YANG_REN_BRANCH[natal.dayMaster.stem as keyof typeof YANG_REN_BRANCH] ? "羊刃格" : "月劫格";
  }
  return ORDINARY[natal.monthCommand.tenGod] ?? "月令格";
}

function exposedGods(natal: NatalChart): string[] {
  return natal.pillars.filter((pillar) => pillar.name !== "day").map((pillar) => pillar.stemTenGod);
}

function specialStructure(natal: NatalChart, qi: QiState, relations: RelationEdge[]): string | null {
  const transform = relations.find((edge) => edge.code.startsWith("GAN_WUHE") && edge.state === "formed" && edge.transformElement === qi.seasonalElement);
  if (transform && qi.elementStrength[qi.seasonalElement] > qi.elementStrength[natal.dayMaster.element]) return "化气格";
  if (qi.followCandidate === "followStrong") return "从强格";
  if (qi.followCandidate === "followOutput") return "从儿格";
  if (qi.followCandidate === "followWealth") return "从财格";
  if (qi.followCandidate === "followAuthority") return "从官杀格";
  return null;
}

function impairedBy(primary: string, exposed: string[]): boolean {
  return (primary === "正官格" && exposed.includes("伤官")) ||
    (primary === "食神格" && exposed.includes("偏印")) ||
    (primary === "正财格" && exposed.includes("劫财")) ||
    (primary === "正印格" && exposed.includes("正财"));
}

function rescueFor(primary: string, exposed: string[]): string | null {
  if ((primary === "正官格" || primary === "七杀格") && exposed.some((god) => god === "正印" || god === "偏印")) return "印星护官杀";
  if (primary === "伤官格" && exposed.some((god) => god === "正财" || god === "偏财")) return "伤官生财";
  if (primary === "食神格" && exposed.some((god) => god === "正财" || god === "偏财")) return "食神生财";
  return null;
}

function auxiliary(natal: NatalChart): string | null {
  const gods = exposedGods(natal);
  if (gods.some((god) => god === "食神" || god === "伤官") && gods.some((god) => god === "正财" || god === "偏财")) return "食伤生财";
  if (gods.some((god) => god === "正印" || god === "偏印") && gods.some((god) => god === "正官" || god === "七杀")) return "官印相生";
  return null;
}

/** Applies the locked special→ordinary precedence and records formation/impairment/rescue evidence. */
export function assessStructure(natal: NatalChart, qi: QiState, relations: RelationEdge[]): StructureDecision {
  const special = specialStructure(natal, qi, relations);
  const anchor = `${natal.monthCommand.stem}${natal.monthCommand.tenGod}`;
  const primaryStructure = special ?? ordinaryStructure(natal);
  const exposed = exposedGods(natal);
  const rescue = rescueFor(primaryStructure, exposed);
  const impaired = !special && impairedBy(primaryStructure, exposed);
  const hasAnchorExposure = exposed.includes(natal.monthCommand.tenGod);
  const status: StructureDecision["status"] = special || rescue
    ? "formed"
    : impaired ? "impaired"
      : hasAnchorExposure ? "formed" : "candidate";
  const evidence = [
    hit("STRUCTURE", status === "impaired" ? "pressure" : "context", status === "formed" ? 3 : 2, [primaryStructure, anchor]),
    ...(impaired ? [hit("STRUCTURE_IMPAIR", "pressure", 3, [primaryStructure, ...exposed])] : []),
    ...(rescue ? [hit("STRUCTURE_RESCUE", "support", 2, [primaryStructure, rescue])] : []),
  ];
  return { primaryStructure, auxiliaryStructure: auxiliary(natal), status, structureAnchor: anchor, evidence };
}
