import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// This endpoint sends a reply/approval/rejection back to the orchestrator.
// Symphony's WebhookClient will need a corresponding receiver endpoint,
// or we post to Slack as a fallback channel.
export async function POST(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

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

  const supabase = createServiceClient();

  // Record the action as an event
  await supabase.from("agent_events").insert({
    agent_id: "dashboard-user",
    event_type: `user.${action}`,
    payload: { message, action },
    jira_issue_key: issue_key,
  });

  // Forward to Symphony callback URL if configured
  const symphonyCallbackUrl = process.env.SYMPHONY_CALLBACK_URL;
  if (symphonyCallbackUrl) {
    try {
      await fetch(symphonyCallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue_key, action, message }),
      });
    } catch {
      // Non-blocking: log but don't fail the request
    }
  }

  return NextResponse.json({ ok: true, action, issue_key });
}
