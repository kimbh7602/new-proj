"use client";

import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/sidebar";
import { TaskList } from "@/components/task-list";
import { TaskDetail } from "@/components/task-detail";
import { AgentDashboard } from "@/components/agent-dashboard";
import { BoardPickerModal } from "@/components/board-picker-modal";
import { CreateIssueModal } from "@/components/create-issue-modal";
import { useJiraBoards, useJiraIssues } from "@/lib/use-jira";
import { useAgents } from "@/lib/use-realtime";
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

  const { boards: jiraBoards, loading: boardsLoading } = useJiraBoards();
  const { issues: jiraIssues } = useJiraIssues(activeBoardId);
  const { agents } = useAgents();

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
      // Find agent working on this issue
      const agent = agents.find((a) =>
        a.current_task_ids.includes(issue.key)
      );

      let status: Task["status"] = "idle";
      if (agent) {
        status = agent.status === "running" ? "running" : agent.status;
      } else {
        // Map Jira status to our status
        const jiraStatus = issue.fields.status.name.toLowerCase();
        if (jiraStatus.includes("done") || jiraStatus.includes("완료")) {
          status = "completed";
        } else if (jiraStatus.includes("progress") || jiraStatus.includes("진행")) {
          status = "running";
        }
      }

      return {
        issue_key: issue.key,
        title: issue.fields.summary,
        status,
        jira_status: issue.fields.status.name,
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

  // TODO: Fetch actual result from Supabase
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
    // Refresh by toggling active board
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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activeView={activeView}
        onViewChange={(view) => {
          if (view === "add-board") {
            setShowBoardPicker(true);
            return;
          }
          setActiveView(view);
        }}
        boards={sidebarBoards}
      />

      {activeView === "dashboard" ? (
        <AgentDashboard agents={agents} />
      ) : (
        <>
          <TaskList
            tasks={filteredTasks}
            selectedKey={selectedTask}
            onSelect={setSelectedTask}
            boardFilter={boardFilter}
            onBoardFilterChange={(filter) => {
              setBoardFilter(filter);
              // Switch active board for fetching issues
              const board = jiraBoards.find((b) => b.name === filter);
              if (board) setActiveBoardId(board.id);
            }}
            boards={subscribedBoards.map((b) => b.name)}
            jiraStatuses={jiraStatuses}
            onCreateIssue={() => setShowCreateIssue(true)}
          />
          <TaskDetail
            task={currentTask}
            result={currentResult}
            onApprove={(key, msg) => handleReply(key, "approve", msg)}
            onReject={(key, msg) => handleReply(key, "reject", msg)}
            onReply={(key, msg) => handleReply(key, "reply", msg)}
          />
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
