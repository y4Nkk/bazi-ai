/**
 * Closed ZP-1 shensha matcher. It emits annotation facts only and is never
 * imported by qi, structure, favorable, verdict, temporal, or projection.
 */
import type { EarthlyBranch, HeavenlyStem } from "./constants";
import type { ShenshaFact } from "./contract";
import { SHENSHA } from "./rules";
import { SHENSHA_CODES, shenshaEvidenceOf } from "./shensha-evidence";

export interface ShenshaContext {
  dayStem: HeavenlyStem;
  dayBranch: EarthlyBranch;
  monthBranch: EarthlyBranch;
  yearBranch: EarthlyBranch;
  voidBranches: EarthlyBranch[];
}

const CODES = SHENSHA_CODES;

function targetIn(ganzhi: string, targets: string): string | null {
  return [...ganzhi].find((char) => targets.includes(char)) ?? null;
}

function add(
  facts: ShenshaFact[],
  code: string,
  label: string,
  reference: string,
  target: string | null,
): void {
  if (!target || facts.some((fact) => fact.code === code && fact.target === target)) return;
  facts.push({ code, label, reference, target, evidence: shenshaEvidenceOf(code) });
}

/** Matches one natal or moving pillar against the fixed natal references. */
export function shenshaForGanzhi(context: ShenshaContext, ganzhi: string): ShenshaFact[] {
  const facts: ShenshaFact[] = [];

  for (const [key, entry] of Object.entries(SHENSHA.dayStem)) {
    const code = CODES[key as keyof typeof SHENSHA.dayStem];
    add(
      facts,
      code,
      entry.label,
      `日干${context.dayStem}`,
      targetIn(ganzhi, entry.targets[context.dayStem]),
    );
  }

  for (const [key, entry] of Object.entries(SHENSHA.monthBranch)) {
    const code = key === "tianYi"
      ? CODES.tianYiMedical
      : CODES[key as Exclude<keyof typeof SHENSHA.monthBranch, "tianYi">];
    add(
      facts,
      code,
      entry.label,
      `月支${context.monthBranch}`,
      targetIn(ganzhi, entry.targets[context.monthBranch]),
    );
  }

  for (const [key, entry] of Object.entries(SHENSHA.dayBranchGroups)) {
    const target = entry.groups.find(([group]) => group.includes(context.dayBranch))?.[1] ?? null;
    add(
      facts,
      CODES[key as keyof typeof CODES],
      entry.label,
      `日支${context.dayBranch}`,
      target ? targetIn(ganzhi, target) : null,
    );
  }

  for (const [key, entry] of Object.entries(SHENSHA.yearBranch)) {
    add(
      facts,
      CODES[key as keyof typeof SHENSHA.yearBranch],
      entry.label,
      `年支${context.yearBranch}`,
      targetIn(ganzhi, entry.targets[context.yearBranch]),
    );
  }

  const voidTarget = [...ganzhi].find((char) => context.voidBranches.includes(char as EarthlyBranch)) ?? null;
  add(facts, CODES.kongWang, "空亡", `日旬${context.voidBranches.join("")}`, voidTarget);
  return facts;
}
