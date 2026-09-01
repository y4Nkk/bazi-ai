"use client";

import { Button } from "./controls";
import { TEXT } from "@/lib/typography";
import { HISTORY_LIMIT, type WorkbenchHistoryRecord } from "@/lib/workbench-cache";
import { civilDateTimeOf } from "@/domain/bazi/astronomy";
import { DIMENSION_LABELS, RESOLUTION_LABELS } from "@/domain/bazi/contract";

function displaySavedAt(timestamp: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function HistoryPanel({
  records,
  activeRecordId,
  onSelect,
}: {
  records: WorkbenchHistoryRecord[];
  activeRecordId: string | null;
  onSelect: (record: WorkbenchHistoryRecord) => void;
}) {
  return (
    <section
      className="rounded-lg border border-bazi-border bg-bazi-surface p-5"
      aria-labelledby="history-title"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="history-title" className={TEXT.cardTitle}>
            历史分析
          </h2>
          <p className={`${TEXT.caption} mt-1`}>仅保存在当前浏览器，点击即可回显。</p>
        </div>
        <span className={TEXT.meta}>
          {records.length}/{HISTORY_LIMIT}
        </span>
      </div>

      {records.length > 0 ? (
        <div className="mt-4 flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
          {records.map((record) => {
            const active = record.id === activeRecordId;
            const birthDateTime = civilDateTimeOf(record.input.timezone, record.input.birthInstant)
              .replace("T", " ")
              .slice(0, 16);
            return (
              <Button
                key={record.id}
                variant={active ? "primary" : "secondary"}
                className="min-h-touch w-full items-start justify-start px-4 py-3 text-left"
                aria-current={active ? "true" : undefined}
                onClick={() => onSelect(record)}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate text-body-sm font-medium">
                      {record.input.subjectName || "未命名命盘"}
                    </span>
                    <span className="shrink-0 text-caption tabular-nums opacity-75">
                      {displaySavedAt(record.updatedAt)}
                    </span>
                  </span>
                  <span className="mt-1 block text-caption opacity-75">
                    {record.input.chartGender === "male" ? "乾造" : "坤造"} · {birthDateTime}
                  </span>
                  <span className="mt-1 block text-caption opacity-75">
                    {RESOLUTION_LABELS[record.snapshot.series.resolution]} · {DIMENSION_LABELS[record.snapshot.series.dimension]} · {record.analysisOutput ? "含 AI 解读" : "命盘快照"}
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
      ) : (
        <p className={`${TEXT.caption} mt-4 rounded-sm bg-bazi-surface-muted p-4`}>
          生成命盘后，最近的分析记录会显示在这里。
        </p>
      )}
    </section>
  );
}
