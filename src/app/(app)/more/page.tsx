import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MoreClient from "./MoreClient";

export default async function MorePage() {
  const session = await auth();
  if (!session) redirect("/login");
  return <MoreClient />;
}
