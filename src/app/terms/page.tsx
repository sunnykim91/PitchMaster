import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관 — PitchMaster",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <a
        href="/login"
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        &larr; 돌아가기
      </a>

      <h1 className="mt-6 font-heading text-3xl font-bold">이용약관</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        시행일: 2026년 3월 18일
      </p>

      <div className="mt-10 space-y-10 text-sm leading-relaxed text-foreground/80">
        <section>
          <h2 className="text-lg font-bold text-foreground">제1조 (목적)</h2>
          <p className="mt-3">
            본 약관은 PitchMaster(이하 &quot;서비스&quot;)가 제공하는 조기축구
            팀 관리 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무를
            규정하는 것을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">제2조 (정의)</h2>
          <ul className="mt-3 ml-5 list-decimal space-y-1 text-muted-foreground">
            <li>
              &quot;서비스&quot;란 PitchMaster가 제공하는 웹 애플리케이션 및
              관련 기능 일체를 말합니다.
            </li>
            <li>
              &quot;이용자&quot;란 본 약관에 따라 서비스를 이용하는 자를
              말합니다.
            </li>
            <li>
              &quot;팀&quot;이란 서비스 내에서 이용자가 생성하거나 참여하는
              조기축구 모임 단위를 말합니다.
            </li>
            <li>
              &quot;운영진&quot;이란 팀 내에서 회장 또는 스태프 권한을 가진
              이용자를 말합니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">
            제3조 (약관의 효력 및 변경)
          </h2>
          <ul className="mt-3 ml-5 list-decimal space-y-1 text-muted-foreground">
            <li>
              본 약관은 서비스 화면에 게시하거나 기타 방법으로 이용자에게
              공지함으로써 효력이 발생합니다.
            </li>
            <li>
              서비스는 합리적인 사유가 있는 경우 약관을 변경할 수 있으며, 변경
              시 시행일 7일 전에 공지합니다.
            </li>
            <li>
              변경된 약관에 동의하지 않는 이용자는 서비스 이용을 중단하고 탈퇴할
              수 있습니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">
            제4조 (회원가입 및 이용계약)
          </h2>
          <ul className="mt-3 ml-5 list-decimal space-y-1 text-muted-foreground">
            <li>
              이용자는 카카오 계정을 통해 로그인함으로써 서비스 이용계약이
              체결됩니다.
            </li>
            <li>
              이용자는 본인의 정보를 정확하게 입력해야 하며, 허위 정보 입력으로
              인한 불이익은 이용자에게 있습니다.
            </li>
            <li>만 14세 미만의 아동은 서비스를 이용할 수 없습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">
            제5조 (서비스의 제공)
          </h2>
          <p className="mt-3">서비스는 다음의 기능을 제공합니다.</p>
          <ul className="mt-3 ml-5 list-disc space-y-1 text-muted-foreground">
            <li>경기 일정 관리 및 참석 투표</li>
            <li>팀원 관리 (초대, 역할 설정)</li>
            <li>경기 기록 관리 (골, 어시스트, MVP, 출석률)</li>
            <li>회비 관리 (수동 입력 및 이미지 인식)</li>
            <li>선수 배치 (전술판, AI 자동 배치)</li>
            <li>커뮤니티 게시판</li>
            <li>팀 회칙 관리</li>
            <li>기타 서비스가 추가로 개발하여 제공하는 기능</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">
            제6조 (서비스 이용료)
          </h2>
          <ul className="mt-3 ml-5 list-decimal space-y-1 text-muted-foreground">
            <li>서비스는 현재 무료로 제공됩니다.</li>
            <li>
              추후 운영 정책에 따라 유료 요금제가 도입되거나 이용 범위·조건이
              변경될 수 있으며, 변경 시 사전에 공지합니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">
            제7조 (이용자의 의무)
          </h2>
          <p className="mt-3">이용자는 다음 행위를 해서는 안 됩니다.</p>
          <ul className="mt-3 ml-5 list-disc space-y-1 text-muted-foreground">
            <li>타인의 개인정보를 도용하거나 허위 정보를 등록하는 행위</li>
            <li>서비스의 정상적인 운영을 방해하는 행위</li>
            <li>다른 이용자에게 불쾌감을 주거나 명예를 훼손하는 행위</li>
            <li>서비스를 상업적 목적으로 무단 이용하는 행위</li>
            <li>서비스의 보안을 위협하거나 취약점을 악용하는 행위</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">
            제8조 (서비스의 중단)
          </h2>
          <ul className="mt-3 ml-5 list-decimal space-y-1 text-muted-foreground">
            <li>
              서비스는 시스템 점검, 장비 교체, 천재지변 등 불가피한 사유로
              서비스 제공을 일시 중단할 수 있습니다.
            </li>
            <li>서비스 중단 시 가능한 한 사전에 공지합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">
            제9조 (책임의 제한)
          </h2>
          <ul className="mt-3 ml-5 list-decimal space-y-1 text-muted-foreground">
            <li>
              서비스는 무료로 제공되며, 서비스 이용으로 발생하는 손해에 대해
              법적 책임을 지지 않습니다.
            </li>
            <li>
              이용자가 입력한 데이터의 정확성에 대한 책임은 이용자에게 있습니다.
            </li>
            <li>
              이미지 인식(OCR) 결과의 정확성을 보장하지 않으며, 이용자가 반드시
              확인 후 사용해야 합니다.
            </li>
            <li>서비스는 이용자 간 분쟁에 대해 개입하지 않습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">
            제10조 (회원 탈퇴 및 자격 상실)
          </h2>
          <ul className="mt-3 ml-5 list-decimal space-y-1 text-muted-foreground">
            <li>
              이용자는 언제든지 서비스 내 설정에서 탈퇴를 요청할 수 있습니다.
            </li>
            <li>탈퇴 시 이용자의 개인정보는 즉시 파기됩니다.</li>
            <li>
              팀에 기록된 경기 데이터(골, 어시스트 등)는 팀 데이터로 보존될 수
              있습니다.
            </li>
            <li>
              서비스는 제7조를 위반한 이용자의 이용을 제한하거나 자격을 상실시킬
              수 있습니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">
            제11조 (지적재산권)
          </h2>
          <ul className="mt-3 ml-5 list-decimal space-y-1 text-muted-foreground">
            <li>
              서비스의 디자인, 코드, 콘텐츠에 대한 지적재산권은 서비스
              운영자에게 있습니다.
            </li>
            <li>
              이용자가 서비스에 등록한 콘텐츠(게시글, 사진 등)의 권리는
              이용자에게 있습니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">
            제12조 (분쟁 해결)
          </h2>
          <ul className="mt-3 ml-5 list-decimal space-y-1 text-muted-foreground">
            <li>서비스 이용과 관련한 분쟁은 대한민국 법률을 적용합니다.</li>
            <li>
              분쟁 발생 시 서비스 운영자의 소재지를 관할하는 법원을 전속 관할로
              합니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">제13조 (연락처)</h2>
          <ul className="mt-3 ml-5 list-disc space-y-1 text-muted-foreground">
            <li>서비스명: PitchMaster</li>
            <li>이메일: pitchmaster.app@gmail.com</li>
          </ul>
        </section>

        <section className="border-t border-border/30 pt-6">
          <p className="text-muted-foreground">
            <strong>부칙:</strong> 본 약관은 2026년 3월 18일부터 시행합니다.
          </p>
        </section>
      </div>
    </main>
  );
}
