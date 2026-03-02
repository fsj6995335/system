import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDateTime, getLoanStatusBadge, LOAN_TYPE_MAP } from "@/lib/loanUtils";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, Bot, CheckCircle, Clock, DollarSign, FileText, User, XCircle } from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function LoanDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const loanId = parseInt(id ?? "0");

  const { data: loan, isLoading, refetch } = trpc.loans.byId.useQuery({ id: loanId }, { enabled: !!loanId });
  const { data: approvals } = trpc.loans.approvals.useQuery({ loanId }, { enabled: !!loanId });
  const { data: repayments } = trpc.loans.repayments.useQuery({ loanId }, { enabled: !!loanId });

  const utils = trpc.useUtils();
  const approveMutation = trpc.loans.approve.useMutation({
    onSuccess: () => {
      toast.success("操作成功");
      refetch();
      utils.loans.pending.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">贷款申请不存在</p>
        <Link href="/loans"><button className="text-primary text-sm mt-2 hover:underline">返回列表</button></Link>
      </div>
    );
  }

  const badge = getLoanStatusBadge(loan.status ?? "");
  const isAdmin = user?.role === "admin";
  const canApprove = isAdmin && (loan.status === "pending" || loan.status === "under_review");
  const canDisburse = isAdmin && loan.status === "approved";

  const handleAction = (action: "approve" | "reject" | "request_info" | "disburse") => {
    const comment = action === "reject" || action === "request_info"
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/loans">
          <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="page-title">贷款申请详情</h1>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.color} ${badge.bg}`}>
              {badge.label}
            </span>
          </div>
          <p className="page-subtitle">申请编号 #{loan.id}</p>
        </div>
      </div>

      {/* Admin Actions */}
      {(canApprove || canDisburse) && (
        <div className="glass-card rounded-xl p-4 elegant-shadow border border-primary/20">
          <p className="text-xs text-muted-foreground mb-3 font-medium">管理员操作</p>
          <div className="flex flex-wrap gap-2">
            {canApprove && (
              <>
                <button
                  onClick={() => handleAction("approve")}
                  disabled={approveMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors disabled:opacity-60"
                >
                  <CheckCircle className="w-3.5 h-3.5" />批准申请
                </button>
                <button
                  onClick={() => handleAction("request_info")}
                  disabled={approveMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-warning/10 text-warning text-xs font-medium hover:bg-warning/20 transition-colors disabled:opacity-60"
                >
                  <Clock className="w-3.5 h-3.5" />补充材料
                </button>
                <button
                  onClick={() => handleAction("reject")}
                  disabled={approveMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors disabled:opacity-60"
                >
                  <XCircle className="w-3.5 h-3.5" />拒绝申请
                </button>
              </>
            )}
            {canDisburse && (
              <button
                onClick={() => handleAction("disburse")}
                disabled={approveMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-60"
              >
                <DollarSign className="w-3.5 h-3.5" />确认放款
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loan Info */}
      <div className="glass-card rounded-xl p-6 elegant-shadow">
        <div className="flex items-center gap-2 mb-5">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">贷款信息</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
          {[
            { label: "申请人", value: loan.applicantName },
            { label: "贷款金额", value: formatCurrency(loan.amount), highlight: true },
            { label: "贷款类型", value: LOAN_TYPE_MAP[loan.loanType] ?? loan.loanType },
            { label: "贷款期限", value: `${loan.termMonths} 个月` },
            { label: "年利率", value: loan.interestRate ? `${loan.interestRate}%` : "待定" },
            { label: "月还款", value: loan.interestRate ? formatCurrency((parseFloat(loan.amount) * (parseFloat(loan.interestRate) / 100 / 12) / (1 - Math.pow(1 + parseFloat(loan.interestRate) / 100 / 12, -loan.termMonths))).toFixed(2)) : "待定" },
            { label: "月收入", value: loan.monthlyIncome ? formatCurrency(loan.monthlyIncome) : "未提供" },
            { label: "就业状态", value: loan.employmentStatus ?? "未提供" },
            { label: "抵押物", value: loan.collateral ?? "无" },
          ].map(({ label, value, highlight }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className={`text-sm font-medium ${highlight ? "text-primary text-base font-bold" : "text-foreground"}`}>{value}</p>
            </div>
          ))}
        </div>
        {loan.purpose && (
          <div className="mt-5 pt-5 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1.5">贷款用途</p>
            <p className="text-sm text-foreground">{loan.purpose}</p>
          </div>
        )}
        {loan.notes && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-1.5">备注</p>
            <p className="text-sm text-foreground">{loan.notes}</p>
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>申请时间：{formatDateTime(loan.createdAt)}</span>
          <span>更新时间：{formatDateTime(loan.updatedAt)}</span>
        </div>
      </div>

      {/* AI Analysis Link */}
      <Link href={`/ai-analysis?loanId=${loan.id}`}>
        <div className="glass-card rounded-xl p-4 elegant-shadow border border-primary/10 hover:border-primary/30 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">AI智能分析</p>
              <p className="text-xs text-muted-foreground">使用豆包AI对此贷款进行风险分析</p>
            </div>
            <ArrowLeft className="w-4 h-4 text-muted-foreground ml-auto rotate-180" />
          </div>
        </div>
      </Link>

      {/* Approval History */}
      {approvals && approvals.length > 0 && (
        <div className="glass-card rounded-xl p-6 elegant-shadow">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">审批历史</h3>
          </div>
          <div className="space-y-4">
            {approvals.map((approval, index) => {
              const actionLabels: Record<string, { label: string; color: string }> = {
                submit: { label: "提交申请", color: "text-blue-400" },
                approve: { label: "批准", color: "text-success" },
                reject: { label: "拒绝", color: "text-destructive" },
                request_info: { label: "要求补充材料", color: "text-warning" },
                disburse: { label: "放款", color: "text-primary" },
              };
              const actionInfo = actionLabels[approval.action] ?? { label: approval.action, color: "text-muted-foreground" };
              return (
                <div key={approval.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${index === 0 ? "bg-primary" : "bg-border"}`} />
                    {index < approvals.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${actionInfo.color}`}>{actionInfo.label}</span>
                      <span className="text-xs text-muted-foreground">by {approval.reviewerName}</span>
                    </div>
                    {approval.comment && (
                      <p className="text-xs text-muted-foreground mt-1 bg-muted/30 rounded-lg p-2">{approval.comment}</p>
                    )}
                    <p className="text-xs text-muted-foreground/60 mt-1">{formatDateTime(approval.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Repayments */}
      {repayments && repayments.length > 0 && (
        <div className="glass-card rounded-xl p-6 elegant-shadow">
          <div className="flex items-center gap-2 mb-5">
            <DollarSign className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">还款记录</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>还款金额</th>
                <th>还款方式</th>
                <th>状态</th>
                <th>还款时间</th>
              </tr>
            </thead>
            <tbody>
              {repayments.map((r) => (
                <tr key={r.id}>
                  <td className="font-semibold text-success">{formatCurrency(r.amount)}</td>
                  <td className="text-muted-foreground text-xs">{r.paymentMethod ?? "-"}</td>
                  <td>
                    <span className={`text-xs ${r.status === "completed" ? "text-success" : r.status === "failed" ? "text-destructive" : "text-warning"}`}>
                      {r.status === "completed" ? "已完成" : r.status === "failed" ? "失败" : "待处理"}
                    </span>
                  </td>
                  <td className="text-muted-foreground text-xs">{formatDateTime(r.paymentDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
