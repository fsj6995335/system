import { trpc } from "@/lib/trpc";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { FileText, DollarSign, TrendingUp, Users, Activity } from "lucide-react";

const COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#a78bfa", "#f87171", "#22d3ee"];

export default function DataScreen() {
  const { data: stats } = trpc.stats.dashboard.useQuery();
  const { data: daily } = trpc.stats.daily.useQuery({ days: 31 });

  const gradeData = stats?.gradeStats?.map((g: any) => ({ name: `${g.grade}级`, value: Number(g.count) })) ?? [];
  const statusData = stats?.statusStats?.map((s: any) => ({
    name: s.status === "pending" ? "待审核" : s.status === "reviewed" ? "已审核" : s.status === "matched" ? "已匹配" : "已拒绝",
    value: Number(s.count),
  })) ?? [];

  const dailyData = (daily ?? []).reverse().map((d: any) => ({
    date: d.date?.slice(5) ?? "",
    征信: d.newCreditReports,
    放款: d.newDisbursements,
    金额: Number(d.disbursementAmount) / 10000,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">数据大屏</h1>
          <p className="text-sm text-muted-foreground mt-1">实时业务数据概览</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="w-3.5 h-3.5 text-green-400 animate-pulse" />
          <span>实时更新</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={FileText} label="征信报告总数" value={stats?.totalCreditReports ?? 0} color="text-blue-400" gradient="from-blue-500/20 to-blue-600/5" />
        <KpiCard icon={Users} label="放款笔数" value={stats?.totalDisbursements ?? 0} color="text-emerald-400" gradient="from-emerald-500/20 to-emerald-600/5" />
        <KpiCard icon={DollarSign} label="放款总额" value={`¥${(Number(stats?.totalDisbursementAmount ?? 0) / 10000).toFixed(1)}万`} color="text-amber-400" gradient="from-amber-500/20 to-amber-600/5" />
        <KpiCard icon={TrendingUp} label="佣金总额" value={`¥${(Number(stats?.totalCommission ?? 0) / 10000).toFixed(1)}万`} color="text-purple-400" gradient="from-purple-500/20 to-purple-600/5" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend Chart */}
        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">业务趋势（近30天）</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorCr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDisb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "rgba(15,15,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="征信" stroke="#60a5fa" fill="url(#colorCr)" strokeWidth={2} />
              <Area type="monotone" dataKey="放款" stroke="#34d399" fill="url(#colorDisb)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Grade Distribution */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">客户等级分布</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={gradeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {gradeData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "rgba(15,15,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Distribution */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">征信状态分布</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "rgba(15,15,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {statusData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Amount Trend */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">放款金额趋势（万元）</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "rgba(15,15,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="金额" stroke="#fbbf24" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color, gradient }: { icon: any; label: string; value: string | number; color: string; gradient: string }) {
  return (
    <div className="glass-card rounded-xl p-5 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50`} />
      <div className="relative">
        <div className={`w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center mb-3`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
