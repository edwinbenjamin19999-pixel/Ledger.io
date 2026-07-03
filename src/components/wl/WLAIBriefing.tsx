import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { generateCFOInsights, type CFOInsight } from "@/lib/ai-cfo-insights";
import { useTenant } from "@/contexts/TenantContext";

interface Props {
  companyId: string;
  userName?: string;
}

const STORAGE_PREFIX = "wl-ai-briefing-shown:";

function fmtSEK(n: number): string {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n)) + " kr";
}

/**
 * White-label CFO briefing panel — the signature surface of a tenant deployment.
 *
 *   FOKUS NORDIC AI EKONOM
 *   Spårbar analys · Revisionslogg aktiv
 *   ─────────────────────────────────────────
 *   • 2 fakturor förfallna                85 000 kr
 *   • Kassaflöde stabilt kommande 14 dagar
 *   • 20 verifikationer kräver granskning
 *
 *   [Visa analys]  [Åtgärda]  [Ignorera]
 *
 * No bubbles, no chat UI, no emojis, no avatar — just executive lines.
 * A single 2px brand-colored top border is the only chrome.
 */
export function WLAIBriefing({ companyId }: Props) {
  const navigate = useNavigate();
  const { tenant } = useTenant();

  const aiLabel = useMemo(() => {
    if (tenant?.ai?.ai_name) return tenant.ai.ai_name;
    if (tenant?.name) return `${tenant.name} AI Ekonom`;
    return "AI Ekonom";
  }, [tenant]);

  const [show, setShow] = useState(false);
  const [cash, setCash] = useState<number>(0);
  const [insights, setInsights] = useState<CFOInsight[]>([]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const key = `${STORAGE_PREFIX}${companyId}:${today}`;
    if (typeof window !== "undefined" && window.localStorage.getItem(key)) return;

    let active = true;
    (async () => {
      const [bankRes, ins] = await Promise.all([
        supabase.from("bank_accounts").select("balance").eq("company_id", companyId).eq("is_active", true),
        generateCFOInsights(companyId),
      ]);
      if (!active) return;
      const total = (bankRes.data || []).reduce((s, b: any) => s + Number(b.balance || 0), 0);
      setCash(total);
      setInsights(ins.slice(0, 4));
      setShow(true);
    })();
    return () => { active = false; };
  }, [companyId]);

  const dismiss = () => {
    const today = new Date().toISOString().split("T")[0];
    const key = `${STORAGE_PREFIX}${companyId}:${today}`;
    if (typeof window !== "undefined") window.localStorage.setItem(key, "1");
    setShow(false);
  };

  const handleAct = () => {
    const firstAction = insights.find((i) => i.severity === "action");
    if (firstAction?.ctaRoute) navigate(firstAction.ctaRoute);
    else navigate("/cfo");
    dismiss();
  };

  if (!show) return null;

  const actionCount = insights.filter((i) => i.severity === "action").length;
  const headline =
    actionCount > 0
      ? `${actionCount} ${actionCount === 1 ? "post" : "poster"} kräver granskning`
      : "Operativt läge stabilt";

  const visibleInsights = insights.slice(0, 3);

  return (
    <section
      className="rounded-2xl border border-border bg-card text-card-foreground p-6 sm:p-7 border-t-2"
      style={{ borderTopColor: `hsl(var(--brand-primary))` }}
    >
      {/* Identity row */}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">
            {aiLabel}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/80 tracking-wide">
            Spårbar analys · Revisionslogg aktiv
          </p>
          <h2 className="mt-3 text-[18px] sm:text-[19px] font-semibold text-foreground leading-tight">
            {headline}
          </h2>
        </div>

        <div className="hidden sm:block flex-shrink-0 text-right">
          <p className="text-[11px] uppercase tracking-[0.12em] font-medium text-muted-foreground">
            Likvid kassa
          </p>
          <p className="mt-1.5 text-[20px] font-semibold text-foreground tabular-nums">
            {fmtSEK(cash)}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border my-5" />

      {/* Insight rows */}
      {visibleInsights.length > 0 ? (
        <ul className="space-y-2.5">
          {visibleInsights.map((i) => {
            const amount =
              typeof i.impactSEK === "number" && Number.isFinite(i.impactSEK) && i.impactSEK !== 0
                ? fmtSEK(Math.abs(i.impactSEK))
                : null;
            return (
              <li
                key={i.id}
                className="flex items-baseline justify-between gap-4 text-sm"
              >
                <div className="min-w-0 flex items-baseline gap-2">
                  <span
                    aria-hidden
                    className={
                      i.severity === "action"
                        ? "text-[#7A1A1A]"
                        : i.severity === "insight"
                          ? "text-muted-foreground"
                          : "text-[#085041]"
                    }
                  >
                    •
                  </span>
                  <span className="text-foreground/80 truncate">{i.title}</span>
                </div>
                {amount && (
                  <span className="tabular-nums font-medium text-foreground shrink-0">
                    {amount}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Inga aktiva signaler att granska.</p>
      )}

      {/* Action row */}
      <div className="mt-6 flex items-center gap-5 text-sm">
        <button
          onClick={() => { navigate("/cfo"); dismiss(); }}
          className="font-semibold transition-colors hover:opacity-80"
          style={{ color: `hsl(var(--brand-primary))` }}
        >
          Visa analys →
        </button>
        {actionCount > 0 && (
          <button
            onClick={handleAct}
            className="font-medium text-foreground/80 hover:text-foreground transition-colors"
          >
            Åtgärda
          </button>
        )}
        <button
          onClick={dismiss}
          className="font-medium text-muted-foreground hover:text-foreground transition-colors ml-auto"
        >
          Ignorera
        </button>
      </div>
    </section>
  );
}
