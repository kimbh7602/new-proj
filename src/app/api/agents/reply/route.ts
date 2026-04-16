import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

const JIRA_BASE_URL = process.env.JIRA_BASE_URL || "";
const JIRA_EMAIL = process.env.JIRA_EMAIL || "";
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || "";

async function addJiraComment(issueKey: string, body: string): Promise<void> {
  if (!JIRA_BASE_URL) return;

  const res = await fetch(
    `${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/comment`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64")}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: body }],
            },
          ],
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jira comment error: ${res.status} ${err}`);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { issue_key, action, message } = body as {
    issue_key: string;
    action: "approve" | "reject" | "reply";
    message?: string;
  };

  if (!issue_key || !action) {
    return NextResponse.json(
      { error: "issue_key and action are required" },
      { status: 400 }
    );
  }

  // Build comment text
  const prefix =
    action === "approve"
      ? "✅ 승인됨"
      : action === "reject"
        ? "❌ 거절됨"
        : "💬 댓글";
  const commentText = message ? `${prefix}: ${message}` : prefix;

  // Post comment to Jira
  try {
    await addJiraComment(issue_key, commentText);
  } catch {
    return NextResponse.json(
      { error: "Failed to post comment to Jira" },
      { status: 502 }
    );
  }

  // Record in Supabase (if configured)
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createServiceClient();
    await supabase.from("agent_events").insert({
      agent_id: "dashboard-user",
      event_type: `user.${action}`,
      payload: { message, action },
      jira_issue_key: issue_key,
    });
  }

  // Symphony receives feedback via Supabase Realtime subscription
  // (agent_events INSERT above triggers it — no HTTP callback needed)

  return NextResponse.json({ ok: true, action, issue_key });
}
