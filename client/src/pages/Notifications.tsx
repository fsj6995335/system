import { trpc } from "@/lib/trpc";
import { formatDateTime } from "@/lib/loanUtils";
import { Bell, BellOff, Check, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Notifications() {
  const { data: notifications, isLoading, refetch } = trpc.notifications.list.useQuery();
  const utils = trpc.useUtils();

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      refetch();
      utils.notifications.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      refetch();
      utils.notifications.list.invalidate();
      toast.success("已全部标记为已读");
    },
  });

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">消息通知</h1>
          <p className="page-subtitle">
            {unreadCount > 0 ? `${unreadCount} 条未读消息` : "所有消息已读"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
          >
            {markAllReadMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            全部已读
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="glass-card rounded-xl elegant-shadow overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-5 flex gap-4">
                <div className="skeleton w-9 h-9 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 rounded w-48" />
                  <div className="skeleton h-3 rounded w-full" />
                  <div className="skeleton h-3 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : !notifications?.length ? (
          <div className="py-20 text-center">
            <BellOff className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">暂无通知</h3>
            <p className="text-xs text-muted-foreground">当有新的贷款动态时，您将在此收到通知</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-5 flex gap-4 transition-colors ${!notification.isRead ? "bg-primary/5" : "hover:bg-muted/20"}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${!notification.isRead ? "bg-primary/10" : "bg-muted/30"}`}>
                  <Bell className={`w-4 h-4 ${!notification.isRead ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-medium ${!notification.isRead ? "text-foreground" : "text-foreground/70"}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.content}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1.5">
                        {formatDateTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <button
                        onClick={() => markReadMutation.mutate({ id: notification.id })}
                        disabled={markReadMutation.isPending}
                        className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="标记为已读"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {!notification.isRead && (
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
