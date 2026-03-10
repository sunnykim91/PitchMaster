import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createTeam, joinTeam } from "@/app/team/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function TeamPage() {
  const session = await auth();

  if (!session) redirect("/login");
  if (!session.user.isProfileComplete) redirect("/onboarding");
  if (session.user.teamId) redirect("/dashboard");

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">Create</p>
              <CardTitle className="font-heading text-2xl font-bold uppercase">새 팀 만들기</CardTitle>
              <CardDescription>팀명을 입력하면 초대 코드가 생성됩니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createTeam} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teamName">팀명</Label>
                  <Input id="teamName" name="teamName" required placeholder="예: 한강 FC" />
                </div>
                <Button type="submit" className="w-full">팀 생성하기</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">Join</p>
              <CardTitle className="font-heading text-2xl font-bold uppercase">초대 코드로 가입</CardTitle>
              <CardDescription>팀에서 받은 초대 코드를 입력하면 즉시 가입됩니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={joinTeam} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">초대 코드</Label>
                  <Input id="inviteCode" name="inviteCode" required placeholder="예: PITCH42" />
                </div>
                <Button type="submit" variant="secondary" className="w-full">팀 가입하기</Button>
              </form>
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 text-sm">
                  <p className="font-bold">가입 승인 옵션</p>
                  <p className="mt-1 text-muted-foreground">현재는 자동 승인으로 동작합니다. 추후 승인 모드에서 변경 가능합니다.</p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
