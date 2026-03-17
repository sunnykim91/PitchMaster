"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

type PlayerRadarProps = {
  goals: number;
  assists: number;
  mvp: number;
  attendanceRate: number;
  /** Team max values for normalization */
  maxGoals: number;
  maxAssists: number;
  maxMvp: number;
};

/** Normalize a value to 0-100 scale relative to team max */
function norm(value: number, max: number): number {
  if (max === 0) return 0;
  return Math.round((value / max) * 100);
}

export default function PlayerRadarChart({
  goals,
  assists,
  mvp,
  attendanceRate,
  maxGoals,
  maxAssists,
  maxMvp,
}: PlayerRadarProps) {
  const data = [
    { stat: "득점", value: norm(goals, maxGoals) },
    { stat: "어시스트", value: norm(assists, maxAssists) },
    { stat: "MVP", value: norm(mvp, maxMvp) },
    { stat: "출석률", value: Math.round(attendanceRate * 100) },
    { stat: "공헌도", value: norm(goals + assists, maxGoals + maxAssists) },
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
        <PolarGrid stroke="#334155" />
        <PolarAngleAxis
          dataKey="stat"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
        />
        <Radar
          dataKey="value"
          stroke="#22c55e"
          fill="#22c55e"
          fillOpacity={0.25}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
