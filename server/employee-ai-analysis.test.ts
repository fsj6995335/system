import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import {
  hasPermission,
  getEffectiveRole,
  getAiAnalysisDataScope,
  ROLE_PERMISSIONS,
  SYSTEM_ROLES,
} from "../shared/permissions";
import type { TrpcContext } from "./_core/context";

// ============ 辅助函数：创建测试 caller ============
function createCaller(role: string, extra: Record<string, any> = {}) {
  const ctx: TrpcContext = {
    user: {
      id: 1,
      openId: `test-${role}`,
      email: `${role}@test.com`,
      name: `Test ${role}`,
      loginMethod: "manus",
      role,
      simulatedRole: null,
      teamId: extra.teamId ?? null,
      branchId: extra.branchId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...extra,
    } as any,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

// ============ 1. AI 分析权限开放测试 ============
describe("AI Analysis - All Roles Access", () => {
  it("boss should have view_ai_analysis permission", () => {
    expect(hasPermission("boss", "view_ai_analysis")).toBe(true);
  });

  it("director should have view_ai_analysis permission", () => {
    expect(hasPermission("director", "view_ai_analysis")).toBe(true);
  });

  it("leader should now have view_ai_analysis permission", () => {
    expect(hasPermission("leader", "view_ai_analysis")).toBe(true);
  });

  it("finance should now have view_ai_analysis permission", () => {
    expect(hasPermission("finance", "view_ai_analysis")).toBe(true);
  });

  it("employee should now have view_ai_analysis permission", () => {
    expect(hasPermission("employee", "view_ai_analysis")).toBe(true);
  });

  it("shareholder should NOT have view_ai_analysis permission", () => {
    // 股东只能查看数据，不能使用 AI 分析
    expect(hasPermission("shareholder", "view_ai_analysis")).toBe(false);
  });
});

// ============ 2. AI 分析数据范围区分测试 ============
describe("AI Analysis - Data Scope by Role", () => {
  it("boss should have 'all' data scope", () => {
    expect(getAiAnalysisDataScope("boss")).toBe("all");
  });

  it("director should have 'all' data scope", () => {
    expect(getAiAnalysisDataScope("director")).toBe("all");
  });

  it("shareholder should have 'all' data scope (view only)", () => {
    expect(getAiAnalysisDataScope("shareholder")).toBe("all");
  });

  it("leader should have 'team' data scope", () => {
    expect(getAiAnalysisDataScope("leader")).toBe("team");
  });

  it("finance should have 'team' data scope", () => {
    expect(getAiAnalysisDataScope("finance")).toBe("team");
  });

  it("employee should have 'personal' data scope", () => {
    expect(getAiAnalysisDataScope("employee")).toBe("personal");
  });
});

// ============ 3. AI 分析 getDataScope API 测试 ============
describe("AI Analysis - getDataScope API", () => {
  it("boss caller should get 'all' scope from API", async () => {
    const caller = createCaller("boss");
    const result = await caller.aiAnalysis.getDataScope();
    expect(result.scope).toBe("all");
    expect(result.label).toBe("全公司数据");
    expect(result.role).toBe("boss");
  });

  it("leader caller should get 'team' scope from API", async () => {
    const caller = createCaller("leader", { teamId: 5, branchId: 2 });
    const result = await caller.aiAnalysis.getDataScope();
    expect(result.scope).toBe("team");
    expect(result.label).toBe("本组/本部门数据");
    expect(result.teamId).toBe(5);
    expect(result.branchId).toBe(2);
  });

  it("employee caller should get 'personal' scope from API", async () => {
    const caller = createCaller("employee");
    const result = await caller.aiAnalysis.getDataScope();
    expect(result.scope).toBe("personal");
    expect(result.label).toBe("个人数据");
  });

  it("shareholder caller should be FORBIDDEN from getDataScope", async () => {
    const caller = createCaller("shareholder");
    await expect(caller.aiAnalysis.getDataScope()).rejects.toThrow();
  });
});

// ============ 4. 员工职位管理权限测试 ============
describe("Employee Position Management - Permissions", () => {
  it("boss should have manage_employees permission", () => {
    expect(hasPermission("boss", "manage_employees")).toBe(true);
  });

  it("director should have manage_employees permission", () => {
    expect(hasPermission("director", "manage_employees")).toBe(true);
  });

  it("leader should NOT have manage_employees permission", () => {
    expect(hasPermission("leader", "manage_employees")).toBe(false);
  });

  it("finance should NOT have manage_employees permission", () => {
    expect(hasPermission("finance", "manage_employees")).toBe(false);
  });

  it("employee should NOT have manage_employees permission", () => {
    expect(hasPermission("employee", "manage_employees")).toBe(false);
  });
});

// ============ 5. updatePosition API 权限控制测试 ============
describe("Employee Position Management - updatePosition API", () => {
  it("boss caller should be able to call updatePosition (structure check)", async () => {
    const caller = createCaller("boss");
    // 验证 API 存在且可调用（会因 DB 不可用而失败，但不应是权限错误）
    try {
      await caller.users.updatePosition({ userId: 999, position: "高级顾问" });
    } catch (e: any) {
      // 期望是 DB 错误，而非权限错误
      expect(e.message).not.toContain("无权限");
      expect(e.code).not.toBe("FORBIDDEN");
    }
  });

  it("director caller should be able to call updatePosition (structure check)", async () => {
    const caller = createCaller("director");
    try {
      await caller.users.updatePosition({ userId: 999, position: "贷款顾问" });
    } catch (e: any) {
      expect(e.message).not.toContain("无权限");
      expect(e.code).not.toBe("FORBIDDEN");
    }
  });

  it("employee caller should be FORBIDDEN from updatePosition", async () => {
    const caller = createCaller("employee");
    await expect(caller.users.updatePosition({ userId: 1, position: "顾问" })).rejects.toThrow();
  });

  it("leader caller should be FORBIDDEN from updatePosition", async () => {
    const caller = createCaller("leader");
    await expect(caller.users.updatePosition({ userId: 1, position: "顾问" })).rejects.toThrow();
  });
});

// ============ 6. assignTeam API 权限控制测试 ============
describe("Employee Team Assignment - assignTeam API", () => {
  it("boss caller should be able to call assignTeam (structure check)", async () => {
    const caller = createCaller("boss");
    try {
      await caller.users.assignTeam({ userId: 999, teamId: 1, branchId: 1 });
    } catch (e: any) {
      expect(e.message).not.toContain("无权限");
      expect(e.code).not.toBe("FORBIDDEN");
    }
  });

  it("director caller should be able to call assignTeam (structure check)", async () => {
    const caller = createCaller("director");
    try {
      await caller.users.assignTeam({ userId: 999, teamId: 2, branchId: null });
    } catch (e: any) {
      expect(e.message).not.toContain("无权限");
      expect(e.code).not.toBe("FORBIDDEN");
    }
  });

  it("employee caller should be FORBIDDEN from assignTeam", async () => {
    const caller = createCaller("employee");
    await expect(caller.users.assignTeam({ userId: 1, teamId: 1, branchId: 1 })).rejects.toThrow();
  });

  it("finance caller should be FORBIDDEN from assignTeam", async () => {
    const caller = createCaller("finance");
    await expect(caller.users.assignTeam({ userId: 1, teamId: 1, branchId: 1 })).rejects.toThrow();
  });
});

// ============ 7. 角色切换后权限联动测试 ============
describe("Simulated Role - AI Analysis Scope Changes", () => {
  it("boss simulating employee should get 'personal' scope", () => {
    const effectiveRole = getEffectiveRole({ role: "boss", simulatedRole: "employee" });
    expect(effectiveRole).toBe("employee");
    expect(getAiAnalysisDataScope(effectiveRole)).toBe("personal");
  });

  it("employee simulating leader should get 'team' scope", () => {
    const effectiveRole = getEffectiveRole({ role: "employee", simulatedRole: "leader" });
    expect(effectiveRole).toBe("leader");
    expect(getAiAnalysisDataScope(effectiveRole)).toBe("team");
  });

  it("employee simulating boss should get 'all' scope", () => {
    const effectiveRole = getEffectiveRole({ role: "employee", simulatedRole: "boss" });
    expect(effectiveRole).toBe("boss");
    expect(getAiAnalysisDataScope(effectiveRole)).toBe("all");
  });
});

// ============ 8. 新 API 路由结构完整性测试 ============
describe("Router Structure - New APIs", () => {
  it("users.updatePosition should be defined", () => {
    const caller = createCaller("boss");
    expect(caller.users.updatePosition).toBeDefined();
  });

  it("users.assignTeam should be defined", () => {
    const caller = createCaller("boss");
    expect(caller.users.assignTeam).toBeDefined();
  });

  it("aiAnalysis.getDataScope should be defined", () => {
    const caller = createCaller("boss");
    expect(caller.aiAnalysis.getDataScope).toBeDefined();
  });
});
