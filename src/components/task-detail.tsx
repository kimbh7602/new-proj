"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Task, Result } from "@/types";

interface TaskDetailProps {
  task: Task | null;
  result: Result | null;
  onApprove: (issueKey: string, message?: string) => void;
  onReject: (issueKey: string, message?: string) => void;
  onReply: (issueKey: string, message: string) => void;
}

const statusBadgeVariant: Record<string, string> = {
  pending: "bg-amber-900/50 text-amber-400 border-amber-700",
  running: "bg-blue-900/50 text-blue-400 border-blue-700",
  completed: "bg-green-900/50 text-green-400 border-green-700",
  error: "bg-red-900/50 text-red-400 border-red-700",
  idle: "bg-zinc-800 text-zinc-400 border-zinc-700",
  unresponsive: "bg-orange-900/50 text-orange-400 border-orange-700",
};

export function TaskDetail({
  task,
  result,
  onApprove,
  onReject,
  onReply,
}: TaskDetailProps) {
  const [message, setMessage] = useState("");

  if (!task) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        <div className="text-center">
          <p className="text-zinc-400 font-medium mb-1">작업을 선택하세요</p>
          <p className="text-sm">
            왼쪽 목록에서 작업을 클릭하면 상세 정보가 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  const handleReply = () => {
    if (!message.trim()) return;
    onReply(task.issue_key, message);
    setMessage("");
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
        <div>
          <h2 className="text-base font-semibold text-white">
            {task.issue_key} {task.title}
          </h2>
          <span className="text-xs text-zinc-500">
            {task.agent_name || "Unassigned"} · {task.elapsed}
          </span>
        </div>
        <Badge
          variant="outline"
          className={statusBadgeVariant[task.status] || ""}
        >
          {task.status === "pending" && "⏳ "}
          {task.status}
        </Badge>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {result ? (
          <div>
            <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">
              Agent Result
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                rehypePlugins={[rehypeHighlight]}
                remarkPlugins={[remarkGfm]}
              >
                {result.content_md}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-zinc-500 text-sm">
            {task.status === "running"
              ? "에이전트가 작업 중입니다..."
              : "결과물이 아직 없습니다."}
          </div>
        )}

        {task.has_pending_approval && (
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/30 border border-amber-700/50 rounded text-amber-400 text-xs">
            ⏳ 승인이 필요합니다
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900">
        {task.has_pending_approval && (
          <div className="flex gap-2 mb-3">
            <Button
              size="sm"
              className="bg-green-800 hover:bg-green-700 text-green-200"
              onClick={() => onApprove(task.issue_key, message || undefined)}
            >
              ✓ 승인
            </Button>
            <Button
              size="sm"
              className="bg-red-900 hover:bg-red-800 text-red-200"
              onClick={() => onReject(task.issue_key, message || undefined)}
            >
              ✗ 거절
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-700 text-zinc-400"
              onClick={() => onReply(task.issue_key, message)}
            >
              ↺ 수정 요청
            </Button>
          </div>
        )}
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="에이전트에게 메시지 보내기..."
          className="bg-zinc-800 border-zinc-700 text-zinc-300 text-sm resize-none"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleReply();
            }
          }}
        />
      </div>
    </div>
  );
}
