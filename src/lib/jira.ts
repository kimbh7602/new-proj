const JIRA_BASE_URL = process.env.JIRA_BASE_URL || "";
const JIRA_EMAIL = process.env.JIRA_EMAIL || "";
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || "";

const headers = {
  Authorization: `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64")}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

// Server-side in-memory cache (10s TTL for near-realtime)
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 10_000;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

async function jiraFetch(path: string, apiVersion: "agile" | "api" = "agile") {
  if (!JIRA_BASE_URL) throw new Error("JIRA_BASE_URL not configured");

  const base = apiVersion === "agile" ? "/rest/agile/1.0" : "/rest/api/3";
  const res = await fetch(`${JIRA_BASE_URL}${base}${path}`, {
    headers,
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("retry-after") || "5", 10);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return jiraFetch(path, apiVersion);
  }

  if (!res.ok) {
    throw new Error(`Jira API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export interface JiraBoard {
  id: number;
  name: string;
  type: string;
  location?: { projectKey: string; projectName: string };
}

export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    status: { name: string };
    assignee?: { displayName: string } | null;
    priority?: { name: string } | null;
  };
}

export async function getBoards(): Promise<JiraBoard[]> {
  const cached = getCached<JiraBoard[]>("boards");
  if (cached) return cached;

  const data = await jiraFetch("/board");
  const boards = data.values as JiraBoard[];
  setCache("boards", boards);
  return boards;
}

export async function getBoardIssues(boardId: number): Promise<JiraIssue[]> {
  const cacheKey = `board-${boardId}-issues`;
  const cached = getCached<JiraIssue[]>(cacheKey);
  if (cached) return cached;

  const data = await jiraFetch(`/board/${boardId}/issue?maxResults=50`);
  const issues = data.issues as JiraIssue[];
  setCache(cacheKey, issues);
  return issues;
}

export interface JiraIssueDetail {
  key: string;
  fields: {
    summary: string;
    description: unknown;
    status: { name: string };
    assignee?: { displayName: string; avatarUrls?: Record<string, string> } | null;
    priority?: { name: string } | null;
    labels: string[];
    created: string;
    updated: string;
    comment: {
      comments: {
        id: string;
        author: { displayName: string; avatarUrls?: Record<string, string> };
        body: unknown;
        created: string;
        updated: string;
      }[];
    };
  };
}

export async function getIssueDetail(issueKey: string): Promise<JiraIssueDetail> {
  const cacheKey = `issue-${issueKey}`;
  const cached = getCached<JiraIssueDetail>(cacheKey);
  if (cached) return cached;

  const data = await jiraFetch(
    `/issue/${issueKey}?fields=summary,description,status,assignee,priority,labels,created,updated,comment`,
    "api"
  );
  setCache(cacheKey, data);
  return data as JiraIssueDetail;
}

export async function getIssueTransitions(issueKey: string) {
  const data = await jiraFetch(`/issue/${issueKey}/transitions`, "api");
  return data.transitions as { id: string; name: string }[];
}

export async function transitionIssue(issueKey: string, transitionId: string) {
  if (!JIRA_BASE_URL) throw new Error("JIRA_BASE_URL not configured");

  const res = await fetch(
    `${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/transitions`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ transition: { id: transitionId } }),
    }
  );

  if (!res.ok) {
    throw new Error(`Jira transition error: ${res.status} ${res.statusText}`);
  }
}

export async function createIssue(projectKey: string, summary: string, description?: string, labels?: string[]) {
  if (!JIRA_BASE_URL) throw new Error("JIRA_BASE_URL not configured");

  const fields: Record<string, unknown> = {
    project: { key: projectKey },
    summary,
    issuetype: { name: "Task" },
  };

  if (labels && labels.length > 0) {
    fields.labels = labels;
  }

  const body: Record<string, unknown> = { fields };

  if (description) {
    body.fields = {
      ...fields,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: description }],
          },
        ],
      },
    };
  }

  const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jira create error: ${res.status} ${err}`);
  }

  return res.json() as Promise<{ id: string; key: string; self: string }>;
}

// Re-export for backward compatibility (server-side callers)
export { adfToText } from "./adf-to-markdown";
