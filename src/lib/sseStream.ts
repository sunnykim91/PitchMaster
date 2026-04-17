/**
 * 클라이언트용 SSE 스트림 리더 헬퍼.
 * fetch POST + text/event-stream 응답 처리.
 *
 * 서버가 보내는 이벤트 타입:
 * - { type: "chunk", text: string }          — 부분 텍스트
 * - { type: "replace", text: string, source: "rule", reason?: string }
 *                                             — 전체 텍스트를 다른 걸로 교체
 * - { type: "done", source: "ai"|"rule", model?: string }
 *                                             — 스트림 종료
 * - { type: "error", message: string }       — 치명 오류
 */

export type StreamEvent =
  | { type: "chunk"; text: string }
  | { type: "replace"; text: string; source: "rule"; reason?: string }
  | { type: "done"; source: "ai" | "rule"; model?: string }
  | { type: "error"; message: string };

export type StreamCallbacks = {
  onChunk?: (text: string) => void;
  onReplace?: (text: string, reason?: string) => void;
  onDone?: (source: "ai" | "rule", model?: string) => void;
  onError?: (message: string) => void;
};

/**
 * POST 요청 → SSE 응답 → 콜백 호출.
 * @returns final source/text accumulated
 */
export async function consumeSseStream(
  url: string,
  body: unknown,
  callbacks: StreamCallbacks
): Promise<{ text: string; source: "ai" | "rule" | null }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // 429, 403, 400 등 — JSON 에러 응답
    const data = await res.json().catch(() => ({}));
    const message = data.message ?? data.error ?? `요청 실패 (${res.status})`;
    callbacks.onError?.(message);
    throw new Error(message);
  }

  if (!res.body) {
    const msg = "응답 바디 없음";
    callbacks.onError?.(msg);
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  let finalSource: "ai" | "rule" | null = null;
  let replacedText: string | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE 이벤트는 빈 줄 2개로 구분됨 — \n\n
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? ""; // 마지막은 미완성일 수 있음

      for (const raw of events) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;

        let event: StreamEvent;
        try {
          event = JSON.parse(payload);
        } catch {
          continue;
        }

        if (event.type === "chunk") {
          accumulated += event.text;
          callbacks.onChunk?.(event.text);
        } else if (event.type === "replace") {
          replacedText = event.text;
          callbacks.onReplace?.(event.text, event.reason);
        } else if (event.type === "done") {
          finalSource = event.source;
          callbacks.onDone?.(event.source, event.model);
        } else if (event.type === "error") {
          callbacks.onError?.(event.message);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return {
    text: replacedText ?? accumulated,
    source: finalSource,
  };
}
