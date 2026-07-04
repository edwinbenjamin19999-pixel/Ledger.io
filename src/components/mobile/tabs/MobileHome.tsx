import { useEffect, useState, useMemo } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getStoredActiveCompanyId } from "@/lib/company-selection";
import {
  Sparkles,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  CalendarClock,
  Wallet,
  TrendingUp,
} from "lucide-react";
import type { MobileTab } from "../MobileNavBar";
import { useDashboardInsightData, formatSEK } from "@/hooks/useDashboardInsightData";
import { usePendingApprovalCount } from "@/hooks/usePendingApprovalCount";
import { MobileBottomSheet } from "../MobileBottomSheet";

interface MobileHomeProps {
  user: User;
  onNavigate: (tab: MobileTab) => void;
  onNavigateWithMessage?: (tab: MobileTab, message: string) => void;
  onNavigateToExpense?: () => void;
}

interface CompanyInfo {
  id: string;
  name: string;
}

interface BulletItem {
  id: string;
  text: string;
  tab: MobileTab;
}

interface AttentionCard {
  id: string;
  icon: React.ElementType;
  text: string;
  actionLabel: string;
  tone: "critical" | "warning" | "info";
  onAction: () => void;
}

interface KpiTile {
  id: string;
  label: string;
  value: string;
  trend?: { dir: "up" | "down" | "flat"; pct?: number };
  icon: React.ElementType;
  detail: { label: string; value: string }[];
  loading?: boolean;
}

function getFirstName(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const first = (meta?.first_name as string) || (meta?.given_name as string) || "";
  if (first.trim()) return first.trim().split(/\s+/)[0].replace(/^./, (c) => c.toUpperCase());
  const display = (meta?.full_name as string) || (meta?.name as string) || "";
  if (display.trim()) return display.trim().split(/\s+/)[0];
  const email = user.email || "";
  if (email.includes("@")) {
    const local = email.split("@")[0].replace(/\d+$/g, "");
    const prefix = local.replace(/[._-]/g, " ").trim();
    if (prefix) return prefix.split(/\s+/)[0].replace(/^./, (c) => c.toUpperCase());
  }
  return "där";
}

