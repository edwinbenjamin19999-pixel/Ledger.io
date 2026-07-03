import { useState, useEffect } from "react";
import { X, AlertTriangle, AlertCircle, Receipt, Wallet, FileText, Sparkles, Clock, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications, type NotifCategory } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const ICON: Record<NotifCategory, any> = {
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

const SESSION_KEY = "notif:bannerDismissed";

export function NotificationBanner() {
  const { topBanner } = useNotifications();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    try {
      setDismissed(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "[]"));
    } catch {
      setDismissed([]);
    }
  }, []);

  if (!topBanner) return null;
  if (topBanner.priority === "info") return null;
  if (dismissed.includes(topBanner.id)) return null;

  const Icon = ICON[topBanner.category] ?? AlertCircle;
  const isUrgent = topBanner.priority === "urgent";

  const handleDismiss = () => {
    const next = [...dismissed, topBanner.id];
    setDismissed(next);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        isUrgent
          ? "bg-destructive/5 border-destructive/30"
          : "bg-primary/5 border-primary/30",
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", isUrgent ? "text-destructive" : "text-primary")} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{topBanner.title}</p>
        <p className="text-xs text-muted-foreground truncate">{topBanner.body}</p>
      </div>
      {topBanner.path && (
        <Button
          size="sm"
          variant={isUrgent ? "destructive" : "default"}
          onClick={() => navigate(topBanner.path!)}
        >
          {topBanner.actionLabel ?? "Öppna"}
        </Button>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        onClick={handleDismiss}
        aria-label="Dölj banner"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
