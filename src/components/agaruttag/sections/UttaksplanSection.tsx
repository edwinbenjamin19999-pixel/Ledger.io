import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Check, Clock, AlertCircle } from "lucide-react";
import { formatSEK } from "@/lib/formatNumber";
import { useMemo, useEffect, useState } from "react";

interface Props {
  forestagenLonManad: number;
  gransbelopp: number;
}

interface PlanRow {
  month: string;
  type: "lon" | "utdelning" | "fond";
  amount: number;
  status: "paid" | "today" | "planned";
}

const TYPE_STYLES = {
  lon: "bg-[#EFF6FF] text-[#1E3A5F] border-[#C8DDF5]",
  utdelning: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]",
  fond: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]",
};
const TYPE_LABELS = { lon: "Lön", utdelning: "Utdelning", fond: "Fond" };

const STATUS_CONFIG = {
  paid: { label: "Utbetald", icon: Check, cls: "text-[#085041]" },
  today: { label: "Förfaller idag", icon: AlertCircle, cls: "text-[#7A5417] animate-pulse" },
  planned: { label: "Planerad", icon: Clock, cls: "text-[#64748B]" },
};

export function UttaksplanSection({ forestagenLonManad, gransbelopp }: Props) {
  const rows = useMemo<PlanRow[]>(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const months = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

    const plan: PlanRow[] = [];
    for (let i = 0; i < Math.min(4, 12); i++) {
      plan.push({
        month: `${months[i]} 2026`,
        type: "lon",
        amount: forestagenLonManad,
        status: i < currentMonth ? "paid" : i === currentMonth ? "today" : "planned",
      });
    }
    plan.push({ month: "Jun 2026", type: "utdelning", amount: gransbelopp, status: currentMonth > 5 ? "paid" : "planned" });
    plan.push({ month: "Dec 2026", type: "fond", amount: 78900, status: "planned" });
    return plan;
  }, [forestagenLonManad, gransbelopp]);

  // Progress bar data
  const { paid, total } = useMemo(() => {
    const paidAmt = rows.filter(r => r.status === "paid").reduce((s, r) => s + r.amount, 0);
    const totalAmt = rows.reduce((s, r) => s + r.amount, 0);
    return { paid: paidAmt, total: totalAmt };
  }, [rows]);

  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

  // Animate progress bar width
  const [barWidth, setBarWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setBarWidth(pct), 100);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <Card className="rounded-[12px] border-[0.5px] border-[#E2E8F0] bg-white flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg text-[#0F1F3D]">Uttaksplan 2026</CardTitle>
        <CardDescription className="text-[#64748B]">Planerade utbetalningar</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 space-y-2">
          {rows.map((r, i) => {
            const S = STATUS_CONFIG[r.status];
            return (
              <div key={i} className="flex items-center gap-3 rounded-[8px] border-[0.5px] border-[#E2E8F0] p-3">
                <span className="text-xs text-[#64748B] w-20 shrink-0">{r.month}</span>
                <Badge variant="outline" className={`text-[10px] ${TYPE_STYLES[r.type]}`}>
                  {TYPE_LABELS[r.type]}
                </Badge>
                <span className="ml-auto text-sm font-medium tabular-nums text-[#0F1F3D]">{formatSEK(r.amount)}</span>
                <span className={`flex items-center gap-1 text-[10px] ${S.cls} shrink-0`}>
                  <S.icon className="h-3 w-3" />
                  {S.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#0F1F3D]">Uttaget hittills 2026</span>
            <span className="text-[#64748B] tabular-nums">{pct}%</span>
          </div>
          <div className="h-3 rounded-full bg-[#F1F5F9] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#0F1F3D] transition-all duration-1000 ease-out"
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <p className="text-[11px] text-[#64748B] tabular-nums">
            {formatSEK(paid)} av planerade {formatSEK(total)} ({pct}%)
          </p>
        </div>

        <Button variant="outline" size="sm" className="mt-4 w-full gap-1.5 border-[#E2E8F0] text-[#0F1F3D]">
          <Plus className="h-3.5 w-3.5" />
          Lägg till uttag
        </Button>
      </CardContent>
    </Card>
  );
}
