"use client";

import { cn } from "@/lib/utils";
import type { AgentEvent } from "@/types";

interface EventTimelineProps {
  events: AgentEvent[];
}

const eventDotColor: Record<string, string> = {
  "agent.task_started": "bg-blue-500",
  "agent.task_completed": "bg-green-400",
  "agent.error": "bg-red-400",
  "agent.status_changed": "bg-zinc-400",
  "agent.plan_sent": "bg-amber-400",
  "agent.plan_approved": "bg-green-400",
};

const eventLabel: Record<string, string> = {
  "agent.task_started": "started",
  "agent.task_completed": "completed",
  "agent.error": "failed",
  "agent.status_changed": "status changed",
  "agent.plan_sent": "plan sent",
  "agent.plan_approved": "plan approved",
};

export function EventTimeline({ events }: EventTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 text-sm">
        이벤트가 아직 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
      {events.map((event, i) => {
        const time = new Date(event.created_at).toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const dotColor = eventDotColor[event.event_type] || "bg-zinc-500";
        const label = eventLabel[event.event_type] || event.event_type;

        return (
          <div
            key={event.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-[13px]",
              i < events.length - 1 && "border-b border-zinc-800"
            )}
          >
            <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
            <span className="text-zinc-300">
              <strong className="text-white">
                {(event.payload as Record<string, unknown>)?.agent_name as string || event.agent_id}
              </strong>{" "}
              {label}{" "}
              {event.jira_issue_key && (
                <span className="text-blue-500">{event.jira_issue_key}</span>
              )}
              {event.event_type === "agent.error" &&
                (event.payload as Record<string, unknown>)?.error ? (
                  <span className="text-red-400">
                    {" — "}
                    {String((event.payload as Record<string, unknown>).error)}
                  </span>
                ) : null}
            </span>
            <span className="ml-auto text-zinc-500 text-xs whitespace-nowrap">
              {time}
            </span>
          </div>
        );
      })}
    </div>
  );
}
