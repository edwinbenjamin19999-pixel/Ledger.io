import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getStoredActiveCompanyId } from "@/lib/company-selection";
import { Receipt, Loader2, CheckCircle, FileText, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { haptic } from "@/lib/haptics";
import { PullToRefresh } from "../PullToRefresh";
import { toDisplayName } from "@/lib/format/displayName";

interface Claim {
  id: string;
  description: string | null;
  amount: number;
  category: string | null;
  status: string;
  created_at: string;
  type: "expense" | "journal";
  submittedBy?: string;
  paymentMethod?: string | null;
}

interface MobileApprovalsProps {
  onNavigate?: (tab: string) => void;
}

const HIGH_VALUE_THRESHOLD = 10000;

async function biometricConfirm(label: string): Promise<boolean> {
  if (typeof window === "undefined") return true;
  return window.confirm(`Bekräfta godkännande: ${label}`);
}

export const MobileApprovals = ({ onNavigate: _onNavigate }: MobileApprovalsProps) => {
  const [items, setItems] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const companyId = getStoredActiveCompanyId();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [expensesRes, journalsRes] = await Promise.all([
      supabase
        .from("expense_claims")
        .select("id, description, amount, category, status, created_at, user_id, payment_method")
        .eq("company_id", companyId)
        .in("status", ["pending_approval", "submitted", "draft"])
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("journal_entries")
        .select("id, description, status, created_at, created_by")
        .eq("company_id", companyId)
        .in("status", ["draft", "pending_approval"])
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    // Sum amounts from journal_entry_lines (no total_amount column on journal_entries)
    const journalIds = (journalsRes.data || []).map((j: any) => j.id);
    const amountMap = new Map<string, number>();
    if (journalIds.length > 0) {
      const { data: lines } = await supabase
        .from("journal_entry_lines")
        .select("journal_entry_id, debit, credit")
        .in("journal_entry_id", journalIds);
      (lines || []).forEach((l: any) => {
        const prev = amountMap.get(l.journal_entry_id) || 0;
        amountMap.set(l.journal_entry_id, prev + (Number(l.debit) || 0));
      });
    }

    // Collect user ids to look up names
    const userIds = new Set<string>();
    (expensesRes.data || []).forEach((c: any) => c.user_id && userIds.add(c.user_id));
    (journalsRes.data || []).forEach((j: any) => j.created_by && userIds.add(j.created_by));

    const nameMap = new Map<string, string>();
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", Array.from(userIds));
      (profiles || []).forEach((p: any) => {
        const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
        nameMap.set(p.id, toDisplayName(full) || p.email || "Okänd");
      });
    }

    const expenses: Claim[] = ((expensesRes.data || []) as any[]).map((c) => ({
      id: c.id,
      description: c.description,
      amount: Number(c.amount) || 0,
      category: c.category,
      status: c.status,
      created_at: c.created_at,
      type: "expense" as const,
      submittedBy: c.user_id ? nameMap.get(c.user_id) : undefined,
      paymentMethod: c.payment_method,
    }));
    const journals: Claim[] = ((journalsRes.data || []) as any[]).map((j) => ({
      id: j.id,
      description: j.description ?? "Verifikat utan beskrivning",
      amount: amountMap.get(j.id) || 0,
      category: "Verifikat",
      status: j.status,
      created_at: j.created_at,
      type: "journal" as const,
      submittedBy: j.created_by ? nameMap.get(j.created_by) : undefined,
    }));

    const combined = [...journals, ...expenses].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    setItems(combined);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (item: Claim, decision: "approved" | "rejected") => {
    if (decision === "approved" && item.amount > HIGH_VALUE_THRESHOLD) {
      const ok = await biometricConfirm(
        `${item.description || "Post"} • ${Number(item.amount).toLocaleString("sv-SE")} kr`,
      );
      if (!ok) return;
    }
    setActing(item.id);

    const table = item.type === "journal" ? "journal_entries" : "expense_claims";
    const newStatus =
      item.type === "journal"
        ? decision === "approved"
          ? "approved"
          : "rejected"
        : decision;

    const { error } = await supabase
      .from(table)
      .update({ status: newStatus })
      .eq("id", item.id);
    if (error) {
      toast.error("Kunde inte uppdatera", { description: error.message });
      haptic("error");
    } else {
      haptic(decision === "approved" ? "success" : "light");
      setItems((prev) => prev.filter((i) => i.id !== item.id));

      // För godkända anställdutlägg: informera om att det nu ligger i utbetalningskön
      if (
        decision === "approved" &&
        item.type === "expense" &&
        item.paymentMethod === "employee"
      ) {
        toast.success("Godkänt – väntar på utbetalning", {
          description: `${item.submittedBy || "Den anställde"} får utbetalning från Direktbetalning.`,
          action: {
            label: "Öppna",
            onClick: () => navigate("/direct-payment"),
          },
        });
      } else {
        toast.success(decision === "approved" ? "Godkänt!" : "Avvisat");
      }
    }
    setActing(null);
  };

  return (
    <PullToRefresh onRefresh={load}>
      <div className="px-4 pt-4 pb-6 bg-[#F8FAFB] min-h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[18px] font-medium text-[#0F172A]">Att godkänna</h1>
          {items.length > 0 && (
            <span className="bg-[#E24B4A] text-white rounded-full px-[8px] py-[2px] text-[11px] font-semibold tabular-nums">
              {items.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-[8px]">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[110px] rounded-[12px] bg-[#F1F5F9]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle size={48} color="#CBD5E1" strokeWidth={1.5} />
            <p className="mt-4 text-[14px] text-[#94A3B8]">Allt är godkänt</p>
            <p className="mt-1 text-[11px] text-[#CBD5E1]">
              Inget väntar på din uppmärksamhet just nu
            </p>
          </div>
        ) : (
          <div className="space-y-[8px]">
            {items.map((item) => {
              const TypeIcon = item.type === "journal" ? FileText : Receipt;
              const typeLabel = item.type === "journal" ? "Verifikat" : "Utlägg";
              const isHighValue = item.amount > HIGH_VALUE_THRESHOLD;
              const submitterLabel =
                item.type === "expense" ? "Utlagt av" : "Skapat av";
              return (
                <div
                  key={item.id}
                  className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[14px]"
                >
                  <div className="flex items-start gap-[10px]">
                    <span className="inline-flex items-center gap-[4px] text-[10px] font-medium text-[#0040CC] bg-[#EFF6FF] px-[8px] py-[3px] rounded-full">
                      <TypeIcon size={10} strokeWidth={2} />
                      {typeLabel}
                    </span>
                    {isHighValue && (
                      <span className="text-[10px] font-medium text-[#9A6300] bg-[#FFFBF0] px-[8px] py-[3px] rounded-full">
                        Face ID
                      </span>
                    )}
                  </div>
                  <div className="mt-[8px] flex items-baseline justify-between gap-3">
                    <p className="text-[13px] font-medium text-[#0F172A] truncate">
                      {item.description || "Utlägg"}
                    </p>
                    <p className="text-[15px] font-medium text-[#0F172A] tabular-nums whitespace-nowrap">
                      {Number(item.amount).toLocaleString("sv-SE")} kr
                    </p>
                  </div>
                  {item.submittedBy && (
                    <p className="text-[11px] text-[#475569] mt-[4px] flex items-center gap-[4px]">
                      <UserIcon size={11} strokeWidth={2} className="text-[#94A3B8]" />
                      <span>
                        {submitterLabel}: <span className="font-medium text-[#0F172A]">{item.submittedBy}</span>
                      </span>
                    </p>
                  )}
                  <p className="text-[11px] text-[#94A3B8] mt-[2px]">
                    {item.category || "Övrigt"} ·{" "}
                    {new Date(item.created_at).toLocaleDateString("sv-SE")}
                    {item.type === "expense" && item.paymentMethod === "employee" && (
                      <span className="ml-1 text-[#9A6300]">· Återbetalas till anställd</span>
                    )}
                  </p>
                  <div className="mt-[12px] flex gap-[8px]">
                    <button
                      onClick={() => act(item, "rejected")}
                      disabled={acting === item.id}
                      className="flex-1 h-[40px] rounded-[8px] bg-white border-[0.5px] border-[#F09595] text-[#791F1F] text-[13px] font-medium active:bg-[#FFF1F1] transition-colors disabled:opacity-50"
                    >
                      {acting === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      ) : (
                        "Avvisa"
                      )}
                    </button>
                    <button
                      onClick={() => act(item, "approved")}
                      disabled={acting === item.id}
                      className="flex-1 h-[40px] rounded-[8px] bg-[#1D9E75] text-white text-[13px] font-medium active:bg-[#178060] transition-colors disabled:opacity-50"
                    >
                      {acting === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      ) : (
                        "Godkänn"
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
};
