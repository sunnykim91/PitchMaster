"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  { q: "정말 무료인가요?", a: "네, 현재는 무료입니다. 인원 제한도 없습니다. 추후 운영에 따라 변동이 있을 수 있습니다." },
  { q: "우리 팀 데이터는 안전한가요?", a: "한국 서울 리전에 암호화 저장됩니다. 카카오 로그인만 사용하며, 별도 비밀번호를 보관하지 않습니다." },
  { q: "축구와 풋살 둘 다 되나요?", a: "네, 팀 생성 시 종목을 선택하면 포지션·전술판·코트 비율이 자동으로 맞춰집니다. 풋살은 3인제부터 8인제까지 완전 지원합니다." },
  { q: "팀원이 카카오가 없으면 어떻게 하나요?", a: "현재는 카카오 계정으로만 가입이 가능합니다. 카카오는 국내 스마트폰 사용자의 90% 이상이 사용 중이라 대부분 문제가 없습니다." },
  { q: "여러 팀을 동시에 관리할 수 있나요?", a: "네, 한 계정으로 여러 팀에 소속될 수 있습니다. 앱 내에서 팀 전환이 가능하고, 각 팀의 역할(회장/운영진/회원)도 별도로 설정됩니다." },
  { q: "회비 기록을 엑셀로 내보낼 수 있나요?", a: "네, 회비 관리 탭에서 월별 납부 현황을 엑셀(.xlsx)로 내보낼 수 있습니다. 회계 정리나 공유가 필요할 때 바로 사용하세요." },
  { q: "기존에 쓰던 회원/경기 데이터를 옮길 수 있나요?", a: "현재는 직접 입력 방식만 지원합니다. 대량 데이터 이관이 필요하신 경우 운영팀에 문의해 주시면 지원 가능 여부를 안내드립니다." },
  { q: "조기축구 관리 앱, 뭐가 좋은가요?", a: "PitchMaster는 조기축구 · 풋살 팀 관리를 위해 만들어진 전용 앱입니다. 참석 투표, 회비 납부 관리, AI 라인업 편성, 경기 기록까지 총무 업무 전체를 커버합니다. 별도 앱 설치 없이 카카오톡으로 바로 사용할 수 있어 팀원 모두가 쉽게 참여합니다." },
  { q: "조기축구 총무를 처음 맡았는데 어디서부터 시작하나요?", a: "팀 생성 → 초대 링크로 팀원 등록 → 첫 경기 일정 등록, 세 단계면 됩니다. 이후 참석 투표 링크를 카카오톡 단체방에 공유하면 팀원들이 직접 참석 여부를 입력합니다. 회비는 통장 캡처 한 장으로 자동 정리됩니다." },
  { q: "통장 캡처로 회비 정리가 어떻게 되는 건가요?", a: "카카오뱅크·토스·국민은행 등 어느 앱이든 모임통장 거래 내역 화면을 캡처해서 올리면 AI가 자동으로 날짜·이름·금액을 읽어 표로 만들어 줍니다. 총무는 '이 거래가 누구 납부인지'만 확인하면 끝. 엑셀에 일일이 옮겨 적는 시간이 사라집니다." },
  { q: "AI 라인업 자동 편성은 어떻게 작동하나요?", a: "참석자 명단과 팀 기본 포메이션만 있으면 AI가 쿼터별 선수 배치와 감독 작전 브리핑까지 같이 생성합니다. 팀 과거 경기 이력, 상대팀 맞대결 기록, 선수별 선호 포지션과 누적 스탯을 모두 반영해 실제 감독처럼 분석합니다. 물론 결과는 전술판에서 수동 조정도 가능합니다." },
  { q: "PC에서도 쓸 수 있나요?", a: "네, 브라우저 기반 PWA라서 PC·태블릿·폰 어디서나 바로 사용 가능합니다. 경기 전날 밤에 PC로 편성을 준비하고, 경기 당일엔 폰으로 확인하는 이중 사용 패턴에 최적화되어 있습니다. 11명 드래그 배치는 큰 화면이 압도적으로 편합니다." },
  { q: "참석 투표는 어떻게 공유하나요?", a: "경기 일정을 등록하면 카카오톡 공유 버튼 한 번으로 단체방에 투표 링크가 전달됩니다. 팀원은 링크를 눌러 참석/불참/미정 중 하나를 터치하면 끝. 마감 전에 미응답자 알림도 자동으로 갑니다. 갠톡으로 일일이 묻는 시간이 0이 됩니다." },
  { q: "휴면·부상으로 회비를 못 낼 때 면제 처리 가능한가요?", a: "네, 회비 설정 탭에서 회원별로 휴회·부상·선납·면제 4가지 사유로 면제 기간을 등록할 수 있습니다. 해당 기간 동안 자동으로 '면제' 상태로 집계되고, 기간이 끝나면 정상 납부 대상으로 복귀합니다." },
  { q: "경기 후 MVP는 어떻게 뽑나요?", a: "경기 종료 후 MVP 투표 탭이 자동 열리며, 팀원들이 각자 앱에서 투표합니다. 투표 결과는 실시간으로 집계되고, 시즌 누적 MVP 통계로 이어집니다. 일부 운영진만 후보를 추릴 수 있도록 '스태프 투표 전용' 옵션도 있습니다." },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative border-t border-border/30 bg-card/30 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-5">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-primary">FAQ</p>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">자주 묻는 질문</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-secondary/50 sm:p-6"
              >
                <span className="pr-4 text-base font-semibold sm:text-lg">{faq.q}</span>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                  {openIndex === i ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </div>
              </button>
              <div className={`grid transition-all duration-300 ease-out ${openIndex === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 leading-relaxed text-muted-foreground sm:px-6 sm:pb-6 sm:text-lg">{faq.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
