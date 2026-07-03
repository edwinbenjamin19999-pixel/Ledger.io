import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getLiquidCash } from "@/lib/cash/getLiquidCash";
import { generateCFOInsights, type CFOInsight } from "@/lib/ai-cfo-insights";
import { computeCompanyHealth, type CompanyHealthSignal } from "@/lib/cfo/companyHealthSignal";
import { useNavigate } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { useAnomalyCount } from "@/hooks/useAnomalyCount";
import { AlertTriangle } from "lucide-react";

interface Props {
  companyId: string;
  userName?: string;
}

const STORAGE_PREFIX = "ai-briefing-shown:";

function fmtSEK(n: number): string {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n)) + " kr";
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 10) return "God morgon";
  if (h < 17) return "Hej";
  return "God kväll";
}

/**
 * Daily AI Briefing — executive summary, not a feature card.
 * Calm, neutral, premium financial-grade.
 */
export function DailyAIBriefing({ companyId, userName }: Props) {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const briefingLabel = tenant?.ai?.ai_name ? tenant.ai.ai_name : "AI Ekonom";
  const [show, setShow] = useState(false);
  const [cash, setCash] = useState<number>(0);
  const [insights, setInsights] = useState<CFOInsight[]>([]);
  const [health, setHealth] = useState<CompanyHealthSignal | null>(null);
  const anomalyCount = useAnomalyCount(companyId);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const key = `${STORAGE_PREFIX}${companyId}:${today}`;
    if (typeof window !== "undefined" && window.localStorage.getItem(key)) return;

    let active = true;
    (async () => {
      const [ledgerCash, bankRes, ins, txRes] = await Promise.all([
        // Kanonisk källa — samma siffra som dashboard, Cash Command, AI-assistenten.
        getLiquidCash(companyId),
        supabase.from("bank_accounts").select("balance").eq("company_id", companyId).eq("is_active", true),
        generateCFOInsights(companyId),
        // Estimate monthly burn from last 90 days of bank transactions for the health signal.
        supabase
          .from("bank_transactions")
          .select("amount, booking_date")
          .eq("company_id", companyId)
          .gte("booking_date", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
      ]);
      if (!active) return;
      const bankTotal = (bankRes.data || []).reduce((s, b: any) => s + Number(b.balance || 0), 0);
      const total = ledgerCash !== 0 ? ledgerCash : bankTotal;
      const tx = (txRes.data || []) as Array<{ amount: number | null }>;
      const net90 = tx.reduce((s, t) => s + Number(t.amount || 0), 0);
      const monthlyBurn = Math.max(0, -net90 / 3);
      setCash(total);
      setHealth(computeCompanyHealth({ cash: total, monthlyBurn }));
      setInsights(ins.slice(0, 4));
      setShow(true);
    })();
    return () => {
      active = false;
    };
  }, [companyId]);

  const dismiss = () => {
    const today = new Date().toISOString().split("T")[0];
    const key = `${STORAGE_PREFIX}${companyId}:${today}`;
    if (typeof window !== "undefined") window.localStorage.setItem(key, "1");
    setShow(false);
  };

  if (!show) return null;

  const actions = insights.filter((i) => i.severity === "action");
  // Health signal trumps action count — never say "Allt ser bra ut" when liquidity is critical.
  const headline =
    health && health.status !== "ok"
      ? health.headline
      : actions.length > 0
      ? `${actions.length} ${actions.length === 1 ? "sak kräver" : "saker kräver"} din uppmärksamhet`
      : "Allt ser bra ut just nu";

  return (
    <div className="bg-[#EFF6FF] border-[0.5px] border-[#B5D4F4] rounded-[12px] p-[14px]">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="w-[18px] h-[18px] rounded-full bg-[#0B4F6C] flex items-center justify-center flex-shrink-0">
              <span className="w-[7px] h-[7px] rounded-full bg-[#E6F4FA]" />
            </span>
            <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#0C447C]">
              {briefingLabel}
            </p>
          </div>
          <h2 className="mt-1.5 text-[22px] font-medium text-[#0F172A] leading-none tracking-[-0.03em]">
            {greeting()}{userName ? `, ${userName}` : ""}
          </h2>
          <p className="mt-1 text-[13px] text-[#185FA5]">{headline}</p>

          {insights.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {insights.slice(0, 3).map((i) => (
                <li key={i.id} className="text-[13px] text-[#185FA5] flex items-start">
                  <span className="text-[#0B4F6C]/60 mr-2">•</span>
                  <span>{i.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="hidden sm:block flex-shrink-0 text-right">
          <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#0C447C]">Kassa</p>
          <p className="mt-1.5 text-[22px] font-medium text-[#0F172A] tabular-nums leading-none tracking-[-0.03em]">{fmtSEK(cash)}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-4 text-[13px] flex-wrap">
        <button
          onClick={() => {
            navigate("/cfo");
            dismiss();
          }}
          className="font-medium text-[#0B4F6C] hover:text-[#1074A0] transition-colors"
        >
          Visa analys →
        </button>
        {anomalyCount > 0 && (
          <button
            onClick={() => {
              navigate("/anomaly-detection");
              dismiss();
            }}
            className="inline-flex items-center gap-1.5 font-medium text-[#B45309] hover:text-[#92400E] transition-colors"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {anomalyCount} {anomalyCount === 1 ? "avvikelse att granska" : "avvikelser att granska"} →
          </button>
        )}
        {actions.length > 0 && (
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("open-ai-assistant", {
                detail: {
                  message: `Gå igenom de ${actions.length} sakerna som behöver min uppmärksamhet — ge mig en kort sammanfattning av varje och vad jag behöver göra.`,
                  autoSend: true,
                },
              }));
            }}
            className="font-medium text-[#0B4F6C] hover:text-[#1074A0] transition-colors"
          >
            Vill du att jag går igenom dem? →
          </button>
        )}
        <button
          onClick={dismiss}
          className="font-medium text-[#185FA5]/70 hover:text-[#0C447C] transition-colors"
        >
          Påminn senare
        </button>
      </div>
    </div>
  );
}
