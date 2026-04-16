"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Agent, AgentEvent } from "@/types";

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("agents")
      .select("*")
      .order("name");
    if (data) setAgents(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAgents();

    if (!supabase) return;

    const channel = supabase
      .channel("agents-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agents" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setAgents((prev) => [...prev, payload.new as Agent]);
          } else if (payload.eventType === "UPDATE") {
            setAgents((prev) =>
              prev.map((a) =>
                a.id === (payload.new as Agent).id
                  ? (payload.new as Agent)
                  : a
              )
            );
          } else if (payload.eventType === "DELETE") {
            setAgents((prev) =>
              prev.filter((a) => a.id !== (payload.old as Agent).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [fetchAgents]);

  return { agents, loading };
}

export function useAgentEvents(limit = 50, onNewEvent?: (event: AgentEvent) => void) {
  const [events, setEvents] = useState<AgentEvent[]>([]);

  const fetchEvents = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("agent_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data) setEvents(data);
  }, [limit]);

  useEffect(() => {
    fetchEvents();

    if (!supabase) return;

    const channel = supabase
      .channel("events-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_events" },
        (payload) => {
          const newEvent = payload.new as AgentEvent;
          setEvents((prev) => [newEvent, ...prev].slice(0, limit));
          onNewEvent?.(newEvent);
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [fetchEvents, limit, onNewEvent]);

  return { events };
}
