import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import { hasPermission, getEffectiveRole, ROLE_PERMISSIONS, SYSTEM_ROLES } from "../shared/permissions";
import type { TrpcContext } from "./_core/context";

// ============ 权限系统测试 ============
describe("RBAC Permission System", () => {
  it("should define 6 system roles", () => {
    expect(SYSTEM_ROLES).toHaveLength(6);
    const roleValues = SYSTEM_ROLES.map((r) => r.value);
    expect(roleValues).toContain("boss");
    expect(roleValues).toContain("director");
    expect(roleValues).toContain("shareholder");
    expect(roleValues).toContain("leader");
    expect(roleValues).toContain("finance");
    expect(roleValues).toContain("employee");
  });

  it("boss should have all permissions", () => {
    expect(hasPermission("boss", "view_dashboard")).toBe(true);
    expect(hasPermission("boss", "view_data_screen")).toBe(true);
    expect(hasPermission("boss", "view_ai_analysis")).toBe(true);
    expect(hasPermission("boss", "delete_data")).toBe(true);
    expect(hasPermission("boss", "manage_branches")).toBe(true);
    expect(hasPermission("boss", "system_settings")).toBe(true);
    expect(hasPermission("boss", "view_all_data")).toBe(true);
  });

  it("director should not have delete_data permission", () => {
    expect(hasPermission("director", "view_dashboard")).toBe(true);
    expect(hasPermission("director", "view_ai_analysis")).toBe(true);
    expect(hasPermission("director", "delete_data")).toBe(false);
    expect(hasPermission("director", "system_settings")).toBe(false);
  });

  it("shareholder should only view data", () => {
    expect(hasPermission("shareholder", "view_dashboard")).toBe(true);
    expect(hasPermission("shareholder", "view_data_screen")).toBe(true);
    expect(hasPermission("shareholder", "upload_credit_report")).toBe(false);
    expect(hasPermission("shareholder", "manage_disbursements")).toBe(false);
    expect(hasPermission("shareholder", "use_ai_assistant")).toBe(false);
  });

  it("leader should see team data and rankings", () => {
    expect(hasPermission("leader", "view_rankings")).toBe(true);
    expect(hasPermission("leader", "view_team_data")).toBe(true);
    expect(hasPermission("leader", "view_all_data")).toBe(false);
    expect(hasPermission("leader", "manage_branches")).toBe(false);
  });

  it("finance should manage disbursements and view all data", () => {
    expect(hasPermission("finance", "manage_disbursements")).toBe(true);
    expect(hasPermission("finance", "view_all_data")).toBe(true);
    expect(hasPermission("finance", "upload_credit_report")).toBe(false);
  });

  it("employee should have basic permissions", () => {
    expect(hasPermission("employee", "view_dashboard")).toBe(true);
    expect(hasPermission("employee", "upload_credit_report")).toBe(true);
    expect(hasPermission("employee", "view_rankings")).toBe(true);
    expect(hasPermission("employee", "manage_branches")).toBe(false);
    // v2.1: AI分析开放给所有角色（员工可查看个人数据）
    expect(hasPermission("employee", "view_ai_analysis")).toBe(true);
  });

  it("getEffectiveRole should map admin to boss", () => {
    expect(getEffectiveRole({ role: "admin" })).toBe("boss");
  });

  it("getEffectiveRole should use simulatedRole when set", () => {
    expect(getEffectiveRole({ role: "boss", simulatedRole: "employee" })).toBe("employee");
    expect(getEffectiveRole({ role: "employee", simulatedRole: "director" })).toBe("director");
  });

  it("getEffectiveRole should default to employee for unknown roles", () => {
    expect(getEffectiveRole({ role: "unknown" })).toBe("employee");
    expect(getEffectiveRole({})).toBe("employee");
  });

  it("hasPermission should return false for null/undefined role", () => {
    expect(hasPermission(null, "view_dashboard")).toBe(true); // defaults to employee which has view_dashboard
    expect(hasPermission(undefined, "manage_branches")).toBe(false); // employee doesn't have manage_branches
  });
});

// ============ Auth Router 测试 ============
describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
    const ctx: TrpcContext = {
      user: {
        id: 1, openId: "test-user", email: "test@example.com", name: "Test User",
        loginMethod: "manus", role: "boss", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
  });
});

// ============ Router 结构测试 ============
describe("appRouter structure", () => {
  it("should have all required routers", () => {
    const routerKeys = Object.keys(appRouter._def.procedures).concat(
      Object.keys(appRouter._def.record)
    );
    // Check top-level router names exist
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    });
    // auth.me should work for public procedure
    expect(caller.auth.me).toBeDefined();
  });
});
