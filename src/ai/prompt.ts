/** Prompt construction for one analysis invocation. */
import { DIMENSION_LABELS, RESOLUTION_LABELS } from "../domain/bazi/contract";
import type { AnalyzeSelection } from "./schema";

const DIMENSION_LIST = Object.entries(DIMENSION_LABELS)
  .map(([key, label]) => `${key}（${label}）`)
  .join("、");

export function buildSystemPrompt(): string {
  return [
    "你是一名传统命理文化解读助手。你收到的是由确定性排盘引擎计算完成的事实：四柱、日主、大运方向、主格与喜用五行，以及某个周期的传统命理趋势指数 K 线和规则依据。",
    "你的职责仅限于解释这些既定事实，绝不计算、修改或新造任何数字、评分、K 线数值或命理事实。",
    "输出要求：",
    "1. 只使用简体中文，语气温和克制，面向对传统文化感兴趣的普通读者。",
    "2. 当输入存在确定性 ruleId 时，每段解释都必须把所依据的 ruleId 放入其 ruleIds 数组；只能引用输入中给定的 ruleId。当输入没有 ruleId 时，evidenceStatus 必须为 insufficient，所有 ruleIds 必须为空，并明确说明当前规则无法确定。",
    "3. 不得给出医疗、法律、投资、生育建议，不得预言死亡、灾祸或确切婚期，不得使用“必然”“一定”等确定性表述。",
    "4. 不得输出任何数字评分、百分比或趋势指数数值。",
    "5. 必须按给定 JSON 结构输出，不添加任何额外字段，不使用 Markdown 代码块。",
    `6. dimensionInterpretations 中的 dimension 只能取以下值之一：${DIMENSION_LIST}。`,
    "7. disclaimer 字段必须说明本解读属于传统文化与娱乐性质，不构成任何现实决策依据。",
  ].join("\n");
}

export function buildUserPrompt(selection: AnalyzeSelection, question?: string): string {
  const period = selection.selectedPeriod;
  const reasonLines = period.reasons.length
    ? period.reasons.map((reason) => `- ruleId=${reason.id} · ${reason.code}：${reason.label}（${reason.temporalLayer}；方向 ${reason.direction}；相关维度 ${reason.domainRelevance.join("、")}；${reason.subjects.join("、")}）`).join("\n")
    : "-（该周期没有额外规则触发）";
  const resolutionLabel = RESOLUTION_LABELS[period.resolution];
  const dimensionLabel = DIMENSION_LABELS[period.dimension];
  const lines = [
    "以下为确定性引擎输出的事实，请仅基于它们解读：",
    "",
    "【命盘事实】",
    ...(selection.subjectName ? [`- 命主称呼：${selection.subjectName}（仅用于称呼，不是排盘或判断依据）`] : []),
    `- 四柱（年、月、日、时）：${selection.natalPillars.join(" ")}`,
    `- 日主：${selection.dayMaster}（${selection.dayMasterElement}）`,
    `- 传统命盘性别：${selection.chartGender === "male" ? "乾造（男）" : "坤造（女）"}`,
    `- 计时标准：${selection.timeStandard === "trueSolar" ? "真太阳时" : "民用时"}`,
    `- 大运行进方向：${selection.luckDirection}`,
    `- 主格：${selection.primaryStructure}`,
    `- 有利五行：${selection.favorableElements.join("、")}`,
    "",
    "【所选周期事实】",
    `- 周期类型：${resolutionLabel}（${period.timestamp}）`,
    `- 解读维度：${dimensionLabel}`,
    `- 传统命理趋势指数 K 线：开 ${period.open}、高 ${period.high}、低 ${period.low}、收 ${period.close}（0–100 的文化娱乐指数，仅供解读，禁止在你的输出中复述具体数值）`,
    "- 确定性规则依据：",
    reasonLines,
  ];
  if (question && question.trim()) {
    lines.push("", "【用户问题】", question.trim());
  }
  lines.push(
    "",
    period.reasons.length
      ? "请输出 JSON，evidenceStatus 必须为 cited；字段为：evidenceStatus、summary、summaryRuleIds、dimensionInterpretations（每项含 dimension、interpretation、ruleIds）、opportunities、cautions、selectedPeriod（含 explanation、ruleIds）、disclaimer。"
      : "请输出 JSON，evidenceStatus 必须为 insufficient；summary 与 selectedPeriod.explanation 必须包含“当前规则无法确定”，所有 ruleIds 必须为空，且不得虚构确定性依据。字段为：evidenceStatus、summary、summaryRuleIds、dimensionInterpretations（每项含 dimension、interpretation、ruleIds）、opportunities、cautions、selectedPeriod（含 explanation、ruleIds）、disclaimer。",
  );
  return lines.join("\n");
}
