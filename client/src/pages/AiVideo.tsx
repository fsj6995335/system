import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  FileText, Loader2, Copy, Check, Clock, CheckCircle, AlertCircle, RefreshCw,
  Sparkles, Tag, Target, Megaphone, Share2, ShoppingBag, Palette, PenTool,
} from "lucide-react";
import { toast } from "sonner";

type ArticleType = "marketing" | "wechat" | "product" | "poster" | "custom";

interface ArticleContent {
  title: string;
  subtitle: string;
  content: string;
  highlights: string[];
  callToAction: string;
  tags: string[];
  imagePrompt: string;
  targetAudience: string;
  platform: string;
}

const ARTICLE_TYPES: { value: ArticleType; label: string; icon: any; desc: string }[] = [
  { value: "marketing", label: "营销推广", icon: Megaphone, desc: "贷款营销推广图文" },
  { value: "wechat", label: "朋友圈", icon: Share2, desc: "朋友圈/微信推广" },
  { value: "product", label: "产品介绍", icon: ShoppingBag, desc: "银行产品详细介绍" },
  { value: "poster", label: "活动海报", icon: Palette, desc: "活动海报文案" },
  { value: "custom", label: "自定义", icon: PenTool, desc: "自由输入需求" },
];

const TEMPLATES: Record<ArticleType, { label: string; prompt: string }[]> = {
  marketing: [
    { label: "低利率经营贷", prompt: "生成一篇关于低利率经营贷的营销图文，利率低至3.85%，额度最高500万，适合中小企业主" },
    { label: "快速审批信用贷", prompt: "生成一篇信用贷款营销图文，突出审批快（最快当天放款）、纯信用无抵押、线上申请便捷" },
    { label: "房产抵押贷优势", prompt: "生成一篇房产抵押贷营销图文，突出额度高、利率低、期限长的优势" },
  ],
  wechat: [
    { label: "朋友圈日常推广", prompt: "写一条适合发朋友圈的贷款推广文案，简短有吸引力，带有emoji，突出低利率和快速放款" },
    { label: "成功案例分享", prompt: "写一条朋友圈文案，分享一个客户成功贷款200万经营贷的案例，突出服务专业、效率高" },
    { label: "节日营销活动", prompt: "写一条朋友圈文案，推广春季贷款优惠活动，利率限时优惠，名额有限" },
  ],
  product: [
    { label: "工行经营贷", prompt: "详细介绍中国工商银行经营贷产品，包含申请条件、利率范围、额度、期限、所需材料等" },
    { label: "建行信用贷", prompt: "详细介绍中国建设银行信用贷产品，突出纯信用、无抵押、线上申请的特点" },
    { label: "农行抵押贷", prompt: "详细介绍中国农业银行抵押贷产品，突出额度高、利率低、审批快的优势" },
  ],
  poster: [
    { label: "贷款咨询日", prompt: "设计一个'免费贷款咨询日'活动的海报文案，包含活动时间、地点、优惠内容" },
    { label: "新客户优惠", prompt: "设计一个新客户首贷优惠活动的海报文案，首次申请利率优惠0.5%，限时30天" },
    { label: "企业融资峰会", prompt: "设计一个中小企业融资对接峰会的海报文案，邀请多家银行参与" },
  ],
  custom: [
    { label: "客户回访话术", prompt: "帮我写一段贷款放款后的客户回访话术，体现专业和关怀" },
    { label: "短信通知模板", prompt: "帮我写几条贷款业务相关的短信通知模板，包含审批通过、放款成功、还款提醒" },
    { label: "竞品对比分析", prompt: "帮我写一篇各大银行经营贷产品对比分析图文，从利率、额度、审批速度等维度对比" },
  ],
};

