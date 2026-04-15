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

// Convert Atlassian Document Format (ADF) to plain text
export function adfToText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;

  if (n.type === "text") return (n.text as string) || "";

  if (n.type === "codeBlock") {
    const lang = (n.attrs as Record<string, string>)?.language || "";
    const code = ((n.content as unknown[]) || []).map(adfToText).join("");
    return `\`\`\`${lang}\n${code}\n\`\`\`\n`;
  }

  if (n.type === "heading") {
    const level = (n.attrs as Record<string, number>)?.level || 1;
    const text = ((n.content as unknown[]) || []).map(adfToText).join("");
    return `${"#".repeat(level)} ${text}\n`;
  }

  if (n.type === "bulletList" || n.type === "orderedList") {
    return ((n.content as unknown[]) || [])
      .map((item, i) => {
        const text = adfToText(item);
        const prefix = n.type === "orderedList" ? `${i + 1}. ` : "- ";
        return `${prefix}${text}`;
      })
      .join("\n") + "\n";
  }

  if (n.type === "listItem") {
    return ((n.content as unknown[]) || []).map(adfToText).join("").trim();
  }

  if (n.type === "paragraph") {
    return ((n.content as unknown[]) || []).map(adfToText).join("") + "\n";
  }

  if (Array.isArray(n.content)) {
    return (n.content as unknown[]).map(adfToText).join("");
  }

  return "";
}
