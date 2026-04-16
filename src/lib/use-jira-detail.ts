"use client";

import { useState, useEffect } from "react";
import { adfToText } from "@/lib/jira";

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

  useEffect(() => {
    if (!issueKey) {
      setDetail(null);
      return;
    }

    setLoading(true);
    fetch(`/api/jira/issue?key=${issueKey}`)
      .then((res) => res.json())
      .then((data) => {
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
            comments: (issue.fields.comment?.comments || []).map(
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
            ).reverse(),
          });
        }
        setLoading(false);
      })
      .catch(() => {
        setDetail(null);
        setLoading(false);
      });
  }, [issueKey]);

  return { detail, loading };
}
