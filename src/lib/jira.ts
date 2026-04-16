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

// Convert Atlassian Document Format (ADF) to Markdown
export function adfToText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;
  const attrs = (n.attrs || {}) as Record<string, unknown>;
  const content = (n.content || []) as unknown[];

  // --- Inline nodes ---

  if (n.type === "text") {
    let text = (n.text as string) || "";
    const marks = (n.marks || []) as Record<string, unknown>[];
    for (const mark of marks) {
      switch (mark.type) {
        case "strong":
          text = `**${text}**`;
          break;
        case "em":
          text = `*${text}*`;
          break;
        case "strike":
          text = `~~${text}~~`;
          break;
        case "code":
          text = `\`${text}\``;
          break;
        case "link": {
          const href = (mark.attrs as Record<string, string>)?.href || "";
          text = `[${text}](${href})`;
          break;
        }
        case "underline":
          text = `<u>${text}</u>`;
          break;
      }
    }
    return text;
  }

  if (n.type === "mention") {
    return `@${(attrs.text as string) || "unknown"}`;
  }

  if (n.type === "emoji") {
    return (attrs.shortName as string) || (attrs.text as string) || "";
  }

  if (n.type === "hardBreak") {
    return "\n";
  }

  if (n.type === "inlineCard") {
    const url = (attrs.url as string) || "";
    return `[${url}](${url})`;
  }

  // --- Block nodes ---

  if (n.type === "paragraph") {
    return content.map(adfToText).join("") + "\n\n";
  }

  if (n.type === "heading") {
    const level = (attrs.level as number) || 1;
    const text = content.map(adfToText).join("");
    return `${"#".repeat(level)} ${text}\n\n`;
  }

  if (n.type === "codeBlock") {
    const lang = (attrs.language as string) || "";
    const code = content.map(adfToText).join("");
    return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
  }

  if (n.type === "blockquote") {
    const inner = content.map(adfToText).join("");
    return inner
      .split("\n")
      .map((line) => (line.trim() ? `> ${line}` : ">"))
      .join("\n") + "\n";
  }

  if (n.type === "rule") {
    return "---\n\n";
  }

  if (n.type === "bulletList") {
    return content
      .map((item) => {
        const text = adfToText(item).trim();
        return `- ${text}`;
      })
      .join("\n") + "\n\n";
  }

  if (n.type === "orderedList") {
    return content
      .map((item, i) => {
        const text = adfToText(item).trim();
        return `${i + 1}. ${text}`;
      })
      .join("\n") + "\n\n";
  }

  if (n.type === "listItem") {
    return content.map(adfToText).join("").trim();
  }

  // --- Table ---

  if (n.type === "table") {
    const rows = content.map(adfToText).filter(Boolean);
    if (rows.length === 0) return "";
    // Insert separator after header row
    const firstRow = rows[0];
    const colCount = (firstRow.match(/\|/g) || []).length - 1;
    const separator = "|" + " --- |".repeat(colCount);
    return [rows[0], separator, ...rows.slice(1)].join("\n") + "\n\n";
  }

  if (n.type === "tableRow") {
    const cells = content.map(adfToText);
    return "| " + cells.join(" | ") + " |";
  }

  if (n.type === "tableHeader" || n.type === "tableCell") {
    return content.map(adfToText).join("").replace(/\n/g, " ").trim();
  }

  // --- Media ---

  if (n.type === "mediaGroup" || n.type === "mediaSingle") {
    return content.map(adfToText).join("");
  }

  if (n.type === "media") {
    const alt = (attrs.alt as string) || "image";
    const url = (attrs.url as string) || "";
    if (url) return `![${alt}](${url})\n`;
    return `[${alt}]\n`;
  }

  // --- Panels / Info boxes ---

  if (n.type === "panel") {
    const panelType = (attrs.panelType as string) || "info";
    const icon = panelType === "warning" ? "⚠️" : panelType === "error" ? "❌" : panelType === "success" ? "✅" : "ℹ️";
    const inner = content.map(adfToText).join("").trim();
    return `> ${icon} ${inner}\n\n`;
  }

  // --- Task list (checkboxes) ---

  if (n.type === "taskList") {
    return content.map(adfToText).join("\n") + "\n\n";
  }

  if (n.type === "taskItem") {
    const checked = (attrs.state as string) === "DONE";
    const text = content.map(adfToText).join("").trim();
    return `- [${checked ? "x" : " "}] ${text}`;
  }

  // --- Expand (collapsible) ---

  if (n.type === "expand" || n.type === "nestedExpand") {
    const title = (attrs.title as string) || "";
    const inner = content.map(adfToText).join("");
    return `**${title}**\n${inner}\n`;
  }

  // --- Decision ---

  if (n.type === "decisionList") {
    return content.map(adfToText).join("\n") + "\n\n";
  }

  if (n.type === "decisionItem") {
    const text = content.map(adfToText).join("").trim();
    return `🔹 ${text}`;
  }

  // --- Status lozenge ---

  if (n.type === "status") {
    const text = (attrs.text as string) || "";
    return `\`${text}\``;
  }

  // --- Date ---

  if (n.type === "date") {
    const ts = attrs.timestamp as string;
    if (ts) {
      const d = new Date(Number(ts));
      return d.toLocaleDateString("ko-KR");
    }
    return "";
  }

  // --- Fallback: recurse into content ---

  if (content.length > 0) {
    return content.map(adfToText).join("");
  }

  return "";
}
