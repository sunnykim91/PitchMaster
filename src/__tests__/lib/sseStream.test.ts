import { describe, it, expect, vi } from "vitest";
import { consumeSseStream } from "@/lib/sseStream";

/** SSE 응답 본문 Mock — ReadableStream에 SSE 라인 쓰기 */
function mockSseResponse(events: unknown[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      for (const e of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      }
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

function mockFetch(response: Response) {
  return vi.fn().mockResolvedValue(response);
}

describe("sseStream — consumeSseStream", () => {
  it("chunk 이벤트 누적 + done 이벤트 처리", async () => {
    const events = [
      { type: "chunk", text: "안녕" },
      { type: "chunk", text: "하세요" },
      { type: "done", source: "ai", model: "claude-haiku-4-5" },
    ];
    global.fetch = mockFetch(mockSseResponse(events)) as unknown as typeof fetch;

    const chunks: string[] = [];
    let doneSource: string | null = null;
    const result = await consumeSseStream("/test", { foo: "bar" }, {
      onChunk: (t) => chunks.push(t),
      onDone: (s) => { doneSource = s; },
    });

    expect(chunks).toEqual(["안녕", "하세요"]);
    expect(doneSource).toBe("ai");
    expect(result.text).toBe("안녕하세요");
    expect(result.source).toBe("ai");
  });

  it("replace 이벤트는 전체 텍스트 교체", async () => {
    const events = [
      { type: "chunk", text: "부분 " },
      { type: "chunk", text: "텍스트" },
      { type: "replace", text: "룰 기반 최종본", source: "rule", reason: "low_quality" },
      { type: "done", source: "rule" },
    ];
    global.fetch = mockFetch(mockSseResponse(events)) as unknown as typeof fetch;

    let replaceCalled: { text: string; reason?: string } | null = null;
    const result = await consumeSseStream("/test", {}, {
      onReplace: (text, reason) => { replaceCalled = { text, reason }; },
    });

    expect(replaceCalled).toEqual({ text: "룰 기반 최종본", reason: "low_quality" });
    expect(result.text).toBe("룰 기반 최종본");
    expect(result.source).toBe("rule");
  });

  it("4xx 응답은 onError 호출 + throw", async () => {
    const errResponse = new Response(
      JSON.stringify({ message: "한도 초과" }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
    global.fetch = mockFetch(errResponse) as unknown as typeof fetch;

    let errMessage: string | null = null;
    await expect(
      consumeSseStream("/test", {}, {
        onError: (m) => { errMessage = m; },
      })
    ).rejects.toThrow("한도 초과");
    expect(errMessage).toBe("한도 초과");
  });

  it("여러 청크가 한 네트워크 패킷에 같이 와도 분리", async () => {
    // 한 번에 "data: {...}\n\ndata: {...}\n\ndata: {...}\n\n" 통째로 들어오는 케이스
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        const combined =
          `data: ${JSON.stringify({ type: "chunk", text: "A" })}\n\n` +
          `data: ${JSON.stringify({ type: "chunk", text: "B" })}\n\n` +
          `data: ${JSON.stringify({ type: "done", source: "ai" })}\n\n`;
        controller.enqueue(encoder.encode(combined));
        controller.close();
      },
    });
    global.fetch = mockFetch(new Response(body, { status: 200 })) as unknown as typeof fetch;

    const chunks: string[] = [];
    await consumeSseStream("/test", {}, { onChunk: (t) => chunks.push(t) });
    expect(chunks).toEqual(["A", "B"]);
  });

  it("청크가 네트워크 경계에서 잘려서 와도 버퍼링으로 복구", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        // 첫 청크는 이벤트 중간에서 끊김
        controller.enqueue(encoder.encode(`data: {"type":"chunk","text`));
        // 두 번째 청크에서 마무리
        controller.enqueue(encoder.encode(`":"복구됨"}\n\ndata: {"type":"done","source":"ai"}\n\n`));
        controller.close();
      },
    });
    global.fetch = mockFetch(new Response(body, { status: 200 })) as unknown as typeof fetch;

    const chunks: string[] = [];
    await consumeSseStream("/test", {}, { onChunk: (t) => chunks.push(t) });
    expect(chunks).toEqual(["복구됨"]);
  });
});
