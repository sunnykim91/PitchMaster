import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Role, Session } from "@/lib/types";
import { hasMinRole } from "@/lib/permissions";

export type ApiContext = {
  session: Session;
  userId: string;
  teamId: string;
  teamRole: Role;
  isDemo: boolean;
};

/** Extract and validate session for API routes */
export async function getApiContext(): Promise<ApiContext | NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const teamId = session.user.teamId;
  const teamRole = session.user.teamRole;

  if (!teamId || !teamRole) {
    return NextResponse.json({ error: "No team" }, { status: 403 });
  }

  return {
    session,
    userId,
    teamId,
    teamRole,
    isDemo: !!session.user.isDemo,
  };
}

/** Check role for API routes, returns error response or null */
export function requireRole(
  ctx: ApiContext,
  minRole: Role
): NextResponse | null {
  if (!hasMinRole(ctx.teamRole, minRole)) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }
  return null;
}

/** Check if Supabase is available */
export function isDbAvailable(): boolean {
  return !!getSupabaseAdmin();
}

/** Block demo users from specific actions */
export function demoGuard(ctx: ApiContext): NextResponse | null {
  if (ctx.isDemo) {
    return NextResponse.json(
      { error: "데모 모드에서는 사용할 수 없는 기능입니다" },
      { status: 403 }
    );
  }
  return null;
}

/** Standard error response */
export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Standard success response */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
