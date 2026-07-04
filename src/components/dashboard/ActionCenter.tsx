import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, X, Bell, BellOff,
  Wallet, FileText, Calculator, Users, TrendingDown,
  BarChart3, BookOpen, Landmark, Loader2, ChevronDown, ChevronUp
} from "lucide-react";

interface ThresholdWarning { kpiLabel: string;
  value: number;
  threshold: number;
  direction: 'below' | 'above';
  type: 'yellow' | 'red';
  suffix: string;
  navigateTo?: string;
}

interface ActionCenterProps { companyId: string;
  thresholdWarnings?: ThresholdWarning[];
}

interface Alert { id: string;
  title: string;
  message: string;
  severity: string;
  notification_type: string;
  created_at: string;
  is_read: boolean;
}

const CATEGORY_ICONS: Record<string, any> = { "Negativ kassa": Wallet,
  "Låg likviditet": Wallet,
  "Förfallna kundfakturor": FileText,
  "Många förfallna fakturor": FileText,
  "Förfallna leverantörsfakturor": FileText,
  "Leverantörsfakturor förfaller snart": FileText,
  "Momsdeklaration": Calculator,
  "AGI-deadline": Users,
  "F-skatt": Calculator,
  "Ovanlig kostnad": BarChart3,
  "Marginalfall": TrendingDown,
  "Intäktsminskning": TrendingDown,
  "Kostnadsökning": TrendingDown,
  "Väntande verifikationer": BookOpen,
  "Ingen bokföring": BookOpen,
  "Bankavstämning": Landmark,
};

const ACTION_PATHS: Record<string, string> = { "Negativ kassa": "/reports",
  "Låg likviditet": "/cash-flow",
  "Förfallna kundfakturor": "/invoices",
  "Många förfallna fakturor": "/invoices",
  "Förfallna leverantörsfakturor": "/invoices",
  "Leverantörsfakturor förfaller snart": "/invoices",
  "Momsdeklaration": "/vat-reports",
  "AGI-deadline": "/automation",
  "F-skatt": "/tax-rules",
  "Ovanlig kostnad": "/reports",
  "Marginalfall": "/reports",
  "Intäktsminskning": "/reports",
  "Kostnadsökning": "/reports",
  "Väntande verifikationer": "/verifications",
  "Ingen bokföring": "/bookkeep",
  "Bankavstämning": "/bank",
};

export const ActionCenter = ({ companyId, thresholdWarnings = [] }: ActionCenterProps) => { const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadAlerts = useCallback(async () => { try { const { data, error } = await supabase
        .from("bank_notifications")
        .select("*")
        .eq("company_id", companyId)
        .eq("notification_type", "proactive_insight")
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setAlerts(data || []);
    } catch (e) { console.error("Failed to load alerts:", e);
    } finally { setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { loadAlerts();
  }, [loadAlerts]);

  const dismissAlert = async (alertId: string) => { setDismissing(alertId);
    try { await supabase
        .from("bank_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (e) { console.error("Failed to dismiss:", e);
    } finally { setDismissing(null);
    }
  };

  const dismissAll = async () => { try { const ids = alerts.map(a => a.id);
      await supabase
        .from("bank_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in("id", ids);
      setAlerts([]);
    } catch (e) { console.error("Failed to dismiss all:", e);
    }
  };

  const hasThresholdWarnings = thresholdWarnings.length > 0;

  if (loading || (alerts.length === 0 && !hasThresholdWarnings)) return null;

  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const totalAlertCount = alerts.length + thresholdWarnings.length;
  const label = criticalCount > 0
    ? `${criticalCount} akut varning${criticalCount > 1 ? 'ar' : ''}`
    : `${totalAlertCount} aktiv${totalAlertCount > 1 ? 'a' : ''} varning${totalAlertCount > 1 ? 'ar' : ''}`;

  const sortedAlerts = [
    ...alerts.filter(a => a.severity === "critical"),
    ...alerts.filter(a => a.severity === "warning"),
    ...alerts.filter(a => a.severity !== "critical" && a.severity !== "warning"),
  ];

  const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

  const getSeverityStyles = (severity: string) => { switch (severity) { case "critical": return "border-destructive/40 bg-destructive/5";
      case "warning": return "border-orange-400/40 bg-orange-50/50 dark:bg-orange-950/20";
      default: return "border-border bg-accent/30";
    }
  };

  const getSeverityDot = (severity: string) => { switch (severity) { case "critical": return "bg-destructive";
      case "warning": return "bg-orange-500";
      default: return "bg-muted-foreground";
    }
  };

  return (
    <div>
      {/* Compact notification bar */}
        <div
        className="flex items-center justify-between px-4 h-11 rounded-lg cursor-pointer bg-[#FAEEDA] dark:bg-[#FAEEDA] border-b-2 border-amber-500"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[#7A5417] dark:text-[#C28A2B]" />
          <span className="text-sm font-medium text-[#7A5417] dark:text-amber-300">
            {label}
          </span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" style={{ color: '#F97316' }}>
          {expanded ? 'Dölj' : 'Visa detaljer'}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {/* Expandable detail panel */}
      {expanded && (
        <div className="mt-1 rounded-lg border p-3 space-y-2 bg-card shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-end">
            {alerts.length > 1 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={dismissAll}>
                <BellOff className="h-3 w-3 mr-1" /> Stäng alla
              </Button>
            )}
          </div>
          {sortedAlerts.map((alert) => { const IconComponent = CATEGORY_ICONS[alert.title] || AlertTriangle;
            const actionPath = ACTION_PATHS[alert.title] || "/dashboard";
            return (
              <div
                key={alert.id}
                className={`flex flex-col sm:flex-row items-start gap-2 sm:gap-3 p-3 rounded-lg border transition-colors ${getSeverityStyles(alert.severity)}`}
              >
                <div className="flex items-start gap-2 sm:gap-3 min-w-0 w-full">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getSeverityDot(alert.severity)}`} />
                  <IconComponent className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 self-end sm:self-start">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => navigate(actionPath)}>
                    Åtgärda <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                  <Button
                    variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground"
                    onClick={() => dismissAlert(alert.id)}
                    disabled={dismissing === alert.id}
                  >
                    {dismissing === alert.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Threshold-based warnings */}
          {thresholdWarnings.map((tw, idx) => { const dirLabel = tw.direction === 'below' ? 'under' : 'över';
            return (
              <div
                key={`tw-${idx}`}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${tw.type === 'red' ? 'border-destructive/40 bg-destructive/5' : 'border-orange-400/40 bg-orange-50/50 dark:bg-orange-950/20'}`}
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${tw.type === 'red' ? 'bg-destructive' : 'bg-orange-500'}`} />
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">⚠ {tw.kpiLabel}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fmt(tw.value)}{tw.suffix} ({dirLabel} tröskel: {fmt(tw.threshold)}{tw.suffix})
                  </p>
                </div>
                {tw.navigateTo && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary shrink-0" onClick={() => navigate(tw.navigateTo!)}>
                    Åtgärda <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
