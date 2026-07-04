import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight, QrCode, Trash2, DollarSign, RefreshCw, Leaf } from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, CLASS_LABELS, type AssetStatus } from "@/lib/asset-types";
import type { FixedAsset, DepreciationEntry } from "@/hooks/useAssets";
import { DepreciationChart } from "./DepreciationChart";

interface AssetCardProps { asset: FixedAsset;
  entries: DepreciationEntry[];
  bookValue: number;
  accumulated: number;
  onDispose: (id: string) => void;
  onScrap: (id: string) => void;
  onRevalue: (id: string) => void;
  onQR: (id: string) => void;
}

const CO2_FACTORS: Record<string, { kg: number; label: string }> = { computers: { kg: 331, label: "IT-utrustning, tillverkad" },
  furniture: { kg: 85, label: "Kontorsmöbler, tillverkade" },
  machinery: { kg: 1200, label: "Maskineri, tillverkat" },
  vehicles: { kg: 6000, label: "Fordonstillverkning" },
  software: { kg: 12, label: "Digital infrastruktur" },
};

export const AssetCard = ({ asset, entries, bookValue, accumulated, onDispose, onScrap, onRevalue, onQR }: AssetCardProps) => { const [open, setOpen] = useState(false);
  const status = asset.status as AssetStatus;
  const isFinancial = asset.asset_class === "financial";
  const depreciable = asset.acquisition_cost - (asset.residual_value || 0);
  const progress = depreciable > 0 ? Math.min((accumulated / depreciable) * 100, 100) : 0;
  const monthlyDepr = !isFinancial && asset.useful_life_years > 0
    ? Math.round(depreciable / (asset.useful_life_years * 12))
    : 0;

  // Tax value (30% degressive)
  const years = Math.max(0, new Date().getFullYear() - new Date(asset.acquisition_date).getFullYear());
  let taxValue = asset.acquisition_cost;
  for (let i = 0; i < years; i++) taxValue *= 0.7;
  taxValue = Math.round(taxValue);
  const taxDiff = bookValue - taxValue;

  // CO2
  const co2 = CO2_FACTORS[asset.category || ""] || null;

  // Asset ID
  const assetId = `ANG-${String(asset.id).substring(0, 4).toUpperCase()}`;

  // Insurance value (acquisition cost as replacement)
  const insuranceValue = asset.acquisition_cost;

  // Year-level data för IB/UB
  const currentYear = new Date().getFullYear();
  const ibEntries = entries.filter(e => new Date(e.period_end).getFullYear() < currentYear);
  const ytdEntries = entries.filter(e => new Date(e.period_end).getFullYear() === currentYear);
  const ibAccumulated = ibEntries.length > 0
    ? ibEntries.sort((a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime())[0]?.accumulated_depreciation || 0
    : 0;
  const ibBookValue = asset.acquisition_cost - ibAccumulated;
  const ytdDepreciation = ytdEntries.reduce((s, e) => s + e.depreciation_amount, 0);
  const ubBookValue = ibBookValue - ytdDepreciation;

  return (
    <Card className={`transition-all ${open ? "ring-1 ring-primary/30" : "hover:border-primary/30"}`}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="mt-1">
                  {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{asset.asset_name}</h3>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[status]}`}>
                      {STATUS_LABELS[status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {assetId} | {CLASS_LABELS[asset.asset_class]} / {asset.asset_type}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold tabular-nums">{bookValue.toLocaleString("sv-SE")} kr</p>
                <p className="text-[10px] text-muted-foreground">Bokfört värde</p>
              </div>
            </div>

            {!isFinancial && (
              <div className="mt-2 ml-7">
                <Progress value={progress} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-0.5">{Math.round(progress)}% avskrivet</p>
              </div>
            )}
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t pt-4">
            {/* Acquisition info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Anskaffning</span>
                <p className="font-medium">{asset.acquisition_date}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Anskaffningsvärde</span>
                <p className="font-medium">{asset.acquisition_cost.toLocaleString("sv-SE")} kr</p>
              </div>
              <div>
                <span className="text-muted-foreground">Anskaffning ex. moms</span>
                <p className="font-medium">{Math.round(asset.acquisition_cost * 0.8).toLocaleString("sv-SE")} kr</p>
              </div>
              {asset.supplier_name && (
                <div>
                  <span className="text-muted-foreground">Leverantör</span>
                  <p className="font-medium">{asset.supplier_name}</p>
                </div>
              )}
            </div>

            {/* Book depreciation */}
            {!isFinancial && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Bokföringsmässig avskrivning (K2, {asset.depreciation_method === "straight_line" ? "linjär" : asset.depreciation_method === "declining_balance_30" ? "30%" : "20%"} {asset.useful_life_years} år)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Månadsavskrivning</span>
                    <p className="font-medium">{monthlyDepr.toLocaleString("sv-SE")} kr</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">IB {currentYear}</span>
                    <p className="font-medium">{Math.round(ibBookValue).toLocaleString("sv-SE")} kr</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avskr {currentYear}</span>
                    <p className="font-medium">{Math.round(ytdDepreciation).toLocaleString("sv-SE")} kr</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">UB</span>
                    <p className="font-medium">{Math.round(ubBookValue).toLocaleString("sv-SE")} kr</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tax depreciation */}
            {!isFinancial && (
              <div className="bg-[#EFF6FF] dark:bg-blue-950/20 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-[#1E3A5F]">
                  Skattemässig avskrivning (30% degressiv)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Skattemässigt restvärde</span>
                    <p className="font-medium">{taxValue.toLocaleString("sv-SE")} kr</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Årets max-avskrivning</span>
                    <p className="font-medium">{Math.round(taxValue * 0.3).toLocaleString("sv-SE")} kr</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avskrivningsdifferens</span>
                    <p className={`font-medium ${taxDiff > 0 ? "text-[#7A5417]" : "text-[#085041]"}`}>
                      {taxDiff > 0 ? "+" : ""}{Math.round(taxDiff).toLocaleString("sv-SE")} kr
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ESG / CO2 */}
            {co2 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#E1F5EE] dark:bg-emerald-950/20 text-xs">
                <Leaf className="w-3.5 h-3.5 text-[#085041]" />
                <span className="text-[#085041] dark:text-[#1D9E75]">
                  {co2.label}: {co2.kg} kg CO2 (Scope 3) — Rapporterat i ESG-modulen
                </span>
              </div>
            )}

            {/* Insurance */}
            <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30">
              <span className="text-muted-foreground">Försäkringsvärde (återanskaffning): <strong>{insuranceValue.toLocaleString("sv-SE")} kr</strong></span>
              <Button variant="ghost" size="sm" className="h-6 text-[10px]">Uppdatera</Button>
            </div>

            {/* Depreciation chart */}
            {!isFinancial && (
              <DepreciationChart
                asset={asset}
                bookValue={bookValue}
                taxValue={taxValue}
              />
            )}

            {/* Action buttons */}
            {asset.status === "active" && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => onDispose(asset.id)}>
                  <DollarSign className="w-3 h-3" /> Avyttra
                </Button>
                <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => onScrap(asset.id)}>
                  <Trash2 className="w-3 h-3" /> Utrangera
                </Button>
                <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => onRevalue(asset.id)}>
                  <RefreshCw className="w-3 h-3" /> Omvärdera
                </Button>
                <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => onQR(asset.id)}>
                  <QrCode className="w-3 h-3" /> QR-kod
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
