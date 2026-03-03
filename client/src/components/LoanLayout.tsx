import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { SYSTEM_ROLES, ROLE_PERMISSIONS, hasPermission, getEffectiveRole, type SystemRole } from "../../../shared/permissions";
import {
  BarChart3, Bell, Bot, Building2, ChevronRight, ClipboardList, CreditCard,
  FileText, Home, LayoutDashboard, LogOut, Menu, Monitor, ScrollText,
  Settings, Shield, Trophy, Users, Video, X, RefreshCw, UserCheck,
} from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  permission?: string;
  divider?: boolean;
  section?: string;
}

const allNavItems: NavItem[] = [
  { icon: Home, label: "首页", path: "/home", section: "概览" },
  { icon: Monitor, label: "数据大屏", path: "/data-screen", permission: "view_data_screen", section: "概览" },
  { icon: FileText, label: "征信上传", path: "/credit-reports", permission: "view_credit_reports", section: "业务管理" },
  { icon: Users, label: "客户列表", path: "/customers", permission: "view_customers", section: "业务管理" },
  { icon: CreditCard, label: "银行产品", path: "/bank-products", permission: "view_bank_products", section: "业务管理" },
  { icon: ClipboardList, label: "放款管理", path: "/disbursements", permission: "view_disbursements", section: "业务管理" },
  { icon: Trophy, label: "排名榜单", path: "/rankings", permission: "view_rankings", section: "业务管理" },
  { icon: BarChart3, label: "AI分析", path: "/ai-analysis", permission: "view_ai_analysis", section: "AI功能" },
  { icon: Bot, label: "AI助手", path: "/ai-assistant", permission: "use_ai_assistant", section: "AI功能" },
  { icon: FileText, label: "AI图文工作室", path: "/ai-video", permission: "use_ai_video", section: "AI功能" },
  { icon: Building2, label: "分公司管理", path: "/branches", permission: "manage_branches", section: "系统管理" },
  { icon: Users, label: "员工管理", path: "/employees", permission: "manage_employees", section: "系统管理" },
  { icon: Settings, label: "系统设置", path: "/settings", permission: "system_settings", section: "系统管理" },
  { icon: ScrollText, label: "操作日志", path: "/operation-logs", permission: "view_operation_logs", section: "系统管理" },
];

function getRoleBadge(role: string) {
  const map: Record<string, { label: string; color: string }> = {
    boss: { label: "老板", color: "bg-amber-500/20 text-amber-400" },
    director: { label: "总监", color: "bg-blue-500/20 text-blue-400" },
    shareholder: { label: "股东", color: "bg-purple-500/20 text-purple-400" },
    leader: { label: "组长", color: "bg-green-500/20 text-green-400" },
    finance: { label: "财务", color: "bg-cyan-500/20 text-cyan-400" },
    employee: { label: "员工", color: "bg-gray-500/20 text-gray-400" },
    admin: { label: "管理员", color: "bg-red-500/20 text-red-400" },
    user: { label: "用户", color: "bg-gray-500/20 text-gray-400" },
  };
  return map[role] ?? { label: role, color: "bg-gray-500/20 text-gray-400" };
}

interface DevUser {
  id: number;
  openId: string;
  name: string | null;
  role: string;
  branchId: number | null;
  teamId: number | null;
  position: string | null;
}

