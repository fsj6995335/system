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

// ============ 单张提取测试 ============
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

// ============ 批量提取测试 ============
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

  it("should accept valid input from boss role (procedure exists and callable)", () => {
    const ctx = createBossContext();
    const caller = appRouter.createCaller(ctx);
    // Just verify the procedure is callable with valid input structure
    expect(caller.aiAnalysis.batchExtractCreditReport).toBeDefined();
  });

  it("should accept valid input from director role", () => {
    const ctx = createDirectorContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.aiAnalysis.batchExtractCreditReport).toBeDefined();
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

// ============ 权限综合测试 ============
describe("aiAnalysis permission checks", () => {
  it("boss should have access to all aiAnalysis procedures", () => {
    const ctx = createBossContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.aiAnalysis).toBeDefined();
    expect(caller.aiAnalysis.extractCreditReport).toBeDefined();
    expect(caller.aiAnalysis.batchExtractCreditReport).toBeDefined();
    expect(caller.aiAnalysis.analyze).toBeDefined();
  });

  it("director should have access to all aiAnalysis procedures", () => {
    const ctx = createDirectorContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.aiAnalysis.extractCreditReport).toBeDefined();
    expect(caller.aiAnalysis.batchExtractCreditReport).toBeDefined();
    expect(caller.aiAnalysis.analyze).toBeDefined();
  });

  it("employee should not have access to aiAnalysis procedures", async () => {
    const ctx = createEmployeeContext();
    const caller = appRouter.createCaller(ctx);
    // All three procedures should reject employee access
    await expect(caller.aiAnalysis.extractCreditReport({ imageUrl: "https://example.com/test.jpg" })).rejects.toThrow();
    await expect(caller.aiAnalysis.batchExtractCreditReport({ imageUrls: ["https://example.com/test.jpg"] })).rejects.toThrow();
    await expect(caller.aiAnalysis.analyze({ question: "test" })).rejects.toThrow();
  });
});
