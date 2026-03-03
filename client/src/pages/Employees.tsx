import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { getEffectiveRole, hasPermission, SYSTEM_ROLES } from "../../../shared/permissions";
import { Users, Search, Shield, Briefcase, Building2, UserCog, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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

// 常用职位预设
const PRESET_POSITIONS = ["贷款顾问", "高级顾问", "客户经理", "风控专员", "财务专员", "组长", "总监助理", "实习生"];

interface EditEmployeeState {
  userId: number;
  name: string;
  currentPosition: string;
  currentTeamId: number | null;
  currentBranchId: number | null;
}

export default function Employees() {
  const { user } = useAuth();
  const role = useMemo(() => getEffectiveRole(user as any), [user]);
  const canManage = hasPermission(role, "manage_employees");
  const [search, setSearch] = useState("");
  const [editState, setEditState] = useState<EditEmployeeState | null>(null);
  const [positionInput, setPositionInput] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  const { data: employees, refetch } = trpc.users.list.useQuery();
  const { data: branches } = trpc.branches.list.useQuery();
  const { data: teams } = trpc.teams.list.useQuery(undefined);

  const updateRoleMut = trpc.users.updateRole.useMutation({ onSuccess: () => { toast.success("角色已更新"); refetch(); } });
  const updatePositionMut = trpc.users.updatePosition.useMutation({ onSuccess: () => { toast.success("职位已更新"); refetch(); setEditState(null); } });
  const assignTeamMut = trpc.users.assignTeam.useMutation({ onSuccess: () => { toast.success("组别已更新"); refetch(); setEditState(null); } });

  const filtered = useMemo(() => {
    if (!employees) return [];
    if (!search) return employees;
    const s = search.toLowerCase();
    return employees.filter((e: any) => e.name?.toLowerCase().includes(s) || e.email?.toLowerCase().includes(s));
  }, [employees, search]);

  const openEdit = (emp: any) => {
    setEditState({
      userId: emp.id,
      name: emp.name ?? "",
      currentPosition: emp.position ?? "",
      currentTeamId: emp.teamId ?? null,
      currentBranchId: emp.branchId ?? null,
    });
    setPositionInput(emp.position ?? "");
    setSelectedTeamId(emp.teamId ? String(emp.teamId) : "");
    setSelectedBranchId(emp.branchId ? String(emp.branchId) : "");
  };

  const handleSavePosition = () => {
    if (!editState) return;
    updatePositionMut.mutate({ userId: editState.userId, position: positionInput });
  };

  const handleSaveTeam = () => {
    if (!editState) return;
    assignTeamMut.mutate({
      userId: editState.userId,
      teamId: selectedTeamId ? Number(selectedTeamId) : null,
      branchId: selectedBranchId ? Number(selectedBranchId) : null,
    });
  };

  // 根据已选分公司过滤团队
  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    if (!selectedBranchId) return teams as any[];
    return (teams as any[]).filter((t: any) => t.branchId === Number(selectedBranchId));
  }, [teams, selectedBranchId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="page-title">员工管理</h1>
          <p className="page-subtitle">管理系统用户、角色权限和组别分配，共 {employees?.length ?? 0} 名用户</p>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">职位</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">所属团队</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">最后登录</th>
                {canManage && <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">操作</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp: any) => {
                const empTeam = (teams as any[])?.find((t: any) => t.id === emp.teamId);
                const empBranch = (branches as any[])?.find((b: any) => b.id === emp.branchId);
                return (
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
                      {canManage ? (
                        <Select value={emp.role} onValueChange={v => updateRoleMut.mutate({ userId: emp.id, role: v })}>
                          <SelectTrigger className="w-[100px] h-7 text-xs"><Shield className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SYSTEM_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[emp.role] ?? ROLE_COLORS.employee}`}>
                          {SYSTEM_ROLES.find(r => r.value === emp.role)?.label ?? emp.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {emp.position ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/20 text-indigo-400">
                          <Briefcase className="w-3 h-3" />{emp.position}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">未设置</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {empTeam ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                            <Users className="w-3 h-3" />{empTeam.name}
                          </span>
                        ) : null}
                        {empBranch ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="w-3 h-3" />{empBranch.name}
                          </span>
                        ) : null}
                        {!empTeam && !empBranch && <span className="text-xs text-muted-foreground">未分配</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(emp.lastSignedIn).toLocaleString()}</td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openEdit(emp)}>
                          <UserCog className="w-3 h-3" />编辑
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={canManage ? 7 : 6} className="px-4 py-12 text-center text-muted-foreground"><Users className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">暂无用户</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 编辑员工弹窗 */}
      <Dialog open={!!editState} onOpenChange={open => !open && setEditState(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-primary" />
              编辑员工信息 — {editState?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* 职位设置 */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400" />职位设置
              </Label>
              <div className="flex gap-2">
                <Input
                  value={positionInput}
                  onChange={e => setPositionInput(e.target.value)}
                  placeholder="输入职位名称..."
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleSavePosition}
                  disabled={updatePositionMut.isPending}
                >
                  {updatePositionMut.isPending ? "保存中..." : "保存"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_POSITIONS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPositionInput(p)}
                    className={`px-2 py-0.5 rounded text-xs border transition-colors ${positionInput === p ? "bg-primary/20 border-primary/50 text-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border" />

            {/* 组别调配 */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />组别调配
              </Label>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">所属分公司</Label>
                  <Select
                    value={selectedBranchId}
                    onValueChange={v => { setSelectedBranchId(v); setSelectedTeamId(""); }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择分公司（可选）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">不分配分公司</SelectItem>
                      {(branches as any[])?.map((b: any) => (
                        <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">所属团队</Label>
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择团队（可选）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">不分配团队</SelectItem>
                      {filteredTeams.map((t: any) => (
                        <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="w-full"
                size="sm"
                variant="outline"
                onClick={handleSaveTeam}
                disabled={assignTeamMut.isPending}
              >
                {assignTeamMut.isPending ? "保存中..." : "保存组别分配"}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setEditState(null)}>
              <X className="w-4 h-4 mr-1" />关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
