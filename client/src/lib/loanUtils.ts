export const LOAN_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "草稿", color: "text-muted-foreground", bg: "bg-muted/30" },
  pending: { label: "待审核", color: "text-warning", bg: "bg-warning/10" },
  under_review: { label: "审核中", color: "text-blue-400", bg: "bg-blue-400/10" },
  approved: { label: "已批准", color: "text-success", bg: "bg-success/10" },
  rejected: { label: "已拒绝", color: "text-destructive", bg: "bg-destructive/10" },
  disbursed: { label: "已放款", color: "text-primary", bg: "bg-primary/10" },
  repaying: { label: "还款中", color: "text-cyan-400", bg: "bg-cyan-400/10" },
  completed: { label: "已完成", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  overdue: { label: "已逾期", color: "text-red-400", bg: "bg-red-400/10" },
};

export const LOAN_TYPE_MAP: Record<string, string> = {
  personal: "个人贷款",
  business: "商业贷款",
  mortgage: "房产抵押",
  education: "教育贷款",
  emergency: "应急贷款",
};

export function formatCurrency(amount: string | number | null | undefined): string {
  if (!amount) return "¥0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(num);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export function getLoanStatusBadge(status: string) {
  return LOAN_STATUS_MAP[status] ?? { label: status, color: "text-muted-foreground", bg: "bg-muted/30" };
}
