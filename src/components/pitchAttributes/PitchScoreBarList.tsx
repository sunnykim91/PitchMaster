"use client";

import { CATEGORY_META } from "@/lib/playerAttributes/config";
import type { AttributeCategory, AttributeCode } from "@/lib/playerAttributes/types";

interface AttributeRow {
  attribute_code: AttributeCode;
  name_ko: string;
  category: AttributeCategory;
  pitch_score: number;
  sample_count: number;
  level: 1 | 2 | 3 | 4 | 5 | null;
}

interface Props {
  attributes: AttributeRow[];
  labelMap?: Map<string, string>;
}

export default function PitchScoreBarList({ attributes, labelMap }: Props) {
  // 카테고리별 그룹화
  const groups = new Map<AttributeCategory, AttributeRow[]>();
  for (const attr of attributes) {
    const arr = groups.get(attr.category) ?? [];
    arr.push(attr);
    groups.set(attr.category, arr);
  }

  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([category, rows]) => (
        <div key={category}>
          <div className="mb-2 flex items-center gap-2 text-sm font-bold">
            <span>{CATEGORY_META[category].emoji}</span>
            <span style={{ color: CATEGORY_META[category].color }}>
              {CATEGORY_META[category].name_ko}
            </span>
          </div>
          <div className="space-y-2">
            {rows.map((attr) => {
              const pct = attr.sample_count > 0 ? (attr.pitch_score / 5) * 100 : 0;
              const labelText =
                attr.level && labelMap
                  ? labelMap.get(`${attr.attribute_code}_${attr.level}`)
                  : null;
              return (
                <div key={attr.attribute_code} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{attr.name_ko}</span>
                    <span className="text-muted-foreground">
                      {attr.sample_count > 0 ? attr.pitch_score.toFixed(2) : "—"}
                      {attr.sample_count > 0 && (
                        <span className="ml-1 opacity-60">({attr.sample_count})</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: CATEGORY_META[category].color,
                      }}
                    />
                  </div>
                  {labelText && (
                    <p className="text-[11px] text-muted-foreground italic">"{labelText}"</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
