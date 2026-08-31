"use client";

import { useState } from "react";
import { Button, Field, inputClass } from "./controls";
import { TEXT } from "@/lib/typography";
import { PROVIDER_PRESETS, type ProviderId } from "@/ai/providers";
import type { AnalysisOutput } from "@/ai/schema";
import { DIMENSION_LABELS, RESOLUTION_LABELS, type Dimension } from "@/domain/fortune/types";

export interface AnalysisState {
  status: "idle" | "loading" | "done" | "error";
  output: AnalysisOutput | null;
  error: string | null;
}

export function AnalysisPanel({
  hasSnapshot,
  boundaryBlocked,
  selectedTimestamp,
  selectedResolution,
  selectedDimension,
  state,
  onRequest,
}: {
  hasSnapshot: boolean;
  boundaryBlocked: boolean;
  selectedTimestamp: string | null;
  selectedResolution: string | null;
  selectedDimension: Dimension | null;
  state: AnalysisState;
  onRequest: (args: { provider: ProviderId; model: string; apiKey: string; question: string }) => void;
}) {
  const [provider, setProvider] = useState<ProviderId>("openai");
  const [model, setModel] = useState<string>(PROVIDER_PRESETS.openai.models[0]);
  const [apiKey, setApiKey] = useState("");
  const [question, setQuestion] = useState("");

  const canRequest = hasSnapshot && !boundaryBlocked && apiKey.trim().length >= 8 && state.status !== "loading";

  return (
    <section
      className="flex flex-col gap-4 rounded-lg border border-bazi-border bg-bazi-surface p-5"
      aria-label="AI 解读"
    >
      <div>
        <h2 className={TEXT.sectionTitle}>AI 解读（自带密钥）</h2>
        <p className={TEXT.caption}>
          仅解读上方确定性结果，不产生或修改任何数值。密钥只在本次请求中使用，不存储、不上报。
        </p>
      </div>

      {!hasSnapshot ? (
        <p className={`${TEXT.bodySm} rounded-sm border border-bazi-border-soft bg-bazi-surface-muted p-4`}>
          请先生成命盘，再选择一个周期请求解读。
        </p>
      ) : (
        <>
          {boundaryBlocked ? (
            <p
              className={`${TEXT.bodySm} rounded-sm border border-bazi-warning bg-bazi-warning-soft p-4`}
              role="alert"
            >
              真太阳时修正跨越了日界或时辰，请先在出生信息中勾选确认，再请求 AI 解读。
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="模型供应商" htmlFor="ai-provider">
              <select
                id="ai-provider"
                value={provider}
                onChange={(event) => {
                  const next = event.target.value as ProviderId;
                  setProvider(next);
                  setModel(PROVIDER_PRESETS[next].models[0]);
                }}
                className={inputClass}
              >
                {Object.values(PROVIDER_PRESETS).map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="模型标识" helper={`常用：${PROVIDER_PRESETS[provider].models.join("、")}`} htmlFor="ai-model">
              <input
                id="ai-model"
                type="text"
                required
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <Field
            label="API Key（仅本次请求使用）"
            helper="保存在浏览器内存中；关闭页面即消失。不会写入任何存储或日志。"
            htmlFor="ai-key"
          >
            <input
              id="ai-key"
              type="password"
              required
              minLength={8}
              autoComplete="off"
              placeholder="sk-…"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field
            label="想重点了解的问题（可选）"
            helper={`解读对象：${selectedResolution && selectedDimension && selectedTimestamp ? `${RESOLUTION_LABELS[selectedResolution as "day" | "month" | "year"]} ${selectedTimestamp} · ${DIMENSION_LABELS[selectedDimension]}维度` : "当前选中周期"}`}
            htmlFor="ai-question"
          >
            <textarea
              id="ai-question"
              rows={2}
              maxLength={300}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              className={`${inputClass} py-2`}
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
        </>
      )}
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

      <div className="flex flex-col gap-3">
        {output.dimensionInterpretations.map((item) => (
          <div key={item.dimension}>
            <h4 className={`${TEXT.cardTitle} text-bazi-ink-secondary`}>
              {DIMENSION_LABELS[item.dimension]}
            </h4>
            <p className={TEXT.bodySm}>{item.interpretation}</p>
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
