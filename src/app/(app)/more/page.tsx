import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MoreClient from "./MoreClient";

export default async function MorePage() {
  const session = await auth();
  if (!session) redirect("/login");
  return (
    <MoreClient
      userName={session.user.name ?? ""}
      teamName={session.user.teamName ?? ""}
      teamRole={session.user.teamRole ?? "MEMBER"}
      profileImageUrl={session.user.profileImageUrl ?? null}
    />
  );
}
