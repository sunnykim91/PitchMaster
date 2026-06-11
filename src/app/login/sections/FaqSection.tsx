"use client";

/**
 * FaqSection — 자주 묻는 질문 (21개)
 *
 * - 카테고리 chip 4개(비용/기능/시작/관리)로 필터
 * - 검색 input (Q 키워드)
 * - 첫 번째 Q 기본 펼침
 * - 펼친 답변에 코랄 키워드 자동 하이라이트 ("무료","AI","자동","휴면","면제")
 * - 펼친 카드 좌측 코랄 strip
 */

import { useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion, AnimatePresence } from "framer-motion";
import { Plus, Search } from "lucide-react";

type Cat = "비용" | "기능" | "시작" | "관리";

const FAQS: Array<{ q: string; a: string; cat: Cat }> = [
  { cat: "비용", q: "정말 무료인가요?", a: "네, 현재는 모든 기능이 무료입니다. 광고도 없습니다." },
  { cat: "비용", q: "앞으로도 계속 무료인가요?", a: "현재는 무료로 운영 중입니다. 향후 운영 상황에 따라 정책이 달라질 수 있으며, 변경 시 사전에 충분히 안내드립니다." },
  { cat: "시작", q: "왜 PitchMaster를 만들었나요?", a: "조기축구 5년차 회장인 제가 운영진들이 팀을 위해서 헌신하는데 조금 더 도움이 되고자 만들게 되었는데, 우리나라 다른 조기축구·풋살팀에서도 활용해보면 좋을 것 같아서 평소에 불편했던 부분들, 실제로 회장하면서 겪은 문제들을 담아서 만들었습니다. 진짜로 쓸데없는 기능 없이 필요한 기능만 만들었습니다." },
  { cat: "시작", q: "가입 없이 둘러볼 수 있나요?", a: "데모 모드가 있어서 가입 없이 30초 만에 핵심 화면을 둘러볼 수 있습니다. 실제로 데이터를 만들어보지는 않아도 흐름은 다 확인됩니다." },
  { cat: "시작", q: "어떻게 시작하나요?", a: "카카오로 1분 안에 가입 → 팀 만들기 → 초대 링크 공유. 팀원은 초대 링크에서 카카오 로그인만 하면(따로 가입 절차 없이) 바로 참석 투표할 수 있습니다." },
  { cat: "시작", q: "기존 팀 데이터를 옮길 수 있나요?", a: "엑셀·시트로 정리된 회비/명단은 한 번에 import 가능합니다. 카톡 출석 기록은 자동 변환은 어렵고 처음부터 PitchMaster에서 쌓는 걸 추천드립니다." },
  { cat: "시작", q: "네이버 밴드나 단톡방을 꼭 끊어야 하나요?", a: "아니요. 밴드·단톡방은 그대로 두고, 매주 반복되는 운영(출석 투표·회비 정산·라인업·기록)만 PitchMaster로 옮기는 팀이 많습니다. 사진·잡담·공지 같은 소통은 익숙한 단톡방에서 계속하고, 총무를 가장 힘들게 하는 운영 업무만 자동으로 처리하는 보조 운영툴로 쓰는 게 가장 부담이 없습니다." },
  { cat: "기능", q: "AI 라인업은 어떻게 동작하나요?", a: "참석자 명단·선호 포지션·과거 경기 기록·상대팀 이력을 분석해 포메이션과 쿼터별 출전을 자동 추천합니다. 이건 다른 운영 앱에 없는 기능입니다." },
  { cat: "기능", q: "우리 팀만의 전술 영상도 만들 수 있나요?", a: "네, 운영진이 선수 위치를 직접 그려 우리 팀 빌드업·수비 흐름을 영상처럼 만들 수 있습니다. 만든 영상은 경기 역할 가이드에서 팀원들이 자동으로 보게 됩니다. 축구 11명·풋살 5~8명 모두 지원합니다." },
  { cat: "기능", q: "팀원이 자기 포지션 역할을 알 수 있나요?", a: "쿼터별로 본인 포지션의 역할·움직임이 카드로 자동 정리됩니다. 축구 11인제 10 포메이션 + 풋살 5·6인제 지원. 투표 마감 시 본인 예상 역할이 푸시로 도착합니다." },
  { cat: "기능", q: "경기 후기는 어떻게 만들어지나요?", a: "경기 종료 즉시 스코어·MOM·골 기록 기반 한 문장 후기가 자동 생성됩니다. 기록이 누적될수록 더 풍성해집니다." },
  { cat: "기능", q: "회비 OCR이 정확한가요?", a: "은행 앱 캡처를 올리면 입금자명·금액을 자동 인식해 명단과 매칭합니다. 휴면·부상 회원은 자동 면제 처리됩니다." },
  { cat: "기능", q: "축구뿐 아니라 풋살도 되나요?", a: "네, 풋살 전용 포지션·전술판·역할 가이드가 별도로 지원됩니다. 주로 5·6인제에 최적화되어 있고, 다른 인원수도 운영 가능합니다. 한 팀에서 축구·풋살을 같이 운영하는 경우도 OK입니다." },
  { cat: "기능", q: "팀원이 카카오 계정이 없으면요?", a: "참석 투표·개인 기록은 카카오 로그인이 필요합니다. 카카오 계정이 없는 팀원은 운영진이 명단에 등록해 출결을 대신 관리할 수 있고, 본인이 직접 투표·기록 확인을 하려면 카카오 로그인(무료·1분)만 하면 됩니다." },
  { cat: "관리", q: "여러 팀을 동시에 운영할 수 있나요?", a: "한 카카오 계정으로 여러 팀을 만들고 전환할 수 있습니다. 회장이 두 팀 운영하는 경우도 흔해서 초기부터 지원합니다." },
  { cat: "관리", q: "회칙·공지는 따로 관리되나요?", a: "회칙 페이지와 공지/게시판이 분리되어 있어서 단톡방에 묻히지 않습니다. 고정 공지·댓글도 가능합니다." },
  { cat: "관리", q: "벌금은 자동으로 부과되나요?", a: "지각·불참 자동 차감 규칙을 회칙에 명시하면, 매번 묻지 않아도 자동으로 회비에서 차감됩니다." },
  { cat: "관리", q: "월별 결산은 어떻게 보나요?", a: "월별 수입·지출·잔고가 자동 집계되어 한 화면에 보입니다. 팀원 공유용 요약 카드는 이미지로 저장하거나 카톡으로 바로 공유할 수 있습니다." },
  { cat: "기능", q: "안드로이드(갤럭시) 앱이 있나요?", a: "네, Google Play 스토어에 정식 출시됐습니다. '피치마스터'를 검색하거나 스토어 링크로 설치하면 홈 화면 아이콘으로 바로 실행할 수 있어요. 아이폰은 아직 별도 앱이 없지만, 사파리에서 '홈 화면에 추가'를 하면 앱처럼 사용할 수 있습니다. 어느 쪽이든 카카오 로그인이 같아 데이터는 그대로 유지됩니다." },
  { cat: "기능", q: "PC에서도 쓸 수 있나요?", a: "PC는 브라우저로 바로 쓸 수 있고, 휴대폰은 앱으로도 쓸 수 있습니다. 안드로이드(갤럭시 등)는 Google Play에서 '피치마스터'를 설치하면 되고, 아이폰은 홈 화면에 추가하면 앱처럼 사용됩니다. 어느 쪽이든 같은 계정·데이터로 이어집니다." },
  { cat: "관리", q: "운영진 권한 분리가 되나요?", a: "회장/총무/일반 팀원 권한이 분리되어 있고, 회비·라인업·공지 권한도 세부 토글이 가능합니다." },
  { cat: "관리", q: "우리 팀 데이터는 안전한가요?", a: "출석·회비·경기 기록은 한국 서울 리전에 암호화되어 보관되고, 권한이 있는 운영진만 접근할 수 있습니다. 카카오 로그인만 사용해 별도 비밀번호는 저장하지 않습니다. 월별 결산은 PDF·이미지로 저장해 앱과 별개로도 기록을 남길 수 있습니다." },
];

