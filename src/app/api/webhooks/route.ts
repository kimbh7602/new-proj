import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { verifyWebhookSignature } from "@/lib/webhook-auth";
import { WebhookPayload } from "@/types";

export async function POST(request: NextRequest) {
  // Guard: Supabase not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const rawBody = await request.text();

  // HMAC signature verification
  const signature = request.headers.get("x-webhook-signature");
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Basic validation
  if (!payload.event_type || !payload.agent_id || !payload.timestamp) {
    return NextResponse.json(
      { error: "Missing required fields: event_type, agent_id, timestamp" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Upsert agent status
  const agentUpdate: Record<string, unknown> = {
    id: payload.agent_id,
    name: payload.agent_name,
    status: payload.payload.status || "running",
    updated_at: payload.timestamp,
  };

  if (payload.jira_issue_key) {
    // Use RPC or handle jsonb append for current_task_ids
    agentUpdate.current_task_ids = [payload.jira_issue_key];
  }

  await supabase.from("agents").upsert(agentUpdate, { onConflict: "id" });

  // Store result separately if present
  let resultId: string | null = null;
  if (payload.payload.result_md) {
    const { data: result } = await supabase
      .from("results")
      .insert({
        agent_id: payload.agent_id,
        jira_issue_key: payload.jira_issue_key,
        content_md: payload.payload.result_md,
      })
      .select("id")
      .single();
    resultId = result?.id ?? null;
  }

  // Insert event (without result_md in payload to keep events table lean)
  const eventPayload = { ...payload.payload };
  delete eventPayload.result_md;

  await supabase.from("agent_events").insert({
    agent_id: payload.agent_id,
    event_type: payload.event_type,
    payload: eventPayload,
    jira_issue_key: payload.jira_issue_key,
    result_id: resultId,
  });

  // Clear current_task_ids on completion/error
  if (
    payload.event_type === "agent.task_completed" ||
    payload.event_type === "agent.error"
  ) {
    if (payload.event_type === "agent.task_completed") {
      await supabase
        .from("agents")
        .update({ status: "completed", current_task_ids: [] })
        .eq("id", payload.agent_id);
    } else {
      await supabase
        .from("agents")
        .update({ status: "error", current_task_ids: [] })
        .eq("id", payload.agent_id);
    }
  }

  return NextResponse.json({ ok: true });
}
