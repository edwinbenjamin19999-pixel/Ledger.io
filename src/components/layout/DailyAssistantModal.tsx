import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDisplayName } from "@/hooks/useDisplayName";
import { supabase } from "@/integrations/supabase/client";
import { getStoredActiveCompanyId } from "@/lib/company-selection";
import { FileCheck, FileText, Receipt, Wallet, ArrowRight, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "northledger_daily_dismissed";
const SESSION_SHOWN_KEY = "northledger_daily_shown_session";

interface ActionItem { id: string;
  icon: typeof FileCheck;
  text: string;
  path: string;
  severity: "warning" | "info" | "urgent";
}

function getGreeting(name?: string): string { const hour = new Date().getHours();
  let greeting: string;
  if (hour < 12) greeting = "God morgon";
  else if (hour < 17) greeting = "God eftermiddag";
  else greeting = "God kväll";
  return name ? `${greeting}, ${name}.` : `${greeting}.`;
}

function isDismissedToday(): boolean { const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const stored = new Date(raw);
  const now = new Date();
  return (
    stored.getFullYear() === now.getFullYear() &&
    stored.getMonth() === now.getMonth() &&
    stored.getDate() === now.getDate()
  );
}

export const DailyAssistantModal = () => { const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const displayName = useDisplayName();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => { if (!user || isDismissedToday() || sessionStorage.getItem(SESSION_SHOWN_KEY)) { setLoading(false);
      return;
    }

    const loadActions = async () => { const actions: ActionItem[] = [];
      
      // Resolve company from localStorage
      const storedId = getStoredActiveCompanyId();
      if (!storedId) { setLoading(false);
        setOpen(true);
        setItems(actions);
        return;
      }
      setCompanyId(storedId);

      try { // 1. Pending journal entries (draft / pending_approval) – matches what the verifications page shows
        const { count: pendingJournalCount } = await supabase
          .from("journal_entries")
          .select("id", { count: "exact", head: true })
          .eq("company_id", storedId)
          .in("status", ["draft", "pending_approval"]);

        const pendingDocs = pendingJournalCount || 0;

        if (pendingDocs > 0) { actions.push({ id: "pending-docs",
            icon: FileCheck,
            text: `${pendingDocs} ${pendingDocs === 1 ? "verifikation väntar" : "verifikationer väntar"} på godkännande`,
            path: "/verifications",
            severity: "info",
          });
        }

        // 2. Invoices due in next 7 days
        const inAWeek = new Date();
        inAWeek.setDate(inAWeek.getDate() + 7);
        const { data: dueSoonInvoices } = await supabase
          .from("invoices")
          .select("id, invoice_number, due_date, total_amount")
          .eq("company_id", storedId)
          .eq("status", "sent")
          .lte("due_date", inAWeek.toISOString().split("T")[0])
          .gte("due_date", new Date().toISOString().split("T")[0])
          .order("due_date")
          .limit(3);

        if (dueSoonInvoices?.length) { const inv = dueSoonInvoices[0];
          const daysLeft = Math.ceil(
            (new Date(inv.due_date).getTime() - Date.now()) / 86400000
          );
          const amount = new Intl.NumberFormat("sv-SE").format(inv.total_amount || 0);
          actions.push({ id: "invoice-due",
            icon: FileText,
            text: `Faktura ${inv.invoice_number || "#?"} förfaller om ${daysLeft} dagar — ${amount} kr`,
            path: "/invoices",
            severity: daysLeft <= 3 ? "urgent" : "warning",
          });
        }

        // 3. VAT deadlines (check if any vat_declarations are in draft status)
        const { count: draftVat } = await supabase
          .from("vat_declarations")
          .select("id", { count: "exact", head: true })
          .eq("company_id", storedId)
          .eq("status", "draft");

        if (draftVat && draftVat > 0) { actions.push({ id: "vat-deadline",
            icon: Receipt,
            text: "Momsdeklaration ska förberedas och skickas in",
            path: "/vat-reports",
            severity: "warning",
          });
        }

        // 4. Low cash (check bank accounts balance)
        const { data: bankAccounts } = await supabase
          .from("bank_accounts")
          .select("balance")
          .eq("company_id", storedId)
          .eq("is_active", true);

        if (bankAccounts?.length) { const totalBalance = bankAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
          if (totalBalance < 30000 && totalBalance >= 0) { const formatted = new Intl.NumberFormat("sv-SE").format(totalBalance);
            actions.push({ id: "low-cash",
              icon: Wallet,
              text: `Kassabehållningen är ${formatted} kr — kontrollera likviditeten`,
              path: "/cashflow",
              severity: "urgent",
            });
          }
        }
      } catch (e) { console.error("Daily assistant data error:", e);
      }

      setItems(actions.slice(0, 4));
      setLoading(false);
      sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
      setOpen(true);
    };

    // Small delay to let the app render first
    const timer = setTimeout(loadActions, 800);
    return () => clearTimeout(timer);
  }, [user]);

  const handleDismiss = () => { setOpen(false);
  };

  const handleDismissDay = () => { localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setOpen(false);
  };

  const handleAction = (path: string) => { setOpen(false);
    navigate(path);
  };

  const capitalizedName = displayName || undefined;

  if (loading || !user) return null;

  const severityColors = { urgent: "bg-[#FCE8E8] border-[#F4C8C8] text-[#7A1A1A] dark:bg-red-950/30 dark:border-red-800 dark:text-red-300",
    warning: "bg-[#FAEEDA] border-[#F0DDB7] text-[#7A5417] dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300",
    info: "bg-[#EFF6FF] border-[#C8DDF5] text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300",
  };

  const severityIconColors = { urgent: "text-[#7A1A1A]",
    warning: "text-[#7A5417]",
    info: "text-blue-500",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden border-0 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ borderRadius: 16 }}
      >
        {/* Header */}
        <div className="px-6 pt-8 pb-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {getGreeting(capitalizedName)}
          </h2>
          {items.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Här är vad som behöver din uppmärksamhet idag.
            </p>
          )}
          {items.length === 0 && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Allt ser bra ut — inga omedelbara åtgärder krävs.
              </p>
              <p className="text-sm text-muted-foreground">
                Skriv vad du vill göra så hjälper jag dig. Du kan alltid nå mig via AI-knappen.
              </p>
            </div>
          )}
        </div>

        {/* Action items */}
        {items.length > 0 && (
          <div className="px-6 space-y-2">
            {items.map((item) => { const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleAction(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all hover:scale-[1.01] hover:shadow-sm",
                    severityColors[item.severity]
                  )}
                >
                  <Icon className={cn("h-5 w-5 flex-shrink-0", severityIconColors[item.severity])} />
                  <span className="flex-1 text-sm font-medium">{item.text}</span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 opacity-50" />
                </button>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pt-5 pb-6 flex flex-col items-center gap-3">
          <Button
            onClick={handleDismiss}
            className="w-full h-11 text-sm font-semibold rounded-xl bg-[#3b82f6] text-white hover:bg-[#3b82f6]/90 transition-colors"
          >
            Sätt igång
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <button
            onClick={handleDismissDay}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Påminn mig inte idag
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
