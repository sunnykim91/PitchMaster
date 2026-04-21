"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Target, BarChart3, Trophy, Swords, Hash, List, Users, Bell, BellRing, MessageSquare, Dribbble, FileText, ShieldCheck, Settings2, CalendarDays, ImageIcon, CloudSun, Moon, Share2, Crosshair, Image as ImageLucide, Wallet, Grid3x3, CheckCircle2, Smartphone, Sparkles, Award, Brain, Camera, PenTool, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

const primaryFeatures = [
  { icon: Brain, title: "AI 전술 편성", desc: "우리 팀 기록·참석자·상대 이력으로 쿼터별 포메이션+배치 자동 설계" },
  { icon: Sparkles, title: "AI 감독 코칭", desc: "편성 근거·공격 루트·고비 쿼터까지 감독 톤으로 작전 브리핑 자동 생성" },
  { icon: Camera, title: "AI 회비 OCR", desc: "통장 스크린샷·카뱅 엑셀 한 장이면 입금자·금액 자동 매칭" },
  { icon: PenTool, title: "자동 경기 후기", desc: "득점·MVP·참석 데이터로 경기 끝난 직후 한 문장 후기 즉시 완성" },
  { icon: Sparkles, title: "FIFA 스타일 선수 카드", desc: "OVR·등급·시그니처 — 카톡 공유로 자랑하는 재미" },
  { icon: Monitor, title: "PC·모바일 모두", desc: "경기 전날 밤엔 PC, 현장엔 폰 — 브라우저만 있으면 OS·기기 무관" },
  { icon: Award, title: "시즌 어워드", desc: "MOM·득점왕·도움왕·철벽·개근 등 7종 자동 시상" },
  { icon: Grid3x3, title: "쿼터별 출전 매트릭스", desc: "쿼터별 출전 현황 한눈에 + 감독 지정 포지션 우선 적용" },
  { icon: Wallet, title: "자동 벌금 부과", desc: "지각·불참 자동 차감으로 총무가 일일이 안 챙겨도 OK" },
  { icon: CheckCircle2, title: "자동 완료 처리", desc: "경기 시간 지나면 자동 완료 + 투표 마감일도 자동 설정" },
  { icon: Smartphone, title: "PWA 즉시 사용", desc: "앱스토어 거치지 않고 카카오톡 링크 공유로 바로 실행" },
  { icon: Target, title: "원탭 득점 기록", desc: "쿼터별 스코어보드로 득점·어시스트 즉시 기록" },
  { icon: BarChart3, title: "커리어 프로필", desc: "베스트 모먼트·시즌 누적·승률·랭킹을 한 페이지에" },
];

const extraPromoted = [
  { icon: Trophy, title: "MVP 투표", desc: "경기 후 팀원이 직접 뽑는 MVP" },
  { icon: Swords, title: "자체전 (A팀 vs B팀)", desc: "랜덤 편성, 팀별 스코어보드, 전적 반영" },
  { icon: Hash, title: "등번호 & 주장/부주장", desc: "등번호 설정 + 주장·부주장 지정, 전술판 연동" },
  { icon: List, title: "기록 상세 드릴다운", desc: "골·어시·MVP·출석 숫자 탭 → 해당 경기 확인" },
];

const extraFeatures = [
  { icon: Users, title: "용병 관리", desc: "경기별 용병 등록, 포지션 지정" },
  { icon: Bell, title: "회비 미납 알림", desc: "미납자 푸시 알림 + 매월 자동 리마인더" },
  { icon: BellRing, title: "투표 마감 리마인더", desc: "마감 전날 미투표자에게 자동 푸시" },
  { icon: MessageSquare, title: "팀 게시판", desc: "공지사항, 자유글, 투표까지 팀 전용 소통" },
  { icon: Dribbble, title: "풋살 전용 지원", desc: "3~8인제 완전 지원, 풋살 전용 포지션·전술판 별도" },
  { icon: FileText, title: "경기 일지 & 공유", desc: "결과 카드 카카오톡 공유 + 댓글" },
  { icon: ShieldCheck, title: "회장 이임 & 승인제", desc: "회장 권한 이양, 가입 승인 모드" },
  { icon: Settings2, title: "회칙 · 유니폼 · 시즌", desc: "팀 운영에 필요한 부가 기능 일체" },
  { icon: CalendarDays, title: "팀 일정 등록", desc: "회식·MT 등 경기 외 일정도 한곳에서" },
  { icon: ImageIcon, title: "팀 로고 업로드", desc: "이미지 크롭으로 로고 등록, 헤더 표시" },
  { icon: CloudSun, title: "경기일 날씨 예보", desc: "경기 5일 전부터 대시보드에 자동 표시" },
  { icon: Moon, title: "라이트/다크 모드", desc: "야외에선 밝게, 실내에선 어둡게" },
  { icon: Share2, title: "게시판 글 공유", desc: "게시글·투표를 카톡이나 링크로 즉시 공유" },
  { icon: Crosshair, title: "PK/FK 골 유형 분류", desc: "일반골·PK·FK·헤딩·자책골 세분화 기록" },
  { icon: ImageLucide, title: "경기 결과 공유 카드", desc: "경기 일지에서 이미지 카드로 결과 공유" },
];

export default function MoreFeaturesSection() {
  const [expanded, setExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setIsVisible(true); }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const visibleExtra = expanded ? [...extraPromoted, ...extraFeatures] : [];
  const totalExtraCount = extraPromoted.length + extraFeatures.length;

  return (
    <section ref={ref} className="relative border-t border-border/30 bg-card/30 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-primary">And More</p>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">이것만이 아닙니다</h2>
          <p className="mt-2 text-muted-foreground">팀 운영에 필요한 모든 기능을 담았습니다.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {primaryFeatures.map((f, i) => (
            <div
              key={f.title}
              className={`group rounded-xl border border-border bg-card/50 p-4 transition-all duration-300 hover:border-primary/30 hover:bg-primary/5 sm:p-5 ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary transition-colors group-hover:bg-primary/20">
                <f.icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        {visibleExtra.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {visibleExtra.map((f, i) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border bg-card/50 p-4 transition-all duration-300 hover:border-border/60 sm:p-5 animate-fade-in-up"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                  <f.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Button variant="outline" size="lg" onClick={() => setExpanded(!expanded)} className="gap-2 rounded-full px-8">
            {expanded ? "접기" : `더 많은 기능 보기 (${totalExtraCount})`}
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </Button>
        </div>
      </div>
    </section>
  );
}
