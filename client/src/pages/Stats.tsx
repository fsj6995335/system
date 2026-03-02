import { trpc } from "@/lib/trpc";
import { formatCurrency, getLoanStatusBadge, LOAN_TYPE_MAP } from "@/lib/loanUtils";
import { BarChart3, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";

const CHART_COLORS = [
  "oklch(0.65 0.18 250)",
  "oklch(0.65 0.18 145)",
  "oklch(0.75 0.18 75)",
  "oklch(0.65 0.18 300)",
  "oklch(0.60 0.22 25)",
  "oklch(0.65 0.18 200)",
];

const tooltipStyle = {
  contentStyle: {
    background: "oklch(0.18 0.012 260)",
    border: "1px solid oklch(0.25 0.015 260)",
    borderRadius: "8px",
    color: "oklch(0.95 0.005 260)",
    fontSize: "12px",
  },
};

export default function Stats() {
  const { data: stats, isLoading } = trpc.stats.dashboard.useQuery();
  const { data: monthlyData } = trpc.stats.monthly.useQuery();

  const statusData = stats?.statusCounts?.map((s) => ({
    name: getLoanStatusBadge(s.status ?? "").label,
    value: Number(s.count),
  })) ?? [];

  const typeData = stats?.typeCounts?.map((t) => ({
    name: LOAN_TYPE_MAP[t.loanType ?? ""] ?? t.loanType,
    count: Number(t.count),
    amount: Math.round(parseFloat(t.totalAmount ?? "0") / 10000),
  })) ?? [];

  const monthlyChartData = (monthlyData ?? []).map((m: { month: string; count: number; totalAmount: string }) => ({
    month: m.month,
    count: Number(m.count),
    amount: Math.round(parseFloat(m.totalAmount ?? "0") / 10000),
  })) ?? [];

  const totalAmount = parseFloat(stats?.totalAmount ?? "0");
  const approvedAmount = stats?.typeCounts?.reduce((sum, t) => sum + parseFloat(t.totalAmount ?? "0"), 0) ?? 0;
  const approvalRate = stats?.totalCount
    ? Math.round(
        ((Number(stats.statusCounts?.find((s) => s.status === "approved")?.count ?? 0) +
          Number(stats.statusCounts?.find((s) => s.status === "disbursed")?.count ?? 0) +
          Number(stats.statusCounts?.find((s) => s.status === "repaying")?.count ?? 0) +
          Number(stats.statusCounts?.find((s) => s.status === "completed")?.count ?? 0)) /
          Number(stats.totalCount)) *
          100
      )
    : 0;

  const metrics = [
    { label: "贷款总数", value: stats?.totalCount ?? 0, unit: "笔", color: "text-primary", bg: "bg-primary/10" },
    { label: "贷款总额", value: formatCurrency(stats?.totalAmount), unit: "", color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { label: "平均贷款额", value: stats?.totalCount ? formatCurrency((totalAmount / Number(stats.totalCount)).toFixed(2)) : "¥0", unit: "", color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "审批通过率", value: `${approvalRate}%`, unit: "", color: "text-success", bg: "bg-success/10" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title">数据统计</h1>
        <p className="page-subtitle">贷款业务综合数据分析</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="metric-card">
            <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center mb-4`}>
              <TrendingUp className={`w-5 h-5 ${m.color}`} />
            </div>
            {isLoading ? (
              <div className="skeleton h-7 w-20 rounded mb-1" />
            ) : (
              <p className={`text-xl font-bold ${m.color}`}>{m.value}{m.unit}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly Trend */}
      {monthlyChartData.length > 0 && (
        <div className="glass-card rounded-xl p-6 elegant-shadow">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">月度趋势</h3>
            <span className="text-xs text-muted-foreground ml-1">（金额单位：万元）</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyChartData} margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.015 260)" />
              <XAxis dataKey="month" tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 11 }} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "11px", color: "oklch(0.60 0.01 260)" }} />
              <Line yAxisId="left" type="monotone" dataKey="count" name="申请数量" stroke="oklch(0.65 0.18 250)" strokeWidth={2} dot={{ fill: "oklch(0.65 0.18 250)", r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="amount" name="金额（万）" stroke="oklch(0.65 0.18 145)" strokeWidth={2} dot={{ fill: "oklch(0.65 0.18 145)", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Type Bar Chart */}
        <div className="glass-card rounded-xl p-6 elegant-shadow">
          <h3 className="text-sm font-semibold text-foreground mb-1">贷款类型分析</h3>
          <p className="text-xs text-muted-foreground mb-5">各类型贷款金额（万元）</p>
          {isLoading ? (
            <div className="skeleton h-48 rounded" />
          ) : typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={typeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.015 260)" />
                <XAxis dataKey="name" tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 11 }} />
                <YAxis tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 11 }} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="amount" name="金额（万）" radius={[4, 4, 0, 0]}>
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">暂无数据</div>
          )}
        </div>

        {/* Status Pie Chart */}
        <div className="glass-card rounded-xl p-6 elegant-shadow">
          <h3 className="text-sm font-semibold text-foreground mb-1">状态分布</h3>
          <p className="text-xs text-muted-foreground mb-5">各状态贷款数量占比</p>
          {isLoading ? (
            <div className="skeleton h-48 rounded" />
          ) : statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">暂无数据</div>
          )}
        </div>
      </div>

      {/* Status Table */}
      <div className="glass-card rounded-xl elegant-shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">状态明细</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>状态</th>
              <th>数量</th>
              <th>占比</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 3 }).map((_, j) => (
                    <td key={j}><div className="skeleton h-4 rounded w-16" /></td>
                  ))}
                </tr>
              ))
            ) : statusData.map((s, i) => {
              const total = statusData.reduce((sum, d) => sum + d.value, 0);
              const pct = total > 0 ? ((s.value / total) * 100).toFixed(1) : "0";
              return (
                <tr key={i}>
                  <td>
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {s.name}
                    </span>
                  </td>
                  <td className="font-semibold text-foreground">{s.value}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted/30 rounded-full h-1.5 max-w-24">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
