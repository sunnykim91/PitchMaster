import { Award, Crown, TrendingUp } from "lucide-react";
import type { PlayerCardProps } from "@/components/pitchmaster/PlayerCard";

export const VOTE_DATA = [
  { label: "참석", pct: 62, kind: "go" as const },
  { label: "불참", pct: 23, kind: "no" as const },
  { label: "미정", pct: 15, kind: "maybe" as const },
];

export const SETTLERS = [
  { name: "김민수", amt: 30000 },
  { name: "이준혁", amt: 30000 },
  { name: "박지훈", amt: 30000 },
  { name: "정수민", amt: 30000 },
];

export const ROLES = [
  {
    quarter: "Q2 · 4-3-3",
    formation: "4-3-3",
    pos: "RCB",
    title: "라인 유지가 핵심",
    bullets: [
      "우측 풀백과 5m 간격 유지",
      "오프사이드 라인 선점",
      "클리어는 중앙 피하고 사이드로",
    ],
  },
  {
    quarter: "Q1 · Q3 · 4-2-3-1",
    formation: "4-2-3-1",
    pos: "CAM",
    title: "ST 뒤에서 해결사",
    bullets: [
      "페널티박스 아크 반박자 패스",
      "DM 옆 빈 공간 차지",
      "세트피스 2차 슛 노리기",
    ],
  },
  {
    quarter: "Q2 · 풋살 1-2-1",
    formation: "풋살 1-2-1",
    pos: "ALA",
    title: "측면 엔진 — 공수 다 한다",
    bullets: [
      "측면 1대1 후 컷인 마무리",
      "공 잃자마자 사람 마크 압박",
      "교체 자주 — 짧고 강하게",
    ],
  },
];

// 실제 PlayerCard 컴포넌트 풀 props — 랜딩 데모용 4단계 등급 카드
export const PLAYER_CARDS: PlayerCardProps[] = [
  {
    ovr: 96,
    rarity: "ICON",
    positionLabel: "FW",
    positionCategory: "FW",
    playerName: "홍길동",
    jerseyNumber: 10,
    teamName: "FC 피치마스터",
    teamPrimaryColor: "#e8613a",
    seasonName: "2026 시즌",
    signature: "32골 18어시 — 시즌 압도적 MVP",
    stats: [
      { label: "골", value: "32", rank: "🏆 팀 1위", isHero: true },
      { label: "어시", value: "18", rank: "🏆 팀 1위" },
      { label: "공격P", value: "50", streak: "🔥 9경기 연속" },
      { label: "MVP", value: "12", rank: "🏆 팀 1위" },
      { label: "출석률", value: "96%" },
    ],
  },
  {
    ovr: 73,
    rarity: "HERO",
    positionLabel: "MID",
    positionCategory: "MID",
    playerName: "강민호",
    jerseyNumber: 8,
    teamName: "FC 피치마스터",
    teamPrimaryColor: "#e8613a",
    seasonName: "2026 시즌",
    signature: "5경기 연속 MVP에 빛난 미드필더",
    stats: [
      { label: "어시", value: "12", rank: "🏆 팀 1위", isHero: true },
      { label: "골", value: "5" },
      { label: "MVP", value: "5", streak: "🔥 5연속" },
      { label: "출석률", value: "88%" },
      { label: "경기", value: "20" },
    ],
  },
  {
    ovr: 64,
    rarity: "RARE",
    positionLabel: "DEF",
    positionCategory: "DEF",
    playerName: "박성진",
    jerseyNumber: 4,
    teamName: "FC 피치마스터",
    teamPrimaryColor: "#e8613a",
    seasonName: "2026 시즌",
    signature: "꾸준한 출석과 안정된 수비",
    stats: [
      { label: "클린시트", value: "5", rank: "🏆 팀 1위", isHero: true },
      { label: "승률", value: "65%" },
      { label: "출석률", value: "88%", streak: "🔥 8연속" },
      { label: "MVP", value: "2" },
      { label: "실점", value: "1.0" },
    ],
  },
  {
    ovr: 55,
    rarity: "COMMON",
    positionLabel: "GK",
    positionCategory: "GK",
    playerName: "최영호",
    jerseyNumber: 1,
    teamName: "FC 피치마스터",
    teamPrimaryColor: "#e8613a",
    seasonName: "2026 시즌",
    signature: "성장 중인 골키퍼",
    stats: [
      { label: "클린시트", value: "1", isHero: true },
      { label: "실점", value: "2.0" },
      { label: "승률", value: "45%" },
      { label: "출석률", value: "62%" },
      { label: "MVP", value: "0" },
    ],
  },
];

export const AWARDS = [
  {
    Icon: Crown,
    tone: "accent",
    title: "경기 MVP",
    body: "참석자 70% 이상 투표로, 신뢰도 높은 MVP를 자동 선정합니다.",
  },
  {
    Icon: Award,
    tone: "info",
    title: "시즌 시상 7종",
    body: "득점왕·도움왕·철벽·개근·올라운더 등 7개 부문 자동 집계.",
  },
  {
    Icon: TrendingUp,
    tone: "success",
    title: "커리어 프로필",
    body: "베스트 모먼트 · 시즌 누적 · 랭킹을 한 페이지로 정리합니다.",
  },
] as const;
