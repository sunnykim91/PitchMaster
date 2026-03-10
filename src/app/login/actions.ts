"use server";

import { redirect } from "next/navigation";
import { createDemoSession, setSession } from "@/lib/auth";

export async function startDemo() {
  const session = createDemoSession();
  await setSession(session);
  redirect("/onboarding");
}
