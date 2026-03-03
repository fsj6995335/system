import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getEffectiveRole, hasPermission } from "../../../shared/permissions";
import { Settings as SettingsIcon, Shield, Database, Bell, Info, ShieldAlert } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const role = useMemo(() => getEffectiveRole(user as any), [user]);
  const canAccess = hasPermission(role, "system_settings");

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">权限不足</h2>
        <p className="text-muted-foreground">系统设置仅对管理员开放</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">系统设置</h1>
        <p className="page-subtitle">管理系统配置和参数</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-blue-400" /></div>
            <div><h3 className="text-sm font-semibold text-foreground">安全设置</h3><p className="text-xs text-muted-foreground">认证和权限配置</p></div>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between p-3 rounded-lg bg-muted/20"><span className="text-muted-foreground">认证方式</span><span className="text-foreground">Manus OAuth</span></div>
            <div className="flex justify-between p-3 rounded-lg bg-muted/20"><span className="text-muted-foreground">权限体系</span><span className="text-foreground">6角色RBAC</span></div>
            <div className="flex justify-between p-3 rounded-lg bg-muted/20"><span className="text-muted-foreground">会话有效期</span><span className="text-foreground">7天</span></div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Database className="w-5 h-5 text-emerald-400" /></div>
            <div><h3 className="text-sm font-semibold text-foreground">数据库信息</h3><p className="text-xs text-muted-foreground">数据存储状态</p></div>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between p-3 rounded-lg bg-muted/20"><span className="text-muted-foreground">数据库类型</span><span className="text-foreground">MySQL / TiDB</span></div>
            <div className="flex justify-between p-3 rounded-lg bg-muted/20"><span className="text-muted-foreground">数据表数量</span><span className="text-foreground">11 张</span></div>
            <div className="flex justify-between p-3 rounded-lg bg-muted/20"><span className="text-muted-foreground">文件存储</span><span className="text-foreground">AWS S3</span></div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center"><Info className="w-5 h-5 text-purple-400" /></div>
            <div><h3 className="text-sm font-semibold text-foreground">AI服务配置</h3><p className="text-xs text-muted-foreground">豆包API集成状态</p></div>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between p-3 rounded-lg bg-muted/20"><span className="text-muted-foreground">图文生成模型</span><span className="text-foreground">doubao-seed-2-0-pro-260215</span></div>
            <div className="flex justify-between p-3 rounded-lg bg-muted/20"><span className="text-muted-foreground">对话分析模型</span><span className="text-foreground">doubao-seed-2-0-pro-260215</span></div>
            <div className="flex justify-between p-3 rounded-lg bg-muted/20"><span className="text-muted-foreground">API状态</span><span className="text-emerald-400">已配置</span></div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><Bell className="w-5 h-5 text-amber-400" /></div>
            <div><h3 className="text-sm font-semibold text-foreground">通知设置</h3><p className="text-xs text-muted-foreground">系统通知配置</p></div>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between p-3 rounded-lg bg-muted/20"><span className="text-muted-foreground">通知方式</span><span className="text-foreground">站内通知</span></div>
            <div className="flex justify-between p-3 rounded-lg bg-muted/20"><span className="text-muted-foreground">自动通知</span><span className="text-foreground">审批结果通知</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
