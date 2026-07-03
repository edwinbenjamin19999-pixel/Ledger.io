/**
 * BudgetNarrativeCard — 3-row Vad/Varför/Att göra primitive driven by AI.
 */
import { useEffect, useState } from "react";
import { Sparkles, AlertCircle, Lightbulb, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Narrative {
  what: string;
  why: string;
  todo: string;
  cta_module?: string;
}

interface Props {
  companyId: string;
  budgetId: string;
  context: Record<string, unknown>;
  onTodoFocus?: () => void;
}

const MODULE_HREF: Record<string, string> = {
  hr: "/hr",
  invoices: "/invoices",
  cash: "/cash-command",
  budget: "/budget",
  suppliers: "/suppliers",
};

export function BudgetNarrativeCard({ companyId, budgetId, context, onTodoFocus }: Props) {
  const [narrative, setNarrative] = useState<Narrative | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!companyId || !budgetId) return;
    setLoading(true);
    setErr(null);
    supabase.functions.invoke("budget-planning-ai", {
      body: { mode: "narrative", company_id: companyId, context: { ...context, budget_id: budgetId } },
    }).then(({ data, error }) => {
      if (!active) return;
      if (error) { setErr(error.message); setLoading(false); return; }
      if (data?.what && data?.why && data?.todo) {
        setNarrative({ what: data.what, why: data.why, todo: data.todo, cta_module: data.cta_module });
      }
      setLoading(false);
    }).catch(e => { if (active) { setErr(String(e)); setLoading(false); } });
    return () => { active = false; };
  }, [companyId, budgetId, JSON.stringify(context)]);

  return (
    <div className="rounded-2xl border bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-[#3b82f6]" />
        <h3 className="text-sm font-semibold text-slate-900">AI CFO — Sammanfattning</h3>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
      </div>

      {err && <p className="text-xs text-[#7A1A1A]">Kunde inte hämta sammanfattning.</p>}

      {narrative && (
        <div className="space-y-3">
          <Row icon={<Sparkles className="w-3.5 h-3.5 text-[#3b82f6]" />} label="Vad" text={narrative.what} />
          <Row icon={<AlertCircle className="w-3.5 h-3.5 text-[#7A5417]" />} label="Varför" text={narrative.why} />
          <div className="flex items-start gap-3">
            <Lightbulb className="w-3.5 h-3.5 text-[#085041] mt-1" />
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Att göra</div>
              <div className="text-sm text-slate-800">{narrative.todo}</div>
            </div>
            {narrative.cta_module && MODULE_HREF[narrative.cta_module] ? (
              <Button asChild size="sm" variant="outline" className="text-xs">
                <Link to={MODULE_HREF[narrative.cta_module]}>
                  Öppna <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            ) : onTodoFocus ? (
              <Button size="sm" variant="outline" className="text-xs" onClick={onTodoFocus}>
                Visa åtgärder <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {!loading && !narrative && !err && (
        <p className="text-xs text-slate-500 italic">Ingen sammanfattning tillgänglig.</p>
      )}
    </div>
  );
}

function Row({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1">{icon}</div>
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{label}</div>
        <div className="text-sm text-slate-800">{text}</div>
      </div>
    </div>
  );
}
