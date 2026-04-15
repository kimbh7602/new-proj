"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useJiraDetail } from "@/lib/use-jira-detail";
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
  const { detail, loading: detailLoading } = useJiraDetail(
    task?.issue_key ?? null
  );
  const [transitions, setTransitions] = useState<
    { id: string; name: string }[]
  >([]);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (!task?.issue_key) return;
    fetch(`/api/jira/transition?key=${task.issue_key}`)
      .then((res) => res.json())
      .then((data) => setTransitions(data.transitions || []))
      .catch(() => setTransitions([]));
  }, [task?.issue_key]);

  const handleTransition = async (transitionId: string) => {
    if (!task) return;
    setTransitioning(true);
    await fetch("/api/jira/transition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issue_key: task.issue_key,
        transition_id: transitionId,
      }),
    });
    setTransitioning(false);
    // Refresh transitions
    const res = await fetch(`/api/jira/transition?key=${task.issue_key}`);
    const data = await res.json();
    setTransitions(data.transitions || []);
  };

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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
        <div>
          <h2 className="text-base font-semibold text-white">
            {task.issue_key} {task.title}
          </h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
            <span>{task.agent_name || "Unassigned"}</span>
            {detail?.assignee && (
              <>
                <span>·</span>
                <span>담당: {detail.assignee}</span>
              </>
            )}
            {detail?.priority && (
              <>
                <span>·</span>
                <span>{detail.priority}</span>
              </>
            )}
            {detail?.labels && detail.labels.length > 0 && (
              <>
                <span>·</span>
                {detail.labels.map((l) => (
                  <span
                    key={l}
                    className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px]"
                  >
                    {l}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {transitions.length > 0 && (
            <select
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300"
              value=""
              disabled={transitioning}
              onChange={(e) => {
                if (e.target.value) handleTransition(e.target.value);
              }}
            >
              <option value="">상태 변경...</option>
              {transitions.map((t) => (
                <option key={t.id} value={t.id}>
                  → {t.name}
                </option>
              ))}
            </select>
          )}
          <Badge
            variant="outline"
            className={statusBadgeVariant[task.status] || ""}
          >
            {task.status === "pending" && "⏳ "}
            {detail?.status || task.status}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Jira Description */}
        {detailLoading ? (
          <div className="space-y-2">
            <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
            <div className="h-20 bg-zinc-800 rounded animate-pulse" />
          </div>
        ) : detail?.description ? (
          <div>
            <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">
              Description
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 prose prose-invert prose-sm max-w-none leading-7 [&_p]:mb-3 [&_li]:mb-1.5 [&_pre]:my-4 [&_h2]:mt-6 [&_h3]:mt-5 [&_ul]:my-3">
              <ReactMarkdown
                rehypePlugins={[rehypeHighlight]}
                remarkPlugins={[remarkGfm]}
              >
                {detail.description}
              </ReactMarkdown>
            </div>
          </div>
        ) : null}

        {/* Agent Result */}
        {result && (
          <div>
            <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">
              Agent Result
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 prose prose-invert prose-sm max-w-none leading-7 [&_p]:mb-3 [&_li]:mb-1.5 [&_pre]:my-4 [&_h2]:mt-6 [&_h3]:mt-5 [&_ul]:my-3">
              <ReactMarkdown
                rehypePlugins={[rehypeHighlight]}
                remarkPlugins={[remarkGfm]}
              >
                {result.content_md}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {!result && !detail?.description && !detailLoading && (
          <div className="text-center py-12 text-zinc-500 text-sm">
            {task.status === "running"
              ? "에이전트가 작업 중입니다..."
              : "결과물이 아직 없습니다."}
          </div>
        )}

        {task.has_pending_approval && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/30 border border-amber-700/50 rounded text-amber-400 text-xs">
            ⏳ 승인이 필요합니다
          </div>
        )}

        {/* Comments */}
        {detail && detail.comments.length > 0 && (
          <div>
            <Separator className="bg-zinc-800 mb-6" />
            <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-3">
              Comments ({detail.comments.length})
            </div>
            <div className="space-y-3">
              {detail.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-zinc-300">
                      {comment.author}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {formatDate(comment.created)}
                    </span>
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none leading-7 [&_p]:mb-3 [&_li]:mb-1.5 [&_pre]:my-4 [&_h2]:mt-6 [&_h3]:mt-5 [&_ul]:my-3 text-zinc-400">
                    <ReactMarkdown
                      rehypePlugins={[rehypeHighlight]}
                      remarkPlugins={[remarkGfm]}
                    >
                      {comment.body}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
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
