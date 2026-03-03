import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { getEffectiveRole, hasPermission } from "../../../shared/permissions";
import { Plus, Building2, Trash2, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";

export default function Branches() {
  const { user } = useAuth();
  const role = useMemo(() => getEffectiveRole(user as any), [user]);
  const canManage = hasPermission(role, "manage_branches");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: branches, refetch } = trpc.branches.list.useQuery();
  const createMut = trpc.branches.create.useMutation({ onSuccess: () => { toast.success("分公司已创建"); refetch(); setDialogOpen(false); } });
  const deleteMut = trpc.branches.delete.useMutation({ onSuccess: () => { toast.success("已删除"); refetch(); } });

  const [form, setForm] = useState({ name: "", address: "", phone: "" });

  const handleCreate = () => {
    if (!form.name) { toast.error("请输入分公司名称"); return; }
    createMut.mutate({ name: form.name, address: form.address || undefined, phone: form.phone || undefined });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="page-title">分公司管理</h1>
          <p className="page-subtitle">管理公司分支机构，共 {branches?.length ?? 0} 个分公司</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />新增分公司</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>新增分公司</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div><label className="text-xs text-muted-foreground">名称 *</label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="分公司名称" /></div>
                <div><label className="text-xs text-muted-foreground">地址</label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="地址" /></div>
                <div><label className="text-xs text-muted-foreground">电话</label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="电话" /></div>
                <Button onClick={handleCreate} disabled={createMut.isPending} className="w-full">{createMut.isPending ? "创建中..." : "创建"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(branches ?? []).map((b: any) => (
          <div key={b.id} className="glass-card rounded-xl p-5 hover:scale-[1.01] transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{b.name}</h3>
                  <span className={`text-xs ${b.status === "active" ? "text-emerald-400" : "text-red-400"}`}>{b.status === "active" ? "运营中" : "已停用"}</span>
                </div>
              </div>
              {canManage && (
                <button onClick={() => { if (confirm("确认删除？")) deleteMut.mutate({ id: b.id }); }} className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              )}
            </div>
            <div className="space-y-2 text-xs">
              {b.address && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-3 h-3" />{b.address}</div>}
              {b.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3 h-3" />{b.phone}</div>}
              <div className="flex justify-between"><span className="text-muted-foreground">创建日期</span><span className="text-foreground">{new Date(b.createdAt).toLocaleDateString()}</span></div>
            </div>
          </div>
        ))}
        {(branches ?? []).length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground"><Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">暂无分公司</p></div>
        )}
      </div>
    </div>
  );
}
