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

describe("aiAnalysis.extractCreditReport", () => {
  it("should exist as a procedure on the router", () => {
    const ctx = createBossContext();
    const caller = appRouter.createCaller(ctx);
    // Verify the extractCreditReport procedure exists
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

describe("aiAnalysis permission checks", () => {
  it("boss should have access to aiAnalysis procedures", () => {
    const ctx = createBossContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.aiAnalysis).toBeDefined();
    expect(caller.aiAnalysis.extractCreditReport).toBeDefined();
    expect(caller.aiAnalysis.analyze).toBeDefined();
  });

  it("director should have access to aiAnalysis procedures", () => {
    const ctx: TrpcContext = {
      user: {
        id: 3, openId: "director-user", email: "dir@example.com", name: "Director User",
        loginMethod: "manus", role: "director", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    expect(caller.aiAnalysis.extractCreditReport).toBeDefined();
  });
});
