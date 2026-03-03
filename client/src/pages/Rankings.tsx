import { trpc } from "@/lib/trpc";
import { Trophy, Medal, TrendingUp, DollarSign } from "lucide-react";
import { useState } from "react";

const MEDAL_COLORS = ["text-amber-400", "text-gray-300", "text-amber-600"];

export default function Rankings() {
  const [tab, setTab] = useState<"personal" | "team">("personal");
  const { data: rankings } = trpc.stats.rankings.useQuery();
  const { data: teamRankings } = trpc.stats.teamRankings.useQuery();

  const personalData = (rankings ?? []).map((r: any, i: number) => ({
    rank: i + 1, name: r.employeeName || `员工${r.employeeId}`,
    count: Number(r.count), amount: Number(r.totalAmount), commission: Number(r.totalCommission),
  }));

  const teamData = (teamRankings ?? []).map((r: any, i: number) => ({
    rank: i + 1, name: `团队${r.teamId}`,
    count: Number(r.count), amount: Number(r.totalAmount), commission: Number(r.totalCommission),
  }));

  const data = tab === "personal" ? personalData : teamData;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">排名榜单</h1>
        <p className="page-subtitle">员工和团队业绩排名</p>
      </div>

      {/* Tab Switch */}
      <div className="flex gap-2">
        <button onClick={() => setTab("personal")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "personal" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>个人排名</button>
        <button onClick={() => setTab("team")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "team" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>团队排名</button>
      </div>

      {/* Top 3 Podium */}
      {data.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {[1, 0, 2].map((idx) => {
            const item = data[idx];
            if (!item) return null;
            const isFirst = idx === 0;
            return (
              <div key={idx} className={`glass-card rounded-xl p-5 text-center ${isFirst ? "lg:-mt-4" : ""}`}>
                <div className="flex justify-center mb-3">
                  {item.rank <= 3 ? (
                    <div className={`w-12 h-12 rounded-full bg-background/50 flex items-center justify-center ${isFirst ? "ring-2 ring-amber-400/50" : ""}`}>
                      <Trophy className={`w-6 h-6 ${MEDAL_COLORS[item.rank - 1]}`} />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">{item.rank}</div>
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground mt-1">第 {item.rank} 名</p>
                <div className="mt-3 space-y-1">
                  <p className="text-lg font-bold text-amber-400">¥{item.amount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{item.count} 笔放款</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Ranking Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground w-16">排名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{tab === "personal" ? "姓名" : "团队"}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">放款笔数</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">放款总额</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">佣金总额</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.rank} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-center">
                    {item.rank <= 3 ? (
                      <Trophy className={`w-4 h-4 mx-auto ${MEDAL_COLORS[item.rank - 1]}`} />
                    ) : (
                      <span className="text-sm text-muted-foreground">{item.rank}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{item.name}</td>
                  <td className="px-4 py-3 text-sm text-right text-muted-foreground">{item.count}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-amber-400">¥{item.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-emerald-400">¥{item.commission.toLocaleString()}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground"><Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">暂无排名数据</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
