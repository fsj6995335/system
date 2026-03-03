import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { getEffectiveRole, hasPermission, SYSTEM_ROLES } from "../../../shared/permissions";
import { Users, Search, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ROLE_COLORS: Record<string, string> = {
  boss: "bg-amber-500/20 text-amber-400",
  director: "bg-blue-500/20 text-blue-400",
  shareholder: "bg-purple-500/20 text-purple-400",
  leader: "bg-green-500/20 text-green-400",
  finance: "bg-cyan-500/20 text-cyan-400",
  employee: "bg-gray-500/20 text-gray-400",
  admin: "bg-red-500/20 text-red-400",
  user: "bg-gray-500/20 text-gray-400",
};

export default function Employees() {
  const { user } = useAuth();
  const role = useMemo(() => getEffectiveRole(user as any), [user]);
  const canManage = hasPermission(role, "manage_employees");
  const [search, setSearch] = useState("");

  const { data: employees, refetch } = trpc.users.list.useQuery();
  const updateRoleMut = trpc.users.updateRole.useMutation({ onSuccess: () => { toast.success("角色已更新"); refetch(); } });

  const filtered = useMemo(() => {
    if (!employees) return [];
    if (!search) return employees;
    const s = search.toLowerCase();
    return employees.filter((e: any) => e.name?.toLowerCase().includes(s) || e.email?.toLowerCase().includes(s));
  }, [employees, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="page-title">员工管理</h1>
          <p className="page-subtitle">管理系统用户和角色权限，共 {employees?.length ?? 0} 名用户</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索姓名/邮箱..." className="pl-9" />
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">用户</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">邮箱</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">角色</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">最后登录</th>
                {canManage && <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">操作</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp: any) => (
                <tr key={emp.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-primary">{emp.name?.charAt(0) ?? "?"}</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">{emp.name || "未设置"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{emp.email || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[emp.role] ?? ROLE_COLORS.employee}`}>
                      {SYSTEM_ROLES.find(r => r.value === emp.role)?.label ?? emp.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(emp.lastSignedIn).toLocaleString()}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <Select value={emp.role} onValueChange={v => updateRoleMut.mutate({ userId: emp.id, role: v })}>
                        <SelectTrigger className="w-[100px] h-7 text-xs"><Shield className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SYSTEM_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={canManage ? 5 : 4} className="px-4 py-12 text-center text-muted-foreground"><Users className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">暂无用户</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
