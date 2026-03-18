import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PitchMaster — 조기축구 · 풋살 팀 관리 플랫폼";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
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
          background: "linear-gradient(135deg, #0a0e14 0%, #1a2332 50%, #0a0e14 100%)",
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
            opacity: 0.08,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 600,
              height: 400,
              border: "4px solid #22c55e",
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
                background: "#22c55e",
              }}
            />
            <div
              style={{
                width: 120,
                height: 120,
                border: "4px solid #22c55e",
                borderRadius: "50%",
              }}
            />
          </div>
        </div>

        {/* 브랜드 라벨 */}
        <div
          style={{
            display: "flex",
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: 6,
            color: "#22c55e",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          PitchMaster
        </div>

        {/* 메인 타이틀 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 900,
              color: "#ffffff",
              textAlign: "center",
              lineHeight: 1.2,
              display: "flex",
            }}
          >
            조기축구 · 풋살 팀 관리 플랫폼
          </div>
        </div>

        {/* 서브타이틀 */}
        <div
          style={{
            fontSize: 22,
            color: "rgba(255,255,255,0.6)",
            marginTop: 20,
            textAlign: "center",
            display: "flex",
          }}
        >
          실시간 투표 · AI 라인업 · 회비 자동정리 · 기록 분석 · 카톡 공유
        </div>

        {/* 기능 뱃지들 */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 40,
          }}
        >
          {["실시간 투표", "AI 라인업", "회비 자동정리", "카톡 공유"].map(
            (text) => (
              <div
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 18px",
                  borderRadius: 24,
                  backgroundColor: "rgba(34, 197, 94, 0.15)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#22c55e",
                }}
              >
                {text}
              </div>
            ),
          )}
        </div>

        {/* 하단 URL */}
        <div
          style={{
            position: "absolute",
            bottom: 30,
            fontSize: 14,
            color: "rgba(255,255,255,0.3)",
            display: "flex",
          }}
        >
          pitch-master-eight.vercel.app
        </div>
      </div>
    ),
    { ...size },
  );
}
