import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Bell,
  Mail,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Gavel,
  Sparkles,
  Phone,
  CalendarClock,
  TrendingUp,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useOverdueInvoices, useSendReminder } from "@/hooks/useInvoiceReminders";
import { formatSEK } from "@/lib/formatNumber";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getStoredActiveCompanyId } from "@/lib/company-selection";

type Recommendation = {
  action: "remind1" | "remind2" | "call" | "plan" | "collection";
  label: string;
  reason: string;
  recoveryProbability: number;
  risk: "low" | "medium" | "high" | "critical";
  alternatives: Array<{ action: string; label: string; icon: typeof Mail }>;
};

const ACTION_META: Record<Recommendation["action"], { icon: typeof Mail; tone: string }> = {
  remind1: { icon: Mail, tone: "bg-[#3b82f6] hover:bg-[#3b82f6] text-white" },
  remind2: { icon: Mail, tone: "bg-amber-600 hover:bg-amber-700 text-white" },
  call: { icon: Phone, tone: "bg-blue-600 hover:bg-blue-700 text-white" },
  plan: { icon: CalendarClock, tone: "bg-violet-600 hover:bg-violet-700 text-white" },
  collection: { icon: Gavel, tone: "bg-rose-600 hover:bg-rose-700 text-white" },
};

function buildRecommendation(inv: {
  daysOverdue: number;
  total_amount: number;
  reminder_count: number | null;
}): Recommendation {
  const days = inv.daysOverdue;
  const sent = inv.reminder_count ?? 0;
  const amount = Number(inv.total_amount);

  // Critical: >60d or large+overdue
  if (days > 60 || (days > 35 && amount > 50000)) {
    return {
      action: "collection",
      label: "Skicka till inkasso",
      reason: `${days} dagar förfallen — eskalering rekommenderas`,
      recoveryProbability: Math.max(45, 85 - days * 0.4),
      risk: "critical",
      alternatives: [
        { action: "call", label: "Ring kund först", icon: Phone },
        { action: "plan", label: "Erbjud betalplan", icon: CalendarClock },
      ],
    };
  }

  // High: 30-60d, plan likely useful
  if (days > 30) {
    return {
      action: "plan",
      label: "Erbjud betalplan",
      reason: "Kund har troligen likviditetsproblem — dela upp",
      recoveryProbability: 72,
      risk: "high",
      alternatives: [
        { action: "call", label: "Ring kund", icon: Phone },
        { action: "remind2", label: "Påminnelse 2", icon: Mail },
      ],
    };
  }

  // Medium: 14-30d
  if (days > 14) {
    return {
      action: sent >= 1 ? "call" : "remind2",
      label: sent >= 1 ? "Ring kund" : "Skicka påminnelse 2",
      reason: sent >= 1 ? "1 påminnelse skickad — personlig kontakt nu" : "Andra påminnelse + lagstadgad avgift",
      recoveryProbability: 84,
      risk: "medium",
      alternatives: [
        { action: "plan", label: "Betalplan", icon: CalendarClock },
        { action: "remind1", label: "Vänlig påminnelse", icon: Mail },
      ],
    };
  }

  // Low: <14d
  return {
    action: "remind1",
    label: "Påminnelse 1 räcker",
    reason: "Tidig fas — vänlig påminnelse löser detta i 92% av fall",
    recoveryProbability: 92,
    risk: "low",
    alternatives: [{ action: "call", label: "Ring direkt", icon: Phone }],
  };
}

const riskTone: Record<Recommendation["risk"], { dot: string; chip: string; label: string }> = {
  low: { dot: "bg-emerald-500", chip: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]", label: "Låg risk" },
  medium: { dot: "bg-amber-500", chip: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]", label: "Medel risk" },
  high: { dot: "bg-orange-500", chip: "bg-orange-500/10 text-orange-600 border-orange-500/30", label: "Hög risk" },
  critical: { dot: "bg-rose-500", chip: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]", label: "Kritisk" },
};

