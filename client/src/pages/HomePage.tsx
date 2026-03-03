import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getEffectiveRole, hasPermission, SYSTEM_ROLES, type SystemRole } from "../../../shared/permissions";
import {
  FileText, CreditCard, ClipboardList, Trophy, Bot, Video, BarChart3,
  ArrowRight, TrendingUp, Users, Building2, DollarSign,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "wouter";

export default function HomePage() {
  const { user } = useAuth();
  const effectiveRole = useMemo(() => getEffectiveRole(user as any), [user]);
  const { data: stats } = trpc.stats.dashboard.useQuery(undefined, {
    enabled: hasPermission(effectiveRole, "view_dashboard"),
  });

  const quickActions = useMemo(() => {
    const actions = [];
    if (hasPermission(effectiveRole, "upload_credit_report"))
      actions.push({ icon: FileText, label: "上传征信", path: "/credit-reports", color: "from-blue-500/20 to-blue-600/10", iconColor: "text-blue-400" });
    if (hasPermission(effectiveRole, "view_bank_products"))
      actions.push({ icon: CreditCard, label: "银行产品", path: "/bank-products", color: "from-emerald-500/20 to-emerald-600/10", iconColor: "text-emerald-400" });
    if (hasPermission(effectiveRole, "view_disbursements"))
      actions.push({ icon: ClipboardList, label: "放款管理", path: "/disbursements", color: "from-amber-500/20 to-amber-600/10", iconColor: "text-amber-400" });
    if (hasPermission(effectiveRole, "view_rankings"))
      actions.push({ icon: Trophy, label: "排名榜单", path: "/rankings", color: "from-purple-500/20 to-purple-600/10", iconColor: "text-purple-400" });
    if (hasPermission(effectiveRole, "use_ai_assistant"))
      actions.push({ icon: Bot, label: "AI助手", path: "/ai-assistant", color: "from-cyan-500/20 to-cyan-600/10", iconColor: "text-cyan-400" });
    if (hasPermission(effectiveRole, "use_ai_video"))
      actions.push({ icon: FileText, label: "AI图文", path: "/ai-video", color: "from-pink-500/20 to-pink-600/10", iconColor: "text-pink-400" });
    return actions;
  }, [effectiveRole]);

  const badge = useMemo(() => {
    const map: Record<string, { label: string; color: string }> = {
      boss: { label: "老板", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
      director: { label: "总监", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
      shareholder: { label: "股东", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
      leader: { label: "组长", color: "bg-green-500/20 text-green-400 border-green-500/30" },
      finance: { label: "财务", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
      employee: { label: "员工", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
    };
    return map[effectiveRole] ?? map.employee;
  }, [effectiveRole]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="glass-card rounded-2xl p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              欢迎回来，<span className="gradient-text">{user?.name ?? "用户"}</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              当前角色：<span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${badge.color}`}>{badge.label}</span>
            </p>
          </div>
          {hasPermission(effectiveRole, "view_data_screen") && (
            <Link href="/data-screen">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium cursor-pointer">
                <Monitor className="w-4 h-4" />
                进入数据大屏
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={FileText} label="征信报告" value={stats.totalCreditReports} color="text-blue-400" bgColor="bg-blue-500/10" />
          <StatCard icon={ClipboardList} label="放款笔数" value={stats.totalDisbursements} color="text-emerald-400" bgColor="bg-emerald-500/10" />
          <StatCard icon={DollarSign} label="放款总额" value={`¥${Number(stats.totalDisbursementAmount).toLocaleString()}`} color="text-amber-400" bgColor="bg-amber-500/10" />
          <StatCard icon={TrendingUp} label="佣金总额" value={`¥${Number(stats.totalCommission).toLocaleString()}`} color="text-purple-400" bgColor="bg-purple-500/10" />
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">快捷操作</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {quickActions.map((action) => (
            <Link key={action.path} href={action.path}>
              <div className={`glass-card rounded-xl p-4 hover:scale-[1.02] transition-all cursor-pointer group`}>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3`}>
                  <action.icon className={`w-5 h-5 ${action.iconColor}`} />
                </div>
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{action.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Role Permissions Guide */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">角色权限说明</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {SYSTEM_ROLES.map((role) => {
            const isActive = effectiveRole === role.value;
            return (
              <div key={role.value} className={`glass-card rounded-xl p-4 transition-all ${isActive ? "ring-1 ring-primary/50" : ""}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {role.label}
                  </span>
                  {isActive && <span className="text-[10px] text-primary">当前</span>}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{role.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bgColor }: { icon: any; label: string; value: string | number; color: string; bgColor: string }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-foreground truncate">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Monitor(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  );
}
