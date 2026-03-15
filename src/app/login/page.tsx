import { isKakaoConfigured } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const kakaoEnabled = isKakaoConfigured();

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-8">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">PitchMaster</p>
            <h1 className="font-heading text-4xl font-bold uppercase leading-tight md:text-5xl">
              조기축구 운영을 한 화면에.
              <span className="block text-primary">팀 일정, 회비, 기록까지 한 번에.</span>
            </h1>
            <p className="text-base text-muted-foreground">
              카카오 로그인 기반의 팀 관리 허브로 경기 일정, 참석 투표, 회비 투명 관리, MVP
              기록을 빠르게 연결합니다.
            </p>
            <div className="flex flex-wrap gap-3">
              {kakaoEnabled ? (
                <Button className="bg-[#FEE500] text-[#1E1E1E] hover:bg-[#FEE500]/90" asChild>
                  <a href="/api/auth/kakao">카카오로 시작하기</a>
                </Button>
              ) : (
                <Button className="bg-[#FEE500] text-[#1E1E1E]" disabled>
                  카카오로 시작하기 (환경변수 필요)
                </Button>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                "다가오는 경기 일정과 참석 투표",
                "전술판 기반 스쿼드 편성",
                "회비 수납/지출 투명 공유",
                "골·어시스트·MVP 기록",
              ].map((item) => (
                <Card key={item} className="bg-card/50">
                  <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <Card className="flex items-center justify-center">
            <CardContent className="p-8 text-center space-y-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">PitchMaster</p>
              <h2 className="font-heading text-2xl font-bold uppercase">조기축구 팀 관리 플랫폼</h2>
              <ul className="space-y-3 text-sm text-muted-foreground text-left">
                {["경기 일정 등록과 참석 투표", "전술판으로 포메이션 편성", "회비 수납/지출 투명 관리", "골·어시스트·MVP 기록 관리"].map((text) => (
                  <li key={text} className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    {text}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">카카오 로그인으로 간편하게 시작하세요.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
