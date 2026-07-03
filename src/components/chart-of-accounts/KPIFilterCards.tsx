import { List, CheckCircle, Tag, XCircle, TrendingUp } from "lucide-react";
import type { KPIFilter } from "./useChartOfAccounts";

interface Props {
  stats: { total: number; active: number; withVat: number; inactive: number };
  currentFilter: KPIFilter;
  onFilterChange: (f: KPIFilter) => void;
}

export function KPIFilterCards({ stats, currentFilter, onFilterChange }: Props) {
  const cards: { value: number; label: string; sub: string; trend: string; icon: React.ReactNode; filter: KPIFilter }[] = [
    { value: stats.total, label: "Totalt antal konton", sub: "BAS 2026-standard", trend: "+12 denna månad", icon: <List className="w-5 h-5" />, filter: "all" },
    { value: stats.active, label: "Aktiva konton", sub: "Aktiverade i bokföringen", trend: "+3 denna vecka", icon: <CheckCircle className="w-5 h-5" />, filter: "active" },
    { value: stats.withVat, label: "Med momskod", sub: "Momspliktiga konton", trend: "Stabilt", icon: <Tag className="w-5 h-5" />, filter: "vat" },
    { value: stats.inactive, label: "Inaktiva konton", sub: "Ej använda i bokföringen", trend: "", icon: <XCircle className="w-5 h-5" />, filter: "all" },
  ];

  const accentMap: Record<string, { gradient: string; border: string; bg: string; iconBg: string; iconText: string; numText: string }> = {
    all: { gradient: "from-slate-50 to-white", border: "border-slate-200", bg: "bg-gradient-to-br", iconBg: "bg-slate-100", iconText: "text-slate-500", numText: "text-slate-900" },
    active: { gradient: "from-emerald-50/80 to-white", border: "border-[#BFE6D6]", bg: "bg-gradient-to-br", iconBg: "bg-[#E1F5EE]", iconText: "text-[#085041]", numText: "text-[#085041]" },
    vat: { gradient: "from-violet-50/80 to-white", border: "border-[#E2E8F0]", bg: "bg-gradient-to-br", iconBg: "bg-[#F1F5F9]", iconText: "text-violet-600", numText: "text-violet-700" },
  };

  return (
    <div className="grid grid-cols-4 gap-4 px-8 py-5">
      {cards.map((card, idx) => {
        const isInactiveCard = idx === 3;
        const active = !isInactiveCard && currentFilter === card.filter;
        const accent = accentMap[card.filter] || accentMap.all;
        return (
          <button
            key={idx}
            onClick={() => !isInactiveCard && onFilterChange(card.filter === currentFilter ? "all" : card.filter)}
            className={`text-left p-6 rounded-2xl border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
              isInactiveCard
                ? "border-slate-200 bg-gradient-to-br from-slate-50/50 to-white cursor-default opacity-80"
                : active
                  ? `${accent.border} ${accent.bg} ${accent.gradient} shadow-md`
                  : `border-slate-200 bg-gradient-to-br from-slate-50/30 to-white hover:border-slate-300`
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
              active ? `${accent.iconBg} ${accent.iconText}` : isInactiveCard ? "bg-slate-100 text-slate-400" : "bg-slate-100 text-slate-400"
            }`}>
              {card.icon}
            </div>
            <p className={`text-3xl font-black tracking-tight tabular-nums ${
              active ? accent.numText : isInactiveCard ? "text-slate-500" : "text-slate-900"
            }`}>
              {card.value}
            </p>
            <p className="text-sm font-medium text-slate-700 mt-0.5">{card.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
            {card.trend && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-[#085041]" />
                <span className="text-[11px] text-[#085041] font-medium">{card.trend}</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
