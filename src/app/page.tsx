import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home({ searchParams }: { searchParams: Promise<{ inviteCode?: string; ref?: string }> }) {
  const session = await auth();
  const { inviteCode, ref } = await searchParams;
  const codeParam = inviteCode ? `?code=${encodeURIComponent(inviteCode)}` : "";

  if (!session) {
    // 추천 링크(?ref=)를 /login 으로 보존 — SignupSourceTracker 가 랜딩(/login)에서 캡처.
    const p = new URLSearchParams();
    if (inviteCode) p.set("code", inviteCode);
    if (ref) p.set("ref", ref);
    const qs = p.toString() ? `?${p.toString()}` : "";
    redirect(`/login${qs}`);
  }

  if (!session.user.isProfileComplete) {
    redirect(`/onboarding${codeParam}`);
  }

  if (!session.user.teamId) {
    redirect(`/team${codeParam}`);
  }

  redirect("/dashboard");
}
