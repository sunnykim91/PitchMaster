"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

/**
 * 컷 번호 칩 — long-press(200ms) 드래그로 순서 변경, 짧은 탭은 선택.
 * activationConstraint.delay 덕분에 onClick은 정상 동작.
 */
export function SortableStepChip({
  index,
  active,
  onSelect,
}: {
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `step-${index}`,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      onClick={onSelect}
      {...attributes}
      {...listeners}
      aria-label={`컷 ${index + 1} 선택 (길게 눌러 순서 변경)`}
      aria-pressed={active}
      className={cn(
        "min-h-[32px] min-w-[32px] rounded px-2 py-1.5 text-[12.5px] font-semibold tabular-nums transition-colors touch-none select-none",
        active
          ? "bg-[hsl(var(--primary)_/_0.15)] text-[hsl(var(--primary))]"
          : "text-muted-foreground hover:text-foreground",
        isDragging && "scale-[1.08] shadow-lg ring-2 ring-[hsl(var(--primary))]/40 cursor-grabbing",
      )}
    >
      {index + 1}
    </button>
  );
}
