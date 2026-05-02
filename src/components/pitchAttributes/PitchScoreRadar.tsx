"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { CATEGORY_META } from "@/lib/playerAttributes/config";
import type { AttributeCategory } from "@/lib/playerAttributes/types";

interface CategoryAvg {
  category: AttributeCategory;
  avg: number;
  count: number;
}

interface Props {
  data: CategoryAvg[];
  height?: number;
}

export default function PitchScoreRadar({ data, height = 260 }: Props) {
  const chartData = data
    .filter((d) => d.count > 0)
    .map((d) => ({
      stat: CATEGORY_META[d.category].name_ko,
      value: Math.round((d.avg / 5) * 100),
    }));

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="#334155" />
        <PolarAngleAxis
          dataKey="stat"
          tick={{ fill: "currentColor", fontSize: 12, fontWeight: 600 }}
        />
        <Radar
          dataKey="value"
          stroke="#e8613a"
          fill="#e8613a"
          fillOpacity={0.3}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
