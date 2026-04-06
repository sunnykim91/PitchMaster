import { NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getDashboardData } from "@/lib/server/getDashboardData";

export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const data = await getDashboardData(ctx.teamId, ctx.userId);
  return apiSuccess(data);
}
