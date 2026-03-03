import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { getEffectiveRole, hasPermission } from "../../../shared/permissions";
import { Plus, CreditCard, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

const TYPE_MAP: Record<string, string> = { mortgage: "房贷", business: "经营贷", personal: "个人贷", credit_card: "信用卡", car_loan: "车贷" };
const TYPE_COLORS: Record<string, string> = { mortgage: "bg-blue-500/20 text-blue-400", business: "bg-emerald-500/20 text-emerald-400", personal: "bg-amber-500/20 text-amber-400", credit_card: "bg-purple-500/20 text-purple-400", car_loan: "bg-cyan-500/20 text-cyan-400" };

export default function BankProducts() {
  const { user } = useAuth();
  const role = useMemo(() => getEffectiveRole(user as any), [user]);
  const canManage = hasPermission(role, "manage_bank_products");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");

  const { data: products, refetch } = trpc.bankProducts.list.useQuery(typeFilter ? { productType: typeFilter } : undefined);
  const createMut = trpc.bankProducts.create.useMutation({ onSuccess: () => { toast.success("产品已创建"); refetch(); setDialogOpen(false); } });
  const deleteMut = trpc.bankProducts.delete.useMutation({ onSuccess: () => { toast.success("已删除"); refetch(); } });

  const [form, setForm] = useState({ bankName: "", productName: "", productType: "personal" as string, minAmount: "", maxAmount: "", interestRateMin: "", interestRateMax: "", termMin: "", termMax: "", requirements: "", minCreditScore: "", features: "" });

  const handleCreate = () => {
    if (!form.bankName || !form.productName) { toast.error("请填写银行名称和产品名称"); return; }
    createMut.mutate({
      bankName: form.bankName, productName: form.productName, productType: form.productType as any,
      minAmount: form.minAmount || undefined, maxAmount: form.maxAmount || undefined,
      interestRateMin: form.interestRateMin || undefined, interestRateMax: form.interestRateMax || undefined,
      termMin: form.termMin ? Number(form.termMin) : undefined, termMax: form.termMax ? Number(form.termMax) : undefined,
      requirements: form.requirements || undefined, minCreditScore: form.minCreditScore ? Number(form.minCreditScore) : undefined, features: form.features || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="page-title">银行产品</h1>
          <p className="page-subtitle">管理合作银行贷款产品，共 {products?.length ?? 0} 个产品</p>
        </div>
        <div className="flex gap-3">
          <Select value={typeFilter} onValueChange={v => setTypeFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="产品类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {Object.entries(TYPE_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />添加产品</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>添加银行产品</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-muted-foreground">银行名称 *</label><Input value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} placeholder="银行名称" /></div>
                    <div><label className="text-xs text-muted-foreground">产品名称 *</label><Input value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} placeholder="产品名称" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-xs text-muted-foreground">产品类型</label>
                      <Select value={form.productType} onValueChange={v => setForm(f => ({ ...f, productType: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(TYPE_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><label className="text-xs text-muted-foreground">最低金额</label><Input value={form.minAmount} onChange={e => setForm(f => ({ ...f, minAmount: e.target.value }))} placeholder="元" /></div>
                    <div><label className="text-xs text-muted-foreground">最高金额</label><Input value={form.maxAmount} onChange={e => setForm(f => ({ ...f, maxAmount: e.target.value }))} placeholder="元" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-muted-foreground">最低利率(%)</label><Input value={form.interestRateMin} onChange={e => setForm(f => ({ ...f, interestRateMin: e.target.value }))} placeholder="%" /></div>
                    <div><label className="text-xs text-muted-foreground">最高利率(%)</label><Input value={form.interestRateMax} onChange={e => setForm(f => ({ ...f, interestRateMax: e.target.value }))} placeholder="%" /></div>
                  </div>
                  <div><label className="text-xs text-muted-foreground">申请要求</label><Input value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} placeholder="申请条件" /></div>
                  <div><label className="text-xs text-muted-foreground">产品特色</label><Input value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))} placeholder="产品亮点" /></div>
                  <Button onClick={handleCreate} disabled={createMut.isPending} className="w-full">{createMut.isPending ? "创建中..." : "创建产品"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Product Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {(products ?? []).map((p: any) => (
          <div key={p.id} className="glass-card rounded-xl p-5 hover:scale-[1.01] transition-all">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${TYPE_COLORS[p.productType] ?? "bg-gray-500/20 text-gray-400"}`}>{TYPE_MAP[p.productType] ?? p.productType}</span>
                <h3 className="text-sm font-semibold text-foreground mt-2">{p.productName}</h3>
                <p className="text-xs text-muted-foreground">{p.bankName}</p>
              </div>
              <CreditCard className="w-8 h-8 text-primary/30" />
            </div>
            <div className="space-y-2 text-xs">
              {(p.minAmount || p.maxAmount) && (
                <div className="flex justify-between"><span className="text-muted-foreground">额度范围</span><span className="text-foreground">{p.minAmount ? `¥${Number(p.minAmount).toLocaleString()}` : "-"} ~ {p.maxAmount ? `¥${Number(p.maxAmount).toLocaleString()}` : "-"}</span></div>
              )}
              {(p.interestRateMin || p.interestRateMax) && (
                <div className="flex justify-between"><span className="text-muted-foreground">利率范围</span><span className="text-foreground">{p.interestRateMin ?? "-"}% ~ {p.interestRateMax ?? "-"}%</span></div>
              )}
              {p.requirements && <div className="pt-2 border-t border-border/50"><p className="text-muted-foreground line-clamp-2">{p.requirements}</p></div>}
            </div>
            {canManage && (
              <div className="flex justify-end mt-3 pt-2 border-t border-border/50">
                <button onClick={() => { if (confirm("确认删除？")) deleteMut.mutate({ id: p.id }); }} className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </div>
        ))}
        {(products ?? []).length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground"><CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">暂无银行产品</p></div>
        )}
      </div>
    </div>
  );
}
