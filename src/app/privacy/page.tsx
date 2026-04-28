import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 — PitchMaster",
  alternates: {
    canonical: "https://pitch-master.app/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <a
        href="/login"
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        &larr; 돌아가기
      </a>

      <h1 className="mt-6 font-heading text-3xl font-bold">개인정보처리방침</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        시행일: 2026년 4월 22일 (AI 기능 · 탈퇴 플로우 반영)
      </p>

      <div className="mt-10 space-y-10 text-sm leading-relaxed text-foreground/80">
        <section>
          <h2 className="text-lg font-bold text-foreground">
            1. 수집하는 개인정보 항목
          </h2>
          <p className="mt-3">
            PitchMaster(이하 &quot;서비스&quot;)는 서비스 제공을 위해 아래의
            개인정보를 수집합니다.
          </p>
          <div className="mt-3 space-y-2">
            <p>
              <strong>필수 항목 (카카오 로그인 시 자동 수집)</strong>
            </p>
            <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
              <li>카카오 계정 고유 ID</li>
              <li>카카오 닉네임</li>
              <li>카카오 프로필 이미지 URL</li>
            </ul>
            <p className="mt-3">
              <strong>선택 항목 (사용자가 직접 입력)</strong>
            </p>
            <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
              <li>이름 (실명 또는 별명)</li>
              <li>휴대전화 번호</li>
              <li>생년월일</li>
              <li>선호 포지션, 주발 정보</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">
            2. 개인정보의 수집 및 이용 목적
          </h2>
          <ul className="mt-3 ml-5 list-disc space-y-1 text-muted-foreground">
            <li>회원 식별 및 로그인 인증</li>
            <li>팀 멤버 관리 및 매칭 (이름, 연락처)</li>
            <li>경기 기록 관리 (골, 어시스트, MVP, 출석)</li>
            <li>서비스 개선을 위한 통계 분석 (비식별 처리)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">
            3. 개인정보의 보유 및 이용 기간
          </h2>
          <ul className="mt-3 ml-5 list-disc space-y-1 text-muted-foreground">
            <li>
              <strong>탈퇴 즉시 개인 식별 정보 파기</strong>: 이름·연락처·생년월일·
              프로필 사진·선호 포지션·주발 정보는 탈퇴 요청 즉시 익명 처리됩니다.
            </li>
            <li>
              <strong>팀 운영 데이터 14일 보존</strong>: 이용자가 작성한 경기 기록·
              출석·게시글·댓글 등은 팀 자산으로 14일간 유지된 후 완전 삭제됩니다.
              이는 팀 기록의 일관성을 위한 최소 기간입니다.
            </li>
            <li>
              관련 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안
              보관합니다.
            </li>
            <li>1년 이상 서비스 미이용 시 별도 통지 후 파기합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">
            4. 개인정보의 제3자 제공
          </h2>
          <p className="mt-3">
            서비스는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.
            다만 아래의 경우는 예외로 합니다.
          </p>
          <ul className="mt-3 ml-5 list-disc space-y-1 text-muted-foreground">
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령에 따라 요청이 있는 경우</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">
            5. 개인정보의 처리 위탁
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-left">
                  <th className="pb-2 font-medium text-muted-foreground">
                    위탁 업체
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground">
                    위탁 내용
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-muted-foreground">
                <tr>
                  <td className="py-2">Supabase (미국, 서울 리전 사용)</td>
                  <td className="py-2">데이터베이스 호스팅 및 인증</td>
                </tr>
                <tr>
                  <td className="py-2">Vercel (미국)</td>
                  <td className="py-2">웹 애플리케이션 호스팅</td>
                </tr>
                <tr>
                  <td className="py-2">Kakao (한국)</td>
                  <td className="py-2">소셜 로그인 인증</td>
                </tr>
                <tr>
                  <td className="py-2">Naver Cloud (한국)</td>
                  <td className="py-2">OCR (이미지 텍스트 인식 — 백업)</td>
                </tr>
                <tr>
                  <td className="py-2">Anthropic (미국)</td>
                  <td className="py-2">
                    AI 분석 생성 — Claude API (통장 이미지 파싱, 경기 후기,
                    전술 코치 분석, 편성 설계, 선수 시그니처)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">
            5-1. AI 기능에 처리되는 데이터 (Claude API)
          </h2>
          <p className="mt-3 text-muted-foreground">
            서비스는 Anthropic의 Claude API를 사용해 아래 AI 기능을 제공합니다.
            각 기능 실행 시에만 해당 데이터가 Anthropic 서버로 전송되며, 평소엔
            전송되지 않습니다.
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <p className="font-medium text-foreground">
                ① 통장 캡처 자동 파싱 (OCR Vision)
              </p>
              <p className="ml-3 text-muted-foreground">
                업로드한 통장 거래 내역 이미지 원본이 전송됩니다. 동일 이미지는
                해시값으로만 캐시되며 원본 이미지는 영구 저장되지 않습니다.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">② AI 자동 편성 · 코치 분석</p>
              <p className="ml-3 text-muted-foreground">
                참석자 이름(또는 별명)·선호 포지션·경기 편성 정보·팀 과거
                경기 통계(포메이션별 승률·선수 기록·쿼터별 득실)·상대팀
                과거 맞대결 기록이 전송됩니다. 연락처·카카오 ID 등
                식별 정보는 포함되지 않습니다.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">③ 경기 후기 자동 생성</p>
              <p className="ml-3 text-muted-foreground">
                경기 스코어·득점자·어시스트·MVP·참석 인원·날씨·상대팀·
                과거 맞대결 정보가 전송됩니다.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">④ 선수 시그니처 카드</p>
              <p className="ml-3 text-muted-foreground">
                선수 이름(또는 별명)·포지션·누적 기록(경기수·골·어시·MVP·
                출석률·승률)이 전송됩니다.
              </p>
            </div>
          </div>
          <p className="mt-4 text-muted-foreground">
            Anthropic은 Enterprise Zero-Retention 정책에 따라 API 호출 데이터를
            모델 학습에 사용하지 않으며, 원본 입력은 콜 즉시 휘발됩니다. 생성된
            결과는 서비스 내 데이터베이스에 캐시로 저장됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">
            6. 개인정보의 파기 절차 및 방법
          </h2>
          <ul className="mt-3 ml-5 list-disc space-y-1 text-muted-foreground">
            <li>전자적 파일: 복구 불가능한 방법으로 영구 삭제</li>
            <li>종이 문서: 해당 없음 (종이 문서를 수집하지 않음)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">
            7. 이용자의 권리
          </h2>
          <p className="mt-3">
            이용자는 언제든지 아래의 권리를 행사할 수 있습니다.
          </p>
          <ul className="mt-3 ml-5 list-disc space-y-1 text-muted-foreground">
            <li>개인정보 열람, 정정, 삭제 요청</li>
            <li>개인정보 처리 정지 요청</li>
            <li>회원 탈퇴 요청</li>
          </ul>
          <p className="mt-3">
            요청은 서비스 내 설정 페이지 또는 아래 연락처로 가능합니다.
            <br />
            <strong>회원 탈퇴 경로</strong>: 설정 → 개인 설정 → 계정 탈퇴 (2단계 확인)
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">
            8. 쿠키 및 자동 수집 정보
          </h2>
          <ul className="mt-3 ml-5 list-disc space-y-1 text-muted-foreground">
            <li>로그인 세션 유지를 위해 쿠키(Cookie)를 사용합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">
            9. 개인정보 보호책임자
          </h2>
          <ul className="mt-3 ml-5 list-disc space-y-1 text-muted-foreground">
            <li>서비스명: PitchMaster</li>
            <li>이메일: pitchmaster.app@gmail.com</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">
            10. 개인정보처리방침 변경
          </h2>
          <p className="mt-3">
            본 방침은 시행일로부터 적용되며, 변경 시 서비스 내 공지를 통해
            안내합니다.
          </p>
        </section>
      </div>
    </main>
  );
}