// 开发模式用户切换浮动条
function DevUserSwitcher({ currentUser, onSwitch }: { currentUser: any; onSwitch: () => void }) {
  const [devUsers, setDevUsers] = useState<DevUser[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    fetch("/api/dev/users")
      .then(res => res.json())
      .then(data => setDevUsers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const switchToUser = useCallback(async (openId: string) => {
    setSwitching(true);
    try {
      await fetch("/api/dev/switch-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openId }),
      });
      window.location.reload();
    } catch (e) {
      setSwitching(false);
    }
  }, []);

  const currentOpenId = currentUser?.openId || "";

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-lg">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2 text-xs">
          <UserCheck className="w-4 h-4" />
          <span className="font-semibold">测试模式</span>
          <span className="opacity-70">|</span>
          <span>当前用户: <strong>{currentUser?.name || "未登录"}</strong></span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            currentUser?.role === "boss" ? "bg-amber-400/30" :
            currentUser?.role === "director" ? "bg-blue-400/30" :
            currentUser?.role === "shareholder" ? "bg-purple-400/30" :
            currentUser?.role === "leader" ? "bg-green-400/30" :
            currentUser?.role === "finance" ? "bg-cyan-400/30" :
            "bg-gray-400/30"
          }`}>
            {getRoleBadge(currentUser?.role || "employee").label}
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors font-medium"
        >
          {expanded ? "收起" : "切换角色用户 ▼"}
        </button>
      </div>
      {expanded && (
        <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {devUsers.map((u) => {
            const badge = getRoleBadge(u.role);
            const isActive = u.openId === currentOpenId;
            return (
              <button
                key={u.openId}
                disabled={switching || isActive}
                onClick={() => switchToUser(u.openId)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs transition-all ${
                  isActive
                    ? "bg-white/30 ring-2 ring-white font-bold"
                    : "bg-white/10 hover:bg-white/20"
                } ${switching ? "opacity-50" : ""}`}
              >
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                  {u.name?.charAt(0) || "?"}
                </div>
                <span className="font-medium truncate max-w-full">{u.name || u.openId}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${badge.color}`}>{badge.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LoanLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated, logout, refresh } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const switchRole = trpc.auth.switchRole.useMutation({
    onSuccess: () => window.location.reload(),
  });

  const { data: notifications } = trpc.notifications.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  const effectiveRole = useMemo(() => {
    if (!user) return "employee" as SystemRole;
    return getEffectiveRole(user as any);
  }, [user]);

  const visibleNavItems = useMemo(() => {
    return allNavItems.filter((item) => {
      if (!item.permission) return true;
      return hasPermission(effectiveRole, item.permission as any);
    });
  }, [effectiveRole]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">系统加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // 开发模式下不显示登录页，显示提示
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-sm mx-auto px-4">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto elegant-shadow">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text mb-2">内部贷款管理系统</h1>
            <p className="text-muted-foreground text-sm">正在自动登录，请稍候...</p>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  const badge = getRoleBadge(effectiveRole);

  const SidebarContent = () => {
    let lastSection = "";
    return (
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <LayoutDashboard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-sidebar-foreground leading-tight">贷款管理系统</h1>
              <p className="text-[10px] text-sidebar-foreground/40 mt-0.5">内部管理平台 v2.0</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            const showSection = item.section && item.section !== lastSection;
            if (showSection) lastSection = item.section!;
            return (
              <div key={item.path}>
                {showSection && (
                  <div className="px-3 pt-4 pb-1.5 text-[10px] font-semibold text-sidebar-foreground/30 uppercase tracking-wider">
                    {item.section}
                  </div>
                )}
                <Link href={item.path} onClick={() => setSidebarOpen(false)}>
                  <div className={`sidebar-item ${isActive ? "sidebar-item-active" : "sidebar-item-inactive hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}`}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-[13px]">{item.label}</span>
                    {item.label === "消息通知" && unreadCount > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center font-medium">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Role Switcher */}
        <div className="px-3 py-2 border-t border-sidebar-border">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>角色切换</span>
            <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.color}`}>{badge.label}</span>
          </button>
          {roleMenuOpen && (
            <div className="mt-1 p-1 rounded-lg bg-sidebar-accent/30 space-y-0.5">
              {SYSTEM_ROLES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => { switchRole.mutate({ role: r.value }); setRoleMenuOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${
                    effectiveRole === r.value ? "bg-primary/15 text-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                  }`}
                >
                  {r.label} <span className="text-sidebar-foreground/30 ml-1">- {r.description}</span>
                </button>
              ))}
              <button
                onClick={() => { switchRole.mutate({ role: "" }); setRoleMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 rounded text-xs text-sidebar-foreground/50 hover:bg-sidebar-accent/50"
              >
                恢复原始角色
              </button>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="px-3 py-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent/30">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-primary">
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.name ?? "用户"}</p>
              <p className="text-[10px] text-sidebar-foreground/40 mt-0.5">
                <span className={`px-1 py-0.5 rounded ${badge.color}`}>{badge.label}</span>
              </p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              title="退出登录"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 开发模式用户切换浮动条 */}
      <DevUserSwitcher currentUser={user} onSwitch={refresh} />

      <div className="flex flex-1" style={{ marginTop: "40px" }}>
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-60 flex-col bg-sidebar border-r border-sidebar-border flex-shrink-0 sticky top-[40px] h-[calc(100vh-40px)]">
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex" style={{ top: "40px" }}>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" style={{ top: "40px" }} onClick={() => setSidebarOpen(false)} />
            <aside className="relative w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-50">
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <SidebarContent />
            </aside>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
          <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm sticky top-[40px] z-40">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-semibold text-foreground">贷款管理系统</h1>
            <div className="ml-auto flex items-center gap-2">
              {unreadCount > 0 && (
                <Link href="/notifications">
                  <div className="relative p-2">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                  </div>
                </Link>
              )}
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-4 lg:p-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
