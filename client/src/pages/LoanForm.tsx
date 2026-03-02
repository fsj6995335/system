import { trpc } from "@/lib/trpc";
import { LOAN_TYPE_MAP } from "@/lib/loanUtils";
import { AlertCircle, ArrowLeft, CheckCircle, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

export default function LoanForm() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    amount: "",
    purpose: "",
    loanType: "personal" as "personal" | "business" | "mortgage" | "education" | "emergency",
    termMonths: 12,
    collateral: "",
    monthlyIncome: "",
    employmentStatus: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const createMutation = trpc.loans.create.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => navigate("/loans"), 2000);
    },
    onError: (err) => {
      setErrors({ submit: err.message });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      newErrors.amount = "请输入有效的贷款金额";
    }
    if (!form.purpose.trim()) newErrors.purpose = "请填写贷款用途";
    if (form.termMonths < 1 || form.termMonths > 360) newErrors.termMonths = "贷款期限应在1-360个月之间";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    createMutation.mutate({
      ...form,
      amount: parseFloat(form.amount).toFixed(2),
      monthlyIncome: form.monthlyIncome ? parseFloat(form.monthlyIncome).toFixed(2) : undefined,
    });
  };

  const InputField = ({
    label, name, type = "text", placeholder, required, value, onChange, error, hint,
  }: {
    label: string; name: string; type?: string; placeholder?: string;
    required?: boolean; value: string; onChange: (v: string) => void;
    error?: string; hint?: string;
  }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground/80">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2.5 bg-input border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all ${error ? "border-destructive focus:border-destructive" : "border-border focus:border-primary/50"}`}
      />
      {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <h2 className="text-xl font-bold text-foreground">申请提交成功！</h2>
        <p className="text-muted-foreground text-sm">您的贷款申请已提交，正在等待审核。</p>
        <p className="text-xs text-muted-foreground">即将跳转到申请列表...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/loans">
          <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="page-title">新建贷款申请</h1>
          <p className="page-subtitle">填写完整信息以提交贷款申请</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="glass-card rounded-xl p-6 elegant-shadow space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">基本信息</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="贷款金额（元）" name="amount" type="number" placeholder="请输入金额"
              required value={form.amount} onChange={(v) => setForm({ ...form, amount: v })}
              error={errors.amount} hint="最小单位：元"
            />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">贷款类型 <span className="text-destructive">*</span></label>
              <select
                value={form.loanType}
                onChange={(e) => setForm({ ...form, loanType: e.target.value as any })}
                className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-all"
              >
                {Object.entries(LOAN_TYPE_MAP).map(([key, val]) => (
                  <option key={key} value={key}>{val}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">贷款用途 <span className="text-destructive">*</span></label>
            <textarea
              placeholder="请详细描述贷款用途..."
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              rows={3}
              className={`w-full px-3 py-2.5 bg-input border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all resize-none ${errors.purpose ? "border-destructive" : "border-border focus:border-primary/50"}`}
            />
            {errors.purpose && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.purpose}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">贷款期限（月）<span className="text-destructive">*</span></label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={1} max={360} step={1}
                value={form.termMonths}
                onChange={(e) => setForm({ ...form, termMonths: parseInt(e.target.value) })}
                className="flex-1 accent-primary"
              />
              <span className="text-sm font-semibold text-primary w-16 text-right">{form.termMonths} 个月</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1个月</span>
              <span>1年</span>
              <span>5年</span>
              <span>10年</span>
              <span>30年</span>
            </div>
            {errors.termMonths && <p className="text-xs text-destructive">{errors.termMonths}</p>}
          </div>
        </div>

        {/* Financial Info */}
        <div className="glass-card rounded-xl p-6 elegant-shadow space-y-5">
          <h3 className="text-sm font-semibold text-foreground">财务信息（选填）</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="月收入（元）" name="monthlyIncome" type="number" placeholder="请输入月收入"
              value={form.monthlyIncome} onChange={(v) => setForm({ ...form, monthlyIncome: v })}
            />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">就业状态</label>
              <select
                value={form.employmentStatus}
                onChange={(e) => setForm({ ...form, employmentStatus: e.target.value })}
                className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-all"
              >
                <option value="">请选择</option>
                <option value="employed">在职</option>
                <option value="self_employed">自雇</option>
                <option value="unemployed">待业</option>
                <option value="retired">退休</option>
                <option value="student">学生</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">抵押物说明</label>
            <input
              type="text" placeholder="如有抵押物，请描述..."
              value={form.collateral}
              onChange={(e) => setForm({ ...form, collateral: e.target.value })}
              className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">备注</label>
            <textarea
              placeholder="其他需要说明的信息..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-all resize-none"
            />
          </div>
        </div>

        {errors.submit && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{errors.submit}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Link href="/loans" className="flex-1">
            <button type="button" className="w-full px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all">
              取消
            </button>
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-all elegant-shadow"
          >
            {createMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" />提交中...</>
            ) : (
              <><FileText className="w-4 h-4" />提交申请</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
