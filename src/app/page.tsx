"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { TaskList } from "@/components/task-list";
import { TaskDetail } from "@/components/task-detail";
import { AgentDashboard } from "@/components/agent-dashboard";
import { BoardPickerModal } from "@/components/board-picker-modal";
import { CreateIssueModal } from "@/components/create-issue-modal";
import { useJiraBoards, useJiraIssues } from "@/lib/use-jira";
import { useAgents, useAgentEvents } from "@/lib/use-realtime";
import type { Task, Result } from "@/types";

export default function Home() {
  const [activeView, setActiveView] = useState("tasks");
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [boardFilter, setBoardFilter] = useState("all");
  const [subscribedBoardIds, setSubscribedBoardIds] = useState<number[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("acc-subscribed-boards");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeBoardId, setActiveBoardId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("acc-active-board");
      return saved ? Number(saved) : null;
    } catch {
      return null;
    }
  });
  const [showBoardPicker, setShowBoardPicker] = useState(false);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const { boards: jiraBoards } = useJiraBoards();
  const { issues: jiraIssues, refetch: refetchIssues } = useJiraIssues(activeBoardId);
  const { agents } = useAgents();

  // Realtime: refetch issues when new agent events arrive
  const refetchRef = React.useRef(refetchIssues);
  refetchRef.current = refetchIssues;
  const handleNewEvent = useCallback(() => {
    refetchRef.current();
  }, []);
  useAgentEvents(10, handleNewEvent);

  // Persist subscriptions to localStorage
  useEffect(() => {
    localStorage.setItem("acc-subscribed-boards", JSON.stringify(subscribedBoardIds));
  }, [subscribedBoardIds]);

  useEffect(() => {
    if (activeBoardId !== null) {
      localStorage.setItem("acc-active-board", String(activeBoardId));
    }
  }, [activeBoardId]);

  // Auto-subscribe to first board (only if nothing saved)
  useEffect(() => {
    if (jiraBoards.length > 0 && subscribedBoardIds.length === 0) {
      const firstId = jiraBoards[0].id;
      setSubscribedBoardIds([firstId]);
      setActiveBoardId(firstId);
    }
  }, [jiraBoards, subscribedBoardIds.length]);

  // Convert Jira issues to Task format
  const tasks: Task[] = useMemo(() => {
    return jiraIssues.map((issue) => {
      const agent = agents.find((a) =>
        a.current_task_ids?.includes(issue.key)
      );

      const jiraStatusName = issue.fields?.status?.name || "";
      let status: Task["status"] = "idle";
      if (agent) {
        status = agent.status === "running" ? "running" : agent.status;
      } else {
        const jiraStatus = jiraStatusName.toLowerCase();
        if (jiraStatus.includes("done") || jiraStatus.includes("완료")) {
          status = "completed";
        } else if (jiraStatus.includes("progress") || jiraStatus.includes("진행")) {
          status = "running";
        }
      }

      return {
        issue_key: issue.key,
        title: issue.fields?.summary || "Untitled",
        status,
        jira_status: jiraStatusName,
        agent_name: agent?.name || null,
        agent_id: agent?.id || null,
        elapsed: agent ? "진행 중" : "",
        has_pending_approval: false,
        latest_result_id: null,
        latest_event: null,
      };
    });
  }, [jiraIssues, agents]);

  // Extract unique Jira statuses for filter
  const jiraStatuses = useMemo(() => {
    const statuses = new Set(tasks.map((t) => t.jira_status).filter(Boolean));
    return Array.from(statuses).sort();
  }, [tasks]);

  // Filter tasks by board
  const filteredTasks = useMemo(() => {
    if (boardFilter === "all") return tasks;
    const board = jiraBoards.find((b) => b.name === boardFilter);
    if (!board?.location?.projectKey) return tasks;
    return tasks.filter((t) =>
      t.issue_key.startsWith(board.location!.projectKey)
    );
  }, [tasks, boardFilter, jiraBoards]);

  const subscribedBoards = jiraBoards.filter((b) =>
    subscribedBoardIds.includes(b.id)
  );

  const sidebarBoards = subscribedBoards.map((b) => ({
    id: b.id,
    name: b.name,
    project_key: b.location?.projectKey || "",
  }));

  const currentTask =
    filteredTasks.find((t) => t.issue_key === selectedTask) ?? null;

  const currentResult: Result | null = null;

  const handleBoardSubscribe = (boardId: number) => {
    if (!subscribedBoardIds.includes(boardId)) {
      setSubscribedBoardIds((prev) => [...prev, boardId]);
    }
    setActiveBoardId(boardId);
  };

  const handleBoardUnsubscribe = (boardId: number) => {
    setSubscribedBoardIds((prev) => prev.filter((id) => id !== boardId));
    if (activeBoardId === boardId) {
      const remaining = subscribedBoardIds.filter((id) => id !== boardId);
      setActiveBoardId(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const projectKeys = useMemo(() => {
    const keys = new Set(
      subscribedBoards
        .map((b) => b.location?.projectKey)
        .filter(Boolean) as string[]
    );
    return Array.from(keys);
  }, [subscribedBoards]);

  const handleCreateIssue = async (
    projectKey: string,
    summary: string,
    description: string,
    labels: string[]
  ) => {
    await fetch("/api/jira/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_key: projectKey, summary, description, labels }),
    });
    setShowCreateIssue(false);
    if (activeBoardId) {
      const id = activeBoardId;
      setActiveBoardId(null);
      setTimeout(() => setActiveBoardId(id), 100);
    }
  };

  const handleReply = async (
    issueKey: string,
    action: "approve" | "reject" | "reply",
    message?: string
  ) => {
    await fetch("/api/agents/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue_key: issueKey, action, message }),
    });
  };

  // Mobile: show detail when task selected, back button to return to list
  const mobileShowDetail = selectedTask !== null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — hidden on mobile, toggle with hamburger */}
      <div className={`
        ${showSidebar ? "fixed inset-0 z-40 flex" : "hidden"}
        md:relative md:flex md:z-auto
      `}>
        {/* Backdrop */}
        {showSidebar && (
          <div
            className="fixed inset-0 bg-black/50 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}
        <div className="relative z-50">
          <Sidebar
            activeView={activeView}
            onViewChange={(view) => {
              setShowSidebar(false);
              if (view === "add-board") {
                setShowBoardPicker(true);
                return;
              }
              setActiveView(view);
            }}
            boards={sidebarBoards}
          />
        </div>
      </div>

      {activeView === "dashboard" ? (
        <div className="flex-1 flex flex-col">
          {/* Mobile header */}
          <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-900">
            <button onClick={() => setShowSidebar(true)} className="text-zinc-400">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              </svg>
            </button>
            <span className="text-sm font-semibold text-white">Dashboard</span>
          </div>
          <AgentDashboard agents={agents} />
        </div>
      ) : (
        <>
          {/* Task List — full width on mobile when no task selected */}
          <div className={`
            ${mobileShowDetail ? "hidden" : "flex-1"}
            md:flex-none md:block
          `}>
            {/* Mobile header */}
            <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-900">
              <button onClick={() => setShowSidebar(true)} className="text-zinc-400">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                </svg>
              </button>
              <span className="text-sm font-semibold text-white">Tasks</span>
            </div>
            <TaskList
              tasks={filteredTasks}
              selectedKey={selectedTask}
              onSelect={setSelectedTask}
              boardFilter={boardFilter}
              onBoardFilterChange={(filter) => {
                setBoardFilter(filter);
                const board = jiraBoards.find((b) => b.name === filter);
                if (board) setActiveBoardId(board.id);
              }}
              boards={subscribedBoards.map((b) => b.name)}
              jiraStatuses={jiraStatuses}
              onCreateIssue={() => setShowCreateIssue(true)}
            />
          </div>

          {/* Task Detail — full width on mobile when task selected */}
          <div className={`
            ${mobileShowDetail ? "flex-1 flex flex-col" : "hidden"}
            md:flex-1 md:flex md:flex-col
          `}>
            {/* Mobile back button */}
            {mobileShowDetail && (
              <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-900">
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-zinc-400"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M12 4L6 10L12 16" />
                  </svg>
                </button>
                <span className="text-sm font-semibold text-white truncate">
                  {currentTask?.issue_key} {currentTask?.title}
                </span>
              </div>
            )}
            <TaskDetail
              task={currentTask}
              result={currentResult}
              onApprove={(key, msg) => handleReply(key, "approve", msg)}
              onReject={(key, msg) => handleReply(key, "reject", msg)}
              onReply={(key, msg) => handleReply(key, "reply", msg)}
            />
          </div>
        </>
      )}
      {showCreateIssue && (
        <CreateIssueModal
          projectKeys={projectKeys}
          onSubmit={handleCreateIssue}
          onClose={() => setShowCreateIssue(false)}
        />
      )}
      {showBoardPicker && (
        <BoardPickerModal
          boards={jiraBoards}
          subscribedIds={subscribedBoardIds}
          onSubscribe={handleBoardSubscribe}
          onUnsubscribe={handleBoardUnsubscribe}
          onClose={() => setShowBoardPicker(false)}
        />
      )}
    </div>
  );
}
