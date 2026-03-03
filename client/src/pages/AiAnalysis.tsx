import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getEffectiveRole, hasPermission } from "../../../shared/permissions";
import {
  Brain, Send, Loader2, ShieldAlert, Sparkles, Bot, ImagePlus, FileSearch,
  CheckCircle2, AlertTriangle, User, CreditCard, DollarSign, TrendingDown,
  ArrowRight, Upload, X, Eye, Download
} from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ExtractedData {
  customerName?: string | null;
  customerPhone?: string | null;
  customerIdCard?: string | null;
  creditScore?: number | null;
  monthlyIncome?: string | null;
  totalDebt?: string | null;
  hasOverdue?: number;
  customerGrade?: string | null;
  loanCount?: number;
  creditCardCount?: number;
  overdueCount?: number;
  overdueAmount?: string | null;
  queryCount?: number;
  summary?: string | null;
  riskLevel?: string | null;
  suggestions?: string | null;
  error?: string | null;
}

const QUICK_PROMPTS = [
  "分析本月各团队业绩表现，找出最佳和最差团队",
  "根据当前放款数据，预测下月业绩趋势",
  "分析各等级客户的转化率，给出优化建议",
  "对比各分公司的运营效率，提出改进方案",
];

type TabType = "chat" | "credit-extract";

export default function AiAnalysis() {
  const { user } = useAuth();
  const role = useMemo(() => getEffectiveRole(user as any), [user]);
  const canAccess = hasPermission(role, "view_ai_analysis");
  const [activeTab, setActiveTab] = useState<TabType>("chat");

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">权限不足</h2>
        <p className="text-muted-foreground">AI分析功能仅对老板和总监角色开放</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">AI 智能分析</h1>
            <p className="text-xs text-muted-foreground">基于豆包大模型的业务数据深度分析 · doubao-seed-2-0-pro-260215</p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-xl mb-4 w-fit">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "chat"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          智能对话
        </button>
        <button
          onClick={() => setActiveTab("credit-extract")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "credit-extract"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileSearch className="w-4 h-4" />
          征信报告提取
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "chat" ? <ChatPanel /> : <CreditExtractPanel />}
    </div>
  );
}

