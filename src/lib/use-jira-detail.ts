"use client";

import { useState, useEffect, useCallback } from "react";
import { adfToText } from "@/lib/adf-to-markdown";

interface JiraComment {
  id: string;
  author: string;
  body: string;
  created: string;
}

interface JiraDetail {
  summary: string;
  description: string;
  status: string;
  assignee: string | null;
  priority: string | null;
  labels: string[];
  created: string;
  updated: string;
  comments: JiraComment[];
}

export function useJiraDetail(issueKey: string | null) {
  const [detail, setDetail] = useState<JiraDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!issueKey) {
      setDetail(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/jira/issue?key=${issueKey}`);
      const data = await res.json();
      if (data.issue) {
        const issue = data.issue;
        setDetail({
          summary: issue.fields.summary,
          description: adfToText(issue.fields.description),
          status: issue.fields.status?.name || "",
          assignee: issue.fields.assignee?.displayName || null,
          priority: issue.fields.priority?.name || null,
          labels: issue.fields.labels || [],
          created: issue.fields.created,
          updated: issue.fields.updated,
          comments: (issue.fields.comment?.comments || [])
            .map(
              (c: {
                id: string;
                author: { displayName: string };
                body: unknown;
                created: string;
              }) => ({
                id: c.id,
                author: c.author.displayName,
                body: adfToText(c.body),
                created: c.created,
              })
            )
            .reverse(),
        });
      }
    } catch {
      setDetail(null);
    }
    setLoading(false);
  }, [issueKey]);

  useEffect(() => {
    fetchDetail();

    // Auto-refresh every 10 seconds for near-realtime updates
    const interval = setInterval(fetchDetail, 10_000);
    return () => clearInterval(interval);
  }, [fetchDetail]);

  return { detail, loading, refetch: fetchDetail };
}
