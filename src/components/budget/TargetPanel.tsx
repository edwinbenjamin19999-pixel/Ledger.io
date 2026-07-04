/**
 * TargetPanel — set EBIT/Revenue/Cash/Runway target by period and back-calculate.
 */
import { useEffect, useState } from "react";
import { Target, Trash2, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatSEK } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";
import { buildTargetPlan, type TargetKpi, type TargetPeriod, type PeriodPlan } from "@/lib/budget/targetEngine";
import type { RRMonth, KFMonth, BudgetDrivers } from "@/lib/budget/driverEngine";
import { GapClosingPanel } from "./GapClosingPanel";
import type { GapOption } from "@/lib/budget/gapEngine";

interface Props {
  companyId: string;
  budgetId: string;
  rr: RRMonth[];
  kf: KFMonth[];
  drivers?: BudgetDrivers;
  onApplyGap?: (option: GapOption) => Promise<void> | void;
}

interface SavedTarget {
  id: string;
  kpi: string;
  target_value: number;
  target_period: string;
  created_at: string;
}

interface AIAction {
  title: string;
  impactSEK?: number;
  reasoning?: string;
}

const KPI_OPTIONS: { value: TargetKpi; label: string }[] = [
  { value: "ebit", label: "EBIT" },
  { value: "revenue", label: "Intäkter" },
  { value: "cash", label: "Kassa (UB)" },
  { value: "runway", label: "Runway (dgr)" },
];

const PERIOD_OPTIONS: TargetPeriod[] = ["Q1", "Q2", "Q3", "Q4", "P1", "P2", "P3", "P4"];

