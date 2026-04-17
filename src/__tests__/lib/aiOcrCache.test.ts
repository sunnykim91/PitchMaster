import { describe, it, expect } from "vitest";
import { hashImage } from "@/lib/server/aiOcrCache";

describe("aiOcrCache — hashImage", () => {
  it("같은 이미지는 같은 해시", () => {
    const buf = Buffer.from("image data", "utf8");
    expect(hashImage(buf)).toBe(hashImage(buf));
  });

  it("다른 이미지는 다른 해시", () => {
    const a = Buffer.from("image A", "utf8");
    const b = Buffer.from("image B", "utf8");
    expect(hashImage(a)).not.toBe(hashImage(b));
  });

  it("해시 길이 16자", () => {
    const buf = Buffer.from("test", "utf8");
    expect(hashImage(buf)).toHaveLength(16);
  });

  it("해시는 16진수만", () => {
    const buf = Buffer.from("test", "utf8");
    expect(hashImage(buf)).toMatch(/^[0-9a-f]{16}$/);
  });

  it("빈 버퍼도 해시 생성 가능", () => {
    expect(hashImage(Buffer.alloc(0))).toHaveLength(16);
  });
});
