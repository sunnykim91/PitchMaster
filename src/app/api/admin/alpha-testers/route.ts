import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const WINDOW_DAYS = 20;
const PLAY_CONSOLE_REQUIRED_STREAK = 14;

function todayKstDate(): Date {
  const now = new Date();
  const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
  const kst = new Date(kstMs);
  kst.setUTCHours(0, 0, 0, 0);
  return kst;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// approved_at TIMESTAMPTZ → KST 날짜 (YYYY-MM-DD)
function tsToKstDateKey(iso: string): string {
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return dateKey(new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate())));
}

function addDays(dateKeyStr: string, days: number): string {
  const [y, m, d] = dateKeyStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export async function GET() {
  const session = await auth();
  if (!session || !isPlatformAdmin(session.user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "DB not available" }, { status: 503 });
  }

  const todayKey = dateKey(todayKstDate());

  const [testersRes, logsRes] = await Promise.all([
    db
      .from("alpha_testers")
      .select("id, user_id, google_email, registered_at, approved_at, rewarded_at, notes")
      .order("registered_at", { ascending: false }),
    db.from("alpha_tester_daily_log").select("alpha_tester_id, log_date"),
  ]);

  if (testersRes.error) {
    console.error("[admin/alpha-testers testers]", testersRes.error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
  if (logsRes.error) {
    console.error("[admin/alpha-testers logs]", logsRes.error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }

  const testerRows = testersRes.data ?? [];

  const userIds = testerRows.map((t) => t.user_id);
  const usersRes = userIds.length
    ? await db.from("users").select("id, name, kakao_id").in("id", userIds)
    : { data: [], error: null };
  if (usersRes.error) {
    console.error("[admin/alpha-testers users]", usersRes.error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
  const userMap = new Map((usersRes.data ?? []).map((u) => [u.id, u]));

  const logsByTester = new Map<string, Set<string>>();
  for (const row of logsRes.data ?? []) {
    const set = logsByTester.get(row.alpha_tester_id) ?? new Set<string>();
    set.add(row.log_date);
    logsByTester.set(row.alpha_tester_id, set);
  }

  const testers = testerRows.map((t) => {
    const user = userMap.get(t.user_id);
    const logs = logsByTester.get(t.id) ?? new Set<string>();

    // 승인일이 anchor (Day 1). 미승인이면 anchor 없음 → 카운트 안 함
    const anchorDate = t.approved_at ? tsToKstDateKey(t.approved_at) : null;

    let dayDates: string[] = [];
    let attendance: boolean[] = [];
    let totalDays = 0;
    let streak = 0;

    if (anchorDate) {
      dayDates = Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(anchorDate, i));
      attendance = dayDates.map((d) => {
        // 미래 날짜는 false (아직 안 옴)
        if (d > todayKey) return false;
        return logs.has(d);
      });
      totalDays = attendance.filter(Boolean).length;

      // 연속 출석: D1부터 시작해서 끊기지 않은 일수
      // 미래는 카운트 못 하니 "오늘까지의 연속 출석"으로 잡음
      for (let i = 0; i < WINDOW_DAYS; i++) {
        if (dayDates[i] > todayKey) break; // 미래는 미정
        if (attendance[i]) streak++;
        else {
          streak = 0;
          // 끊겼지만 이후 다시 시작할 수 있음 — 가장 최근 streak 계산
        }
      }

      // 위 로직은 "마지막 끊김 이후 현재까지의 연속" — 오늘 시점 기준으로 정확
      // 다시 계산: 오늘부터 거꾸로 끊기지 않은 일수
      let cur = 0;
      for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
        if (dayDates[i] > todayKey) continue;
        if (attendance[i]) cur++;
        else break;
      }
      streak = cur;
    }

    return {
      id: t.id,
      userId: t.user_id,
      name: user?.name ?? "(알 수 없음)",
      kakaoId: user?.kakao_id ?? null,
      googleEmail: t.google_email,
      registeredAt: t.registered_at,
      approvedAt: t.approved_at,
      rewardedAt: t.rewarded_at,
      notes: t.notes,
      anchorDate,
      dayDates,
      attendance,
      totalDays,
      streak,
    };
  });

  // 14일 연속 도달 = streak >= 14 (Play Console 프로덕션 신청 요건. 윈도우는 20일이지만 요건 자체는 14일 유지)
  const continuous14Count = testers.filter((t) => t.streak >= PLAY_CONSOLE_REQUIRED_STREAK).length;
  const eligibleForProduction = continuous14Count >= 12;

  return NextResponse.json({
    today: todayKey,
    windowDays: WINDOW_DAYS,
    testers,
    summary: {
      total: testers.length,
      approved: testers.filter((t) => t.approvedAt).length,
      continuous14Count,
      eligibleForProduction,
    },
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || !isPlatformAdmin(session.user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: {
    id?: unknown;
    approved?: unknown;
    rewarded?: unknown;
    notes?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.id !== "string") {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "DB not available" }, { status: 503 });
  }

  const patch: Record<string, string | null> = {};
  if (body.approved === true) patch.approved_at = new Date().toISOString();
  else if (body.approved === false) patch.approved_at = null;
  if (body.rewarded === true) patch.rewarded_at = new Date().toISOString();
  else if (body.rewarded === false) patch.rewarded_at = null;
  if (typeof body.notes === "string") patch.notes = body.notes.slice(0, 500);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const { error } = await db.from("alpha_testers").update(patch).eq("id", body.id);
  if (error) {
    console.error("[admin/alpha-testers PATCH]", error);
    return NextResponse.json({ error: "갱신 실패" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session || !isPlatformAdmin(session.user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "DB not available" }, { status: 503 });
  }
  const { error } = await db.from("alpha_testers").delete().eq("id", id);
  if (error) {
    console.error("[admin/alpha-testers DELETE]", error);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
