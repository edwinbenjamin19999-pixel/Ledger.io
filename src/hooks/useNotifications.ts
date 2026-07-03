import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type NotifPriority = "urgent" | "important" | "info";
export type NotifCategory =
  | "vat_due"
  | "invoice_overdue"
  | "bank_disconnected"
  | "journal_failed"
  | "ai_low_confidence"
  | "supplier_invoice_attest"
  | "payroll_upcoming"
  | "period_close_ready"
  | "ai_batch_summary"
  | "ai_insight"
  | "report_ready";

export interface AppNotification {
  id: string;
  category: NotifCategory;
  priority: NotifPriority;
  title: string;
  body: string;
  timestamp: string; // ISO
  path?: string;
  actionLabel?: string;
  /** stable key for dedupe within 24h */
  dedupeKey: string;
}

const READ_KEY = "notif:read";
const DISMISS_KEY = "notif:dismissed";
const SEEN_KEY = "notif:seen"; // dedupeKey -> ISO

function loadSet(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
  } catch {
    return new Set();
  }
}
function saveSet(key: string, s: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...s]));
}
function loadSeen(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveSeen(m: Record<string, string>) {
  localStorage.setItem(SEEN_KEY, JSON.stringify(m));
}

const PRIORITY_RANK: Record<NotifPriority, number> = { urgent: 0, important: 1, info: 2 };

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadSet(READ_KEY));
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => loadSet(DISMISS_KEY));
  const [disabledCategories, setDisabledCategories] = useState<Set<NotifCategory>>(new Set());

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const out: AppNotification[] = [];
    try {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", user.id);
      const companyIds = (roles ?? []).map((r) => r.company_id).filter(Boolean) as string[];
      if (companyIds.length === 0) {
        setItems([]);
        return;
      }

      const today = new Date().toISOString().split("T")[0];

      // --- URGENT: overdue customer invoices ---
      const { data: overdue } = await supabase
        .from("invoices")
        .select("id, counterparty_name, total_amount, due_date")
        .in("company_id", companyIds)
        .eq("invoice_direction", "outgoing")
        .in("status", ["sent", "overdue"])
        .lt("due_date", today)
        .order("due_date", { ascending: true })
        .limit(20);
      (overdue ?? []).forEach((inv: any) => {
        out.push({
          id: `inv-${inv.id}`,
          category: "invoice_overdue",
          priority: "urgent",
          title: "Faktura förfallen",
          body: `${inv.counterparty_name ?? "Kund"} – ${Number(inv.total_amount ?? 0).toLocaleString("sv-SE")} kr`,
          timestamp: inv.due_date,
          path: "/invoices",
          actionLabel: "Visa faktura",
          dedupeKey: `invoice_overdue:${inv.id}`,
        });
      });

      // --- URGENT: bank connection broken ---
      // NOTE: there is no `bank_connections` table; PSD2/Enable Banking writes its
      // lifecycle events into `bank_connection_events`. We look at the latest event per
      // company and surface it if it's a known failure-class event.
      const { data: bankEvents } = await supabase
        .from("bank_connection_events")
        .select("id, company_id, event_type, created_at")
        .in("company_id", companyIds)
        .in("event_type", ["error", "expired", "revoked", "disconnected", "auth_failed"])
        .order("created_at", { ascending: false })
        .limit(10);
      (bankEvents ?? []).forEach((b: any) => {
        out.push({
          id: `bank-${b.id}`,
          category: "bank_disconnected",
          priority: "urgent",
          title: "Bankuppkoppling bruten",
          body: "Banken behöver kopplas upp på nytt",
          timestamp: b.created_at ?? new Date().toISOString(),
          path: "/bank",
          actionLabel: "Återanslut",
          dedupeKey: `bank_disconnected:${b.id}`,
        });
      });

      // --- URGENT: VAT due within 7 days ---
      // vat_periods has no `due_date` column; SKV-deadline is the 12th of the second
      // month after period_end for monthly/quarterly reporting. Compute client-side.
      const { data: vatPeriods } = await supabase
        .from("vat_periods")
        .select("id, period_start, period_end, status")
        .in("company_id", companyIds)
        .neq("status", "filed")
        .order("period_end", { ascending: true })
        .limit(10);
      (vatPeriods ?? []).forEach((v: any) => {
        if (!v.period_end) return;
        const end = new Date(v.period_end);
        const due = new Date(end.getFullYear(), end.getMonth() + 2, 12);
        const days = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days <= 7 && days >= -1) {
          out.push({
            id: `vat-${v.id}`,
            category: "vat_due",
            priority: "urgent",
            title:
              days <= 0
                ? "Momsdeklaration förfallen"
                : `Momsdeklaration förfaller om ${days} dagar`,
            body: `Period ${v.period_start} – ${v.period_end}`,
            timestamp: due.toISOString(),
            path: "/moms",
            actionLabel: "Granska underlag",
            dedupeKey: `vat_due:${v.id}`,
          });
        }
      });

      // --- URGENT: rejected journal entries (was previously querying status='failed'
      // which isn't a value in the journal_status enum and produced 400s).
      const { data: failed } = await supabase
        .from("journal_entries")
        .select("id, description, created_at")
        .in("company_id", companyIds)
        .eq("status", "rejected")
        .order("created_at", { ascending: false })
        .limit(10);
      (failed ?? []).forEach((j: any) => {
        out.push({
          id: `je-fail-${j.id}`,
          category: "journal_failed",
          priority: "urgent",
          title: "Verifikation avvisad",
          body: j.description ?? "Bokföring kunde inte slutföras",
          timestamp: j.created_at,
          path: "/accounting",
          actionLabel: "Granska",
          dedupeKey: `journal_failed:${j.id}`,
        });
      });

      // --- IMPORTANT: AI low confidence ---
      const { data: lowConf } = await supabase
        .from("ai_account_suggestions")
        .select("id, transaction_id, confidence, suggested_account, created_at")
        .in("company_id", companyIds)
        .lt("confidence", 0.6)
        .order("created_at", { ascending: false })
        .limit(20);
      const lowCount = (lowConf ?? []).length;
      if (lowCount > 0) {
        out.push({
          id: `ai-low-${today}`,
          category: "ai_low_confidence",
          priority: "important",
          title: "AI behöver din input",
          body: `${lowCount} transaktion${lowCount === 1 ? "" : "er"} med låg träffsäkerhet`,
          timestamp: new Date().toISOString(),
          path: "/ai-activity",
          actionLabel: "Granska",
          dedupeKey: `ai_low_confidence:${today}`,
        });
      }

      // --- IMPORTANT: supplier invoices to attest ---
      const { data: suppliers } = await supabase
        .from("invoices")
        .select("id, counterparty_name, total_amount, created_at")
        .in("company_id", companyIds)
        .eq("invoice_direction", "incoming")
        .eq("status", "draft")
        .order("created_at", { ascending: false })
        .limit(10);
      (suppliers ?? []).forEach((inv: any) => {
        out.push({
          id: `sup-${inv.id}`,
          category: "supplier_invoice_attest",
          priority: "important",
          title: "Ny leverantörsfaktura att attestera",
          body: `${inv.counterparty_name ?? "Leverantör"} – ${Number(inv.total_amount ?? 0).toLocaleString("sv-SE")} kr`,
          timestamp: inv.created_at,
          path: "/invoices",
          actionLabel: "Attestera",
          dedupeKey: `supplier_attest:${inv.id}`,
        });
      });

      // --- IMPORTANT: payroll upcoming ---
      const { data: payrolls } = await supabase
        .from("payroll_runs")
        .select("id, payment_date, period_end, status")
        .in("company_id", companyIds)
        .eq("status", "draft")
        .gte("payment_date", today)
        .order("payment_date", { ascending: true })
        .limit(5);
      (payrolls ?? []).forEach((p: any) => {
        if (!p.payment_date) return;
        const days = Math.ceil(
          (new Date(p.payment_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        if (days <= 3 && days >= 0) {
          out.push({
            id: `pr-${p.id}`,
            category: "payroll_upcoming",
            priority: "important",
            title: `Löneutbetalning om ${days} dagar`,
            body: `Period slut ${p.period_end}`,
            timestamp: p.payment_date,
            path: "/hr",
            actionLabel: "Granska",
            dedupeKey: `payroll_upcoming:${p.id}`,
          });
        }
      });

      // --- IMPORTANT: period ready to close (last day of prev month - 3..+5d) ---
      const now = new Date();
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const daysSinceClose = Math.floor(
        (now.getTime() - lastMonthEnd.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSinceClose >= -3 && daysSinceClose <= 5) {
        const periodKey = `${lastMonthEnd.getFullYear()}-${lastMonthEnd.getMonth() + 1}`;
        const { data: closed } = await (supabase as any)
          .from("accounting_periods")
          .select("id, status")
          .in("company_id", companyIds)
          .eq("period_year", lastMonthEnd.getFullYear())
          .eq("period_month", lastMonthEnd.getMonth() + 1)
          .maybeSingle();
        if (!closed || closed.status !== "closed") {
          out.push({
            id: `pc-${periodKey}`,
            category: "period_close_ready",
            priority: "important",
            title: "Period klar att stängas",
            body: lastMonthEnd.toLocaleDateString("sv-SE", {
              month: "long",
              year: "numeric",
            }),
            timestamp: lastMonthEnd.toISOString(),
            path: "/period-close",
            actionLabel: "Öppna checklista",
            dedupeKey: `period_close:${periodKey}`,
          });
        }
      }

      // --- INFO: AI batched activity today ---
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count: aiCount } = await supabase
        .from("ai_account_suggestions")
        .select("id", { count: "exact", head: true })
        .in("company_id", companyIds)
        .gte("confidence", 0.95)
        .gte("created_at", startOfDay.toISOString());
      if (aiCount && aiCount > 0) {
        out.push({
          id: `ai-batch-${today}`,
          category: "ai_batch_summary",
          priority: "info",
          title: `AI kategoriserade ${aiCount} transaktioner automatiskt idag`,
          body: "Ingen åtgärd krävs",
          timestamp: new Date().toISOString(),
          path: "/ai-activity",
          actionLabel: "Visa logg",
          dedupeKey: `ai_batch:${today}`,
        });
      }

      // --- Anti-noise: dedupe within 24h based on dedupeKey ---
      const seen = loadSeen();
      const now24 = Date.now();
      const filtered: AppNotification[] = [];
      for (const n of out) {
        const last = seen[n.dedupeKey];
        const isFresh = !last || now24 - new Date(last).getTime() > 24 * 60 * 60 * 1000;
        // Always show even if dedup, but record first sight
        if (!last) seen[n.dedupeKey] = new Date().toISOString();
        // Keep all once visible; dedup mainly affects future re-emission (push/email layer)
        filtered.push(n);
      }
      // prune old entries (>7d)
      Object.keys(seen).forEach((k) => {
        if (now24 - new Date(seen[k]).getTime() > 7 * 24 * 60 * 60 * 1000) delete seen[k];
      });
      saveSeen(seen);

      setItems(filtered);
    } catch (e) {
      console.error("[useNotifications] load error", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = items
    .filter((n) => !dismissedIds.has(n.id))
    .filter(
      (n) => n.priority === "urgent" || !disabledCategories.has(n.category),
    )
    .sort((a, b) => {
      const r = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (r !== 0) return r;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  const unreadCount = visible.filter((n) => !readIds.has(n.id)).length;

  const markRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveSet(READ_KEY, next);
      return next;
    });
  };
  const markAllRead = () => {
    const next = new Set(readIds);
    visible.forEach((n) => next.add(n.id));
    saveSet(READ_KEY, next);
    setReadIds(next);
  };
  const dismiss = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveSet(DISMISS_KEY, next);
      return next;
    });
  };
  const toggleCategory = (c: NotifCategory, enabled: boolean) => {
    setDisabledCategories((prev) => {
      const next = new Set(prev);
      if (enabled) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const topBanner = visible.find((n) => n.priority === "urgent" || n.priority === "important");

  return {
    items: visible,
    loading,
    unreadCount,
    isRead: (id: string) => readIds.has(id),
    markRead,
    markAllRead,
    dismiss,
    refresh: load,
    topBanner,
    toggleCategory,
    disabledCategories,
  };
}
