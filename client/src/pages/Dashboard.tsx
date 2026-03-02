import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDateTime, getLoanStatusBadge, LOAN_TYPE_MAP } from "@/lib/loanUtils";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowUpRight, BarChart3, CheckCircle, Clock, DollarSign, FileText, TrendingUp, XCircle } from "lucide-react";
import { Link } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const CHART_COLORS = [
  "oklch(0.65 0.18 250)",
  "oklch(0.65 0.18 145)",
  "oklch(0.75 0.18 75)",
  "oklch(0.65 0.18 300)",
  "oklch(0.60 0.22 25)",
];

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = trpc.stats.dashboard.useQuery();

  const statusData = stats?.statusCounts?.map((s) => ({
    name: getLoanStatusBadge(s.status ?? "").label,
    value: Number(s.count),
  })) ?? [];

  const typeData = stats?.typeCounts?.map((t) => ({
    name: LOAN_TYPE_MAP[t.loanType ?? ""] ?? t.loanType,
    count: Number(t.count),
    amount: parseFloat(t.totalAmount ?? "0") / 10000,
  })) ?? [];

  const approvedCount = stats?.statusCounts?.find((s) => s.status === "approved")?.count ?? 0;
  const pendingCount = stats?.statusCounts?.find((s) => s.status === "pending")?.count ?? 0;
  const rejectedCount = stats?.statusCounts?.find((s) => s.status === "rejected")?.count ?? 0;
  const disbursedCount = stats?.statusCounts?.find((s) => s.status === "disbursed")?.count ?? 0;

  const metrics = [
    {
      label: "贷款总数",
      value: stats?.totalCount ?? 0,
      icon: FileText,
      color: "text-primary",
      bg: "bg-primary/10",
      sub: "全部申请",
    },
    {
      label: "贷款总额",
      value: formatCurrency(stats?.totalAmount),
      icon: DollarSign,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      sub: "累计金额",
    },
    {
      label: "待审核",
      value: Number(pendingCount),
      icon: Clock,
      color: "text-warning",
      bg: "bg-warning/10",
      sub: "等待处理",
    },
    {
      label: "已批准",
      value: Number(approvedCount) + Number(disbursedCount),
      icon: CheckCircle,
      color: "text-success",
      bg: "bg-success/10",
      sub: "批准+放款",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">
            欢迎回来，<span className="gradient-text">{user?.name ?? "用户"}</span>
          </h1>
          <p className="page-subtitle">这是您的贷款管理概览</p>
        </div>
        <Link href="/loans/new">
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors elegant-shadow">
            <FileText className="w-4 h-4" />
            新建申请
          </button>
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="metric-card">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${m.color}`} />
                </div>
                <TrendingUp className="w-4 h-4 text-muted-foreground/40" />
              </div>
              {isLoading ? (
                <div className="skeleton h-8 w-24 rounded mb-1" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{m.value}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">{m.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="glass-card rounded-xl p-6 elegant-shadow">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">贷款类型分布</h3>
              <p className="text-xs text-muted-foreground mt-0.5">按类型统计数量与金额（万元）</p>
            </div>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </div>
          {isLoading ? (
            <div className="skeleton h-48 rounded" />
          ) : typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.015 260)" />
                <XAxis dataKey="name" tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 11 }} />
                <YAxis tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.18 0.012 260)", border: "1px solid oklch(0.25 0.015 260)", borderRadius: "8px", color: "oklch(0.95 0.005 260)" }}
                />
                <Bar dataKey="count" name="数量" fill="oklch(0.65 0.18 250)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">暂无数据</div>
          )}
        </div>

        {/* Pie Chart */}
        <div className="glass-card rounded-xl p-6 elegant-shadow">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">贷款状态分布</h3>
              <p className="text-xs text-muted-foreground mt-0.5">各状态申请占比</p>
            </div>
          </div>
          {isLoading ? (
            <div className="skeleton h-48 rounded" />
          ) : statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {statusData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.18 0.012 260)", border: "1px solid oklch(0.25 0.015 260)", borderRadius: "8px", color: "oklch(0.95 0.005 260)" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: "oklch(0.60 0.01 260)" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">暂无数据</div>
          )}
        </div>
      </div>

      {/* Recent Loans */}
      <div className="glass-card rounded-xl elegant-shadow">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">最近申请</h3>
          <Link href="/loans">
            <button className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
              查看全部 <ArrowUpRight className="w-3 h-3" />
            </button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>申请人</th>
                <th>贷款金额</th>
                <th>类型</th>
                <th>状态</th>
                <th>申请时间</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j}><div className="skeleton h-4 rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : stats?.recentLoans?.length ? (
                stats.recentLoans.map((loan) => {
                  const badge = getLoanStatusBadge(loan.status ?? "");
                  return (
                    <tr key={loan.id}>
                      <td className="font-medium text-foreground">{loan.applicantName}</td>
                      <td className="text-primary font-semibold">{formatCurrency(loan.amount)}</td>
                      <td className="text-muted-foreground">{LOAN_TYPE_MAP[loan.loanType] ?? loan.loanType}</td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.color} ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="text-muted-foreground text-xs">{formatDateTime(loan.createdAt)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-center text-muted-foreground py-8">暂无贷款申请</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
