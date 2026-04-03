"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  { q: "정말 무료인가요?", a: "네, 현재는 무료입니다. 인원 제한도 없습니다. 추후 운영에 따라 변동이 있을 수 있습니다." },
  { q: "우리 팀 데이터는 안전한가요?", a: "한국 서울 리전에 암호화 저장됩니다. 카카오 로그인만 사용하며, 별도 비밀번호를 보관하지 않습니다." },
  { q: "축구와 풋살 둘 다 되나요?", a: "네, 팀 생성 시 종목을 선택하면 포지션·전술판·코트 비율이 자동으로 맞춰집니다." },
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