function parseArticleContent(raw: string): ArticleContent | null {
  try {
    // 尝试提取 JSON（可能被 markdown 代码块包裹）
    let jsonStr = raw;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    // 也尝试直接匹配 { ... }
    const braceMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (braceMatch) jsonStr = braceMatch[0];
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function ArticlePreview({ content, raw }: { content: ArticleContent | null; raw: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = () => {
    let text = "";
    if (content) {
      text = `${content.title}\n${content.subtitle}\n\n${content.content}\n\n`;
      if (content.highlights?.length) text += `亮点：${content.highlights.join(" | ")}\n\n`;
      if (content.callToAction) text += `${content.callToAction}\n\n`;
      if (content.tags?.length) text += content.tags.map(t => `#${t}`).join(" ");
    } else {
      text = raw;
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("图文内容已复制到剪贴板");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!content) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-foreground">生成结果</h4>
          <Button variant="outline" size="sm" onClick={handleCopyAll} className="gap-1 text-xs">
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? "已复制" : "复制全文"}
          </Button>
        </div>
        <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-sm text-foreground/80">{raw}</div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 p-6 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground mb-1">{content.title}</h2>
            <p className="text-sm text-muted-foreground">{content.subtitle}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleCopyAll} className="gap-1 text-xs flex-shrink-0 ml-4">
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? "已复制" : "一键复制"}
          </Button>
        </div>
        {content.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {content.tags.map((tag, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                <Tag className="w-3 h-3" />#{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="p-6 space-y-4">
        <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{content.content}</div>

        {/* Highlights */}
        {content.highlights?.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {content.highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-xs text-foreground">{h}</span>
              </div>
            ))}
          </div>
        )}

        {/* Call to Action */}
        {content.callToAction && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/10">
            <Target className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="text-sm font-medium text-foreground">{content.callToAction}</span>
          </div>
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap gap-4 pt-2 border-t border-border text-xs text-muted-foreground">
          {content.targetAudience && <span>目标受众：{content.targetAudience}</span>}
          {content.platform && <span>推荐平台：{content.platform}</span>}
        </div>
      </div>
    </div>
  );
}

export default function AiVideo() {
  const [articleType, setArticleType] = useState<ArticleType>("marketing");
  const [prompt, setPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);

  const { data: tasks, refetch: refetchTasks } = trpc.aiVideo.list.useQuery();

  const createMutation = trpc.aiVideo.create.useMutation({
    onSuccess: (data) => {
      setGeneratedContent((data as any).content || null);
      toast.success("图文生成完成！");
      refetchTasks();
    },
    onError: (err) => toast.error(`生成失败：${err.message}`),
  });

  const handleSubmit = async () => {
    if (!prompt.trim()) { toast.error("请输入图文需求"); return; }
    setGeneratedContent(null);
    createMutation.mutate({ prompt, type: articleType });
  };

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "等待中", color: "text-yellow-400", icon: Clock },
    processing: { label: "生成中", color: "text-blue-400", icon: Loader2 },
    completed: { label: "已完成", color: "text-emerald-400", icon: CheckCircle },
    failed: { label: "失败", color: "text-red-400", icon: AlertCircle },
  };

  const parsedContent = generatedContent ? parseArticleContent(generatedContent) : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
          <FileText className="w-5 h-5 text-pink-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">AI 图文工作室</h1>
          <p className="text-xs text-muted-foreground">一键生成专业贷款营销图文</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Create Form */}
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">创建图文</h3>
            </div>

            {/* Article Type Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground/80">图文类型</label>
              <div className="grid grid-cols-5 gap-2">
                {ARTICLE_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => { setArticleType(value); setPrompt(""); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                      articleType === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Templates */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground/80">快捷模板</label>
              <div className="space-y-1.5">
                {TEMPLATES[articleType].map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(t.prompt)}
                    className={`w-full text-left text-xs p-3 rounded-lg border transition-all ${
                      prompt === t.prompt
                        ? "border-primary/50 bg-primary/5 text-foreground"
                        : "border-transparent hover:border-border hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="font-medium text-foreground">{t.label}</span>
                    <span className="block mt-0.5 line-clamp-1 opacity-70">{t.prompt}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Prompt */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground/80">图文需求描述 *</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="描述您想要生成的图文内容，如：产品特点、目标客户、营销重点等..."
                className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all resize-none"
              />
            </div>

            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="w-full gap-2">
              {createMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />图文生成中...</>
              ) : (
                <><Sparkles className="w-4 h-4" />一键生成图文</>
              )}
            </Button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="space-y-4">
          {generatedContent ? (
            <ArticlePreview content={parsedContent} raw={generatedContent} />
          ) : (
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">功能说明</h3>
              <div className="space-y-3">
                {[
                  { label: "支持类型", value: "营销推广、朋友圈、产品介绍、活动海报" },
                  { label: "生成内容", value: "标题、正文、亮点、标签、行动号召" },
                  { label: "一键复制", value: "生成后可一键复制到剪贴板" },
                  { label: "历史记录", value: "所有生成记录自动保存" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task History */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">生成历史</h3>
          <Button variant="outline" size="sm" onClick={() => refetchTasks()} className="gap-1 text-xs">
            <RefreshCw className="w-3 h-3" />刷新
          </Button>
        </div>
        <div className="divide-y divide-border">
          {!tasks?.length ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">暂无生成记录</p>
              <p className="text-xs mt-1">选择模板或输入需求，一键生成专业图文</p>
            </div>
          ) : (
            tasks.map((task: any) => {
              const config = statusConfig[task.status] ?? statusConfig.pending;
              const Icon = config.icon;
              const articleData = task.status === "completed" && task.videoUrl ? parseArticleContent(task.videoUrl) : null;
              return (
                <div key={task.id} className="px-6 py-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${task.status === "completed" ? "bg-emerald-500/10" : task.status === "failed" ? "bg-red-500/10" : "bg-muted/30"}`}>
                      <Icon className={`w-4 h-4 ${config.color} ${task.status === "processing" ? "animate-spin" : ""}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground line-clamp-2">{task.prompt}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                        <span className="text-xs text-muted-foreground">{new Date(task.createdAt).toLocaleString()}</span>
                      </div>
                      {task.status === "completed" && articleData && (
                        <div className="mt-3 p-3 rounded-lg bg-muted/20 border border-border">
                          <p className="text-sm font-medium text-foreground">{articleData.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{articleData.subtitle}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {articleData.tags?.map((tag: string, i: number) => (
                              <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">#{tag}</span>
                            ))}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-xs gap-1"
                            onClick={() => setGeneratedContent(task.videoUrl)}
                          >
                            <FileText className="w-3 h-3" />查看完整图文
                          </Button>
                        </div>
                      )}
                      {task.status === "completed" && !articleData && task.videoUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-xs gap-1"
                          onClick={() => setGeneratedContent(task.videoUrl)}
                        >
                          <FileText className="w-3 h-3" />查看内容
                        </Button>
                      )}
                      {task.status === "failed" && task.errorMessage && (
                        <p className="text-xs text-red-400 mt-1">{task.errorMessage}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
