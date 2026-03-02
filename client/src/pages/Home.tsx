import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { BarChart3, Bot, ChevronRight, FileText, Shield, Video } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 relative">
        <div className="mb-8 text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 elegant-shadow">
            <BarChart3 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">内部贷款管理系统</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            专业、高效的企业内部贷款管理平台，集成AI智能分析与视频生成功能
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10 max-w-2xl w-full">
          {[
            { icon: FileText, label: "贷款管理", desc: "申请、审批、跟踪" },
            { icon: BarChart3, label: "数据统计", desc: "实时业务分析" },
            { icon: Bot, label: "AI分析", desc: "豆包智能风控" },
            { icon: Video, label: "视频生成", desc: "Seedance模型" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="glass-card rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
        <a
          href={getLoginUrl()}
          className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-2xl text-base font-semibold hover:bg-primary/90 transition-all elegant-shadow group"
        >
          <Shield className="w-5 h-5" />
          登录系统
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </a>
        <p className="text-xs text-muted-foreground mt-4">仅限内部员工访问 · 请使用企业账号登录</p>
      </div>
      <footer className="text-center py-6 text-xs text-muted-foreground/50">
        内部贷款管理系统 · 企业内部使用
      </footer>
    </div>
  );
}
