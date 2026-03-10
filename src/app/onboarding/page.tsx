import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { completeOnboarding } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.isProfileComplete) {
    redirect("/team");
  }

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">가입 정보</p>
            <CardTitle className="font-heading text-3xl font-bold uppercase">기본 정보를 입력해주세요</CardTitle>
            <CardDescription>필수 정보를 입력해야 PitchMaster 기능을 이용할 수 있어요.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={completeOnboarding} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">생년월일</Label>
                  <Input id="birthDate" name="birthDate" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">연락처</Label>
                  <Input id="phone" name="phone" required placeholder="010-0000-0000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredFoot">주발</Label>
                  <NativeSelect id="preferredFoot" name="preferredFoot">
                    <option value="RIGHT">오른발</option>
                    <option value="LEFT">왼발</option>
                    <option value="BOTH">양발</option>
                  </NativeSelect>
                </div>
              </div>
              <div className="space-y-3">
                <Label>선호 포지션 (복수 선택)</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {["GK", "DF", "MF", "FW"].map((pos) => (
                    <label key={pos} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
                      <input type="checkbox" name="preferredPositions" value={pos} className="h-4 w-4 accent-primary" />
                      {pos}
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full">다음 단계로</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
