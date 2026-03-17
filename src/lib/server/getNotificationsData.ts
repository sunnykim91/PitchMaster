import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function getNotificationsData(userId: string) {
  const db = getSupabaseAdmin();
  if (!db) return { notifications: [], settings: null };

  const [notifRes, settingsRes] = await Promise.all([
    db.from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    db.from("notification_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  return {
    notifications: notifRes.data ?? [],
    settings: settingsRes.data ?? null,
  };
}
