import { trpc } from "@/lib/trpc";
import { formatDateTime } from "@/lib/loanUtils";
import { Shield, User, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";

export default function Users() {
  const { data: users, isLoading, refetch } = trpc.users.list.useQuery();

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("角色更新成功");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleRoleChange = (userId: number, role: "user" | "admin") => {
    if (window.confirm(`确认将该用户角色更改为 ${role === "admin" ? "管理员" : "普通用户"}？`)) {
      updateRoleMutation.mutate({ userId, role });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <UsersIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="page-title">用户管理</h1>
          <p className="page-subtitle">管理系统用户和权限</p>
        </div>
        <span className="ml-auto text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full">
          共 {users?.length ?? 0} 个用户
        </span>
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-xl elegant-shadow overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>登录方式</th>
              <th>注册时间</th>
              <th>最后登录</th>
              <th className="text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j}><div className="skeleton h-4 rounded w-20" /></td>
                  ))}
                </tr>
              ))
            ) : !users?.length ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">暂无用户</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {user.name?.charAt(0)?.toUpperCase() ?? "U"}
                        </span>
                      </div>
                      <span className="font-medium text-foreground text-sm">{user.name ?? "未设置"}</span>
                    </div>
                  </td>
                  <td className="text-muted-foreground text-xs">{user.email ?? "-"}</td>
                  <td>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${user.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground"}`}>
                      {user.role === "admin" ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {user.role === "admin" ? "管理员" : "普通用户"}
                    </span>
                  </td>
                  <td className="text-muted-foreground text-xs">{user.loginMethod ?? "-"}</td>
                  <td className="text-muted-foreground text-xs">{formatDateTime(user.createdAt)}</td>
                  <td className="text-muted-foreground text-xs">{formatDateTime(user.lastSignedIn)}</td>
                  <td className="text-right">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as "user" | "admin")}
                      disabled={updateRoleMutation.isPending}
                      className="bg-input border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
                    >
                      <option value="user">普通用户</option>
                      <option value="admin">管理员</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
