import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import GalleryClient from "./GalleryClient";

export const metadata = {
  title: "팀 사진 갤러리 | PitchMaster",
  description: "경기 후기 사진을 한곳에서 모아봅니다.",
};

export default async function GalleryPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!session.user.teamId) redirect("/team");

  return <GalleryClient teamName={session.user.teamName ?? "우리 팀"} />;
}
