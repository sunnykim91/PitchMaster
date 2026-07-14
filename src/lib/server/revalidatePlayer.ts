import { revalidatePath } from "next/cache";

/**
 * /player/[memberId] 는 ISR — 관련 기록(골·MVP·평점) 변경 시 해당 선수 카드 즉시 갱신.
 * page route 의 .or(`user_id.eq,id.eq`) 매칭 덕에 어느 쪽 ID 로 path 만들어도 hit.
 * try/catch — vitest 등 next runtime context 없는 환경에서 invariant 실패 시 mutation 자체엔 영향 없게.
 */
export function safeRevalidatePlayer(id: string | null | undefined) {
  if (!id) return;
  try {
    revalidatePath(`/player/${id}`);
  } catch (err) {
    console.warn("[revalidatePath] skip:", err instanceof Error ? err.message : err);
  }
}

/** 여러 선수 일괄 갱신 (골 기록 등 득점자+어시스트 동시 영향). */
export function revalidatePlayers(ids: (string | null | undefined)[]) {
  for (const id of ids) safeRevalidatePlayer(id);
}
