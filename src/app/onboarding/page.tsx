import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { completeOnboarding } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { BirthDateSelect } from "@/components/ui/birth-date-select";
import { PhoneInput } from "@/components/ui/phone-input";
import type { SportType } from "@/lib/types";

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

  // 초대코드가 있으면 해당 팀의 스포츠 타입 조회
  let sportType: SportType = "SOCCER";
  if (params.code) {
    const db = getSupabaseAdmin();
    if (db) {
      const { data: team } = await db
        .from("teams")
        .select("sport_type")
        .eq("invite_code", params.code.toUpperCase())
        .single();
      if (team?.sport_type === "FUTSAL") sportType = "FUTSAL";
    }
  }
  const isFutsal = sportType === "FUTSAL";

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-3xl">
        {/* 프로그레스 바 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {["프로필 입력", "팀 선택", "시작!"].map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  {i + 1}
                </div>
                <span className={`text-xs font-medium ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
              </div>
            ))}
          </div>
          <div className="relative h-1 rounded-full bg-secondary">
            <div className="absolute h-1 rounded-full bg-primary" style={{ width: "16%" }} />
          </div>
        </div>

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
                {isFutsal ? (
                  /* ── 풋살 포지션 ── */
                  <div className="grid gap-2 sm:grid-cols-2">
                    {([
                      { value: "GK", name: "골레이루 (GK)", desc: "골키퍼 — 골문을 지키는 역할" },
                      { value: "FIXO", name: "피소 (FIXO)", desc: "수비 — 축구의 센터백과 유사, 수비 조율" },
                      { value: "ALA", name: "아라 (ALA)", desc: "측면 — 축구의 윙어와 유사, 측면 공수 전환" },
                      { value: "PIVO", name: "피벗 (PIVO)", desc: "공격 — 축구의 스트라이커와 유사, 최전방 공격" },
                    ]).map((pos) => (
                      <label key={pos.value} className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 cursor-pointer hover:bg-accent transition-colors">
                        <input type="checkbox" name="preferredPositions" value={pos.value} className="h-4 w-4 accent-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{pos.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{pos.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  /* ── 축구 포지션 ── */
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
                        {([["CB", "센터백"], ["LB", "좌측 윙백"], ["RB", "우측 윙백"]] as const).map(([v, l]) => (
                          <label key={v} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
                            <input type="checkbox" name="preferredPositions" value={v} className="h-4 w-4 accent-primary" />
                            {v} · {l}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">미드필더</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {([["CDM", "수비형 미드필더"], ["CM", "중앙 미드필더"], ["CAM", "공격형 미드필더"]] as const).map(([v, l]) => (
                          <label key={v} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
                            <input type="checkbox" name="preferredPositions" value={v} className="h-4 w-4 accent-primary" />
                            {v} · {l}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">공격</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {([["LW", "좌측 윙어"], ["RW", "우측 윙어"], ["ST", "스트라이커"]] as const).map(([v, l]) => (
                          <label key={v} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
                            <input type="checkbox" name="preferredPositions" value={v} className="h-4 w-4 accent-primary" />
                            {v} · {l}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full">다음 단계로</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
