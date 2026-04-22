import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PitchMaster — 조기축구 · 풋살 팀 관리 플랫폼";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  const primary = "#e8613a";
  const primaryLight = "rgba(232, 97, 58, 0.15)";
  const primaryBorder = "rgba(232, 97, 58, 0.3)";
  const pitch = "#1a6b32";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(145deg, #0e0f11 0%, #161819 40%, #0e0f11 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 축구장 패턴 배경 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.06,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 700,
              height: 440,
              border: `4px solid ${pitch}`,
              borderRadius: 12,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: "50%",
                width: 4,
                background: pitch,
              }}
            />
            <div
              style={{
                width: 140,
                height: 140,
                border: `4px solid ${pitch}`,
                borderRadius: "50%",
              }}
            />
          </div>
        </div>

        {/* 브랜드 라벨 */}
        <div
          style={{
            display: "flex",
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: 8,
            color: primary,
            textTransform: "uppercase",
            marginBottom: 20,
          }}
        >
          PitchMaster
        </div>

        {/* 메인 타이틀 */}
        <div
          style={{
            fontSize: 54,
            fontWeight: 900,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.2,
            display: "flex",
          }}
        >
          조기축구 · 풋살 팀 관리
        </div>

        {/* 서브타이틀 */}
        <div
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.5)",
            marginTop: 16,
            textAlign: "center",
            display: "flex",
          }}
        >
          총무를 위한 올인원 관리 앱 — 무료
        </div>

        {/* 기능 뱃지 */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 44,
          }}
        >
          {["참석 투표", "스마트 라인업", "회비 자동정리", "경기 기록"].map(
            (text) => (
              <div
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 20px",
                  borderRadius: 24,
                  backgroundColor: primaryLight,
                  border: `1px solid ${primaryBorder}`,
                  fontSize: 16,
                  fontWeight: 700,
                  color: primary,
                }}
              >
                {text}
              </div>
            ),
          )}
        </div>

        {/* 하단 URL + 팀 수 */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            display: "flex",
            gap: 16,
            alignItems: "center",
            fontSize: 15,
            color: "rgba(255,255,255,0.35)",
          }}
        >
          <span style={{ display: "flex" }}>pitch-master.app</span>
          <span style={{ display: "flex" }}>·</span>
          <span style={{ display: "flex" }}>80+ 팀이 사용 중</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
