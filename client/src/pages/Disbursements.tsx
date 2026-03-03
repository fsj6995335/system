import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { getEffectiveRole, hasPermission } from "../../../shared/permissions";
import { Plus, Search, DollarSign, Filter } from "lucide-react";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "待审批", color: "bg-yellow-500/20 text-yellow-400" },
  approved: { label: "已审批", color: "bg-blue-500/20 text-blue-400" },
  disbursed: { label: "已放款", color: "bg-emerald-500/20 text-emerald-400" },
  completed: { label: "已完成", color: "bg-green-500/20 text-green-400" },
  cancelled: { label: "已取消", color: "bg-red-500/20 text-red-400" },
};

export default function Disbursements() {
  const { user } = useAuth();
  const role = useMemo(() => getEffectiveRole(user as any), [user]);
  const canManage = hasPermission(role, "manage_disbursements");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, refetch } = trpc.disbursements.list.useQuery({ search: search || undefined, status: statusFilter || undefined, page, pageSize: 20 });
  const createMut = trpc.disbursements.create.useMutation({ onSuccess: () => { toast.success("放款记录已创建"); refetch(); setDialogOpen(false); } });

  const [form, setForm] = useState({ customerName: "", bankName: "", amount: "", commission: "", notes: "" });

  const handleCreate = () => {
    if (!form.customerName || !form.amount) { toast.error("请填写客户姓名和放款金额"); return; }
    createMut.mutate({ customerName: form.customerName, bankName: form.bankName || undefined, amount: form.amount, commission: form.commission || undefined, notes: form.notes || undefined });
  };

  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="page-title">放款管理</h1>
          <p className="page-subtitle">管理放款记录，共 {data?.total ?? 0} 条记录</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />新增放款</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>新增放款记录</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">客户姓名 *</label><Input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} placeholder="客户姓名" /></div>
                  <div><label className="text-xs text-muted-foreground">银行名称</label><Input value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} placeholder="银行名称" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">放款金额 *</label><Input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="元" /></div>
                  <div><label className="text-xs text-muted-foreground">佣金</label><Input value={form.commission} onChange={e => setForm(f => ({ ...f, commission: e.target.value }))} placeholder="元" /></div>
                </div>
                <div><label className="text-xs text-muted-foreground">备注</label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="备注" /></div>
                <Button onClick={handleCreate} disabled={createMut.isPending} className="w-full">{createMut.isPending ? "提交中..." : "提交"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="搜索客户/银行..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[130px]"><Filter className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">客户姓名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">银行</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">放款金额</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">佣金</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">经办人</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">日期</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((item: any) => (
                <tr key={item.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{item.customerName}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{item.bankName || "-"}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-amber-400">¥{Number(item.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-muted-foreground">{item.commission ? `¥${Number(item.commission).toLocaleString()}` : "-"}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{item.employeeName || "-"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_MAP[item.status]?.color ?? ""}`}>{STATUS_MAP[item.status]?.label ?? item.status}</span></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {(data?.items ?? []).length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground"><DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">暂无放款记录</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
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
