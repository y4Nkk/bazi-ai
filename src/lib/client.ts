/** Client-side helpers for the two API routes. */
import type { BirthInput } from "@/domain/bazi/normalize";
import type { ChartSnapshot, Dimension, Resolution, TrendRange } from "@/domain/bazi/contract";

export interface ApiError {
  error: { code: string; message: string; issues?: Array<{ path: string; message: string }> };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const apiError = payload as ApiError | null;
    throw new Error(apiError?.error?.message ?? `请求失败（${response.status}），请重试。`);
  }
  return payload as T;
}

export function fetchChartSnapshot(args: {
  input: BirthInput;
  range: TrendRange;
  dimension: Dimension;
  resolution: Resolution;
}): Promise<{ snapshot: ChartSnapshot }> {
  return postJson("/api/chart", args);
}

export function fetchAnalysis(args: {
  selection: unknown;
  provider: string;
  model: string;
  apiKey: string;
  question?: string;
}): Promise<{ analysis: unknown }> {
  return postJson("/api/analyze", args);
}