// ============ 智能对话面板 ============
function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const analyzeMut = trpc.aiAnalysis.analyze.useMutation();

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
      const result = await analyzeMut.mutateAsync({ question: msg });
      setMessages([...newMessages, { role: "assistant", content: result.answer }]);
    } catch (e: any) {
      setMessages([...newMessages, { role: "assistant", content: `分析失败: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
    </>
  );
}

// ============ 征信报告提取面板 ============
function CreditExtractPanel() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [rawAnswer, setRawAnswer] = useState<string>("");
  const [showRaw, setShowRaw] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMut = trpc.upload.file.useMutation();
  const extractMut = trpc.aiAnalysis.extractCreditReport.useMutation();
  const createCreditMut = trpc.creditReports.create.useMutation();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("请上传图片文件（JPG/PNG等）");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("图片大小不能超过10MB");
      return;
    }
    setImageFile(file);
    setExtractedData(null);
    setRawAnswer("");
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleExtract = async () => {
    if (!imageFile || extracting) return;
    setExtracting(true);
    setExtractedData(null);
    try {
      // Step 1: 上传图片到S3
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = (ev) => {
          const result = ev.target?.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(imageFile);
      });

      toast.info("正在上传图片...");
      const { url } = await uploadMut.mutateAsync({
        fileName: imageFile.name,
        fileData: base64,
        contentType: imageFile.type,
      });

      // Step 2: 调用AI提取
      toast.info("正在AI识别征信报告...");
      const result = await extractMut.mutateAsync({ imageUrl: url });
      setExtractedData(result.extracted);
      setRawAnswer(result.rawAnswer);

      if (result.extracted?.error) {
        toast.warning(result.extracted.error);
      } else {
        toast.success("征信报告信息提取完成！");
      }
    } catch (e: any) {
      toast.error(`提取失败: ${e.message}`);
    } finally {
      setExtracting(false);
    }
  };

  const handleImportToCreditSystem = async () => {
    if (!extractedData || extractedData.error) return;
    try {
      await createCreditMut.mutateAsync({
        customerName: extractedData.customerName ?? "未知客户",
        customerPhone: extractedData.customerPhone ?? undefined,
        customerIdCard: extractedData.customerIdCard ?? undefined,
        creditScore: extractedData.creditScore ?? undefined,
        customerGrade: (extractedData.customerGrade as "A" | "B" | "C" | "D") ?? "C",
        monthlyIncome: extractedData.monthlyIncome ?? undefined,
        totalDebt: extractedData.totalDebt ?? undefined,
        hasOverdue: extractedData.hasOverdue ?? 0,
        notes: `[AI自动提取]\n风险等级: ${extractedData.riskLevel ?? "未知"}\n综合评价: ${extractedData.summary ?? ""}\n贷款建议: ${extractedData.suggestions ?? ""}\n贷款笔数: ${extractedData.loanCount ?? 0}\n信用卡数: ${extractedData.creditCardCount ?? 0}\n逾期次数: ${extractedData.overdueCount ?? 0}\n逾期金额: ${extractedData.overdueAmount ?? "0"}\n近期查询: ${extractedData.queryCount ?? 0}次`,
      });
      toast.success("已成功导入到征信系统！");
    } catch (e: any) {
      toast.error(`导入失败: ${e.message}`);
    }
  };

  const handleClear = () => {
    setImageFile(null);
    setImagePreview(null);
    setExtractedData(null);
    setRawAnswer("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getRiskColor = (level: string | null | undefined) => {
    if (!level) return "text-muted-foreground";
    if (level.includes("低")) return "text-emerald-400";
    if (level.includes("中")) return "text-amber-400";
    return "text-red-400";
  };

  const getGradeColor = (grade: string | null | undefined) => {
    switch (grade) {
      case "A": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "B": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "C": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "D": return "text-red-400 bg-red-500/10 border-red-500/20";
      default: return "text-muted-foreground bg-muted/10 border-border";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        {/* 左侧：上传区域 */}
        <div className="flex flex-col gap-4">
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-purple-400" />
              上传征信报告图片
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              支持 JPG、PNG 格式，最大 10MB。AI 将自动识别并提取征信报告中的关键信息。
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!imagePreview ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
              >
                <Upload className="w-8 h-8 text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground">点击或拖拽上传征信报告图片</span>
                <span className="text-xs text-muted-foreground/50">JPG / PNG，最大 10MB</span>
              </button>
            ) : (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="征信报告预览"
                  className="w-full max-h-64 object-contain rounded-xl border border-border"
                />
                <button
                  onClick={handleClear}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleExtract}
                disabled={!imageFile || extracting}
                className="flex-1"
              >
                {extracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    AI 识别中...
                  </>
                ) : (
                  <>
                    <FileSearch className="w-4 h-4 mr-2" />
                    开始提取信息
                  </>
                )}
              </Button>
              {imageFile && (
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  重新选择
                </Button>
              )}
            </div>
          </div>

          {/* 提取进度提示 */}
          {extracting && (
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">正在分析征信报告...</p>
                  <p className="text-xs text-muted-foreground">豆包视觉模型正在识别图片中的关键信息</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 右侧：提取结果 */}
        <div className="flex flex-col gap-4 overflow-y-auto">
          {!extractedData && !extracting && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileSearch className="w-12 h-12 text-muted-foreground/20 mb-4" />
              <h3 className="text-base font-semibold text-foreground mb-2">等待提取</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                上传征信报告图片后，AI 将自动识别并提取客户姓名、信用评分、贷款记录、逾期情况等关键字段
              </p>
            </div>
          )}

          {extractedData && extractedData.error && (
            <div className="glass-card rounded-xl p-5 border-amber-500/20">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-semibold text-amber-400">识别异常</h3>
              </div>
              <p className="text-sm text-muted-foreground">{extractedData.error}</p>
              {extractedData.summary && (
                <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">{extractedData.summary}</p>
                </div>
              )}
            </div>
          )}

          {extractedData && !extractedData.error && (
            <>
              {/* 风险等级 & 客户等级 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">风险等级</p>
                  <p className={`text-lg font-bold ${getRiskColor(extractedData.riskLevel)}`}>
                    {extractedData.riskLevel ?? "未知"}
                  </p>
                </div>
                <div className="glass-card rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">客户等级</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-lg font-bold border ${getGradeColor(extractedData.customerGrade)}`}>
                    {extractedData.customerGrade ?? "-"}
                  </span>
                </div>
              </div>

              {/* 基本信息 */}
              <div className="glass-card rounded-xl p-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />
                  客户基本信息
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <InfoItem label="客户姓名" value={extractedData.customerName} />
                  <InfoItem label="手机号码" value={extractedData.customerPhone} />
                  <InfoItem label="身份证号" value={extractedData.customerIdCard} />
                  <InfoItem label="信用评分" value={extractedData.creditScore?.toString()} highlight />
                </div>
              </div>

              {/* 财务信息 */}
              <div className="glass-card rounded-xl p-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5" />
                  财务信息
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <InfoItem label="月收入" value={extractedData.monthlyIncome ? `¥${Number(extractedData.monthlyIncome).toLocaleString()}` : null} />
                  <InfoItem label="总负债" value={extractedData.totalDebt ? `¥${Number(extractedData.totalDebt).toLocaleString()}` : null} />
                </div>
              </div>

              {/* 信用信息 */}
              <div className="glass-card rounded-xl p-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5" />
                  信用记录
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <StatItem label="贷款笔数" value={extractedData.loanCount ?? 0} />
                  <StatItem label="信用卡数" value={extractedData.creditCardCount ?? 0} />
                  <StatItem label="近期查询" value={extractedData.queryCount ?? 0} />
                </div>
              </div>

              {/* 逾期信息 */}
              <div className="glass-card rounded-xl p-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <TrendingDown className="w-3.5 h-3.5" />
                  逾期信息
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <StatItem
                    label="是否逾期"
                    value={extractedData.hasOverdue ? "是" : "否"}
                    color={extractedData.hasOverdue ? "text-red-400" : "text-emerald-400"}
                  />
                  <StatItem label="逾期次数" value={extractedData.overdueCount ?? 0} color={extractedData.overdueCount ? "text-red-400" : undefined} />
                  <StatItem label="逾期金额" value={extractedData.overdueAmount ? `¥${Number(extractedData.overdueAmount).toLocaleString()}` : "¥0"} />
                </div>
              </div>

              {/* 综合评价 */}
              {extractedData.summary && (
                <div className="glass-card rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">综合评价</h4>
                  <p className="text-sm text-foreground leading-relaxed">{extractedData.summary}</p>
                </div>
              )}

              {/* 贷款建议 */}
              {extractedData.suggestions && (
                <div className="glass-card rounded-xl p-4 border-primary/20">
                  <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">贷款建议</h4>
                  <p className="text-sm text-foreground leading-relaxed">{extractedData.suggestions}</p>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-2">
                <Button onClick={handleImportToCreditSystem} className="flex-1">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  一键导入征信系统
                </Button>
                <Button variant="outline" onClick={() => setShowRaw(!showRaw)}>
                  <Eye className="w-4 h-4 mr-1" />
                  {showRaw ? "隐藏" : "原始"}数据
                </Button>
              </div>

              {/* 原始数据 */}
              {showRaw && rawAnswer && (
                <div className="glass-card rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">AI 原始返回</h4>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all bg-muted/30 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {rawAnswer}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ 辅助组件 ============
function InfoItem({ label, value, highlight }: { label: string; value?: string | null; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${value ? (highlight ? "text-primary" : "text-foreground") : "text-muted-foreground/50"}`}>
        {value ?? "未识别"}
      </p>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-base font-bold ${color ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}
