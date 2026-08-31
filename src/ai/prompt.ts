/** Prompt construction for one analysis invocation. */
import { DIMENSION_LABELS } from "../domain/fortune/types";
import { factorLabel } from "../domain/fortune/factors";
import { RESOLUTION_LABELS } from "../domain/fortune/types";
import type { AnalyzeSelection } from "./schema";

const DIMENSION_LIST = Object.entries(DIMENSION_LABELS)
  .map(([key, label]) => `${key}（${label}）`)
  .join("、");

export function buildSystemPrompt(): string {
  return [
    "你是一名传统命理文化解读助手。你收到的是由确定性排盘引擎计算完成的事实：四柱、日主、大运方向，以及某个周期的传统命理趋势指数 K 线与确定性因子码。",
    "你的职责仅限于解释这些既定事实，绝不计算、修改或新造任何数字、评分、K 线数值或命理事实。",
    "输出要求：",
    "1. 只使用简体中文，语气温和克制，面向对传统文化感兴趣的普通读者。",
    "2. 明确以给定的因子码（如地支相冲、天干五合）为解释依据，并说明它对应命盘中的哪一柱或哪一层关系。",
    "3. 不得给出医疗、法律、投资、生育建议，不得预言死亡、灾祸或确切婚期，不得使用“必然”“一定”等确定性表述。",
    "4. 不得输出任何数字评分、百分比或趋势指数数值。",
    "5. 必须按给定 JSON 结构输出，不添加任何额外字段，不使用 Markdown 代码块。",
    `6. dimensionInterpretations 中的 dimension 只能取以下值之一：${DIMENSION_LIST}。`,
    "7. disclaimer 字段必须说明本解读属于传统文化与娱乐性质，不构成任何现实决策依据。",
  ].join("\n");
}

export function buildUserPrompt(selection: AnalyzeSelection, question?: string): string {
  const period = selection.selectedPeriod;
  const factorLines = period.factors.length
    ? period.factors.map((code) => `- ${code}：${factorLabel(code)}`).join("\n")
    : "-（该周期没有命盘互动因子）";
  const resolutionLabel = RESOLUTION_LABELS[period.resolution];
  const dimensionLabel = DIMENSION_LABELS[period.dimension];
  const lines = [
    "以下为确定性引擎输出的事实，请仅基于它们解读：",
    "",
    "【命盘事实】",
    `- 四柱（年、月、日、时）：${selection.natalPillars.join(" ")}`,
    `- 日主：${selection.dayMaster}（${selection.dayMasterElement}）`,
    `- 传统命盘性别：${selection.chartGender === "male" ? "乾造（男）" : "坤造（女）"}`,
    `- 计时标准：${selection.timeStandard === "trueSolar" ? "真太阳时" : "民用时"}`,
    `- 大运行进方向：${selection.luckDirection}`,
    "",
    "【所选周期事实】",
    `- 周期类型：${resolutionLabel}（${period.timestamp}）`,
    `- 解读维度：${dimensionLabel}`,
    `- 传统命理趋势指数 K 线：开 ${period.open}、高 ${period.high}、低 ${period.low}、收 ${period.close}（0–100 的文化娱乐指数，仅供解读，禁止在你的输出中复述具体数值）`,
    "- 确定性因子码：",
    factorLines,
  ];
  if (question && question.trim()) {
    lines.push("", "【用户问题】", question.trim());
  }
  lines.push(
    "",
    "请输出 JSON，字段为：summary（整体解读）、dimensionInterpretations（数组，每项含 dimension 与 interpretation）、opportunities（字符串数组，顺势建议）、cautions（字符串数组，需留意之处）、selectedPeriod（含 explanation，解释所选周期的指数走向与因子）、disclaimer（文化与娱乐性质声明）。",
  );
  return lines.join("\n");
}
