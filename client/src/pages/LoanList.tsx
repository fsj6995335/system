import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDateTime, getLoanStatusBadge, LOAN_STATUS_MAP, LOAN_TYPE_MAP } from "@/lib/loanUtils";
import { useAuth } from "@/_core/hooks/useAuth";
import { Eye, Filter, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function LoanList() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loanType, setLoanType] = useState("");
  const [page, setPage] = useState(1);
  const [myOnly, setMyOnly] = useState(user?.role !== "admin");

  const { data, isLoading, refetch } = trpc.loans.list.useQuery({
    search: search || undefined,
    status: status || undefined,
    loanType: loanType || undefined,
    page,
    pageSize: 15,
    myOnly: user?.role === "admin" ? myOnly : true,
  });

  const totalPages = Math.ceil((data?.total ?? 0) / 15);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">贷款申请</h1>
          <p className="page-subtitle">管理所有贷款申请记录</p>
        </div>
        <Link href="/loans/new">
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors elegant-shadow">
            <Plus className="w-4 h-4" />
            新建申请
          </button>
        </Link>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4 elegant-shadow">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索申请人或用途..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
            >
              <option value="">全部状态</option>
              {Object.entries(LOAN_STATUS_MAP).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>

            <select
              value={loanType}
              onChange={(e) => { setLoanType(e.target.value); setPage(1); }}
              className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
            >
              <option value="">全部类型</option>
              {Object.entries(LOAN_TYPE_MAP).map(([key, val]) => (
                <option key={key} value={key}>{val}</option>
              ))}
            </select>
          </div>

          {user?.role === "admin" && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={myOnly}
                onChange={(e) => { setMyOnly(e.target.checked); setPage(1); }}
                className="rounded border-border"
              />
              仅我的申请
            </label>
          )}

          <span className="text-xs text-muted-foreground ml-auto">
            共 {data?.total ?? 0} 条记录
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl elegant-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>申请人</th>
                <th>贷款金额</th>
                <th>类型</th>
                <th>期限</th>
                <th>用途</th>
                <th>状态</th>
                <th>申请时间</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><div className="skeleton h-4 rounded w-16" /></td>
                    ))}
                  </tr>
                ))
              ) : data?.items?.length ? (
                data.items.map((loan) => {
                  const badge = getLoanStatusBadge(loan.status ?? "");
                  return (
                    <tr key={loan.id}>
                      <td className="font-medium text-foreground">{loan.applicantName}</td>
                      <td className="font-semibold text-primary">{formatCurrency(loan.amount)}</td>
                      <td className="text-muted-foreground text-xs">{LOAN_TYPE_MAP[loan.loanType] ?? loan.loanType}</td>
                      <td className="text-muted-foreground text-xs">{loan.termMonths}个月</td>
                      <td className="text-muted-foreground text-xs max-w-32 truncate">{loan.purpose}</td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.color} ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="text-muted-foreground text-xs">{formatDateTime(loan.createdAt)}</td>
                      <td className="text-right">
                        <Link href={`/loans/${loan.id}`}>
                          <button className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-md hover:bg-primary/10">
                            <Eye className="w-3.5 h-3.5" />
                            查看
                          </button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center text-muted-foreground py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-muted-foreground/30" />
                      <p>暂无贷款申请</p>
                      <Link href="/loans/new">
                        <button className="text-primary text-sm hover:underline">立即创建</button>
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-xs text-muted-foreground">第 {page} / {totalPages} 页</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 disabled:opacity-40 transition-all"
              >
                上一页
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 disabled:opacity-40 transition-all"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
