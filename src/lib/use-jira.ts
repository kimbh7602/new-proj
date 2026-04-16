"use client";

import { useState, useEffect, useCallback } from "react";

interface JiraBoard {
  id: number;
  name: string;
  location?: { projectKey: string; projectName: string };
}

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    status: { name: string };
    assignee?: { displayName: string } | null;
  };
}

export function useJiraBoards() {
  const [boards, setBoards] = useState<JiraBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/jira/boards")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setBoards(data.boards || []);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Jira 연결 실패");
        setLoading(false);
      });
  }, []);

  return { boards, loading, error };
}

export function useJiraIssues(boardId: number | null) {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchIssues = useCallback(async () => {
    if (!boardId) {
      setIssues([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/jira/issues?boardId=${boardId}`);
      const data = await res.json();
      // Filter out issues without required fields
      const valid = (data.issues || []).filter(
        (i: JiraIssue) => i && i.key && i.fields
      );
      setIssues(valid);
    } catch {
      setIssues([]);
    }
    setLoading(false);
  }, [boardId]);

  useEffect(() => {
    fetchIssues();

    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchIssues, 15_000);
    return () => clearInterval(interval);
  }, [fetchIssues]);

  return { issues, loading, refetch: fetchIssues };
}
