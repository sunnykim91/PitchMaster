import { NextRequest, NextResponse } from "next/server";
import {
  getApiContext,
  requireRole,
  demoGuard,
  apiError,
  apiSuccess,
} from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { validateSafeName } from "@/lib/validators/safeText";
import { invalidateTeamStats } from "@/lib/server/aiTeamStats";

export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data: team, error } = await db
    .from("teams")
    .select("id, name, logo_url, invite_code, invite_expires_at, join_mode, sport_type, uniform_primary, uniform_secondary, uniform_pattern, uniforms, is_searchable, default_formation_id, stats_recording_staff_only, mvp_vote_staff_only, default_player_count")
    .eq("id", ctx.teamId)
    .single();

  if (error || !team) return apiError("Team not found", 404);
  return apiSuccess({ team });
}

export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.TEAM_SETTINGS);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const nameCheck = validateSafeName(body.name, { maxLength: 30, minLength: 2, fieldLabel: "팀 이름", requireMeaningful: true });
    if (!nameCheck.ok) return apiError(nameCheck.reason);
    updates.name = nameCheck.value;
  }
  if (body.logoUrl !== undefined) {
    // 안전한 URL만 허용 (http/https/빈 값)
    if (body.logoUrl && typeof body.logoUrl === "string") {
      const url = body.logoUrl.trim();
      if (url && !/^https?:\/\//i.test(url)) {
        return apiError("로고 URL은 http 또는 https로 시작해야 합니다");
      }
      updates.logo_url = url || null;
    } else {
      updates.logo_url = null;
    }
  }
  if (body.inviteExpiresAt !== undefined)
    updates.invite_expires_at = body.inviteExpiresAt;
  if (body.joinMode) updates.join_mode = body.joinMode;
  if (body.uniformPrimary !== undefined) updates.uniform_primary = body.uniformPrimary;
  if (body.uniformSecondary !== undefined) updates.uniform_secondary = body.uniformSecondary;
  if (body.uniformPattern !== undefined) updates.uniform_pattern = body.uniformPattern;
  if (body.uniforms !== undefined) updates.uniforms = body.uniforms;
  if (body.sportType !== undefined) updates.sport_type = body.sportType;
  if (body.isSearchable !== undefined) updates.is_searchable = body.isSearchable;
  if (body.defaultFormationId !== undefined) updates.default_formation_id = body.defaultFormationId;
  if (body.statsRecordingStaffOnly !== undefined)
    updates.stats_recording_staff_only = body.statsRecordingStaffOnly;
  if (body.mvpVoteStaffOnly !== undefined)
    updates.mvp_vote_staff_only = body.mvpVoteStaffOnly;
  if (body.defaultPlayerCount !== undefined) {
    const n = Number(body.defaultPlayerCount);
    if (!Number.isInteger(n) || n < 3 || n > 11) {
      return apiError("default player count는 3~11 사이 정수여야 합니다");
    }
    updates.default_player_count = n;
  }

  // sport_type ↔ default_player_count 일치성 검증
  // 풋살: 3~6, 축구: 8~11 만 허용 (UI 셀렉트 옵션과 일치)
  if (updates.sport_type !== undefined || updates.default_player_count !== undefined) {
    const { data: cur } = await db
      .from("teams")
      .select("sport_type, default_player_count")
      .eq("id", ctx.teamId)
      .single();

    const finalSport = (updates.sport_type as string | undefined) ?? cur?.sport_type ?? "SOCCER";
    const finalCount =
      (updates.default_player_count as number | undefined) ?? cur?.default_player_count;

    if (finalCount !== null && finalCount !== undefined) {
      const valid =
        finalSport === "FUTSAL"
          ? finalCount >= 3 && finalCount <= 6
          : finalCount >= 8 && finalCount <= 11;
      if (!valid) {
        const sportLabel = finalSport === "FUTSAL" ? "풋살" : "축구";
        const range = finalSport === "FUTSAL" ? "3~6" : "8~11";
        return apiError(
          `${sportLabel}팀의 기본 참가 인원은 ${range}만 가능합니다. 종목과 인원수를 함께 변경해주세요.`,
        );
      }
    }
  }

  const { error } = await db.from("teams").update(updates).eq("id", ctx.teamId);
  if (error) return apiError(error.message);

  // mvp_vote_staff_only 토글은 MVP 정책 분기에 영향 → 캐시 무효화
  if (updates.mvp_vote_staff_only !== undefined) {
    invalidateTeamStats(ctx.teamId).catch(() => {});
  }

  return apiSuccess({ ok: true });
}

export async function DELETE() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const demo = demoGuard(ctx);
  if (demo) return demo;

  const roleCheck = requireRole(ctx, PERMISSIONS.TEAM_DELETE);
  if (roleCheck) return roleCheck;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { error } = await db.from("teams").delete().eq("id", ctx.teamId);
  if (error) return apiError(error.message);
  return apiSuccess({ ok: true });
}
