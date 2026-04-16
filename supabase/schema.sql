-- Agent Control Center DB Schema
-- Run this in Supabase SQL Editor

-- Teams
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Users
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  team_id uuid references teams(id),
  role text default 'member',
  created_at timestamptz default now()
);

-- Agents
create table if not exists agents (
  id text primary key,
  team_id uuid references teams(id),
  name text not null,
  type text default 'symphony',
  orchestrator_id text,
  status text default 'idle' check (status in ('idle', 'running', 'error', 'completed', 'unresponsive')),
  current_task_ids jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- Agent Events
create table if not exists agent_events (
  id uuid primary key default gen_random_uuid(),
  agent_id text references agents(id),
  team_id uuid references teams(id),
  event_type text not null,
  payload jsonb default '{}'::jsonb,
  jira_issue_key text,
  result_id uuid,
  created_at timestamptz default now()
);

create index idx_agent_events_agent_id on agent_events(agent_id);
create index idx_agent_events_jira_key on agent_events(jira_issue_key);
create index idx_agent_events_created on agent_events(created_at desc);

-- Results (separated from events for DRY)
create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  agent_id text references agents(id),
  team_id uuid references teams(id),
  event_id uuid,
  jira_issue_key text,
  content_md text not null,
  created_at timestamptz default now()
);

create index idx_results_jira_key on results(jira_issue_key);

-- Jira Subscriptions
create table if not exists jira_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  team_id uuid references teams(id),
  board_id integer not null,
  board_name text not null,
  project_key text not null,
  created_at timestamptz default now(),
  unique(user_id, board_id)
);

-- Enable Realtime on agents, agent_events, and results
alter publication supabase_realtime add table agents;
alter publication supabase_realtime add table agent_events;
alter publication supabase_realtime add table results;

-- 90-day retention cleanup (run via pg_cron)
-- select cron.schedule('cleanup-old-events', '0 3 * * *',
--   $$delete from agent_events where created_at < now() - interval '90 days'$$
-- );
