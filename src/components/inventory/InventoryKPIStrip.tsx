import { Package, ShoppingCart, AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import { GradientKPIStrip, KPI_GRADIENTS } from "@/components/shared/GradientKPICard";
import { useInventoryStats } from "@/hooks/useInventoryData";

const fmtSEK = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

export const InventoryKPIStrip = () => {
  const { data, isLoading } = useInventoryStats();

  const kpis = [
    { label: "Lagervärde just nu", value: isLoading ? "…" : fmtSEK(data?.totalValue ?? 0), sub: "Konto 1460", icon: Package, gradient: KPI_GRADIENTS.indigo },
    { label: "Antal artiklar", value: isLoading ? "…" : `${data?.totalItems ?? 0} st`, sub: `${data?.totalItems ?? 0} unika produkter`, icon: ShoppingCart, gradient: KPI_GRADIENTS.blue },
    { label: "Lågt lager", value: isLoading ? "…" : `${data?.belowReorder ?? 0} artiklar`, sub: "Under beställningspunkt", icon: AlertTriangle, gradient: KPI_GRADIENTS.amber },
    { label: "Slut i lager", value: isLoading ? "…" : `${data?.outOfStock ?? 0} artiklar`, sub: "Saldo = 0", icon: RefreshCw, gradient: KPI_GRADIENTS.emerald },
    { label: "AI-rekommendationer", value: isLoading ? "…" : `${(data?.belowReorder ?? 0) + (data?.outOfStock ?? 0)} åtgärder`, sub: "Beställning behövs", icon: Sparkles, gradient: KPI_GRADIENTS.purple },
  ];

  return <GradientKPIStrip cards={kpis} columns={5} />;
};
