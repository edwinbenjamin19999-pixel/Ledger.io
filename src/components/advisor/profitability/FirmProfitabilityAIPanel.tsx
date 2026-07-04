import { useMemo } from "react";
import { Sparkles, TrendingDown, Zap, ArrowUpRight, AlertTriangle } from "lucide-react";
import type { ClientProfitability, ProfitabilitySuggestion } from "@/hooks/useFirmProfitability";
import { cn } from "@/lib/utils";

const fmtSEK = (n: number | null | undefined) => {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";
};

const KIND_META: Record<
  ProfitabilitySuggestion["kind"],
  { icon: typeof Sparkles; tone: string; label: string }
> = {
  price_increase: { icon: ArrowUpRight, tone: "amber", label: "Prishöjning" },
  automate: { icon: Zap, tone: "violet", label: "Automation" },
  renegotiate: { icon: AlertTriangle, tone: "rose", label: "Omförhandla" },
  review_scope: { icon: TrendingDown, tone: "amber", label: "Fakturera" },
  celebrate: { icon: Sparkles, tone: "emerald", label: "Premium" },
};

const TONE_BG: Record<string, string> = {
  amber: "bg-[#FAEEDA] border-[#F0DDB7] text-[#7A5417]",
  violet: "bg-[#F1F5F9] border-[#E2E8F0] text-violet-900",
  rose: "bg-[#FCE8E8] border-[#F4C8C8] text-[#7A1A1A]",
  emerald: "bg-[#E1F5EE] border-[#BFE6D6] text-[#085041]",
};

const TONE_ICON: Record<string, string> = {
  amber: "text-[#7A5417] bg-[#FAEEDA]",
  violet: "text-violet-600 bg-[#F1F5F9]",
  rose: "text-[#7A1A1A] bg-[#FCE8E8]",
  emerald: "text-[#085041] bg-[#E1F5EE]",
};

interface Props {
  rows: ClientProfitability[];
  onOpenClient?: (clientId: string) => void;
}

export function FirmProfitabilityAIPanel({ rows, onOpenClient }: Props) {
  const { critical, opportunities, totalUplift, premiumCount } = useMemo(() => {
    const withSuggestion = rows.filter((r) => r.suggestion);
    const critical = withSuggestion.filter((r) => r.tier === "critical").slice(0, 3);
    const opportunities = withSuggestion
      .filter((r) => r.tier === "warning" || r.tier === "healthy")
      .slice(0, 3);
    const totalUplift = withSuggestion.reduce(
      (acc, r) => acc + (r.suggestion?.estimatedUplift ?? 0),
      0,
    );
    const premiumCount = rows.filter((r) => r.tier === "premium").length;
    return { critical, opportunities, totalUplift, premiumCount };
  }, [rows]);

  if (rows.length === 0) return null;

  return (
    <div
      className="rounded-3xl p-6 text-white relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, hsl(220 47% 11%) 0%, hsl(222 47% 14%) 50%, hsl(243 75% 22%) 100%)",
      }}
    >
      <div
        className="absolute -top-10 -right-10 w-72 h-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(var(--brand-primary)) 0%, transparent 70%)" }}
      />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-[#3b82f6]" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#3b82f6]/80">
                AI Profit Coach
              </p>
              <h3 className="text-base font-bold tracking-tight">Lönsamhetsanalys</h3>
            </div>
          </div>
          <div className="flex items-center gap-6 text-right">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Möjlig uppsida</p>
              <p className="text-xl font-bold text-emerald-300 tabular-nums">{fmtSEK(totalUplift)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Premium</p>
              <p className="text-xl font-bold text-[#3b82f6] tabular-nums">{premiumCount}</p>
            </div>
          </div>
        </div>

        {critical.length === 0 && opportunities.length === 0 ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-center">
            <Sparkles className="h-6 w-6 text-emerald-300 mx-auto mb-2" />
            <p className="text-sm font-medium">Hela portföljen är lönsam.</p>
            <p className="text-xs text-white/60 mt-1">
              Inga kritiska klienter just nu — fokusera på tillväxt.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...critical, ...opportunities].slice(0, 4).map((r) => {
              const sug = r.suggestion!;
              const meta = KIND_META[sug.kind];
              const Icon = meta.icon;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onOpenClient?.(r.id)}
                  className={cn(
                    "text-left rounded-2xl border p-4 transition-all hover:scale-[1.01] hover:shadow-lg",
                    TONE_BG[meta.tone],
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0",
                        TONE_ICON[meta.tone],
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-xs font-bold uppercase tracking-wider opacity-70">
                          {meta.label}
                        </p>
                        {sug.estimatedUplift !== null && (
                          <span className="text-[10px] font-bold tabular-nums opacity-80">
                            +{fmtSEK(sug.estimatedUplift)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold truncate">{r.name}</p>
                      <p className="text-xs font-medium mt-0.5">{sug.headline}</p>
                      <p className="text-[11px] opacity-75 mt-1 line-clamp-2">{sug.detail}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
