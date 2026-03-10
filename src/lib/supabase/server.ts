import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Returns a Supabase server client using the anon key.
 * Returns null when env vars are missing (demo mode).
 */
export function getSupabaseServer(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!_client) {
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

/** Shorthand: throws if Supabase is not configured */
export function requireSupabase(): SupabaseClient {
  const client = getSupabaseServer();
  if (!client) throw new Error("Supabase is not configured");
  return client;
}
