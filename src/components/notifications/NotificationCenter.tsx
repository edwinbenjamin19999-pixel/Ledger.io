import { useState } from "react";
import { Bell, X, CheckCheck, AlertTriangle, AlertCircle, Info, FileText, Wallet, Receipt, Sparkles, Clock, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, type AppNotification, type NotifCategory } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const CATEGORY_ICON: Record<NotifCategory, any> = {
  vat_due: Receipt,
  invoice_overdue: AlertTriangle,
  bank_disconnected: Wallet,
  journal_failed: AlertCircle,
  ai_low_confidence: Sparkles,
  supplier_invoice_attest: FileText,
  payroll_upcoming: Clock,
  period_close_ready: FileCheck,
  ai_batch_summary: Sparkles,
  ai_insight: Sparkles,
  report_ready: FileText,
};

function groupBucket(ts: string): "today" | "yesterday" | "week" {
  const d = new Date(ts);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  const w = new Date(today);
  w.setDate(w.getDate() - 7);
  if (d >= today) return "today";
  if (d >= y) return "yesterday";
  return "week";
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { items, unreadCount, isRead, markRead, markAllRead, dismiss, refresh } = useNotifications();

  const groups: Record<string, AppNotification[]> = { today: [], yesterday: [], week: [] };
  items.forEach((n) => groups[groupBucket(n.timestamp)].push(n));

  const handleAction = (n: AppNotification) => {
    markRead(n.id);
    setOpen(false);
    if (n.path) navigate(n.path);
  };

  const renderGroup = (label: string, list: AppNotification[]) => {
    if (!list.length) return null;
    return (
      <div key={label}>
        <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/30 sticky top-0">
          {label}
        </div>
        <div className="divide-y">
          {list.map((n) => {
            const Icon = CATEGORY_ICON[n.category] ?? Info;
            const read = isRead(n.id);
            return (
              <div
                key={n.id}
                className={cn(
                  "p-3 flex items-start gap-3 group",
                  !read && "bg-primary/5",
                  n.priority === "urgent" && !read && "bg-destructive/5",
                )}
              >
                <div className="mt-0.5 shrink-0">
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      n.priority === "urgent" && "text-destructive",
                      n.priority === "important" && "text-primary",
                      n.priority === "info" && "text-muted-foreground",
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm truncate", !read && "font-semibold")}>{n.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.timestamp).toLocaleString("sv-SE", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {n.actionLabel && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAction(n)}>
                        {n.actionLabel}
                      </Button>
                    )}
                    {!read && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => markRead(n.id)}>
                        Markera som läst
                      </Button>
                    )}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100"
                  onClick={() => dismiss(n.id)}
                  aria-label="Dölj notifikation"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (v) refresh(); }}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifikationer">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle>Notifikationer</SheetTitle>
            {items.length > 0 && unreadCount > 0 && (
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={markAllRead}>
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Markera alla som lästa
              </Button>
            )}
          </div>
        </SheetHeader>
        <ScrollArea className="flex-1">
          {items.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Inga notifikationer just nu
            </div>
          ) : (
            <>
              {renderGroup("Idag", groups.today)}
              {renderGroup("Igår", groups.yesterday)}
              {renderGroup("Tidigare denna vecka", groups.week)}
            </>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
