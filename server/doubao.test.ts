import { describe, expect, it } from "vitest";

describe("Doubao API Keys", () => {
  it("DOUBAO_VIDEO_API_KEY should be configured", () => {
    const key = process.env.DOUBAO_VIDEO_API_KEY;
    expect(key).toBeDefined();
    expect(key?.length).toBeGreaterThan(10);
  });

  it("DOUBAO_CHAT_API_KEY should be configured", () => {
    const key = process.env.DOUBAO_CHAT_API_KEY;
    expect(key).toBeDefined();
    expect(key?.length).toBeGreaterThan(10);
  });

  it("Video API key format should be valid UUID", () => {
    const key = process.env.DOUBAO_VIDEO_API_KEY ?? "";
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(key)).toBe(true);
  });

  it("Chat API key format should be valid UUID", () => {
    const key = process.env.DOUBAO_CHAT_API_KEY ?? "";
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(key)).toBe(true);
  });
});
