import { Package, AlertTriangle, RefreshCw, Archive } from "lucide-react";
import type { FixedAsset, DepreciationEntry } from "@/hooks/useAssets";

interface AssetKPIStripProps { assets: FixedAsset[];
  entries: DepreciationEntry[];
  getBookValue: (a: FixedAsset) => number;
  getAccumulated: (a: FixedAsset) => number;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

const KPICard = ({ gradient, icon: Icon, label, value, sub, pulsing }: {
  gradient: string; icon: React.ElementType; label: string;
  value: string; sub?: string; pulsing?: boolean;
}) => (
  <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-[0_8px_32px_rgba(0,0,0,0.15)]`}>
    <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
    <div className="relative">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center ${pulsing ? "animate-pulse" : ""}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <span className="text-2xl font-bold text-white tabular-nums whitespace-nowrap">{value}</span>
      <p className="text-[11px] text-white/70 mt-1 uppercase tracking-wider font-medium">{label}</p>
      {sub && <p className="text-xs text-white/60 mt-0.5">{sub}</p>}
    </div>
  </div>
);

export const AssetKPIStrip = ({ assets, entries, getBookValue, getAccumulated }: AssetKPIStripProps) => {
  const active = assets.filter(a => a.status === "active" || a.status === "in_progress");
  
  const totalBookValue = active.reduce((s, a) => s + getBookValue(a), 0);

  // Items under min stock (simulated — assets don't have min stock, but we flag fully depreciated)
  const fullyDepreciated = active.filter(a => {
    if (a.asset_class === "financial") return false;
    return getBookValue(a) <= (a.residual_value || 0) + 0.01;
  });

  // Inventory turnover (simplified)
  const totalAcquisition = active.reduce((s, a) => s + a.acquisition_cost, 0);
  const totalAccumulated = active.reduce((s, a) => s + getAccumulated(a), 0);
  const turnoverRate = totalBookValue > 0 ? Math.round((totalAccumulated / totalBookValue) * 10) / 10 : 0;

  // Obsolete items (> 180 days old with no recent depreciation entries)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
  const obsolete = active.filter(a => {
    const assetEntries = entries.filter(e => e.fixed_asset_id === a.id);
    if (assetEntries.length === 0) return false;
    const lastEntry = assetEntries.sort((a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime())[0];
    return new Date(lastEntry.period_end) < sixMonthsAgo && getBookValue(a) <= (a.residual_value || 0) + 1;
  });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        gradient="from-violet-600 to-purple-700"
        icon={Package}
        label="Lagervärde"
        value={`${fmt(totalBookValue)} kr`}
        sub="Bokfört restvärde"
      />

      <KPICard
        gradient={fullyDepreciated.length > 0 ? "from-rose-500 to-red-600" : "from-emerald-500 to-blue-600"}
        icon={AlertTriangle}
        label="Fullt avskrivna"
        value={`${fullyDepreciated.length} st`}
        sub="Kräver utvärdering"
        pulsing={fullyDepreciated.length > 0}
      />

      <KPICard
        gradient="from-blue-500 to-indigo-600"
        icon={RefreshCw}
        label="Avskrivningsgrad"
        value={totalAcquisition > 0 ? `${Math.round((totalAccumulated / totalAcquisition) * 100)}%` : "0%"}
        sub="Ack. avskr. / anskaffning"
      />

      <KPICard
        gradient="from-amber-500 to-orange-600"
        icon={Archive}
        label="Inkuranta tillgångar"
        value={`${obsolete.length} st`}
        sub="Ej avskrivna > 180 dagar"
      />
    </div>
  );
};
