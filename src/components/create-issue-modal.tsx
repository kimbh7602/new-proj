"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CreateIssueModalProps {
  projectKeys: string[];
  onSubmit: (projectKey: string, summary: string, description: string) => void;
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
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!summary.trim()) return;
    setSubmitting(true);
    onSubmit(projectKey, summary, description);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-[480px] flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-white">새 이슈 생성</h3>
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
            <label className="text-xs text-zinc-500 block mb-1">
              설명 (선택)
            </label>
            <Textarea
              className="bg-zinc-800 border-zinc-700 text-zinc-300 text-sm resize-none"
              placeholder="이슈 설명..."
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
