import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { getEffectiveRole, hasPermission } from "../../../shared/permissions";
import { Plus, Search, FileText, Eye, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

const GRADE_COLORS: Record<string, string> = { A: "bg-emerald-500/20 text-emerald-400", B: "bg-blue-500/20 text-blue-400", C: "bg-amber-500/20 text-amber-400", D: "bg-red-500/20 text-red-400" };
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "待审核", color: "bg-yellow-500/20 text-yellow-400" },
  reviewed: { label: "已审核", color: "bg-blue-500/20 text-blue-400" },
  matched: { label: "已匹配", color: "bg-emerald-500/20 text-emerald-400" },
  rejected: { label: "已拒绝", color: "bg-red-500/20 text-red-400" },
};

export default function CreditReports() {
  const { user } = useAuth();
  const role = useMemo(() => getEffectiveRole(user as any), [user]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, refetch } = trpc.creditReports.list.useQuery({ search: search || undefined, status: statusFilter || undefined, grade: gradeFilter || undefined, page, pageSize: 20 });
  const createMut = trpc.creditReports.create.useMutation({ onSuccess: () => { toast.success("征信报告已上传"); refetch(); setDialogOpen(false); } });
  const deleteMut = trpc.creditReports.delete.useMutation({ onSuccess: () => { toast.success("已删除"); refetch(); } });

  const [form, setForm] = useState({ customerName: "", customerPhone: "", customerIdCard: "", creditScore: "", customerGrade: "C" as string, monthlyIncome: "", totalDebt: "", notes: "" });

  const handleCreate = () => {
    if (!form.customerName) { toast.error("请输入客户姓名"); return; }
    createMut.mutate({ customerName: form.customerName, customerPhone: form.customerPhone || undefined, customerIdCard: form.customerIdCard || undefined, creditScore: form.creditScore ? Number(form.creditScore) : undefined, customerGrade: form.customerGrade as any, monthlyIncome: form.monthlyIncome || undefined, totalDebt: form.totalDebt || undefined, notes: form.notes || undefined });
  };

  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="page-title">征信上传</h1>
          <p className="page-subtitle">管理客户征信报告，共 {data?.total ?? 0} 条记录</p>
        </div>
        {hasPermission(role, "upload_credit_report") && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />上传征信</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>上传征信报告</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">客户姓名 *</label><Input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} placeholder="客户姓名" /></div>
                  <div><label className="text-xs text-muted-foreground">手机号</label><Input value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} placeholder="手机号" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">身份证号</label><Input value={form.customerIdCard} onChange={e => setForm(f => ({ ...f, customerIdCard: e.target.value }))} placeholder="身份证号" /></div>
                  <div><label className="text-xs text-muted-foreground">信用评分</label><Input type="number" value={form.creditScore} onChange={e => setForm(f => ({ ...f, creditScore: e.target.value }))} placeholder="0-1000" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-xs text-muted-foreground">客户等级</label>
                    <Select value={form.customerGrade} onValueChange={v => setForm(f => ({ ...f, customerGrade: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["A", "B", "C", "D"].map(g => <SelectItem key={g} value={g}>{g}级</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><label className="text-xs text-muted-foreground">月收入</label><Input value={form.monthlyIncome} onChange={e => setForm(f => ({ ...f, monthlyIncome: e.target.value }))} placeholder="元" /></div>
                  <div><label className="text-xs text-muted-foreground">总负债</label><Input value={form.totalDebt} onChange={e => setForm(f => ({ ...f, totalDebt: e.target.value }))} placeholder="元" /></div>
                </div>
                <div><label className="text-xs text-muted-foreground">备注</label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="备注信息" /></div>
                <Button onClick={handleCreate} disabled={createMut.isPending} className="w-full">{createMut.isPending ? "提交中..." : "提交"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="搜索客户姓名/手机号..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[130px]"><Filter className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">待审核</SelectItem>
            <SelectItem value="reviewed">已审核</SelectItem>
            <SelectItem value="matched">已匹配</SelectItem>
            <SelectItem value="rejected">已拒绝</SelectItem>
          </SelectContent>
        </Select>
        <Select value={gradeFilter} onValueChange={v => { setGradeFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="等级" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部等级</SelectItem>
            {["A", "B", "C", "D"].map(g => <SelectItem key={g} value={g}>{g}级</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">客户姓名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">手机号</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">等级</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">信用分</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">上传人</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">日期</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((item: any) => (
                <tr key={item.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{item.customerName}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{item.customerPhone || "-"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${GRADE_COLORS[item.customerGrade] ?? ""}`}>{item.customerGrade}级</span></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{item.creditScore ?? "-"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_MAP[item.status]?.color ?? ""}`}>{STATUS_MAP[item.status]?.label ?? item.status}</span></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{item.uploaderName || "-"}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {hasPermission(role, "delete_credit_report") && (
                        <button onClick={() => { if (confirm("确认删除？")) deleteMut.mutate({ id: item.id }); }} className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(data?.items ?? []).length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground"><FileText className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">暂无征信报告</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">共 {data?.total} 条</p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
              <span className="px-3 py-1 text-xs text-muted-foreground">{page}/{totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
