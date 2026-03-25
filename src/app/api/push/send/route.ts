import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isStaffOrAbove } from "@/lib/permissions";
import { sendTeamPush } from "@/lib/server/sendPush";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isStaffOrAbove(session.user.teamRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!session.user.teamId) {
    return NextResponse.json({ error: "No team" }, { status: 400 });
  }

  const { title, body, url, userIds } = await req.json();
  if (!title || !body) {
    return NextResponse.json({ error: "Missing title or body" }, { status: 400 });
  }

  const result = await sendTeamPush(session.user.teamId, {
    title,
    body,
    url: url ?? "/dashboard",
    userIds: userIds && Array.isArray(userIds) && userIds.length > 0 ? userIds : undefined,
  });

  return NextResponse.json(result);
}
