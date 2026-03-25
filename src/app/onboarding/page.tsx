import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { completeOnboarding } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { BirthDateSelect } from "@/components/ui/birth-date-select";
import { PhoneInput } from "@/components/ui/phone-input";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ code?: string; error?: string }> }) {
  const params = await searchParams;
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.isProfileComplete) {
    redirect("/team");
  }

  const errorMsg = params.error;

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-3xl">
        {errorMsg && (
          <Card className="mb-6 border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 text-sm font-semibold text-destructive">
              {decodeURIComponent(errorMsg)}
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">가입 정보</p>
            <CardTitle className="font-heading text-3xl font-bold uppercase">기본 정보를 입력해주세요</CardTitle>
            <CardDescription>이름과 선호 포지션은 필수입니다. 나머지는 나중에 설정에서 추가할 수 있어요.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={completeOnboarding} className="space-y-6">
              {params.code && <input type="hidden" name="inviteCode" value={params.code} />}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label>생년월일 <span className="text-muted-foreground font-normal">(선택)</span></Label>
                  <BirthDateSelect name="birthDate" defaultValue="" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">연락처 <span className="text-muted-foreground font-normal">(선택)</span></Label>
                  <PhoneInput id="phone" name="phone" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredFoot">주발 <span className="text-muted-foreground font-normal">(선택)</span></Label>
                  <NativeSelect id="preferredFoot" name="preferredFoot">
                    <option value="RIGHT">오른발</option>
                    <option value="LEFT">왼발</option>
                    <option value="BOTH">양발</option>
                  </NativeSelect>
                </div>
              </div>
              <div className="space-y-3">
                <Label>선호 포지션 (복수 선택)</Label>
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">골키퍼</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
                        <input type="checkbox" name="preferredPositions" value="GK" className="h-4 w-4 accent-primary" />
                        GK · 골키퍼
                      </label>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">수비</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <label className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
                        <input type="checkbox" name="preferredPositions" value="CB" className="h-4 w-4 accent-primary" />
                        CB · 센터백
                      </label>
                      <label className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
                        <input type="checkbox" name="preferredPositions" value="LB" className="h-4 w-4 accent-primary" />
                        LB · 좌측 윙백
                      </label>
                      <label className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
                        <input type="checkbox" name="preferredPositions" value="RB" className="h-4 w-4 accent-primary" />
                        RB · 우측 윙백
                      </label>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">미드필더</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <label className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
                        <input type="checkbox" name="preferredPositions" value="CDM" className="h-4 w-4 accent-primary" />
                        CDM · 수비형 미드필더
                      </label>
                      <label className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
                        <input type="checkbox" name="preferredPositions" value="CM" className="h-4 w-4 accent-primary" />
                        CM · 중앙 미드필더
                      </label>
                      <label className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
                        <input type="checkbox" name="preferredPositions" value="CAM" className="h-4 w-4 accent-primary" />
                        CAM · 공격형 미드필더
                      </label>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">공격</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <label className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
                        <input type="checkbox" name="preferredPositions" value="LW" className="h-4 w-4 accent-primary" />
                        LW · 좌측 윙어
                      </label>
                      <label className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
                        <input type="checkbox" name="preferredPositions" value="RW" className="h-4 w-4 accent-primary" />
                        RW · 우측 윙어
                      </label>
                      <label className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
                        <input type="checkbox" name="preferredPositions" value="ST" className="h-4 w-4 accent-primary" />
                        ST · 스트라이커
                      </label>
                    </div>
                  </div>
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
