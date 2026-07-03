import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Wallet, PieChart, Shield } from "lucide-react";
import { formatSEK } from "@/lib/formatNumber";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef, useState } from "react";
import type { AgaruttagKPIData } from "../hooks/useAgaruttagKPI";

interface Props {
  kpi: AgaruttagKPIData;
  gransbelopp: number;
  forestagenLonManad: number;
}

function AnimatedValue({ value, loading }: { value: number; loading: boolean }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (loading) return;
    const duration = 1200;
    const startTime = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, loading]);

  if (loading) return <Skeleton className="h-7 w-28" />;
  return (
    <p className="text-2xl font-bold text-[#0F1F3D] tabular-nums">
      {formatSEK(display)}
    </p>
  );
}

const cards = [
  { key: "ek" as const, label: "Eget kapital", sub: "Tillgängligt i bolaget", Icon: TrendingUp, iconBg: "bg-[#EFF6FF]", iconFg: "text-[#1E3A5F]" },
  { key: "lon" as const, label: "Optimalt ägaruttag (lön)", sub: "Rekommenderad månadslön", Icon: Wallet, iconBg: "bg-[#E1F5EE]", iconFg: "text-[#085041]" },
  { key: "k10" as const, label: "Utdelningsutrymme (K10)", sub: "Lågbeskattat utdelningsutrymme 20%", Icon: PieChart, iconBg: "bg-[#EFF6FF]", iconFg: "text-[#1E3A5F]" },
  { key: "pf" as const, label: "Periodiseringsfond", sub: "Skattemässig reserv", Icon: Shield, iconBg: "bg-[#FAEEDA]", iconFg: "text-[#7A5417]" },
];

export function HeroKPIRow({ kpi, gransbelopp, forestagenLonManad }: Props) {
  const values: Record<string, number> = {
    ek: kpi.egetKapital,
    lon: forestagenLonManad,
    k10: gransbelopp,
    pf: kpi.periodiseringsfond,
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <Card
          key={c.key}
          className="rounded-[12px] border-[0.5px] border-[#E2E8F0] bg-white animate-fade-in"
          style={{ animationDelay: `${i * 100}ms`, animationFillMode: "backwards" }}
        >
          <CardContent className="p-5">
            <div className={`h-9 w-9 rounded-[8px] flex items-center justify-center mb-3 ${c.iconBg}`}>
              <c.Icon className={`h-4 w-4 ${c.iconFg}`} />
            </div>
            <p className="text-xs text-[#64748B] mb-1">{c.label}</p>
            <AnimatedValue value={values[c.key]} loading={kpi.loading} />
            <p className="text-[11px] text-[#64748B] mt-1">{c.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
