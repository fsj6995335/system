import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getEffectiveRole, hasPermission } from "../../../shared/permissions";
import { ClipboardList, ShieldAlert, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ACTION_COLORS: Record<string, string> = {
  create: "bg-emerald-500/20 text-emerald-400",
  update: "bg-blue-500/20 text-blue-400",
  delete: "bg-red-500/20 text-red-400",
  approve: "bg-amber-500/20 text-amber-400",
  reject: "bg-red-500/20 text-red-400",
  login: "bg-purple-500/20 text-purple-400",
};

const ACTION_LABELS: Record<string, string> = {
  create: "创建",
  update: "更新",
  delete: "删除",
  approve: "审批",
  reject: "拒绝",
  login: "登录",
};

export default function AuditLogs() {
  const { user } = useAuth();
  const role = useMemo(() => getEffectiveRole(user as any), [user]);
  const canAccess = hasPermission(role, "view_operation_logs");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: logs } = trpc.operationLogs.list.useQuery({ page: 1, pageSize: 100 });

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">权限不足</h2>
        <p className="text-muted-foreground">操作日志仅对老板和总监开放</p>
      </div>
    );
  }

  const filtered = useMemo(() => {
    if (!logs?.items) return [];
    let items = logs.items;
    if (search) {
      const s = search.toLowerCase();
      items = items.filter((l: any) => l.userName?.toLowerCase().includes(s) || l.details?.toLowerCase().includes(s) || l.module?.toLowerCase().includes(s));
    }
    if (actionFilter !== "all") {
      items = items.filter((l: any) => l.action === actionFilter);
    }
    return items;
  }, [logs, search, actionFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">操作日志</h1>
        <p className="page-subtitle">系统操作记录和审计追踪</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索用户/模块/详情..." className="pl-9" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[120px]"><Filter className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部操作</SelectItem>
            <SelectItem value="create">创建</SelectItem>
            <SelectItem value="update">更新</SelectItem>
            <SelectItem value="delete">删除</SelectItem>
            <SelectItem value="approve">审批</SelectItem>
            <SelectItem value="login">登录</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">时间</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">用户</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">操作</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">模块</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">详情</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log: any) => (
                <tr key={log.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{log.userName || "-"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action] ?? "bg-muted text-muted-foreground"}`}>{ACTION_LABELS[log.action] ?? log.action}</span></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{log.module || "-"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{log.details || "-"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{log.ipAddress || "-"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground"><ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">暂无操作日志</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
