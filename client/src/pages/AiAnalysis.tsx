import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getEffectiveRole, hasPermission } from "../../../shared/permissions";
import { Brain, Send, Loader2, ShieldAlert, Sparkles, Bot } from "lucide-react";
import { Streamdown } from "streamdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "分析本月各团队业绩表现，找出最佳和最差团队",
  "根据当前放款数据，预测下月业绩趋势",
  "分析各等级客户的转化率，给出优化建议",
  "对比各分公司的运营效率，提出改进方案",
];

export default function AiAnalysis() {
  const { user } = useAuth();
  const role = useMemo(() => getEffectiveRole(user as any), [user]);
  const canAccess = hasPermission(role, "view_ai_analysis");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const analyzeMut = trpc.aiAnalysis.analyze.useMutation();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">权限不足</h2>
        <p className="text-muted-foreground">AI分析功能仅对老板和总监角色开放</p>
      </div>
    );
  }

  const handleSend = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || loading) return;
    setInput("");
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const result = await analyzeMut.mutateAsync({ question: msg });
      setMessages([...newMessages, { role: "assistant", content: result.answer }]);
    } catch (e: any) {
      setMessages([...newMessages, { role: "assistant", content: `分析失败: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
          <Brain className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">AI 智能分析</h1>
          <p className="text-xs text-muted-foreground">基于豆包大模型的业务数据深度分析 · doubao-seed-2-0-pro-260215</p>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="w-12 h-12 text-primary/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">开始智能分析</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">选择一个快捷问题或输入您的分析需求</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
              {QUICK_PROMPTS.map((p, i) => (
                <button key={i} onClick={() => handleSend(p)} className="glass-card rounded-lg p-3 text-left text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "assistant" ? "bg-primary/10" : "bg-muted"}`}>
              {msg.role === "assistant" ? <Bot className="w-4 h-4 text-primary" /> : <span className="text-xs text-muted-foreground">我</span>}
            </div>
            <div className={`max-w-[80%] rounded-xl px-4 py-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "glass-card"}`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-invert prose-sm max-w-none"><Streamdown>{msg.content}</Streamdown></div>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="glass-card rounded-xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">正在分析...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="输入分析需求..."
          className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <Button onClick={() => handleSend()} disabled={!input.trim() || loading} size="icon" className="h-auto w-12 rounded-xl">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
