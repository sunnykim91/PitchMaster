"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type AttendancePieProps = {
  attend: number;
  absent: number;
  maybe: number;
};

const COLORS = {
  attend: "#22c55e",
  absent: "#ef4444",
  maybe: "#f59e0b",
};

export default function AttendancePieChart({
  attend,
  absent,
  maybe,
}: AttendancePieProps) {
  const total = attend + absent + maybe;
  if (total === 0) return null;

  const data = [
    { name: "참석", value: attend, color: COLORS.attend },
    { name: "불참", value: absent, color: COLORS.absent },
    { name: "미정", value: maybe, color: COLORS.maybe },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={100} height={100}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={28}
            outerRadius={44}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "none",
              borderRadius: 8,
              fontSize: 12,
            }}
            itemStyle={{ color: "#e2e8f0" }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1.5 text-xs">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-muted-foreground">{d.name}</span>
            <span className="font-bold text-foreground">
              {d.value}명 ({Math.round((d.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
