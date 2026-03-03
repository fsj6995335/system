import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Send, Loader2, Sparkles, Copy, Check } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const TEMPLATES = [
  { label: "贷款营销文案", prompt: "帮我写一段吸引客户的贷款营销文案，突出低利率和快速审批" },
  { label: "客户跟进话术", prompt: "帮我写一段客户跟进话术，客户之前咨询过房贷但没有下单" },
  { label: "朋友圈推广", prompt: "帮我写一条适合发朋友圈的贷款推广文案，简短有吸引力" },
  { label: "短信通知模板", prompt: "帮我写一条贷款审批通过的短信通知模板" },
  { label: "产品介绍文案", prompt: "帮我写一段银行经营贷产品的介绍文案，包含产品优势和申请条件" },
  { label: "客户回访话术", prompt: "帮我写一段贷款放款后的客户回访话术" },
];

export default function AiAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const assistantMut = trpc.aiAssistant.chat.useMutation();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || loading) return;
    setInput("");
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const result = await assistantMut.mutateAsync({ message: msg });
      setMessages([...newMessages, { role: "assistant", content: result.answer }]);
    } catch (e: any) {
      setMessages([...newMessages, { role: "assistant", content: `生成失败: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    toast.success("已复制到剪贴板");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">AI 助手</h1>
          <p className="text-xs text-muted-foreground">智能文案生成 · 全员可用</p>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="w-12 h-12 text-cyan-400/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">AI文案助手</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">选择模板快速生成，或自由输入需求</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-xl">
              {TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => handleSend(t.prompt)} className="glass-card rounded-lg p-3 text-left text-xs text-muted-foreground hover:text-foreground hover:border-cyan-500/30 transition-colors">
                  <span className="font-medium text-foreground block mb-1">{t.label}</span>
                  <span className="line-clamp-2">{t.prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "assistant" ? "bg-cyan-500/10" : "bg-muted"}`}>
              {msg.role === "assistant" ? <Bot className="w-4 h-4 text-cyan-400" /> : <span className="text-xs text-muted-foreground">我</span>}
            </div>
            <div className={`max-w-[80%] ${msg.role === "user" ? "" : ""}`}>
              <div className={`rounded-xl px-4 py-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "glass-card"}`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none"><Streamdown>{msg.content}</Streamdown></div>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
              </div>
              {msg.role === "assistant" && (
                <button onClick={() => handleCopy(msg.content, i)} className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {copiedIdx === i ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  {copiedIdx === i ? "已复制" : "复制"}
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="glass-card rounded-xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span className="text-sm text-muted-foreground">正在生成...</span>
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
          placeholder="输入文案需求..."
          className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <Button onClick={() => handleSend()} disabled={!input.trim() || loading} size="icon" className="h-auto w-12 rounded-xl">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
