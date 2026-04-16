/**
 * Jira API 클라이언트.
 *
 * 인증 우선순위:
 *   1. 유저별 OAuth 토큰 (Jira OAuth 2.0 3LO)
 *   2. 환경변수 Basic Auth 폴백 (JIRA_EMAIL + JIRA_API_TOKEN)
 */

import { getCurrentUser } from "@/lib/session";
import { refreshAccessToken } from "@/lib/jira-oauth";
import { createServiceClient } from "@/lib/supabase";

const JIRA_BASE_URL = process.env.JIRA_BASE_URL || "";
const JIRA_EMAIL = process.env.JIRA_EMAIL || "";
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || "";

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

/** Jira 인증 정보 — OAuth 토큰 또는 Basic Auth */
interface JiraAuth {
  baseUrl: string;
  headers: Record<string, string>;
  accountId?: string;
}

async function resolveAuth(): Promise<JiraAuth> {
  // Try OAuth user first
  try {
    const user = await getCurrentUser();
    if (user?.jira_access_token && user.jira_cloud_id) {
      let accessToken = user.jira_access_token;

      // Check if token is expired and refresh
      if (
        user.jira_token_expires_at &&
        new Date(user.jira_token_expires_at) < new Date()
      ) {
        if (user.jira_refresh_token) {
          const tokens = await refreshAccessToken(user.jira_refresh_token);
          accessToken = tokens.access_token;

          // Update tokens in DB
          const supabase = createServiceClient();
          await supabase
            .from("users")
            .update({
              jira_access_token: tokens.access_token,
              jira_refresh_token: tokens.refresh_token,
              jira_token_expires_at: new Date(
                Date.now() + tokens.expires_in * 1000
              ).toISOString(),
            })
            .eq("id", user.id);
        }
      }

      return {
        baseUrl: `https://api.atlassian.com/ex/jira/${user.jira_cloud_id}`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        accountId: user.jira_account_id ?? undefined,
      };
    }
  } catch {
    // Fall through to env-based auth
  }

  // Fallback to env-based Basic Auth
  if (!JIRA_BASE_URL) throw new Error("JIRA_BASE_URL not configured");
  return {
    baseUrl: JIRA_BASE_URL,
    headers: {
      Authorization: `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64")}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
}

async function jiraFetch(
  path: string,
  apiVersion: "agile" | "api" = "agile"
) {
  const auth = await resolveAuth();
  const base = apiVersion === "agile" ? "/rest/agile/1.0" : "/rest/api/3";
  const res = await fetch(`${auth.baseUrl}${base}${path}`, {
    headers: auth.headers,
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

async function jiraPost(path: string, body: unknown) {
  const auth = await resolveAuth();
  const res = await fetch(`${auth.baseUrl}/rest/api/3${path}`, {
    method: "POST",
    headers: auth.headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jira API error: ${res.status} ${err}`);
  }

  // Some endpoints return 204 with no body
  const text = await res.text();
  return text ? JSON.parse(text) : {};
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
    assignee?: {
      displayName: string;
      avatarUrls?: Record<string, string>;
    } | null;
    priority?: { name: string } | null;
    labels: string[];
    created: string;
    updated: string;
    comment: {
      comments: {
        id: string;
        author: {
          displayName: string;
          avatarUrls?: Record<string, string>;
        };
        body: unknown;
        created: string;
        updated: string;
      }[];
    };
  };
}

export async function getIssueDetail(
  issueKey: string
): Promise<JiraIssueDetail> {
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

export async function transitionIssue(
  issueKey: string,
  transitionId: string
) {
  await jiraPost(`/issue/${issueKey}/transitions`, {
    transition: { id: transitionId },
  });
}

export async function createIssue(
  projectKey: string,
  summary: string,
  description?: string,
  labels?: string[]
) {
  // Auto-assign to current OAuth user
  const auth = await resolveAuth();

  const fields: Record<string, unknown> = {
    project: { key: projectKey },
    summary,
    issuetype: { name: "Task" },
    ...(auth.accountId
      ? { assignee: { accountId: auth.accountId } }
      : {}),
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

  return jiraPost("/issue", body) as Promise<{
    id: string;
    key: string;
    self: string;
  }>;
}

// Re-export for backward compatibility (server-side callers)
export { adfToText } from "./adf-to-markdown";
