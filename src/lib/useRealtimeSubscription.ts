"use client";

import { useEffect, useRef } from "react";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";

let _realtimeClient: ReturnType<typeof createClient> | null = null;

function getRealtimeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!_realtimeClient) {
    _realtimeClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _realtimeClient;
}

type SubscriptionConfig = {
  /** Supabase table name to listen to */
  table: string;
  /** Optional filter (e.g., "match_id=eq.xxx") */
  filter?: string;
  /** Events to listen for */
  events?: ("INSERT" | "UPDATE" | "DELETE")[];
  /** Callback when a change is detected */
  onchange: () => void;
};

/**
 * Subscribe to Supabase Realtime postgres_changes.
 * Automatically cleans up on unmount or config change.
 */
export function useRealtimeSubscription({
  table,
  filter,
  events = ["INSERT", "UPDATE", "DELETE"],
  onchange,
}: SubscriptionConfig) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onchangeRef = useRef(onchange);
  onchangeRef.current = onchange;

  useEffect(() => {
    const client = getRealtimeClient();
    if (!client) return;

    const channelName = `realtime-${table}-${filter ?? "all"}`;
    const channel = client.channel(channelName);

    for (const event of events) {
      const config: Record<string, string> = {
        event,
        schema: "public",
        table,
      };
      if (filter) config.filter = filter;

      channel.on(
        "postgres_changes" as never,
        config,
        () => {
          onchangeRef.current();
        },
      );
    }

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter]);
}
