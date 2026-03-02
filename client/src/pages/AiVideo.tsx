import { trpc } from "@/lib/trpc";
import { formatDateTime } from "@/lib/loanUtils";
import {
  AlertCircle, CheckCircle, Clock, Download, Film, Loader2, Plus, Upload, Video, X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function AiVideo() {
  const [prompt, setPrompt] = useState("无人机以极快速度穿越复杂障碍或自然奇观，带来沉浸式飞行体验 --duration 5 --camerafixed false");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<number | null>(null);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: tasks, refetch: refetchTasks } = trpc.aiVideo.list.useQuery();

  const createMutation = trpc.aiVideo.create.useMutation({
    onSuccess: (data) => {
      setCurrentTaskId(data.taskDbId);
      setPollingEnabled(true);
      toast.success("视频生成任务已创建，正在处理中...");
      refetchTasks();
    },
    onError: (err) => toast.error(`创建失败：${err.message}`),
  });

  const { data: pollData, refetch: pollRefetch } = trpc.aiVideo.poll.useQuery(
    { taskDbId: currentTaskId! },
    {
      enabled: pollingEnabled && !!currentTaskId,
      refetchInterval: pollingEnabled ? 5000 : false,
    }
  );

  useEffect(() => {
    if (pollData?.status === "completed" || pollData?.status === "failed") {
      setPollingEnabled(false);
      refetchTasks();
      if (pollData.status === "completed") {
        toast.success("视频生成完成！");
      } else {
        toast.error("视频生成失败");
      }
    }
  }, [pollData?.status]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("图片大小不能超过10MB");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast.error("请输入视频描述");
      return;
    }

    let finalImageUrl = imageUrl;

    if (imageFile) {
      setUploading(true);
      try {
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const key = `ai-video-images/${Date.now()}-${imageFile.name}`;
        const response = await fetch("/api/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, contentType: imageFile.type, dataUrl: imagePreview }),
        });
        if (response.ok) {
          const data = await response.json();
          finalImageUrl = data.url;
        }
      } catch (err) {
        toast.error("图片上传失败，将使用URL方式");
      } finally {
        setUploading(false);
      }
    }

    createMutation.mutate({ prompt, imageUrl: finalImageUrl || undefined });
  };

  const statusConfig = {
    pending: { label: "等待中", color: "text-muted-foreground", icon: Clock },
    processing: { label: "生成中", color: "text-warning", icon: Loader2 },
    completed: { label: "已完成", color: "text-success", icon: CheckCircle },
    failed: { label: "失败", color: "text-destructive", icon: AlertCircle },
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title">AI视频生成</h1>
        <p className="page-subtitle">使用豆包Seedance模型，将图片和描述转化为精彩视频</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Create Form */}
        <div className="glass-card rounded-xl p-6 elegant-shadow space-y-5">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">创建新视频</h3>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground/80">参考图片（选填）</label>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={imagePreview} alt="预览" className="w-full h-40 object-cover" />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(""); setImageUrl(""); }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <Upload className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">点击上传图片</p>
                <p className="text-xs text-muted-foreground/60 mt-1">支持 JPG、PNG，最大10MB</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">或</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <input
              type="url"
              placeholder="输入图片URL..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-all"
            />
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground/80">视频描述 <span className="text-destructive">*</span></label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="描述您想要生成的视频内容，可以加入参数如 --duration 5 --camerafixed false"
              className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-all resize-none"
            />
            <p className="text-xs text-muted-foreground">
              支持参数：<code className="bg-muted/50 px-1 rounded">--duration 5</code>（时长）、
              <code className="bg-muted/50 px-1 rounded">--camerafixed false</code>（镜头运动）
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending || uploading || pollingEnabled}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-all elegant-shadow"
          >
            {createMutation.isPending || uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{uploading ? "上传图片中..." : "创建任务中..."}</>
            ) : pollingEnabled ? (
              <><Loader2 className="w-4 h-4 animate-spin" />视频生成中，请等待...</>
            ) : (
              <><Film className="w-4 h-4" />开始生成视频</>
            )}
          </button>

          {/* Current Task Status */}
          {pollingEnabled && pollData && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-warning/10 border border-warning/20">
              <Loader2 className="w-4 h-4 text-warning animate-spin flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-warning">视频生成中...</p>
                <p className="text-xs text-muted-foreground">通常需要1-3分钟，请耐心等待</p>
              </div>
            </div>
          )}
        </div>

        {/* Model Info */}
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-6 elegant-shadow">
            <h3 className="text-sm font-semibold text-foreground mb-4">模型信息</h3>
            <div className="space-y-3">
              {[
                { label: "模型", value: "doubao-seedance-1-5-pro" },
                { label: "最大时长", value: "5秒" },
                { label: "分辨率", value: "1080P" },
                { label: "支持功能", value: "图生视频、文生视频" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-xl p-6 elegant-shadow">
            <h3 className="text-sm font-semibold text-foreground mb-3">提示词示例</h3>
            <div className="space-y-2">
              {[
                "专业的贷款顾问在现代办公室与客户交谈 --duration 5",
                "城市金融中心的航拍镜头，展现繁荣的商业景象 --duration 5 --camerafixed false",
                "数字化金融数据流动的科技感视觉效果 --duration 5",
              ].map((example, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(example)}
                  className="w-full text-left text-xs text-muted-foreground hover:text-foreground p-2.5 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-border"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Task History */}
      <div className="glass-card rounded-xl elegant-shadow">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">生成历史</h3>
        </div>
        <div className="divide-y divide-border">
          {!tasks?.length ? (
            <div className="py-12 text-center text-muted-foreground">
              <Film className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">暂无生成记录</p>
            </div>
          ) : (
            tasks.map((task) => {
              const config = statusConfig[task.status] ?? statusConfig.pending;
              const Icon = config.icon;
              return (
                <div key={task.id} className="px-6 py-4 flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${task.status === "completed" ? "bg-success/10" : task.status === "failed" ? "bg-destructive/10" : "bg-muted/30"}`}>
                    <Icon className={`w-4 h-4 ${config.color} ${task.status === "processing" ? "animate-spin" : ""}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground line-clamp-2">{task.prompt}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(task.createdAt)}</span>
                    </div>
                    {task.status === "completed" && task.videoUrl && (
                      <div className="mt-3 space-y-2">
                        <video
                          src={task.videoUrl}
                          controls
                          className="w-full max-w-sm rounded-lg"
                          style={{ maxHeight: "200px" }}
                        />
                        <a
                          href={task.videoUrl}
                          download
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          下载视频
                        </a>
                      </div>
                    )}
                    {task.status === "failed" && task.errorMessage && (
                      <p className="text-xs text-destructive mt-1">{task.errorMessage}</p>
                    )}
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
