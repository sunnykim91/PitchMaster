"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from "recharts";

type RankItem = {
  name: string;
  value: number;
};

const COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#64748b"];

export default function BarRankingChart({
  data,
  color,
}: {
  data: RankItem[];
  color?: string;
}) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={data.length * 36 + 8}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 4, bottom: 0, left: 0 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={60}
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={color ?? COLORS[i % COLORS.length]}
              fillOpacity={1 - i * 0.15}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
