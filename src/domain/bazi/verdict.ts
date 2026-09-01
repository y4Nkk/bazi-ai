/** Domain conclusions derived from deterministic rule evidence only. */
import type { Element } from "./constants";
import { elementControlledBy, elementGeneratedBy, ruleHit } from "./rules";
import { DIMENSION_KEYS, type Dimension, type DomainVerdict, type NatalChart, type NatalJudgment, type RuleHit, type TemporalLayer } from "./contract";
import type { BirthInput } from "./normalize";

function targetElement(dimension: Dimension, dayElement: Element, gender: BirthInput["chartGender"]): Element | null {
  const resource = (["木", "火", "土", "金", "水"] as Element[]).find((element) => elementGeneratedBy(element) === dayElement) as Element;
  const output = elementGeneratedBy(dayElement);
  const wealth = elementControlledBy(dayElement);
  const authority = (["木", "火", "土", "金", "水"] as Element[]).find((element) => elementControlledBy(element) === dayElement) as Element;
  return {
    overall: null,
    career: authority,
    wealth,
    relationship: gender === "male" ? wealth : authority,
    children: output,
    family: resource,
    health: dayElement,
    study: resource,
    personality: dayElement,
    mobility: output,
  }[dimension];
}

function relevant(hit: RuleHit, target: Element | null, dimension: Dimension): boolean {
  const code = hit.code.replace(/^RELATION_(?:BLOCKED|BROKEN|CONTESTED):/, "");
  if (dimension === "overall") return true;
  if (!hit.domainRelevance.includes(dimension)) return false;
  if (!target || hit.subjects.includes(target)) return true;
  return code.startsWith("STRUCTURE") || code.startsWith("QI_") || code.startsWith("CLIMATE") || code.startsWith("SPECIAL") || code.startsWith("BALANCE") || code.startsWith("REMEDY") || code.startsWith("ZHI_CHONG") || code.startsWith("ZHI_XING") || code.startsWith("FUYIN") || code.startsWith("FANYIN") || code.startsWith("ZHI_LIUHE") || code.startsWith("ZHI_SANHE") || code.startsWith("ZHI_BANHE") || code.startsWith("ZHI_GONGHE") || code.startsWith("ZHI_SANHUI");
}

function confidenceFor(hits: RuleHit[]): DomainVerdict["confidence"] {
  const layers = new Set(hits.map((hit) => hit.temporalLayer));
  return layers.size >= 3 ? "high" : layers.size >= 2 ? "medium" : "low";
}

function rawIntensity(support: number, pressure: number): DomainVerdict["intensity"] {
  const strength = Math.max(support, pressure);
  return strength >= 9 ? "extreme" : strength >= 5 ? "strong" : strength >= 2 ? "moderate" : "weak";
}

/** A transient cannot become a strong claim without natal theme, luck condition, and trigger. */
function intensityFor(
  support: number,
  pressure: number,
  evidenceFor: RuleHit[],
  evidenceAgainst: RuleHit[],
): DomainVerdict["intensity"] {
  const dominant = support >= pressure ? evidenceFor : evidenceAgainst;
  const layers = new Set(dominant.map((hit) => hit.temporalLayer));
  const hasNatalTheme = layers.has("原局");
  const hasLuckCondition = layers.has("大运");
  const hasTrigger = ["流年", "流月", "流日", "流时"].some((layer) => layers.has(layer as RuleHit["temporalLayer"]));
  const raw = rawIntensity(support, pressure);
  if (hasNatalTheme && hasLuckCondition && hasTrigger) return raw;
  return raw === "extreme" || raw === "strong" ? "moderate" : raw;
}

export function verdictsOf(args: {
  input: BirthInput;
  natal: NatalChart;
  judgment: NatalJudgment;
  evidence: RuleHit[];
}): Record<Dimension, DomainVerdict> {
  const result = {} as Record<Dimension, DomainVerdict>;
  for (const domain of DIMENSION_KEYS) {
    const target = targetElement(domain, args.natal.dayMaster.element, args.input.chartGender);
    const evidenceFor = args.evidence.filter((hit) => hit.polarity === "support" && relevant(hit, target, domain));
    const evidenceAgainst = args.evidence.filter((hit) => hit.polarity === "pressure" && relevant(hit, target, domain));
    const evidenceContext = args.evidence.filter((hit) => hit.polarity === "context" && relevant(hit, target, domain));
    if (evidenceFor.length === 0 && evidenceAgainst.length === 0 && evidenceContext.length === 0) {
      evidenceContext.push(ruleHit("INSUFFICIENT_EVIDENCE", "context", 1, "原局", [domain]));
    }
    const support = evidenceFor.reduce((sum, hit) => sum + hit.severity, 0);
    const pressure = evidenceAgainst.reduce((sum, hit) => sum + hit.severity, 0);
    const tendency: DomainVerdict["tendency"] = support === pressure
      ? "neutral"
      : support > pressure ? "favorable" : "challenging";
    const active = [...new Set([...evidenceFor, ...evidenceAgainst, ...evidenceContext].map((hit) => hit.temporalLayer))] as TemporalLayer[];
    const dominantEvidence = support >= pressure ? evidenceFor : evidenceAgainst;
    result[domain] = {
      domain,
      tendency: support > 0 && pressure > 0 ? "mixed" : tendency,
      intensity: intensityFor(support, pressure, evidenceFor, evidenceAgainst),
      confidence: confidenceFor(dominantEvidence),
      evidenceFor,
      evidenceAgainst,
      evidenceContext,
      ruleIds: [...new Set([...evidenceFor, ...evidenceAgainst, ...evidenceContext].map((hit) => hit.id))],
      activePeriods: active,
    };
  }
  return result;
}
