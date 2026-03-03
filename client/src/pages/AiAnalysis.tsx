import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getEffectiveRole, hasPermission } from "../../../shared/permissions";
import {
  Brain, Send, Loader2, ShieldAlert, Sparkles, Bot, ImagePlus, FileSearch,
  CheckCircle2, AlertTriangle, User, CreditCard, DollarSign, TrendingDown,
  ArrowRight, Upload, X, Eye, Layers, Trash2, CheckCheck, XCircle, ChevronDown, ChevronUp
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

interface BatchImageItem {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "extracting" | "success" | "error";
  uploadedUrl?: string;
  extracted?: ExtractedData;
  rawAnswer?: string;
  errorMsg?: string;
  imported?: boolean;
}

const QUICK_PROMPTS = [
  "分析本月各团队业绩表现，找出最佳和最差团队",
  "根据当前放款数据，预测下月业绩趋势",
  "分析各等级客户的转化率，给出优化建议",
  "对比各分公司的运营效率，提出改进方案",
];

type TabType = "chat" | "credit-extract" | "batch-extract";

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
          单张提取
        </button>
        <button
          onClick={() => setActiveTab("batch-extract")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "batch-extract"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="w-4 h-4" />
          批量提取
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "chat" && <ChatPanel />}
      {activeTab === "credit-extract" && <CreditExtractPanel />}
      {activeTab === "batch-extract" && <BatchExtractPanel />}
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

// ============ 单张征信报告提取面板 ============
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
    if (!file.type.startsWith("image/")) { toast.error("请上传图片文件（JPG/PNG等）"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("图片大小不能超过10MB"); return; }
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
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = (ev) => { resolve((ev.target?.result as string).split(",")[1]); };
        reader.readAsDataURL(imageFile);
      });
      toast.info("正在上传图片...");
      const { url } = await uploadMut.mutateAsync({ fileName: imageFile.name, fileData: base64, contentType: imageFile.type });
      toast.info("正在AI识别征信报告...");
      const result = await extractMut.mutateAsync({ imageUrl: url });
      setExtractedData(result.extracted);
      setRawAnswer(result.rawAnswer);
      if (result.extracted?.error) { toast.warning(result.extracted.error); }
      else { toast.success("征信报告信息提取完成！"); }
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
    setImageFile(null); setImagePreview(null); setExtractedData(null); setRawAnswer("");
    if (fileInputRef.current) fileInputRef.current.value = "";
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
            <p className="text-xs text-muted-foreground mb-4">支持 JPG、PNG 格式，最大 10MB。AI 将自动识别并提取征信报告中的关键信息。</p>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            {!imagePreview ? (
              <button onClick={() => fileInputRef.current?.click()} className="w-full h-48 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                <Upload className="w-8 h-8 text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground">点击或拖拽上传征信报告图片</span>
                <span className="text-xs text-muted-foreground/50">JPG / PNG，最大 10MB</span>
              </button>
            ) : (
              <div className="relative">
                <img src={imagePreview} alt="征信报告预览" className="w-full max-h-64 object-contain rounded-xl border border-border" />
                <button onClick={handleClear} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <Button onClick={handleExtract} disabled={!imageFile || extracting} className="flex-1">
                {extracting ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" />AI 识别中...</>) : (<><FileSearch className="w-4 h-4 mr-2" />开始提取信息</>)}
              </Button>
              {imageFile && (<Button variant="outline" onClick={() => fileInputRef.current?.click()}>重新选择</Button>)}
            </div>
          </div>
          {extracting && (
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-purple-400" /></div>
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
              <p className="text-sm text-muted-foreground max-w-xs">上传征信报告图片后，AI 将自动识别并提取关键字段</p>
            </div>
          )}
          {extractedData && <ExtractResultCard data={extractedData} rawAnswer={rawAnswer} showRaw={showRaw} onToggleRaw={() => setShowRaw(!showRaw)} onImport={handleImportToCreditSystem} />}
        </div>
      </div>
    </div>
  );
}

// ============ 批量征信报告提取面板 ============
function BatchExtractPanel() {
  const [images, setImages] = useState<BatchImageItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMut = trpc.upload.file.useMutation();
  const batchExtractMut = trpc.aiAnalysis.batchExtractCreditReport.useMutation();
  const createCreditMut = trpc.creditReports.create.useMutation();

  const handleFilesSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const validFiles = files.filter(f => {
      if (!f.type.startsWith("image/")) { toast.error(`${f.name} 不是图片文件，已跳过`); return false; }
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} 超过10MB，已跳过`); return false; }
      return true;
    });

    if (images.length + validFiles.length > 20) {
      toast.error("最多支持20张图片");
      return;
    }

    const newItems: BatchImageItem[] = validFiles.map(file => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const preview = URL.createObjectURL(file);
      return { id, file, preview, status: "pending" as const };
    });

    setImages(prev => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [images.length]);

  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(i => i.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    images.forEach(i => URL.revokeObjectURL(i.preview));
    setImages([]);
    setExpandedId(null);
  }, [images]);

  const handleBatchExtract = async () => {
    const pendingImages = images.filter(i => i.status === "pending" || i.status === "error");
    if (pendingImages.length === 0) { toast.info("没有待处理的图片"); return; }
    setProcessing(true);

    // Step 1: 逐张上传图片到S3
    const uploadedUrls: string[] = [];
    const indexMap: Map<number, string> = new Map(); // urlIndex -> imageId

    for (let i = 0; i < pendingImages.length; i++) {
      const item = pendingImages[i];
      setCurrentIndex(i);
      setImages(prev => prev.map(img => img.id === item.id ? { ...img, status: "uploading" } : img));

      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = (ev) => { resolve((ev.target?.result as string).split(",")[1]); };
          reader.readAsDataURL(item.file);
        });
        const { url } = await uploadMut.mutateAsync({ fileName: item.file.name, fileData: base64, contentType: item.file.type });
        uploadedUrls.push(url);
        indexMap.set(uploadedUrls.length - 1, item.id);
        setImages(prev => prev.map(img => img.id === item.id ? { ...img, uploadedUrl: url, status: "extracting" } : img));
      } catch (e: any) {
        setImages(prev => prev.map(img => img.id === item.id ? { ...img, status: "error", errorMsg: `上传失败: ${e.message}` } : img));
      }
    }

    if (uploadedUrls.length === 0) {
      toast.error("所有图片上传失败");
      setProcessing(false);
      setCurrentIndex(-1);
      return;
    }

    // Step 2: 调用批量提取API
    toast.info(`正在AI识别 ${uploadedUrls.length} 张征信报告...`);
    try {
      const result = await batchExtractMut.mutateAsync({ imageUrls: uploadedUrls });

      // Step 3: 更新每张图片的结果
      for (const r of result.results) {
        const imageId = indexMap.get(r.index);
        if (!imageId) continue;
        setImages(prev => prev.map(img => img.id === imageId ? {
          ...img,
          status: r.status === "success" ? "success" : "error",
          extracted: r.extracted,
          rawAnswer: r.rawAnswer,
          errorMsg: r.errorMsg ?? r.extracted?.error,
        } : img));
      }

      toast.success(`批量提取完成！成功 ${result.successCount}/${result.total} 张`);
    } catch (e: any) {
      toast.error(`批量提取失败: ${e.message}`);
      // 将所有extracting状态的图片标记为error
      setImages(prev => prev.map(img => img.status === "extracting" ? { ...img, status: "error", errorMsg: e.message } : img));
    } finally {
      setProcessing(false);
      setCurrentIndex(-1);
    }
  };

  const handleBatchImport = async () => {
    const successItems = images.filter(i => i.status === "success" && i.extracted && !i.extracted.error && !i.imported);
    if (successItems.length === 0) { toast.info("没有可导入的记录"); return; }

    let importedCount = 0;
    for (const item of successItems) {
      try {
        const d = item.extracted!;
        await createCreditMut.mutateAsync({
          customerName: d.customerName ?? "未知客户",
          customerPhone: d.customerPhone ?? undefined,
          customerIdCard: d.customerIdCard ?? undefined,
          creditScore: d.creditScore ?? undefined,
          customerGrade: (d.customerGrade as "A" | "B" | "C" | "D") ?? "C",
          monthlyIncome: d.monthlyIncome ?? undefined,
          totalDebt: d.totalDebt ?? undefined,
          hasOverdue: d.hasOverdue ?? 0,
          notes: `[AI批量提取]\n风险等级: ${d.riskLevel ?? "未知"}\n综合评价: ${d.summary ?? ""}\n贷款建议: ${d.suggestions ?? ""}\n贷款笔数: ${d.loanCount ?? 0}\n信用卡数: ${d.creditCardCount ?? 0}\n逾期次数: ${d.overdueCount ?? 0}\n逾期金额: ${d.overdueAmount ?? "0"}\n近期查询: ${d.queryCount ?? 0}次`,
        });
        setImages(prev => prev.map(img => img.id === item.id ? { ...img, imported: true } : img));
        importedCount++;
      } catch (e: any) {
        toast.error(`导入 ${item.extracted?.customerName ?? item.file.name} 失败: ${e.message}`);
      }
    }
    toast.success(`成功导入 ${importedCount} 条征信记录到系统！`);
  };

  const handleSingleImport = async (item: BatchImageItem) => {
    if (!item.extracted || item.extracted.error || item.imported) return;
    try {
      const d = item.extracted;
      await createCreditMut.mutateAsync({
        customerName: d.customerName ?? "未知客户",
        customerPhone: d.customerPhone ?? undefined,
        customerIdCard: d.customerIdCard ?? undefined,
        creditScore: d.creditScore ?? undefined,
        customerGrade: (d.customerGrade as "A" | "B" | "C" | "D") ?? "C",
        monthlyIncome: d.monthlyIncome ?? undefined,
        totalDebt: d.totalDebt ?? undefined,
        hasOverdue: d.hasOverdue ?? 0,
        notes: `[AI批量提取]\n风险等级: ${d.riskLevel ?? "未知"}\n综合评价: ${d.summary ?? ""}\n贷款建议: ${d.suggestions ?? ""}`,
      });
      setImages(prev => prev.map(img => img.id === item.id ? { ...img, imported: true } : img));
      toast.success(`${d.customerName ?? "客户"} 已导入征信系统`);
    } catch (e: any) {
      toast.error(`导入失败: ${e.message}`);
    }
  };

  const successCount = images.filter(i => i.status === "success").length;
  const errorCount = images.filter(i => i.status === "error").length;
  const pendingCount = images.filter(i => i.status === "pending").length;
  const importedCount = images.filter(i => i.imported).length;
  const importableCount = images.filter(i => i.status === "success" && !i.imported && !i.extracted?.error).length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
        {/* 左侧：上传区域 (2/5) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              批量上传征信报告
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              支持同时选择多张图片（最多20张），AI将逐张识别并提取关键信息。
            </p>

            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFilesSelect} className="hidden" />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={processing}
              className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-6 h-6 text-muted-foreground/50" />
              <span className="text-sm text-muted-foreground">点击选择多张图片</span>
              <span className="text-xs text-muted-foreground/50">JPG / PNG，每张最大 10MB，最多 20 张</span>
            </button>

            {/* 图片预览网格 */}
            {images.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">已选择 {images.length} 张图片</span>
                  <button onClick={clearAll} disabled={processing} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">
                    清空全部
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 max-h-[280px] overflow-y-auto pr-1">
                  {images.map((item) => (
                    <div key={item.id} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                      <img src={item.preview} alt="" className="w-full h-full object-cover" />
                      {/* 状态覆盖层 */}
                      <div className={`absolute inset-0 flex items-center justify-center ${
                        item.status === "pending" ? "bg-transparent" :
                        item.status === "uploading" || item.status === "extracting" ? "bg-black/50" :
                        item.status === "success" ? "bg-emerald-500/20" :
                        "bg-red-500/20"
                      }`}>
                        {item.status === "uploading" && <Loader2 className="w-5 h-5 animate-spin text-blue-400" />}
                        {item.status === "extracting" && <Loader2 className="w-5 h-5 animate-spin text-purple-400" />}
                        {item.status === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                        {item.status === "error" && <XCircle className="w-5 h-5 text-red-400" />}
                      </div>
                      {/* 删除按钮 */}
                      {!processing && (
                        <button
                          onClick={() => removeImage(item.id)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      )}
                      {/* 已导入标记 */}
                      {item.imported && (
                        <div className="absolute bottom-0 left-0 right-0 bg-emerald-600/90 text-white text-[10px] text-center py-0.5">
                          已导入
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleBatchExtract}
                disabled={images.length === 0 || processing || pendingCount === 0}
                className="flex-1"
              >
                {processing ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />处理中 ({currentIndex + 1}/{images.filter(i => i.status !== "success").length})...</>
                ) : (
                  <><FileSearch className="w-4 h-4 mr-2" />开始批量提取 ({pendingCount}张)</>
                )}
              </Button>
            </div>
          </div>

          {/* 统计概览 */}
          {images.length > 0 && (
            <div className="glass-card rounded-xl p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">处理统计</h4>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{images.length}</p>
                  <p className="text-[10px] text-muted-foreground">总计</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-400">{successCount}</p>
                  <p className="text-[10px] text-muted-foreground">成功</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-400">{errorCount}</p>
                  <p className="text-[10px] text-muted-foreground">失败</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-400">{importedCount}</p>
                  <p className="text-[10px] text-muted-foreground">已导入</p>
                </div>
              </div>
              {/* 进度条 */}
              {images.length > 0 && (
                <div className="mt-3">
                  <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${((successCount + errorCount) / images.length) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 text-right">
                    {successCount + errorCount}/{images.length} 已处理
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 批量导入按钮 */}
          {importableCount > 0 && (
            <Button onClick={handleBatchImport} className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500">
              <CheckCheck className="w-4 h-4 mr-2" />
              一键全部导入征信系统 ({importableCount}条)
            </Button>
          )}
        </div>

        {/* 右侧：提取结果列表 (3/5) */}
        <div className="lg:col-span-3 flex flex-col gap-3 overflow-y-auto">
          {images.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Layers className="w-12 h-12 text-muted-foreground/20 mb-4" />
              <h3 className="text-base font-semibold text-foreground mb-2">批量提取模式</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                选择多张征信报告图片，AI将逐张识别并提取关键信息，支持一键批量导入征信系统
              </p>
            </div>
          )}

          {images.filter(i => i.status !== "pending").length === 0 && images.length > 0 && !processing && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Upload className="w-12 h-12 text-muted-foreground/20 mb-4" />
              <h3 className="text-base font-semibold text-foreground mb-2">准备就绪</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                已选择 {images.length} 张图片，点击"开始批量提取"按钮开始处理
              </p>
            </div>
          )}

          {/* 结果卡片列表 */}
          {images.filter(i => i.status !== "pending").map((item) => (
            <div key={item.id} className="glass-card rounded-xl overflow-hidden">
              {/* 卡片头部 */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/10 transition-colors"
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              >
                <img src={item.preview} alt="" className="w-12 h-12 rounded-lg object-cover border border-border flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.extracted?.customerName ?? item.file.name}
                    </p>
                    {item.status === "success" && !item.extracted?.error && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getGradeColor(item.extracted?.customerGrade)}`}>
                        {item.extracted?.customerGrade ?? "-"}级
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {item.status === "uploading" && <span className="text-xs text-blue-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />上传中</span>}
                    {item.status === "extracting" && <span className="text-xs text-purple-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />识别中</span>}
                    {item.status === "success" && !item.extracted?.error && (
                      <>
                        <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />提取成功</span>
                        {item.extracted?.riskLevel && <span className={`text-xs ${getRiskColor(item.extracted.riskLevel)}`}>{item.extracted.riskLevel}</span>}
                        {item.extracted?.creditScore && <span className="text-xs text-muted-foreground">评分: {item.extracted.creditScore}</span>}
                      </>
                    )}
                    {item.status === "success" && item.extracted?.error && (
                      <span className="text-xs text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{item.extracted.error}</span>
                    )}
                    {item.status === "error" && <span className="text-xs text-red-400 flex items-center gap-1"><XCircle className="w-3 h-3" />{item.errorMsg ?? "提取失败"}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.imported && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">已导入</span>
                  )}
                  {item.status === "success" && !item.extracted?.error && !item.imported && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleSingleImport(item); }}>
                      <ArrowRight className="w-3 h-3 mr-1" />导入
                    </Button>
                  )}
                  {expandedId === item.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {/* 展开详情 */}
              {expandedId === item.id && item.extracted && !item.extracted.error && (
                <div className="border-t border-border p-4 space-y-3">
                  {/* 基本信息 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <InfoItem label="客户姓名" value={item.extracted.customerName} />
                    <InfoItem label="手机号码" value={item.extracted.customerPhone} />
                    <InfoItem label="身份证号" value={item.extracted.customerIdCard} />
                    <InfoItem label="信用评分" value={item.extracted.creditScore?.toString()} highlight />
                  </div>
                  {/* 财务信息 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <InfoItem label="月收入" value={item.extracted.monthlyIncome ? `¥${Number(item.extracted.monthlyIncome).toLocaleString()}` : null} />
                    <InfoItem label="总负债" value={item.extracted.totalDebt ? `¥${Number(item.extracted.totalDebt).toLocaleString()}` : null} />
                    <InfoItem label="贷款笔数" value={item.extracted.loanCount?.toString()} />
                    <InfoItem label="信用卡数" value={item.extracted.creditCardCount?.toString()} />
                  </div>
                  {/* 逾期信息 */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-0.5">是否逾期</p>
                      <p className={`text-sm font-bold ${item.extracted.hasOverdue ? "text-red-400" : "text-emerald-400"}`}>
                        {item.extracted.hasOverdue ? "是" : "否"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-0.5">逾期次数</p>
                      <p className={`text-sm font-bold ${item.extracted.overdueCount ? "text-red-400" : "text-foreground"}`}>{item.extracted.overdueCount ?? 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-0.5">近期查询</p>
                      <p className="text-sm font-bold text-foreground">{item.extracted.queryCount ?? 0}次</p>
                    </div>
                  </div>
                  {/* 综合评价 */}
                  {item.extracted.summary && (
                    <div className="bg-muted/20 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">综合评价</p>
                      <p className="text-xs text-foreground leading-relaxed">{item.extracted.summary}</p>
                    </div>
                  )}
                  {/* 贷款建议 */}
                  {item.extracted.suggestions && (
                    <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                      <p className="text-xs text-primary mb-1">贷款建议</p>
                      <p className="text-xs text-foreground leading-relaxed">{item.extracted.suggestions}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ 提取结果卡片（单张模式复用） ============
function ExtractResultCard({ data, rawAnswer, showRaw, onToggleRaw, onImport }: {
  data: ExtractedData; rawAnswer: string; showRaw: boolean; onToggleRaw: () => void; onImport: () => void;
}) {
  if (data.error) {
    return (
      <div className="glass-card rounded-xl p-5 border-amber-500/20">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-semibold text-amber-400">识别异常</h3>
        </div>
        <p className="text-sm text-muted-foreground">{data.error}</p>
        {data.summary && (<div className="mt-3 p-3 bg-muted/30 rounded-lg"><p className="text-xs text-muted-foreground">{data.summary}</p></div>)}
      </div>
    );
  }

  return (
    <>
      {/* 风险等级 & 客户等级 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">风险等级</p>
          <p className={`text-lg font-bold ${getRiskColor(data.riskLevel)}`}>{data.riskLevel ?? "未知"}</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">客户等级</p>
          <span className={`inline-block px-3 py-1 rounded-full text-lg font-bold border ${getGradeColor(data.customerGrade)}`}>{data.customerGrade ?? "-"}</span>
        </div>
      </div>
      {/* 基本信息 */}
      <div className="glass-card rounded-xl p-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2"><User className="w-3.5 h-3.5" />客户基本信息</h4>
        <div className="grid grid-cols-2 gap-3">
          <InfoItem label="客户姓名" value={data.customerName} />
          <InfoItem label="手机号码" value={data.customerPhone} />
          <InfoItem label="身份证号" value={data.customerIdCard} />
          <InfoItem label="信用评分" value={data.creditScore?.toString()} highlight />
        </div>
      </div>
      {/* 财务信息 */}
      <div className="glass-card rounded-xl p-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2"><DollarSign className="w-3.5 h-3.5" />财务信息</h4>
        <div className="grid grid-cols-2 gap-3">
          <InfoItem label="月收入" value={data.monthlyIncome ? `¥${Number(data.monthlyIncome).toLocaleString()}` : null} />
          <InfoItem label="总负债" value={data.totalDebt ? `¥${Number(data.totalDebt).toLocaleString()}` : null} />
        </div>
      </div>
      {/* 信用记录 */}
      <div className="glass-card rounded-xl p-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2"><CreditCard className="w-3.5 h-3.5" />信用记录</h4>
        <div className="grid grid-cols-3 gap-3">
          <StatItem label="贷款笔数" value={data.loanCount ?? 0} />
          <StatItem label="信用卡数" value={data.creditCardCount ?? 0} />
          <StatItem label="近期查询" value={data.queryCount ?? 0} />
        </div>
      </div>
      {/* 逾期信息 */}
      <div className="glass-card rounded-xl p-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2"><TrendingDown className="w-3.5 h-3.5" />逾期信息</h4>
        <div className="grid grid-cols-3 gap-3">
          <StatItem label="是否逾期" value={data.hasOverdue ? "是" : "否"} color={data.hasOverdue ? "text-red-400" : "text-emerald-400"} />
          <StatItem label="逾期次数" value={data.overdueCount ?? 0} color={data.overdueCount ? "text-red-400" : undefined} />
          <StatItem label="逾期金额" value={data.overdueAmount ? `¥${Number(data.overdueAmount).toLocaleString()}` : "¥0"} />
        </div>
      </div>
      {/* 综合评价 */}
      {data.summary && (<div className="glass-card rounded-xl p-4"><h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">综合评价</h4><p className="text-sm text-foreground leading-relaxed">{data.summary}</p></div>)}
      {/* 贷款建议 */}
      {data.suggestions && (<div className="glass-card rounded-xl p-4 border-primary/20"><h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">贷款建议</h4><p className="text-sm text-foreground leading-relaxed">{data.suggestions}</p></div>)}
      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button onClick={onImport} className="flex-1"><ArrowRight className="w-4 h-4 mr-2" />一键导入征信系统</Button>
        <Button variant="outline" onClick={onToggleRaw}><Eye className="w-4 h-4 mr-1" />{showRaw ? "隐藏" : "原始"}数据</Button>
      </div>
      {/* 原始数据 */}
      {showRaw && rawAnswer && (
        <div className="glass-card rounded-xl p-4">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">AI 原始返回</h4>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all bg-muted/30 rounded-lg p-3 max-h-48 overflow-y-auto">{rawAnswer}</pre>
        </div>
      )}
    </>
  );
}

// ============ 辅助组件 & 工具函数 ============
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

function getRiskColor(level: string | null | undefined) {
  if (!level) return "text-muted-foreground";
  if (level.includes("低")) return "text-emerald-400";
  if (level.includes("中")) return "text-amber-400";
  return "text-red-400";
}

function getGradeColor(grade: string | null | undefined) {
  switch (grade) {
    case "A": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    case "B": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    case "C": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "D": return "text-red-400 bg-red-500/10 border-red-500/20";
    default: return "text-muted-foreground bg-muted/10 border-border";
  }
}
