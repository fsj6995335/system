import { trpc } from "@/lib/trpc";
import { formatCurrency, getLoanStatusBadge, LOAN_TYPE_MAP } from "@/lib/loanUtils";
import { Bot, Loader2, Send, Sparkles, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

const QUICK_QUESTIONS = [
  "请对这笔贷款进行综合风险评估",
  "申请人的还款能力如何？",
  "这笔贷款的利率建议是多少？",
  "是否存在潜在的违约风险？",
  "请给出审批建议",
];

export default function AiAnalysis() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const loanIdParam = params.get("loanId");

  const [selectedLoanId, setSelectedLoanId] = useState<number | undefined>(
    loanIdParam ? parseInt(loanIdParam) : undefined
  );
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [answer, setAnswer] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "ai"; content: string }>>([]);

  const { data: loans } = trpc.loans.list.useQuery({ pageSize: 100, myOnly: false });

  const analyzeMutation = trpc.aiAnalysis.analyze.useMutation({
    onSuccess: (data) => {
      const userMsg = question;
      setAnswer(data.answer);
      setChatHistory((prev) => [
        ...prev,
        { role: "user", content: userMsg },
        { role: "ai", content: data.answer },
      ]);
      setQuestion("");
    },
    onError: (err) => toast.error(`分析失败：${err.message}`),
  });

  const handleSubmit = () => {
    if (!question.trim()) {
      toast.error("请输入分析问题");
      return;
    }
    analyzeMutation.mutate({
      loanId: selectedLoanId,
      question,
      context: context || undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  const selectedLoan = loans?.items?.find((l) => l.id === selectedLoanId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">AI智能分析</h1>
        <p className="page-subtitle">使用豆包AI对贷款申请进行智能风险分析</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Config Panel */}
        <div className="space-y-4">
          {/* Loan Selector */}
          <div className="glass-card rounded-xl p-5 elegant-shadow space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">选择分析对象</h3>
            </div>
            <select
              value={selectedLoanId ?? ""}
              onChange={(e) => setSelectedLoanId(e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-all"
            >
              <option value="">通用分析（不关联贷款）</option>
              {loans?.items?.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  #{loan.id} {loan.applicantName} - {formatCurrency(loan.amount)}
                </option>
              ))}
            </select>

            {selectedLoan && (
              <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                {[
                  { label: "申请人", value: selectedLoan.applicantName },
                  { label: "金额", value: formatCurrency(selectedLoan.amount) },
                  { label: "类型", value: LOAN_TYPE_MAP[selectedLoan.loanType] ?? selectedLoan.loanType },
                  { label: "状态", value: getLoanStatusBadge(selectedLoan.status ?? "").label },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground font-medium">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Context */}
          <div className="glass-card rounded-xl p-5 elegant-shadow space-y-3">
            <h3 className="text-sm font-semibold text-foreground">补充背景信息</h3>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="可以补充额外的背景信息，如市场情况、行业背景等..."
              rows={4}
              className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-all resize-none"
            />
          </div>

          {/* Quick Questions */}
          <div className="glass-card rounded-xl p-5 elegant-shadow space-y-3">
            <h3 className="text-sm font-semibold text-foreground">快速问题</h3>
            <div className="space-y-1.5">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  className="w-full text-left text-xs text-muted-foreground hover:text-foreground p-2.5 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-border"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Panel */}
        <div className="xl:col-span-2 glass-card rounded-xl elegant-shadow flex flex-col" style={{ minHeight: "600px" }}>
          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">豆包AI分析助手</h3>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    选择一笔贷款申请，然后提出您的问题。AI将基于贷款数据提供专业的风险分析和建议。
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
                  {QUICK_QUESTIONS.slice(0, 3).map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuestion(q)}
                      className="text-xs text-primary hover:text-primary/80 p-2 rounded-lg border border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatHistory.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "ai" ? "bg-primary/10" : "bg-muted"}`}>
                    {msg.role === "ai" ? (
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <span className="text-xs text-muted-foreground">我</span>
                    )}
                  </div>
                  <div className={`flex-1 max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                    <div className={`rounded-xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/40 text-foreground"}`}>
                      {msg.role === "ai" ? (
                        <Streamdown className="prose prose-sm prose-invert max-w-none text-foreground [&_*]:text-foreground">{msg.content}</Streamdown>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {analyzeMutation.isPending && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-muted/40 rounded-xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                  <span className="text-xs text-muted-foreground">AI正在分析中...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-4">
            <div className="flex gap-3">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入您的问题... (Ctrl+Enter 发送)"
                rows={2}
                className="flex-1 px-3 py-2.5 bg-input border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-all resize-none"
              />
              <button
                onClick={handleSubmit}
                disabled={analyzeMutation.isPending || !question.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-all elegant-shadow flex-shrink-0 self-end"
              >
                {analyzeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-2">
              模型：doubao-seed-2-0-pro-260215 · 按 Ctrl+Enter 快速发送
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
