import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDateTime, getLoanStatusBadge, LOAN_TYPE_MAP } from "@/lib/loanUtils";
import { CheckCircle, Clock, DollarSign, Eye, Shield, XCircle } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Approvals() {
  const { data: pendingLoans, isLoading, refetch } = trpc.loans.pending.useQuery();
  const utils = trpc.useUtils();

  const approveMutation = trpc.loans.approve.useMutation({
    onSuccess: () => {
      toast.success("操作成功");
      refetch();
      utils.stats.dashboard.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAction = (
    loanId: number,
    action: "approve" | "reject" | "request_info" | "disburse"
  ) => {
    const comment =
      action === "reject" || action === "request_info"
        ? window.prompt(action === "reject" ? "请输入拒绝原因：" : "请说明需要补充的材料：") ?? undefined
        : undefined;
    let interestRate: string | undefined;
    if (action === "approve") {
      const rate = window.prompt("请输入年利率（%），如：5.5");
      if (rate) interestRate = rate;
    }
    approveMutation.mutate({ loanId, action, comment, interestRate });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="page-title">审批管理</h1>
          <p className="page-subtitle">处理待审核的贷款申请</p>
        </div>
        <div className="ml-auto">
          {pendingLoans && pendingLoans.length > 0 && (
            <span className="bg-warning/10 text-warning text-xs font-semibold px-3 py-1.5 rounded-full">
              {pendingLoans.length} 条待处理
            </span>
          )}
        </div>
      </div>

      {/* Pending Loans */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-36 rounded-xl" />
          ))
        ) : !pendingLoans?.length ? (
          <div className="glass-card rounded-xl p-16 text-center elegant-shadow">
            <CheckCircle className="w-12 h-12 text-success/40 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">暂无待审核申请</h3>
            <p className="text-xs text-muted-foreground">所有贷款申请已处理完毕</p>
          </div>
        ) : (
          pendingLoans.map((loan) => {
            const badge = getLoanStatusBadge(loan.status ?? "");
            const isProcessing = approveMutation.isPending;
            return (
              <div key={loan.id} className="glass-card rounded-xl p-6 elegant-shadow hover:border-primary/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-sm font-semibold text-foreground">{loan.applicantName}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.color} ${badge.bg}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs text-muted-foreground">#{loan.id}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">贷款金额</p>
                        <p className="text-sm font-bold text-primary">{formatCurrency(loan.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">贷款类型</p>
                        <p className="text-sm text-foreground">{LOAN_TYPE_MAP[loan.loanType] ?? loan.loanType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">贷款期限</p>
                        <p className="text-sm text-foreground">{loan.termMonths} 个月</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">月收入</p>
                        <p className="text-sm text-foreground">{loan.monthlyIncome ? formatCurrency(loan.monthlyIncome) : "未提供"}</p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-0.5">贷款用途</p>
                      <p className="text-xs text-foreground/80 line-clamp-2">{loan.purpose}</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(loan.createdAt)}
                      </span>
                      {loan.collateral && (
                        <span>抵押物：{loan.collateral}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Link href={`/loans/${loan.id}`}>
                      <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all w-full">
                        <Eye className="w-3.5 h-3.5" />
                        查看详情
                      </button>
                    </Link>
                    {loan.status === "pending" || loan.status === "under_review" ? (
                      <>
                        <button
                          onClick={() => handleAction(loan.id, "approve")}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors disabled:opacity-60"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          批准
                        </button>
                        <button
                          onClick={() => handleAction(loan.id, "request_info")}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-warning/10 text-warning text-xs font-medium hover:bg-warning/20 transition-colors disabled:opacity-60"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          补充材料
                        </button>
                        <button
                          onClick={() => handleAction(loan.id, "reject")}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors disabled:opacity-60"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          拒绝
                        </button>
                      </>
                    ) : loan.status === "approved" ? (
                      <button
                        onClick={() => handleAction(loan.id, "disburse")}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-60"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        确认放款
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
