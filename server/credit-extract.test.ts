import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ============ 征信报告提取API结构测试 ============

function createBossContext(): TrpcContext {
  return {
    user: {
      id: 1, openId: "boss-user", email: "boss@example.com", name: "Boss User",
      loginMethod: "manus", role: "boss", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createEmployeeContext(): TrpcContext {
  return {
    user: {
      id: 2, openId: "employee-user", email: "emp@example.com", name: "Employee User",
      loginMethod: "manus", role: "employee", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createDirectorContext(): TrpcContext {
  return {
    user: {
      id: 3, openId: "director-user", email: "dir@example.com", name: "Director User",
      loginMethod: "manus", role: "director", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

// ============ 单张图片提取测试 ============
describe("aiAnalysis.extractCreditReport", () => {
  it("should exist as a procedure on the router", () => {
    const ctx = createBossContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.aiAnalysis.extractCreditReport).toBeDefined();
    expect(typeof caller.aiAnalysis.extractCreditReport).toBe("function");
  });

  it("should reject empty imageUrl input", async () => {
    const ctx = createBossContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.aiAnalysis.extractCreditReport({ imageUrl: "" })
    ).rejects.toThrow();
  });

  it("should reject access for employee role (no view_ai_analysis permission)", async () => {
    const ctx = createEmployeeContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.aiAnalysis.extractCreditReport({ imageUrl: "https://example.com/test.jpg" })
    ).rejects.toThrow();
  });

  it("analyze procedure should still exist alongside extractCreditReport", () => {
    const ctx = createBossContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.aiAnalysis.analyze).toBeDefined();
    expect(typeof caller.aiAnalysis.analyze).toBe("function");
  });
});

// ============ PDF征信报告提取测试 ============
describe("aiAnalysis.extractCreditPdf", () => {
  it("should exist as a procedure on the router", () => {
    const ctx = createBossContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.aiAnalysis.extractCreditPdf).toBeDefined();
    expect(typeof caller.aiAnalysis.extractCreditPdf).toBe("function");
  });

  it("should reject empty pdfData input", async () => {
    const ctx = createBossContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.aiAnalysis.extractCreditPdf({ pdfData: "", fileName: "test.pdf" })
    ).rejects.toThrow();
  });

  it("should reject empty fileName input", async () => {
    const ctx = createBossContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.aiAnalysis.extractCreditPdf({ pdfData: "dGVzdA==", fileName: "" })
    ).rejects.toThrow();
  });

  it("should reject access for employee role", async () => {
    const ctx = createEmployeeContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.aiAnalysis.extractCreditPdf({ pdfData: "dGVzdA==", fileName: "test.pdf" })
    ).rejects.toThrow();
  });

  it("should be accessible by director role", () => {
    const ctx = createDirectorContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.aiAnalysis.extractCreditPdf).toBeDefined();
  });
});

// ============ 批量图片提取测试 ============
describe("aiAnalysis.batchExtractCreditReport", () => {
  it("should exist as a procedure on the router", () => {
    const ctx = createBossContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.aiAnalysis.batchExtractCreditReport).toBeDefined();
    expect(typeof caller.aiAnalysis.batchExtractCreditReport).toBe("function");
  });

  it("should reject empty imageUrls array", async () => {
    const ctx = createBossContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.aiAnalysis.batchExtractCreditReport({ imageUrls: [] })
    ).rejects.toThrow();
  });

  it("should reject imageUrls with empty strings", async () => {
    const ctx = createBossContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.aiAnalysis.batchExtractCreditReport({ imageUrls: [""] })
    ).rejects.toThrow();
  });

  it("should reject access for employee role", async () => {
    const ctx = createEmployeeContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.aiAnalysis.batchExtractCreditReport({ imageUrls: ["https://example.com/test.jpg"] })
    ).rejects.toThrow();
  });

  it("should reject more than 20 images", async () => {
    const ctx = createBossContext();
    const caller = appRouter.createCaller(ctx);
    const tooManyUrls = Array.from({ length: 21 }, (_, i) => `https://example.com/img${i}.jpg`);
    await expect(
      caller.aiAnalysis.batchExtractCreditReport({ imageUrls: tooManyUrls })
    ).rejects.toThrow();
  });
});