export const MobileHome = ({ user, onNavigate, onNavigateToExpense }: MobileHomeProps) => {
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [overdueCount, setOverdueCount] = useState<number | null>(null);
  const [overdueAmount, setOverdueAmount] = useState<number>(0);
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [aiActionsCount, setAiActionsCount] = useState<number>(0);
  const [draftInvoices, setDraftInvoices] = useState<number>(0);
  const [openSheet, setOpenSheet] = useState<KpiTile | null>(null);

  const firstName = getFirstName(user);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "God morgon" : hour < 18 ? "God eftermiddag" : "God kväll";
  const insights = useDashboardInsightData(company?.id);
  const pendingApprovals = usePendingApprovalCount(company?.id);

  // ─── Load company ───
  useEffect(() => {
    const cid = getStoredActiveCompanyId();
    if (!cid) return;
    supabase.from("companies").select("id, name").eq("id", cid).maybeSingle()
      .then(({ data }) => { if (data) setCompany(data); });
  }, []);

  // ─── AI actions today (journal entries created today by AI) ───
  useEffect(() => {
    if (!company?.id) return;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .in("status", ["posted", "approved"])
      .gte("created_at", startOfDay.toISOString())
      .then(({ count }) => setAiActionsCount(count ?? 0));
  }, [company?.id]);

  // ─── Overdue invoices ───
  useEffect(() => {
    if (!company?.id) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase.from("invoices").select("id, total_amount")
      .eq("company_id", company.id).lt("due_date", today).neq("status", "paid")
      .then(({ data }) => {
        if (!data) { setOverdueCount(0); return; }
        setOverdueCount(data.length);
        setOverdueAmount(data.reduce((s, i) => s + Number(i.total_amount ?? 0), 0));
      });
  }, [company?.id]);

  // ─── Draft invoices ───
  useEffect(() => {
    if (!company?.id) return;
    supabase.from("invoices").select("id", { count: "exact", head: true })
      .eq("company_id", company.id).eq("status", "draft")
      .then(({ count }) => setDraftInvoices(count ?? 0));
  }, [company?.id]);

  // ─── Cash balance ───
  useEffect(() => {
    if (!company?.id) return;
    supabase.from("bank_accounts").select("balance").eq("company_id", company.id)
      .then(({ data }) => {
        if (!data) { setCashBalance(0); return; }
        setCashBalance(data.reduce((s, b) => s + Number(b.balance ?? 0), 0));
      });
  }, [company?.id]);

  // ─── Build AI summary bullets (max 3, condensed) ───
  const bullets: BulletItem[] = useMemo(() => {
    const list: BulletItem[] = [];
    if (aiActionsCount > 0) {
      list.push({
        id: "ai-actions",
        text: `Jag har bokfört ${aiActionsCount} ${aiActionsCount === 1 ? "verifikation" : "verifikationer"} sedan i går.`,
        tab: "approvals",
      });
    }
    if (overdueCount && overdueCount > 0) {
      list.push({
        id: "overdue",
        text: `${overdueCount} ${overdueCount === 1 ? "kundfaktura är förfallen" : "kundfakturor är förfallna"} (${formatSEK(overdueAmount)}).`,
        tab: "invoices",
      });
    }
    if (pendingApprovals > 0) {
      list.push({
        id: "approvals",
        text: `${pendingApprovals} ${pendingApprovals === 1 ? "post" : "poster"} väntar på ditt godkännande.`,
        tab: "approvals",
      });
    }
    if (list.length === 0) {
      list.push({
        id: "all-clear",
        text: "Allt ser bra ut i morse — inga åtgärder krävs.",
        tab: "home",
      });
    }
    return list.slice(0, 3);
  }, [aiActionsCount, overdueCount, overdueAmount, pendingApprovals]);

  // ─── Attention cards (max 3) ───
  const attention: AttentionCard[] = useMemo(() => {
    const list: AttentionCard[] = [];
    if (overdueCount && overdueCount > 0) {
      list.push({
        id: "overdue-card",
        icon: AlertTriangle,
        text: `${overdueCount} förfallna fakturor — ${formatSEK(overdueAmount)} att kräva in`,
        actionLabel: "Skicka påminnelse",
        tone: "critical",
        onAction: () => onNavigate("invoices"),
      });
    }
    if (pendingApprovals > 0) {
      list.push({
        id: "approvals-card",
        icon: CheckCircle2,
        text: `${pendingApprovals} verifikat väntar på godkännande`,
        actionLabel: "Granska nu",
        tone: "warning",
        onAction: () => onNavigate("approvals"),
      });
    }
    if (draftInvoices > 0) {
      list.push({
        id: "drafts-card",
        icon: Receipt,
        text: `${draftInvoices} fakturautkast inte skickade`,
        actionLabel: "Fortsätt",
        tone: "info",
        onAction: () => onNavigate("invoices"),
      });
    }
    return list;
  }, [overdueCount, overdueAmount, pendingApprovals, draftInvoices, onNavigate]);

  const moreAttention = attention.length > 3;

  // ─── KPI tiles (horizontal scroll) ───
  const isPositive = insights.delta >= 0;
  const kpis: KpiTile[] = [
    {
      id: "result",
      label: "Månadsresultat",
      value: insights.status === "ready" ? formatSEK(insights.currentResult) : "—",
      trend: insights.deltaPct !== null
        ? { dir: isPositive ? "up" : "down", pct: Math.abs(insights.deltaPct) }
        : undefined,
      icon: TrendingUp,
      detail: [
        { label: "Innevarande månad", value: insights.status === "ready" ? formatSEK(insights.currentResult) : "—" },
        { label: "Föregående månad", value: insights.status === "ready" ? formatSEK(insights.previousResult ?? 0) : "—" },
        { label: "Förändring", value: insights.deltaPct !== null ? `${isPositive ? "+" : "−"}${Math.abs(insights.deltaPct).toFixed(1)}%` : "—" },
      ],
      loading: insights.status !== "ready",
    },
    {
      id: "cash",
      label: "Kassa & Bank",
      value: cashBalance !== null ? formatSEK(cashBalance) : "—",
      icon: Wallet,
      detail: [
        { label: "Total likviditet", value: cashBalance !== null ? formatSEK(cashBalance) : "—" },
        { label: "Källa", value: "Anslutna bankkonton" },
      ],
      loading: cashBalance === null,
    },
    {
      id: "overdue",
      label: "Förfallet",
      value: overdueCount === null ? "—" : overdueCount > 0 ? formatSEK(overdueAmount) : "0 kr",
      trend: overdueCount && overdueCount > 0 ? { dir: "down" } : undefined,
      icon: AlertTriangle,
      detail: [
        { label: "Antal fakturor", value: overdueCount?.toString() ?? "—" },
        { label: "Belopp", value: formatSEK(overdueAmount) },
      ],
      loading: overdueCount === null,
    },
    {
      id: "deadline",
      label: "Nästa deadline",
      value: "Moms",
      trend: undefined,
      icon: CalendarClock,
      detail: [
        { label: "Typ", value: "Momsdeklaration" },
        { label: "Förfallodag", value: "12 nästa månad" },
      ],
    },
  ];

  // ─── Skeleton helpers ───
  const loadingTopSection = !company || (overdueCount === null && cashBalance === null);

  return (
    <div className="px-4 pt-4 pb-6 space-y-5 bg-[#F8FAFB] min-h-full">
      {/* ─── TOP — Greeting & AI summary ─── */}
      <section className="bg-white border-[0.5px] border-[#E2E8F0] rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} color="#3b82f6" strokeWidth={1.75} />
          <span className="text-[13px] text-[#64748B] leading-[1.6]">AI-sammanfattning</span>
        </div>
        <h1 className="text-[20px] font-semibold text-[#0F172A] leading-tight">
          {greeting}, {firstName}
        </h1>
        <ul className="mt-3 space-y-2">
          {loadingTopSection
            ? [1, 2, 3].map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#CBD5E1] mt-[10px]" />
                  <span className="flex-1 h-[18px] bg-[#F1F5F9] animate-pulse rounded" />
                </li>
              ))
            : bullets.map((b) => (
                <li key={b.id}>
                  <button
                    onClick={() => onNavigate(b.tab)}
                    className="w-full flex items-start gap-2 text-left active:opacity-60 transition-opacity min-h-[44px] py-1"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] mt-[10px] flex-shrink-0" />
                    <span className="flex-1 text-[15px] text-[#0F172A] leading-[1.6]">{b.text}</span>
                    <ChevronRight size={16} color="#CBD5E1" className="mt-1 flex-shrink-0" />
                  </button>
                </li>
              ))}
        </ul>
      </section>

      {/* ─── MIDDLE — Attention required ─── */}
      {(attention.length > 0 || loadingTopSection) && (
        <section>
          <h2 className="text-[13px] uppercase tracking-[0.06em] text-[#64748B] font-medium mb-2 px-1">
            Kräver uppmärksamhet
          </h2>
          <div className="space-y-2">
            {loadingTopSection
              ? [1, 2].map((i) => (
                  <div key={i} className="bg-white border-[0.5px] border-[#E2E8F0] rounded-2xl p-4 h-[112px] animate-pulse" />
                ))
              : attention.slice(0, 3).map((a) => {
                  const toneBg =
                    a.tone === "critical" ? "bg-[#FEF2F2]" :
                    a.tone === "warning" ? "bg-[#FFFBEB]" : "bg-[#EFF6FF]";
                  const toneFg =
                    a.tone === "critical" ? "#DC2626" :
                    a.tone === "warning" ? "#D97706" : "#3b82f6";
                  return (
                    <div
                      key={a.id}
                      className="bg-white border-[0.5px] border-[#E2E8F0] rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-9 h-9 rounded-xl ${toneBg} flex items-center justify-center flex-shrink-0`}>
                          <a.icon size={18} color={toneFg} strokeWidth={1.75} />
                        </div>
                        <p className="flex-1 text-[15px] text-[#0F172A] leading-[1.6]">{a.text}</p>
                      </div>
                      <button
                        onClick={a.onAction}
                        className="w-full h-[44px] rounded-xl bg-[#3b82f6] active:bg-[#0052FF] text-white text-[15px] font-medium transition-colors"
                      >
                        {a.actionLabel}
                      </button>
                    </div>
                  );
                })}
            {moreAttention && (
              <button
                onClick={() => onNavigate("approvals")}
                className="w-full text-[13px] text-[#3b82f6] font-medium py-2 active:opacity-60"
              >
                Visa alla {attention.length} →
              </button>
            )}
          </div>
        </section>
      )}

      {/* ─── BOTTOM — KPI strip (horizontal scroll) ─── */}
      <section>
        <h2 className="text-[13px] uppercase tracking-[0.06em] text-[#64748B] font-medium mb-2 px-1">
          Nyckeltal
        </h2>
        <div
          className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-none"
          style={{ scrollbarWidth: "none" }}
        >
          {kpis.map((k) => (
            <button
              key={k.id}
              onClick={() => setOpenSheet(k)}
              className="snap-start flex-shrink-0 w-[140px] min-h-[112px] bg-white border-[0.5px] border-[#E2E8F0] rounded-2xl p-3 text-left active:bg-[#F8FAFB] transition-colors shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-center justify-between mb-2">
                <k.icon size={16} color="#94A3B8" strokeWidth={1.75} />
                {k.trend && (
                  k.trend.dir === "up" ? (
                    <ArrowUpRight size={14} color="#1D9E75" />
                  ) : k.trend.dir === "down" ? (
                    <ArrowDownRight size={14} color="#E24B4A" />
                  ) : null
                )}
              </div>
              <p className="text-[13px] text-[#64748B] leading-[1.4]">{k.label}</p>
              {k.loading ? (
                <div className="h-[20px] mt-1 w-3/4 bg-[#F1F5F9] animate-pulse rounded" />
              ) : (
                <p className="mt-1 text-[16px] font-semibold text-[#0F172A] tabular-nums leading-tight">
                  {k.value}
                </p>
              )}
              {k.trend?.pct !== undefined && (
                <p className={`mt-0.5 text-[13px] tabular-nums ${k.trend.dir === "up" ? "text-[#1D9E75]" : "text-[#E24B4A]"}`}>
                  {k.trend.dir === "up" ? "+" : "−"}{k.trend.pct.toFixed(0)}%
                </p>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ─── KPI bottom sheet drilldown ─── */}
      <MobileBottomSheet open={!!openSheet} onClose={() => setOpenSheet(null)}>
        {openSheet && (
          <div className="px-5 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                <openSheet.icon size={20} color="#3b82f6" strokeWidth={1.75} />
              </div>
              <h3 className="text-[20px] font-semibold text-[#0F172A]">{openSheet.label}</h3>
            </div>
            <p className="text-[28px] font-semibold text-[#0F172A] tabular-nums mb-5">
              {openSheet.value}
            </p>
            <dl className="space-y-3 border-t-[0.5px] border-[#E2E8F0] pt-4">
              {openSheet.detail.map((d) => (
                <div key={d.label} className="flex items-center justify-between">
                  <dt className="text-[13px] text-[#64748B] leading-[1.6]">{d.label}</dt>
                  <dd className="text-[15px] text-[#0F172A] tabular-nums font-medium">{d.value}</dd>
                </div>
              ))}
            </dl>
            <button
              onClick={() => { setOpenSheet(null); onNavigate("approvals"); }}
              className="mt-6 w-full h-[48px] rounded-xl bg-[#3b82f6] active:bg-[#0052FF] text-white text-[15px] font-medium"
            >
              Öppna detaljvy
            </button>
          </div>
        )}
      </MobileBottomSheet>

      {/* Spacer so bottom tab bar never overlaps content */}
      <div aria-hidden className="h-6" />
    </div>
  );
};
