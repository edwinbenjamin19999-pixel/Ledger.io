import { Sparkles, AlertTriangle, TrendingDown, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  overdueCount: number;
  overdueAmount: number;
  canDeferAmount: number;
  canDeferCount: number;
  creditCount: number;
  creditAmount: number;
  onApplyCritical: () => void;
  onApplyOptimize: () => void;
  onApplyCredits: () => void;
  mode: "off" | "suggest" | "auto";
  onModeChange: (m: "off" | "suggest" | "auto") => void;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

export function PaymentSuggestionCard(props: Props) {
  const suggestions = [
    {
      key: "critical",
      tone: "rose" as const,
      icon: AlertTriangle,
      title: "Betala kritiska nu",
      amount: props.overdueAmount,
      reason: props.overdueCount > 0
        ? `${props.overdueCount} fakturor är förfallna eller förfaller inom 3 dagar.`
        : "Inga kritiska betalningar just nu.",
      action: props.onApplyCritical,
      disabled: props.overdueCount === 0,
      cta: "Markera",
    },
    {
      key: "optimize",
      tone: "cyan" as const,
      icon: TrendingDown,
      title: "Optimera likviditet",
      amount: props.canDeferAmount,
      reason: props.canDeferAmount > 0
        ? `Frigör ${fmt(props.canDeferAmount)} kr genom att skjuta fram ${props.canDeferCount} icke-kritiska.`
        : "Allt utestående är redan tidskritiskt.",
      action: props.onApplyOptimize,
      disabled: props.canDeferAmount === 0,
      cta: "Tillämpa",
    },
    {
      key: "credits",
      tone: "blue" as const,
      icon: Link2,
      title: "Använd kreditfakturor",
      amount: props.creditAmount,
      reason: props.creditCount > 0
        ? `${props.creditCount} kreditfakturor kan automatchas mot leverantörsfakturor.`
        : "Inga tillgängliga kreditfakturor.",
      action: props.onApplyCredits,
      disabled: props.creditCount === 0,
      cta: "Auto-matcha",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-[#EFF6FF]">
            <Sparkles className="h-4 w-4 text-[#3b82f6]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">AI Treasury-förslag</p>
            <p className="text-[11px] text-slate-500">Tre handlingar rangordnade efter likviditetspåverkan</p>
          </div>
        </div>
        <ModeToggle mode={props.mode} onChange={props.onModeChange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-100">
        {suggestions.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="bg-white px-4 py-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "p-1.5 rounded-md",
                  s.tone === "rose" && "bg-[#FCE8E8] text-[#7A1A1A]",
                  s.tone === "cyan" && "bg-[#EFF6FF] text-[#3b82f6]",
                  s.tone === "blue" && "bg-[#EFF6FF] text-blue-600",
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <p className="text-sm font-medium text-slate-900">{s.title}</p>
              </div>
              <p className={cn(
                "text-xl font-semibold tabular-nums",
                s.tone === "rose" && "text-[#7A1A1A]",
                s.tone === "cyan" && "text-[#3b82f6]",
                s.tone === "blue" && "text-blue-600",
              )}>
                {fmt(s.amount)} kr
              </p>
              <p className="text-[11px] text-slate-500 flex-1">{s.reason}</p>
              <Button
                size="sm"
                variant="outline"
                disabled={s.disabled}
                onClick={s.action}
                className="w-full mt-1"
              >
                {s.cta}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModeToggle({ mode, onChange }: { mode: "off" | "suggest" | "auto"; onChange: (m: "off" | "suggest" | "auto") => void }) {
  const modes: { v: "off" | "suggest" | "auto"; l: string }[] = [
    { v: "off", l: "Av" },
    { v: "suggest", l: "Förslag" },
    { v: "auto", l: "Auto" },
  ];
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[11px]">
      {modes.map(m => (
        <button
          key={m.v}
          type="button"
          onClick={() => onChange(m.v)}
          className={cn(
            "px-2.5 py-1 rounded-md transition-colors",
            mode === m.v ? "bg-white text-[#3b82f6] shadow-sm font-medium" : "text-slate-600 hover:text-slate-900",
          )}
        >
          {m.l}
        </button>
      ))}
    </div>
  );
}