const CATS: Cat[] = ["비용", "기능", "시작", "관리"];
const HIGHLIGHT_WORDS = ["무료", "AI", "자동", "휴면", "면제"];

function highlight(text: string) {
  // split by any highlight word and re-render with span around matches
  const re = new RegExp(`(${HIGHLIGHT_WORDS.join("|")})`, "g");
  const parts = text.split(re);
  return parts.map((p, i) =>
    HIGHLIGHT_WORDS.includes(p) ? (
      <strong
        key={i}
        style={{
          color: "hsl(var(--primary))",
          fontWeight: 700,
        }}
      >
        {p}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export default function FaqSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduced = useReducedMotion();

  const [activeCat, setActiveCat] = useState<Cat | null>(null);
  const [query, setQuery] = useState("");
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const filtered = useMemo(() => {
    return FAQS.map((f, i) => ({ ...f, _i: i })).filter((f) => {
      if (activeCat && f.cat !== activeCat) return false;
      if (query) {
        const q = query.trim().toLowerCase();
        if (!f.q.toLowerCase().includes(q) && !f.a.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [activeCat, query]);

  return (
    <section
      ref={ref}
      id="faq"
      className="relative overflow-hidden py-20 lg:py-28 px-5 lg:px-14"
      style={{
        background:
          "radial-gradient(ellipse 60% 40% at 50% 0%, hsl(var(--accent) / 0.10), transparent 60%), hsl(var(--background))",
        wordBreak: "keep-all",
      }}
    >
      <div className="relative max-w-[760px] mx-auto">
        <div className="text-center">
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-display tracking-[0.20em] whitespace-nowrap"
            style={{
              background: "hsl(var(--accent) / 0.14)",
              border: "1px solid hsl(var(--accent) / 0.32)",
              color: "hsl(var(--accent))",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            자주 묻는 질문
          </span>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={reduced ? { duration: 0 } : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="font-extrabold leading-[1.12] mt-4 mb-3"
            style={{
              fontSize: "clamp(30px, 5.4vw, 52px)",
              letterSpacing: "-0.03em",
              textWrap: "balance",
            }}
          >
            자주 묻는 <span style={{ color: "hsl(var(--accent))" }}>질문</span>
          </motion.h2>
          <p
            className="text-[15.5px] lg:text-[17px] leading-[1.55]"
            style={{ color: "hsl(var(--muted-foreground))", textWrap: "pretty" }}
          >
            총무가 가장 많이 물어본 것들.
          </p>
        </div>

        {/* Filter chips + search */}
        <div className="mt-10 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveCat(null)}
            className="h-9 px-3.5 rounded-full text-[13px] font-bold tracking-[-0.01em] transition-colors duration-200"
            style={{
              background: activeCat === null ? "hsl(var(--primary))" : "hsl(var(--secondary) / 0.6)",
              color: activeCat === null ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
              border: activeCat === null ? "1px solid transparent" : "1px solid hsl(var(--border))",
            }}
          >
            전체
          </button>
          {CATS.map((c) => {
            const on = activeCat === c;
            return (
              <button
                key={c}
                onClick={() => setActiveCat(on ? null : c)}
                className="h-9 px-3.5 rounded-full text-[13px] font-bold tracking-[-0.01em] transition-colors duration-200"
                style={{
                  background: on ? "hsl(var(--primary))" : "hsl(var(--secondary) / 0.6)",
                  color: on ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                  border: on ? "1px solid transparent" : "1px solid hsl(var(--border))",
                }}
              >
                {c}
              </button>
            );
          })}

          <div
            className="ml-auto flex items-center gap-2 h-9 px-3 rounded-full"
            style={{
              background: "hsl(var(--secondary) / 0.5)",
              border: "1px solid hsl(var(--border))",
              minWidth: 220,
            }}
          >
            <Search className="w-4 h-4" style={{ color: "hsl(var(--muted-foreground))" }} />
            <input
              type="text"
              placeholder="질문 키워드 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent border-0 outline-none text-[13px]"
              style={{ color: "hsl(var(--foreground))" }}
            />
          </div>
        </div>

        {/* List */}
        <div className="mt-6 flex flex-col gap-2.5">
          {filtered.length === 0 && (
            <p className="py-10 text-center text-[14px]" style={{ color: "hsl(var(--muted-foreground))" }}>
              검색어와 일치하는 질문이 없습니다.
            </p>
          )}
          {filtered.map((f) => {
            const open = openIdx === f._i;
            return (
              <motion.div
                key={f._i}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={reduced ? { duration: 0 } : { duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative rounded-[14px] overflow-hidden cursor-pointer transition-transform duration-200 hover:-translate-y-[1px]"
                style={{
                  background: open
                    ? "hsl(var(--card) / 0.85)"
                    : "hsl(var(--secondary) / 0.45)",
                  border: open ? "1px solid hsl(var(--primary) / 0.35)" : "1px solid hsl(var(--border))",
                }}
                onClick={() => setOpenIdx(open ? null : f._i)}
              >
                {/* coral strip when open */}
                {open && (
                  <span
                    className="absolute left-0 top-0 bottom-0 w-[3px]"
                    style={{
                      background:
                        "linear-gradient(180deg, hsl(var(--primary)), hsl(var(--accent)))",
                    }}
                  />
                )}

                <button
                  className="w-full flex items-start justify-between gap-4 px-5 lg:px-6 py-4 lg:py-5 text-left bg-transparent border-0"
                  aria-expanded={open}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span
                      className="text-[12px] font-display tracking-[0.20em] px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        background: "hsl(var(--accent) / 0.14)",
                        color: "hsl(var(--accent))",
                        border: "1px solid hsl(var(--accent) / 0.30)",
                      }}
                    >
                      {f.cat}
                    </span>
                    <span
                      className="text-[15px] lg:text-[16px] font-bold leading-[1.4]"
                      style={{ color: "hsl(var(--foreground))", letterSpacing: "-0.01em" }}
                    >
                      {f.q}
                    </span>
                  </div>
                  <motion.span
                    animate={{ rotate: open ? 45 : 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0"
                    style={{
                      background: open ? "hsl(var(--primary) / 0.16)" : "hsl(var(--muted) / 0.5)",
                      color: open ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      key="ans"
                      initial={{ gridTemplateRows: "0fr", opacity: 0 }}
                      animate={{ gridTemplateRows: "1fr", opacity: 1 }}
                      exit={{ gridTemplateRows: "0fr", opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      style={{ display: "grid" }}
                    >
                      <div className="overflow-hidden">
                        <div
                          className="px-5 lg:px-6 pb-5 pt-1 text-[14px] lg:text-[14.5px] leading-[1.65]"
                          style={{ color: "hsl(var(--muted-foreground))", textWrap: "pretty" }}
                        >
                          {highlight(f.a)}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
