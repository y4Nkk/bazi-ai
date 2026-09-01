"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button, Checkbox, Field, Input, Select, Textarea } from "./controls";
import { TEXT } from "@/lib/typography";
import { DEFAULT_PROVIDER_ID, PROVIDER_PRESETS, type ProviderId } from "@/ai/providers";
import type { AnalysisOutput } from "@/ai/schema";
import { DIMENSION_LABELS, RESOLUTION_LABELS, type BoundaryNotice, type Dimension } from "@/domain/bazi/contract";

export interface AnalysisState {
  status: "idle" | "loading" | "done" | "error";
  output: AnalysisOutput | null;
  error: string | null;
}

export function AnalysisPanel({
  boundary,
  boundaryAcknowledged,
  onBoundaryAckChange,
  selectedTimestamp,
  selectedResolution,
  selectedDimension,
  state,
  onRequest,
}: {
  boundary: BoundaryNotice | null;
  boundaryAcknowledged: boolean;
  onBoundaryAckChange: (acknowledged: boolean) => void;
  selectedTimestamp: string | null;
  selectedResolution: string | null;
  selectedDimension: Dimension | null;
  state: AnalysisState;
  onRequest: (args: { provider: ProviderId; model: string; apiKey: string; question: string }) => void;
}) {
  const [provider, setProvider] = useState<ProviderId>(DEFAULT_PROVIDER_ID);
  const [model, setModel] = useState<string>(PROVIDER_PRESETS[DEFAULT_PROVIDER_ID].models[0]);
  const [apiKey, setApiKey] = useState("");
  const [question, setQuestion] = useState("");
  const activePreset = PROVIDER_PRESETS[provider];
  const boundaryBlocked = boundary !== null && !boundaryAcknowledged;

  const canRequest = !boundaryBlocked && apiKey.trim().length >= 8 && state.status !== "loading";

  return (
    <section
      className="flex flex-col gap-4 rounded-lg border border-bazi-border bg-bazi-surface p-5"
      aria-label="AI 解读"
    >
      <h2 className={TEXT.sectionTitle}>AI 解读（自带密钥）</h2>

      {boundary ? (
        <p
          className={`${TEXT.bodySm} rounded-sm border border-bazi-warning bg-bazi-warning-soft p-4`}
          role="alert"
        >
          <span className="font-medium text-bazi-ink">
            真太阳时修正跨越了
            {boundary.changedDay ? "日界" : ""}
            {boundary.changedDay && boundary.changedShichen ? "与" : ""}
            {boundary.changedShichen ? "时辰" : ""}：民用时 {boundary.civilDay} {boundary.civilShichen}时 → 真太阳时 {boundary.trueSolarDay} {boundary.trueSolarShichen}时。
          </span>
          <span className={`${TEXT.caption} mt-1 block`}>
            两种候选四柱不同；请确认后再请求 AI 解读。此确认不会变更当前已生成的命盘。
          </span>
          <Checkbox
            checked={boundaryAcknowledged}
            onCheckedChange={onBoundaryAckChange}
            label="我已了解时辰差异，按已选排盘依据请求 AI 解读"
            className={`${TEXT.bodySm} mt-3 min-h-touch font-medium text-bazi-ink`}
          >
            我已了解时辰差异，按已选排盘依据请求 AI 解读
          </Checkbox>
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="模型供应商" htmlFor="ai-provider">
              <Select
                id="ai-provider"
                value={provider}
                onValueChange={(value) => {
                  const next = value as ProviderId;
                  setProvider(next);
                  setModel(PROVIDER_PRESETS[next].models[0]);
                }}
                options={Object.values(PROVIDER_PRESETS).map((preset) => ({
                  value: preset.id,
                  label: preset.label,
                }))}
              />
            </Field>
            <Field label="模型标识" htmlFor="ai-model">
              <Input
                id="ai-model"
                type="text"
                required
                value={model}
                onChange={(event) => setModel(event.target.value)}
              />
            </Field>
          </div>

          <Field
            label="API Key（仅本次请求使用）"
            helper="保存在浏览器内存中；关闭页面即消失。不会写入任何存储或日志。"
            htmlFor="ai-key"
          >
            <Input
              id="ai-key"
              type="password"
              required
              minLength={8}
              autoComplete="off"
              placeholder="sk-…"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
          </Field>
          <a
            href={activePreset.apiKeyUrl}
            target="_blank"
            rel="noreferrer"
            className={`${TEXT.bodySm} inline-flex min-h-touch w-fit items-center gap-1 text-bazi-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bazi-primary`}
          >
            获取 {activePreset.label} API Key
            <ExternalLink className="size-4" aria-hidden />
          </a>

          <Field
            label="想重点了解的问题（可选）"
            helper={`解读对象：${selectedResolution && selectedDimension && selectedTimestamp ? `${RESOLUTION_LABELS[selectedResolution as "day" | "month" | "year"]} ${selectedTimestamp} · ${DIMENSION_LABELS[selectedDimension]}维度` : "当前选中周期"}`}
            htmlFor="ai-question"
          >
            <Textarea
              id="ai-question"
              rows={2}
              maxLength={300}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </Field>

          <Button
            className="min-h-touch px-6"
            disabled={!canRequest}
            aria-busy={state.status === "loading"}
            onClick={() => onRequest({ provider, model, apiKey: apiKey.trim(), question })}
          >
            {state.status === "loading" ? "解读中…" : "请求 AI 解读"}
          </Button>

          {state.status === "error" && state.error ? (
            <p className={`${TEXT.bodySm} rounded-sm border border-bazi-danger bg-bazi-danger-soft p-4`} role="alert">
              {state.error}
            </p>
          ) : null}

          {state.output ? <AnalysisResult output={state.output} /> : null}
    </section>
  );
}

function AnalysisResult({ output }: { output: AnalysisOutput }) {
  return (
    <article
      className="flex flex-col gap-4 rounded-md border border-bazi-border p-4"
      style={{ borderImage: "var(--bazi-ai-gradient) 1" }}
      aria-label="AI 解读结果"
    >
      <header className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block size-2 rounded-full"
          style={{ background: "var(--bazi-ai-gradient)" }}
        />
        <h3 className={TEXT.panelTitle}>AI 解读（非计算结果）</h3>
      </header>
      <p className={TEXT.bodyLg}>{output.summary}</p>
      <CitationList ids={output.summaryRuleIds} />

      <div className="flex flex-col gap-3">
        {output.dimensionInterpretations.map((item) => (
          <div key={item.dimension}>
            <h4 className={`${TEXT.cardTitle} text-bazi-ink-secondary`}>
              {DIMENSION_LABELS[item.dimension]}
            </h4>
            <p className={TEXT.bodySm}>{item.interpretation}</p>
            <CitationList ids={item.ruleIds} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <h4 className={`${TEXT.cardTitle} text-bazi-success`}>顺势方向</h4>
          <ul className={`${TEXT.bodySm} list-disc pl-5`}>
            {output.opportunities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className={`${TEXT.cardTitle} text-bazi-warning`}>留意之处</h4>
          <ul className={`${TEXT.bodySm} list-disc pl-5`}>
            {output.cautions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h4 className={TEXT.cardTitle}>所选周期解读</h4>
        <p className={TEXT.body}>{output.selectedPeriod.explanation}</p>
        <CitationList ids={output.selectedPeriod.ruleIds} />
      </div>

      <footer className="flex items-start gap-2 rounded-sm bg-bazi-surface-muted p-3">
        <span aria-hidden className="text-body-sm">
          ⚠
        </span>
        <p className={TEXT.caption}>
          {output.disclaimer}
          <br />
          本产品为传统文化与娱乐分析，所有指数与解读均不构成医疗、法律、投资或其他现实决策依据。
        </p>
      </footer>
    </article>
  );
}

function CitationList({ ids }: { ids: string[] }) {
  return (
    <p className={`${TEXT.micro} mt-1 break-all text-bazi-ink-muted`}>
      规则依据：{ids.join(" · ")}
    </p>
  );
}
