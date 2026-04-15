"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CreateIssueModalProps {
  projectKeys: string[];
  onSubmit: (
    projectKey: string,
    summary: string,
    description: string,
    labels: string[]
  ) => void;
  onClose: () => void;
}

export function CreateIssueModal({
  projectKeys,
  onSubmit,
  onClose,
}: CreateIssueModalProps) {
  const [projectKey, setProjectKey] = useState(projectKeys[0] || "");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleAddLabel = () => {
    const trimmed = labelInput.trim();
    if (trimmed && !labels.includes(trimmed)) {
      setLabels((prev) => [...prev, trimmed]);
    }
    setLabelInput("");
  };

  const handleRemoveLabel = (label: string) => {
    setLabels((prev) => prev.filter((l) => l !== label));
  };

  const handleSubmit = async () => {
    if (!summary.trim()) return;
    setSubmitting(true);
    onSubmit(projectKey, summary, description, labels);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-[520px] flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-white">새 이슈 생성</h3>
            <span className="text-[11px] text-zinc-500">
              기본 상태: Backlog
            </span>
          </div>
          <button
            className="text-zinc-500 hover:text-zinc-300 text-lg"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">프로젝트</label>
            <select
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-300"
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value)}
            >
              {projectKeys.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1">제목</label>
            <input
              type="text"
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-500"
              placeholder="이슈 제목"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1">설명</label>
            <Textarea
              className="bg-zinc-800 border-zinc-700 text-zinc-300 text-sm min-h-[160px]"
              placeholder="이슈 설명을 입력하세요..."
              rows={8}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1">레이블</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-300 placeholder:text-zinc-500"
                placeholder="레이블 입력 후 Enter"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddLabel();
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-700 text-zinc-400 text-xs h-8"
                onClick={handleAddLabel}
                disabled={!labelInput.trim()}
              >
                추가
              </Button>
            </div>
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {labels.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-xs text-zinc-300"
                  >
                    {label}
                    <button
                      className="text-zinc-500 hover:text-zinc-300"
                      onClick={() => handleRemoveLabel(label)}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-400"
            onClick={onClose}
          >
            취소
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-500 text-white"
            disabled={!summary.trim() || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "생성 중..." : "생성"}
          </Button>
        </div>
      </div>
    </div>
  );
}