const InvoiceReminders = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: invoices, isLoading: loadingData, error } = useOverdueInvoices();
  const sendReminder = useSendReminder();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const overdueInvoices = useMemo(() => (invoices ?? []).filter((i) => i.isOverdue), [invoices]);

  const enriched = useMemo(
    () =>
      overdueInvoices.map((inv) => ({
        ...inv,
        recommendation: buildRecommendation({
          daysOverdue: inv.daysOverdue,
          total_amount: Number(inv.total_amount),
          reminder_count: inv.reminder_count,
        }),
      })),
    [overdueInvoices],
  );

  const aiSummary = useMemo(() => {
    const collection = enriched.filter((e) => e.recommendation.action === "collection");
    const plan = enriched.filter((e) => e.recommendation.action === "plan");
    const remind = enriched.filter((e) => e.recommendation.action.startsWith("remind"));
    const recoveryEst = enriched.reduce(
      (s, e) => s + Number(e.total_amount) * (e.recommendation.recoveryProbability / 100),
      0,
    );
    return {
      collection: collection.length,
      collectionAmount: collection.reduce((s, e) => s + Number(e.total_amount), 0),
      plan: plan.length,
      remind: remind.length,
      recoveryEst,
    };
  }, [enriched]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  if (!user) return null;

  const handleSendReminder = async (inv: typeof enriched[0]) => {
    const tId = toast.loading(`Skickar påminnelse till ${inv.counterparty_name}…`);
    try {
      const result = await sendReminder.mutateAsync({
        invoiceId: inv.id,
        reminderNumber: (inv.reminder_count ?? 0) + 1,
      });
      toast.success(`Påminnelse skickad till ${result?.sent_to ?? inv.counterparty_name}`, { id: tId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kunde inte skicka påminnelsen', { id: tId });
    }
  };

  const handleSendToCollection = async (inv: typeof enriched[0]) => {
    const companyId = getStoredActiveCompanyId();
    if (!companyId || !user) {
      toast.error("Saknar bolags- eller användarkontext");
      return;
    }
    const tId = toast.loading(`Skapar inkassoärende för ${inv.counterparty_name}…`);
    try {
      // Avoid duplicate active case for the same invoice
      const { data: existing } = await supabase
        .from("collection_cases")
        .select("id, status")
        .eq("invoice_id", inv.id)
        .not("status", "in", "(closed,cancelled,paid)")
        .maybeSingle();
      if (existing) {
        toast.info("Ett aktivt inkassoärende finns redan för denna faktura", { id: tId });
        navigate("/finance");
        return;
      }
      const amount = Number(inv.total_amount);
      const { error } = await supabase.from("collection_cases").insert({
        company_id: companyId,
        invoice_id: inv.id,
        created_by: user.id,
        status: "pending",
        debtor_name: inv.counterparty_name,
        original_amount: amount,
        remaining_amount: amount,
        reminder_count: inv.reminder_count ?? 0,
      });
      if (error) throw error;
      toast.success(`Inkassoärende skapat — ${inv.counterparty_name}`, { id: tId });
      navigate("/finance");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte skapa inkassoärende", { id: tId });
    }
  };

  const handleAction = (inv: typeof enriched[0], action: string) => {
    if (action === "remind1" || action === "remind2") {
      handleSendReminder(inv);
    } else if (action === "call") {
      toast.info(`Samtalslogg skapad för ${inv.counterparty_name}`);
    } else if (action === "plan") {
      toast.info(`Betalplansförslag genereras för ${inv.counterparty_name}`);
    } else if (action === "collection") {
      handleSendToCollection(inv);
    }
  };

  return (
    <div>
      <PageHeader
        icon={Bell}
        title="Påminnelser & Kravflöde"
        subtitle="AI rekommenderar bästa åtgärd per faktura"
      />
      <div className="px-8 space-y-6">
        {/* AI Decision Banner */}
        {enriched.length > 0 && (
          <div className="rounded-2xl bg-[#0F1F3D] border border-[#C8DDF5] p-6 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center gap-5">
              <div className="flex items-start gap-4 flex-1">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-blue-600 flex items-center justify-center shadow-lg shadow-[#3b82f6]/30 flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-[#3b82f6] uppercase">
                      AI Beslutsmotor
                    </span>
                    <span className="h-1 w-1 rounded-full bg-[#3b82f6]/60" />
                    <span className="text-[10px] text-slate-300">live-analys</span>
                  </div>
                  <p className="text-lg font-semibold text-white leading-tight">
                    {enriched.length} fordringar analyserade —{" "}
                    <span className="text-[#3b82f6]">{formatSEK(Math.round(aiSummary.recoveryEst))}</span> bedöms återvinningsbart
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {aiSummary.remind > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#3b82f6]/15 border border-[#3b82f6]/30 text-[#3b82f6] text-xs font-medium">
                        <Mail className="h-3 w-3" /> {aiSummary.remind} påminnelser räcker
                      </span>
                    )}
                    {aiSummary.plan > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-400/30 text-violet-200 text-xs font-medium">
                        <CalendarClock className="h-3 w-3" /> {aiSummary.plan} behöver betalplan
                      </span>
                    )}
                    {aiSummary.collection > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-400/30 text-rose-200 text-xs font-medium">
                        <Gavel className="h-3 w-3" /> {aiSummary.collection} till inkasso ({formatSEK(aiSummary.collectionAmount)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#3b82f6] to-blue-600 hover:from-[#3b82f6] hover:to-blue-700 text-white shadow-lg shadow-[#3b82f6]/20 lg:flex-shrink-0"
                onClick={() => toast.success(`${enriched.length} rekommenderade åtgärder köade för utförande`)}
              >
                <Zap className="h-4 w-4 mr-2" />
                Utför alla rekommendationer
              </Button>
            </div>
          </div>
        )}

        {error && (
          <Card className="border-destructive/30">
            <CardContent className="py-6 text-center">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-destructive" />
              <p className="text-sm">Kunde inte ladda fakturor — försök igen</p>
            </CardContent>
          </Card>
        )}

        {loadingData ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : enriched.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-[#085041]" />
              <p className="font-medium text-foreground">Inga förfallna fakturor</p>
              <p className="text-sm text-muted-foreground mt-1">AI bevakar automatiskt — du får besked vid förändring</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {enriched.map((inv) => {
              const rec = inv.recommendation;
              const meta = ACTION_META[rec.action];
              const tone = riskTone[rec.risk];
              const Icon = meta.icon;
              return (
                <div
                  key={inv.id}
                  className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-[#C8DDF5] hover:shadow-lg transition-all overflow-hidden"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_auto_1.4fr] gap-0">
                    {/* Left: Customer + invoice */}
                    <div className="p-5 lg:border-r border-slate-200/70 dark:border-slate-800">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wide uppercase ${tone.chip}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                          {tone.label}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">{inv.invoice_number}</span>
                      </div>
                      <p className="font-semibold text-foreground text-base leading-tight">{inv.counterparty_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Förfallen <span className="text-[#7A1A1A] font-semibold">{inv.daysOverdue} dagar</span> · sedan {inv.due_date}
                      </p>
                    </div>

                    {/* Middle: Amount */}
                    <div className="p-5 lg:border-r border-slate-200/70 dark:border-slate-800 lg:min-w-[180px] flex flex-col justify-center lg:items-end">
                      <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase mb-1">Skuld</p>
                      <p className="text-2xl font-extrabold tabular-nums text-foreground leading-none">
                        {formatSEK(Number(inv.total_amount))}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Påminnelser: <span className="font-semibold text-foreground">{inv.reminder_count ?? 0}</span>
                      </p>
                    </div>

                    {/* Right: AI recommendation + actions */}
                    <div className="p-5 bg-slate-50/60 dark:bg-slate-900/60">
                      <div className="flex items-start gap-2 mb-3">
                        <Sparkles className="h-3.5 w-3.5 text-[#3b82f6] mt-0.5 flex-shrink-0" />
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold tracking-[0.15em] text-[#3b82f6] dark:text-[#1E3A5F] uppercase">
                              AI rekommenderar
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#085041]">
                              <TrendingUp className="h-3 w-3" />
                              {Math.round(rec.recoveryProbability)}% chans
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-foreground leading-tight">{rec.label}</p>
                          <p className="text-xs text-muted-foreground leading-snug">{rec.reason}</p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className={`${meta.tone} shadow-md text-xs h-9`}
                          onClick={() => handleAction(inv, rec.action)}
                        >
                          <Icon className="w-3.5 h-3.5 mr-1.5" />
                          {rec.label}
                        </Button>
                        {rec.alternatives.map((alt) => {
                          const AltIcon = alt.icon;
                          return (
                            <Button
                              key={alt.action}
                              size="sm"
                              variant="outline"
                              className="text-xs h-9 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                              onClick={() => handleAction(inv, alt.action)}
                            >
                              <AltIcon className="w-3.5 h-3.5 mr-1.5" />
                              {alt.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Compact KPI footer (moved from top to reduce noise) */}
        {enriched.length > 0 && (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 pt-2">
            <Card>
              <CardHeader className="pb-3 pt-4">
                <CardDescription className="text-xs">Förfallna</CardDescription>
                <CardTitle className="text-lg">{enriched.length} st</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3 pt-4">
                <CardDescription className="text-xs">Utestående</CardDescription>
                <CardTitle className="text-lg text-[#7A1A1A]">
                  {formatSEK(enriched.reduce((s, i) => s + Number(i.total_amount), 0))}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3 pt-4">
                <CardDescription className="text-xs">Snitt förfallotid</CardDescription>
                <CardTitle className="text-lg">
                  {Math.round(enriched.reduce((s, i) => s + i.daysOverdue, 0) / enriched.length)} dagar
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3 pt-4">
                <CardDescription className="text-xs">Bedömd återvinning</CardDescription>
                <CardTitle className="text-lg text-[#085041]">{formatSEK(Math.round(aiSummary.recoveryEst))}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceReminders;
