const JIRA_BASE_URL = process.env.JIRA_BASE_URL || "";
const JIRA_EMAIL = process.env.JIRA_EMAIL || "";
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || "";

const headers = {
  Authorization: `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64")}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

// Server-side in-memory cache (30s TTL)
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 30_000;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

async function jiraFetch(path: string) {
  if (!JIRA_BASE_URL) throw new Error("JIRA_BASE_URL not configured");

  const res = await fetch(`${JIRA_BASE_URL}/rest/agile/1.0${path}`, {
    headers,
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("retry-after") || "5", 10);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return jiraFetch(path);
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
