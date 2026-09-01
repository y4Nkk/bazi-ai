import type { CSSProperties } from "react";
import { BRANCH_ELEMENTS, STEM_ELEMENTS, type EarthlyBranch, type Element, type HeavenlyStem } from "@/domain/bazi/constants";

export const ELEMENT_TEXT: Record<Element, string> = {
  木: "text-bazi-element-wood",
  火: "text-bazi-element-fire",
  土: "text-bazi-element-earth",
  金: "text-bazi-element-metal",
  水: "text-bazi-element-water",
};

export const ELEMENT_GRADIENT: Record<Element, string> = {
  木: "var(--bazi-gradient-wood)",
  火: "var(--bazi-gradient-fire)",
  土: "var(--bazi-gradient-earth)",
  金: "var(--bazi-gradient-metal)",
  水: "var(--bazi-gradient-water)",
};

export function gradientInk(element: Element): CSSProperties {
  return {
    backgroundImage: ELEMENT_GRADIENT[element],
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  };
}
export function elementOfGanzhiChar(char: string): Element {
  return char in STEM_ELEMENTS
    ? STEM_ELEMENTS[char as HeavenlyStem]
    : BRANCH_ELEMENTS[char as EarthlyBranch];
}
