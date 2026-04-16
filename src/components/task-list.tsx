"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

interface TaskListProps {
  tasks: Task[];
  selectedKey: string | null;
  onSelect: (issueKey: string) => void;
  boardFilter: string;
  onBoardFilterChange: (board: string) => void;
  boards: string[];
  jiraStatuses: string[];
  onCreateIssue: () => void;
}

const statusDotColor: Record<string, string> = {
  running: "bg-blue-500",
  completed: "bg-green-400",
  error: "bg-red-400",
  idle: "bg-zinc-500",
  pending: "bg-amber-500",
  unresponsive: "bg-orange-400",
};

const statusLabel: Record<string, string> = {
  running: "실행 중",
  completed: "완료",
  error: "에러",
  idle: "대기",
  pending: "승인 대기",
  unresponsive: "응답 없음",
};

export function TaskList({
  tasks,
  selectedKey,
  onSelect,
  boardFilter,
  onBoardFilterChange,
  boards,
  jiraStatuses,
  onCreateIssue,
}: TaskListProps) {
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set());

  const toggleStatus = (status: string) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const filteredTasks =
    activeStatuses.size === 0
      ? tasks
      : tasks.filter((t) => activeStatuses.has(t.jira_status));

  return (
    <div className="w-full md:w-[300px] bg-zinc-900 border-r border-zinc-800 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-semibold text-white">Tasks</h2>
          <button
            className="text-xs text-blue-500 hover:text-blue-400"
            onClick={onCreateIssue}
          >
            + 새 이슈
          </button>
        </div>
        <select
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-300"
          value={boardFilter}
          onChange={(e) => onBoardFilterChange(e.target.value)}
        >
          <option value="all">All Boards</option>
          {boards.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        {jiraStatuses.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {jiraStatuses.map((s) => (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors border",
                  activeStatuses.has(s)
                    ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                    : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300 hover:border-zinc-600"
                )}
              >
                {s}
              </button>
            ))}
            {activeStatuses.size > 0 && (
              <button
                onClick={() => setActiveStatuses(new Set())}
                className="px-2 py-0.5 rounded-full text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                초기화
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredTasks.length === 0 && (
          <div className="px-4 py-12 text-center text-zinc-500 text-sm">
            <p className="font-medium text-zinc-400 mb-1">작업이 없습니다</p>
            <p>Jira 보드를 구독하면 여기에 표시됩니다.</p>
          </div>
        )}
        {filteredTasks.map((task) => (
          <button
            key={task.issue_key}
            className={cn(
              "w-full text-left px-4 py-3 border-b border-zinc-800/50 transition-colors",
              selectedKey === task.issue_key
                ? "bg-blue-950/30 border-l-2 border-l-blue-500"
                : "hover:bg-zinc-800/50 border-l-2 border-l-transparent"
            )}
            onClick={() => onSelect(task.issue_key)}
          >
            <div className="text-xs text-blue-500 font-medium">
              {task.issue_key}
            </div>
            <div className="text-[13px] text-zinc-300 mt-0.5 truncate">
              {task.title}
            </div>
            <div className="flex justify-between mt-1.5 text-[11px] text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    statusDotColor[task.status] || "bg-zinc-500"
                  )}
                />
                {task.jira_status || statusLabel[task.status] || task.status}
              </span>
              <span>
                {task.agent_name ? `${task.agent_name} · ` : ""}
                {task.elapsed}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
