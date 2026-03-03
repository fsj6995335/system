// 6角色RBAC权限体系
export type SystemRole = "boss" | "director" | "shareholder" | "leader" | "finance" | "employee";

export const SYSTEM_ROLES: { value: SystemRole; label: string; description: string }[] = [
  { value: "boss", label: "老板", description: "所有权限，可查看全公司AI分析和数据大屏" },
  { value: "director", label: "总监", description: "部分权限，无删除权限，可查看全公司AI分析" },
  { value: "shareholder", label: "股东", description: "只能查看数据，无操作权限" },
  { value: "leader", label: "组长", description: "查看本组员工数据、排名，可使用AI分析（本组数据）" },
  { value: "finance", label: "财务", description: "财务相关权限，可使用AI分析" },
  { value: "employee", label: "员工", description: "基本操作，可查看排名，可使用AI分析（个人数据）" },
];

export type Permission =
  | "view_dashboard"
  | "view_data_screen"
  | "view_credit_reports"
  | "upload_credit_report"
  | "edit_credit_report"
  | "delete_credit_report"
  | "view_customers"
  | "view_bank_products"
  | "manage_bank_products"
  | "view_disbursements"
  | "manage_disbursements"
  | "view_rankings"
  | "view_ai_analysis"
  | "use_ai_assistant"
  | "use_ai_video"
  | "manage_branches"
  | "manage_employees"
  | "manage_teams"
  | "view_operation_logs"
  | "system_settings"
  | "view_all_data"
  | "view_team_data"
  | "delete_data";

export const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  boss: [
    "view_dashboard", "view_data_screen", "view_credit_reports", "upload_credit_report",
    "edit_credit_report", "delete_credit_report", "view_customers", "view_bank_products",
    "manage_bank_products", "view_disbursements", "manage_disbursements", "view_rankings",
    "view_ai_analysis", "use_ai_assistant", "use_ai_video", "manage_branches",
    "manage_employees", "manage_teams", "view_operation_logs", "system_settings",
    "view_all_data", "delete_data",
  ],
  director: [
    "view_dashboard", "view_data_screen", "view_credit_reports", "upload_credit_report",
    "edit_credit_report", "view_customers", "view_bank_products", "manage_bank_products",
    "view_disbursements", "manage_disbursements", "view_rankings", "view_ai_analysis",
    "use_ai_assistant", "use_ai_video", "manage_employees", "manage_teams",
    "view_operation_logs", "view_all_data",
  ],
  shareholder: [
    "view_dashboard", "view_data_screen", "view_credit_reports", "view_customers",
    "view_bank_products", "view_disbursements", "view_rankings", "view_all_data",
  ],
  leader: [
    "view_dashboard", "view_credit_reports", "upload_credit_report", "edit_credit_report",
    "view_customers", "view_bank_products", "view_disbursements", "manage_disbursements",
    "view_rankings", "view_ai_analysis", "use_ai_assistant", "use_ai_video", "view_team_data",
  ],
  finance: [
    "view_dashboard", "view_credit_reports", "view_customers", "view_bank_products",
    "view_disbursements", "manage_disbursements", "view_rankings", "view_ai_analysis",
    "use_ai_assistant", "view_all_data",
  ],
  employee: [
    "view_dashboard", "view_credit_reports", "upload_credit_report", "view_customers",
    "view_bank_products", "view_disbursements", "view_rankings", "view_ai_analysis",
    "use_ai_assistant", "use_ai_video",
  ],
};

export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  const r = (role || "employee") as SystemRole;
  const perms = ROLE_PERMISSIONS[r];
  if (!perms) return false;
  return perms.includes(permission);
}

export function getEffectiveRole(user: { role?: string | null; simulatedRole?: string | null }): SystemRole {
  // 如果有模拟角色（角色切换功能），使用模拟角色
  if (user.simulatedRole && ROLE_PERMISSIONS[user.simulatedRole as SystemRole]) {
    return user.simulatedRole as SystemRole;
  }
  // admin 映射为 boss
  if (user.role === "admin") return "boss";
  if (user.role && ROLE_PERMISSIONS[user.role as SystemRole]) {
    return user.role as SystemRole;
  }
  return "employee";
}

/**
 * 根据角色获取 AI 分析的数据范围描述
 * boss/director: 全公司数据
 * leader/finance: 本组/本部门数据
 * employee: 个人数据
 */
export function getAiAnalysisDataScope(role: SystemRole): "all" | "team" | "personal" {
  if (role === "boss" || role === "director" || role === "shareholder") return "all";
  if (role === "leader" || role === "finance") return "team";
  return "personal";
}