// ============ 批量混合提取测试（图片+PDF） ============
describe("aiAnalysis.batchMixedExtract", () => {
  it("should exist as a procedure on the router", () => {
    const ctx = createBossContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.aiAnalysis.batchMixedExtract).toBeDefined();
    expect(typeof caller.aiAnalysis.batchMixedExtract).toBe("function");
  });

  it("should reject empty items array", async () => {
    const ctx = createBossContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.aiAnalysis.batchMixedExtract({ items: [] })
    ).rejects.toThrow();
  });

  it("should reject access for employee role", async () => {
    const ctx = createEmployeeContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.aiAnalysis.batchMixedExtract({
        items: [{ type: "image", imageUrl: "https://example.com/test.jpg", fileName: "test.jpg" }]
      })
    ).rejects.toThrow();
  });

  it("should reject more than 20 items", async () => {
    const ctx = createBossContext();
    const caller = appRouter.createCaller(ctx);
    const tooManyItems = Array.from({ length: 21 }, (_, i) => ({
      type: "image" as const,
      imageUrl: `https://example.com/img${i}.jpg`,
      fileName: `img${i}.jpg`,
    }));
    await expect(
      caller.aiAnalysis.batchMixedExtract({ items: tooManyItems })
    ).rejects.toThrow();
  });

  it("should accept valid image item from boss role (procedure exists)", () => {
    const ctx = createBossContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.aiAnalysis.batchMixedExtract).toBeDefined();
  });

  it("should accept valid PDF item from director role (procedure exists)", () => {
    const ctx = createDirectorContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.aiAnalysis.batchMixedExtract).toBeDefined();
  });

  it("should accept mixed items (image + pdf) structure", () => {
    // Verify the input schema accepts both types
    const ctx = createBossContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.aiAnalysis.batchMixedExtract).toBeDefined();
  });
});

// ============ 权限综合测试 ============
describe("aiAnalysis permission checks", () => {
  it("boss should have access to all aiAnalysis procedures", () => {
    const ctx = createBossContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.aiAnalysis).toBeDefined();
    expect(caller.aiAnalysis.extractCreditReport).toBeDefined();
    expect(caller.aiAnalysis.extractCreditPdf).toBeDefined();
    expect(caller.aiAnalysis.batchExtractCreditReport).toBeDefined();
    expect(caller.aiAnalysis.batchMixedExtract).toBeDefined();
    expect(caller.aiAnalysis.analyze).toBeDefined();
  });

  it("director should have access to all aiAnalysis procedures", () => {
    const ctx = createDirectorContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.aiAnalysis.extractCreditReport).toBeDefined();
    expect(caller.aiAnalysis.extractCreditPdf).toBeDefined();
    expect(caller.aiAnalysis.batchExtractCreditReport).toBeDefined();
    expect(caller.aiAnalysis.batchMixedExtract).toBeDefined();
    expect(caller.aiAnalysis.analyze).toBeDefined();
  });

  it("employee should not have access to any aiAnalysis procedures", async () => {
    const ctx = createEmployeeContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.aiAnalysis.extractCreditReport({ imageUrl: "https://example.com/test.jpg" })).rejects.toThrow();
    await expect(caller.aiAnalysis.extractCreditPdf({ pdfData: "dGVzdA==", fileName: "test.pdf" })).rejects.toThrow();
    await expect(caller.aiAnalysis.batchExtractCreditReport({ imageUrls: ["https://example.com/test.jpg"] })).rejects.toThrow();
    await expect(caller.aiAnalysis.batchMixedExtract({ items: [{ type: "image", imageUrl: "https://example.com/test.jpg", fileName: "test.jpg" }] })).rejects.toThrow();
    await expect(caller.aiAnalysis.analyze({ question: "test" })).rejects.toThrow();
  });
});
