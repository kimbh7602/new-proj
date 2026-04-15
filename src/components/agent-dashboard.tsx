"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { Agent } from "@/types";

interface AgentDashboardProps {
  agents: Agent[];
}

const statusConfig: Record<
  string,
  { dot: string; bg: string; label: string }
> = {
  running: {
    dot: "bg-blue-500 animate-pulse",
    bg: "border-blue-900/50",
    label: "Running",
  },
  completed: {
    dot: "bg-green-400",
    bg: "border-green-900/50",
    label: "Completed",
  },
  error: { dot: "bg-red-400", bg: "border-red-900/50", label: "Error" },
  idle: { dot: "bg-zinc-500", bg: "border-zinc-800", label: "Idle" },
  unresponsive: {
    dot: "bg-orange-400",
    bg: "border-orange-900/50",
    label: "Unresponsive",
  },
};

export function AgentDashboard({ agents }: AgentDashboardProps) {
  if (agents.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        <div className="text-center">
          <p className="text-zinc-400 font-medium mb-1">
            연결된 에이전트가 없습니다
          </p>
          <p className="text-sm">
            Symphony에서 webhook을 설정하면 에이전트가 여기에 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Agents</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {agents.map((agent) => {
          const config = statusConfig[agent.status] || statusConfig.idle;
          return (
            <Card
              key={agent.id}
              className={cn(
                "bg-zinc-900 border",
                config.bg
              )}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold text-sm text-white">
                    {agent.name}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <span className={cn("w-2 h-2 rounded-full", config.dot)} />
                    {config.label}
                  </span>
                </div>
                <div className="text-xs text-zinc-500">
                  {agent.current_task_ids.length > 0 ? (
                    <span>
                      <span className="text-blue-500">
                        {agent.current_task_ids.join(", ")}
                      </span>
                    </span>
                  ) : (
                    "대기 중"
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
