export type AgentStatus = "idle" | "running" | "error" | "completed" | "unresponsive";

export interface Agent {
  id: string;
  team_id: string;
  name: string;
  type: string;
  orchestrator_id: string;
  status: AgentStatus;
  current_task_ids: string[];
  updated_at: string;
}

export interface AgentEvent {
  id: string;
  agent_id: string;
  team_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  jira_issue_key: string | null;
  result_id: string | null;
  created_at: string;
}

export interface Result {
  id: string;
  agent_id: string;
  team_id: string;
  event_id: string;
  jira_issue_key: string | null;
  content_md: string;
  created_at: string;
}

export interface JiraSubscription {
  id: string;
  user_id: string;
  team_id: string;
  board_id: number;
  board_name: string;
  project_key: string;
}

// Webhook payload from orchestrator
export interface WebhookPayload {
  event_type:
    | "agent.status_changed"
    | "agent.task_started"
    | "agent.task_completed"
    | "agent.error"
    | "agent.plan_sent"
    | "agent.plan_approved";
  agent_id: string;
  agent_name: string;
  timestamp: string;
  jira_issue_key: string | null;
  payload: {
    status?: AgentStatus;
    message?: string | null;
    result_md?: string | null;
    plan_number?: number;
    cost?: number;
    error?: string;
  };
}

export interface Task {
  issue_key: string;
  title: string;
  status: AgentStatus | "pending";
  jira_status: string;
  agent_name: string | null;
  agent_id: string | null;
  elapsed: string;
  has_pending_approval: boolean;
  latest_result_id: string | null;
  latest_event: AgentEvent | null;
}
