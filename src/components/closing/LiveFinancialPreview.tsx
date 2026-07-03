import { TrendingUp, Calculator, Wallet, Building2 } from "lucide-react";
import { formatSEK } from "@/lib/formatNumber";
import type { ClosingLivePreview } from "@/hooks/useClosingStatus";

interface Props {
  preview: ClosingLivePreview | undefined;
  isLoading: boolean;
}

export function LiveFinancialPreview({ preview, isLoading }: Props) {
  const kpis = [
    {
      label: "Årets resultat",
      value: preview?.net_result ?? 0,
      Icon: TrendingUp,
      hint: preview?.adjustments_count ? `Inkl. ${preview.adjustments_count} justeringar` : "Före justeringar",
    },
    {
      label: "Beräknad bolagsskatt",
      value: preview?.tax_estimate ?? 0,
      Icon: Calculator,
      hint: "20,6% av resultat",
    },
    {
      label: "Likvida medel",
      value: preview?.cash ?? 0,
      Icon: Wallet,
      hint: "Klass 19 (kassa & bank)",
    },
    {
      label: "Eget kapital",
      value: preview?.equity ?? 0,
      Icon: Building2,
      hint: preview?.br_diff && preview.br_diff > 1 ? `BR-diff: ${formatSEK(preview.br_diff)}` : "Balansräkning OK",
    },
  ];

  return (
    <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[16px]">
      <div className="mb-[14px] flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-medium text-[#0F172A]">Live finansiell preview</h2>
          <p className="text-[11px] text-[#94A3B8] mt-px">Uppdateras realtid vid varje justering</p>
        </div>
        <div className="inline-flex items-center gap-[6px] text-[11px] text-[#1D6E55]">
          <span className="w-[6px] h-[6px] rounded-full bg-[#1D9E75] animate-pulse" />
          Live
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[10px]">
        {kpis.map(({ label, value, Icon, hint }) => (
          <div
            key={label}
            className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[14px] flex flex-col gap-[6px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">{label}</span>
              <Icon className="h-[14px] w-[14px] text-[#475569]" />
            </div>
            <div className="text-[20px] font-medium tabular-nums tracking-[-0.02em] text-[#0F172A]">
              {isLoading ? "..." : formatSEK(value)}
            </div>
            {hint && <div className="text-[11px] text-[#94A3B8]">{hint}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