export function TargetPanel({ companyId, budgetId, rr, kf, drivers, onApplyGap }: Props) {
  const [kpi, setKpi] = useState<TargetKpi>("ebit");
  const [targetValue, setTargetValue] = useState<string>("");
  const [period, setPeriod] = useState<TargetPeriod>("Q4");
  const [plan, setPlan] = useState<PeriodPlan | null>(null);
  const [aiActions, setAiActions] = useState<AIAction[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saved, setSaved] = useState<SavedTarget[]>([]);

  const loadSaved = async () => {
    const { data } = await supabase
      .from("budget_targets")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    setSaved((data ?? []) as SavedTarget[]);
  };

  useEffect(() => { if (companyId) loadSaved(); }, [companyId]);

  const compute = () => {
    const v = parseFloat(targetValue);
    if (isNaN(v)) { toast.error("Ange ett målvärde"); return; }
    const p = buildTargetPlan({ kpi, targetValue: v, period }, rr, kf);
    setPlan(p);
    setAiActions(null);
  };

  const fetchAI = async () => {
    if (!plan) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("budget-planning-ai", {
        body: {
          mode: "target",
          company_id: companyId,
          context: {
            kpi, target_value: parseFloat(targetValue), period,
            current_value: plan.currentValue,
            gap: plan.gap,
            required_revenue_delta: plan.requiredRevenueDelta,
            required_cost_delta: plan.requiredCostDelta,
          },
        },
      });
      if (error) throw error;
      const actions = (data?.actions ?? data?.options ?? []) as AIAction[];
      setAiActions(actions);
    } catch (e: any) {
      toast.error("Kunde inte hämta AI-förslag");
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const saveTarget = async () => {
    if (!plan) { toast.error("Beräkna först"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("budget_targets").insert({
      company_id: companyId,
      budget_id: budgetId,
      kpi,
      target_value: parseFloat(targetValue),
      target_period: period,
      created_by: u.user?.id,
    });
    if (error) { toast.error("Kunde inte spara"); return; }
    toast.success("Mål sparat");
    loadSaved();
  };

  const deleteTarget = async (id: string) => {
    const { error } = await supabase.from("budget_targets").delete().eq("id", id);
    if (error) { toast.error("Kunde inte radera"); return; }
    setSaved(s => s.filter(t => t.id !== id));
  };

  const gapColor = !plan ? "" : plan.gap > 0 ? "text-[#7A5417]" : "text-[#085041]";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Form */}
      <div className="lg:col-span-1 rounded-2xl border bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[#3b82f6]" />
          <h3 className="text-sm font-semibold">Sätt mål</h3>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">KPI</Label>
          <Select value={kpi} onValueChange={v => setKpi(v as TargetKpi)}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {KPI_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Målvärde</Label>
          <Input
            type="number"
            value={targetValue}
            onChange={e => setTargetValue(e.target.value)}
            placeholder={kpi === "runway" ? "180" : "1 000 000"}
            className="h-9 text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Period</Label>
          <Select value={period} onValueChange={v => setPeriod(v as TargetPeriod)}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={compute} className="flex-1 text-xs">Beräkna</Button>
          {plan && <Button size="sm" variant="outline" onClick={saveTarget} className="text-xs">Spara mål</Button>}
        </div>
      </div>

      {/* Result */}
      <div className="lg:col-span-2 space-y-4">
        {drivers && (
          <GapClosingPanel
            drivers={drivers}
            rr={rr}
            kf={kf}
            onApply={onApplyGap}
          />
        )}
        {plan && (
          <div className="rounded-2xl border bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] p-5 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Nuläge" value={kpi === "runway" ? `${Math.round(plan.currentValue)} dgr` : formatSEK(plan.currentValue)} />
              <Stat label="Mål" value={kpi === "runway" ? `${plan.requiredValue} dgr` : formatSEK(plan.requiredValue)} />
              <Stat label="Gap" value={kpi === "runway" ? `${Math.round(plan.gap)} dgr` : formatSEK(plan.gap)} cls={gapColor} />
              <Stat label="Gap %" value={`${plan.gapPct.toFixed(1)}%`} cls={gapColor} />
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
              {plan.recommendation}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {plan.requiredRevenueDelta != null && (
                <DeltaCard label="Krävd intäktsökning" value={plan.requiredRevenueDelta} />
              )}
              {plan.requiredCostDelta != null && (
                <DeltaCard label="Krävd kostnadsförändring" value={plan.requiredCostDelta} />
              )}
              {plan.requiredMarginDelta != null && (
                <DeltaCard label="Marginalförändring (pp)" value={plan.requiredMarginDelta} suffix=" pp" raw />
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#3b82f6]" />
                AI-förslag per period
              </h4>
              <Button size="sm" variant="outline" onClick={fetchAI} disabled={aiLoading} className="text-xs">
                {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Generera 3 åtgärder"}
              </Button>
            </div>

            {aiActions && aiActions.length > 0 && (
              <ul className="space-y-2">
                {aiActions.map((a, i) => (
                  <li key={i} className="rounded-xl border border-slate-200 p-3">
                    <div className="text-sm font-medium text-slate-900">{a.title}</div>
                    {a.impactSEK != null && (
                      <div className="text-xs text-[#085041] tabular-nums mt-0.5">+{formatSEK(a.impactSEK)}</div>
                    )}
                    {a.reasoning && <div className="text-xs text-slate-600 mt-1">{a.reasoning}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Saved targets */}
        <div className="rounded-2xl border bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] p-5">
          <h4 className="text-sm font-semibold mb-3">Sparade mål ({saved.length})</h4>
          {saved.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Inga mål sparade.</p>
          ) : (
            <ul className="space-y-2">
              {saved.map(t => (
                <li key={t.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100">{t.target_period}</span>
                    <span className="font-medium uppercase text-slate-700">{t.kpi}</span>
                    <span className="tabular-nums text-slate-900">
                      {t.kpi === "runway" ? `${t.target_value} dgr` : formatSEK(t.target_value)}
                    </span>
                  </div>
                  <button onClick={() => deleteTarget(t.id)} className="text-slate-400 hover:text-[#7A1A1A]">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={cn("text-base font-semibold tabular-nums text-slate-900", cls)}>{value}</div>
    </div>
  );
}

function DeltaCard({ label, value, suffix = "", raw = false }: { label: string; value: number; suffix?: string; raw?: boolean }) {
  const positive = value > 0;
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={cn("text-base font-semibold tabular-nums mt-0.5", positive ? "text-[#085041]" : "text-[#7A1A1A]")}>
        {positive ? "+" : ""}{raw ? value.toFixed(1) : formatSEK(Math.round(value))}{suffix}
      </div>
    </div>
  );
}
