import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, Filter, Phone, Mail } from "lucide-react";

const GRADE_COLORS: Record<string, string> = { A: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", B: "bg-blue-500/20 text-blue-400 border-blue-500/30", C: "bg-amber-500/20 text-amber-400 border-amber-500/30", D: "bg-red-500/20 text-red-400 border-red-500/30" };

export default function Customers() {
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data } = trpc.creditReports.list.useQuery({ search: search || undefined, grade: gradeFilter || undefined, page, pageSize: 20 });
  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">客户列表</h1>
        <p className="page-subtitle">客户信息管理，共 {data?.total ?? 0} 位客户</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="搜索客户姓名/手机号..." className="pl-9" />
        </div>
        <Select value={gradeFilter} onValueChange={v => { setGradeFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[120px]"><Filter className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="等级" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部等级</SelectItem>
            {["A", "B", "C", "D"].map(g => <SelectItem key={g} value={g}>{g}级客户</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(data?.items ?? []).map((c: any) => (
          <div key={c.id} className="glass-card rounded-xl p-5 hover:scale-[1.01] transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-primary">{c.customerName?.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{c.customerName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.uploaderName ? `经办: ${c.uploaderName}` : ""}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${GRADE_COLORS[c.customerGrade] ?? ""}`}>{c.customerGrade}级</span>
            </div>
            <div className="space-y-2 text-xs">
              {c.customerPhone && (
                <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3 h-3" />{c.customerPhone}</div>
              )}
              {c.creditScore && (
                <div className="flex justify-between"><span className="text-muted-foreground">信用评分</span><span className="text-foreground font-medium">{c.creditScore}</span></div>
              )}
              {c.monthlyIncome && (
                <div className="flex justify-between"><span className="text-muted-foreground">月收入</span><span className="text-foreground">¥{Number(c.monthlyIncome).toLocaleString()}</span></div>
              )}
              {c.totalDebt && (
                <div className="flex justify-between"><span className="text-muted-foreground">总负债</span><span className="text-foreground">¥{Number(c.totalDebt).toLocaleString()}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">录入日期</span><span className="text-foreground">{new Date(c.createdAt).toLocaleDateString()}</span></div>
            </div>
          </div>
        ))}
        {(data?.items ?? []).length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground"><Users className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">暂无客户数据</p></div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
          <span className="text-xs text-muted-foreground">{page}/{totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
        </div>
      )}
    </div>
  );
}
