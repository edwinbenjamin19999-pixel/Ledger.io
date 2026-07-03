import { PosDailySales, formatKr } from "@/hooks/useKassaregister";
import { ShoppingBag, CreditCard, Scale, FileCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

interface Props { todaySales: PosDailySales | undefined;
  yesterdaySales: PosDailySales | undefined;
  monthTotal: number;
  monthVat: number;
  monthRefunds: number;
}

/* ─── Animated number ─── */
const AnimatedNumber = ({ value }: { value: string }) => (
  <span className="text-2xl font-bold text-white tabular-nums whitespace-nowrap">{value}</span>
);

/* ─── Mini donut SVG ─── */
const MiniDonut = ({ pct, colorA, colorB }: { pct: number; colorA: string; colorB: string }) => {
  const r = 14, c = 2 * Math.PI * r;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r={r} fill="none" stroke={colorB} strokeWidth="4" opacity="0.3" />
      <circle cx="18" cy="18" r={r} fill="none" stroke={colorA} strokeWidth="4"
        strokeDasharray={`${c * pct} ${c * (1 - pct)}`}
        strokeDashoffset={c * 0.25} strokeLinecap="round" />
    </svg>
  );
};

/* ─── Gradient KPI Card ─── */
const KPICard = ({ gradient, icon: Icon, label, value, sub, badge, extra }: {
  gradient: string; icon: React.ElementType; label: string;
  value: string; sub?: string; badge?: React.ReactNode; extra?: React.ReactNode;
}) => (
  <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-[0_8px_32px_rgba(0,0,0,0.15)]`}>
    <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
    <div className="relative">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
          <Icon className="w-4.5 h-4.5" />
        </div>
        {badge}
        {extra}
      </div>
      <AnimatedNumber value={value} />
      <p className="text-[11px] text-white/70 mt-1 uppercase tracking-wider font-medium">{label}</p>
      {sub && <p className="text-xs text-white/60 mt-0.5">{sub}</p>}
    </div>
  </div>
);

/* ─── Sales by hour chart ─── */
const SalesByHourChart = ({ todaySales }: { todaySales: PosDailySales | undefined }) => {
  const currentHour = new Date().getHours();
  // Mock hourly data distribution
  const totalSales = todaySales?.total_sales || 0;
  const hourlyWeights = [0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 5, 8, 12, 6, 5, 7, 9, 11, 8, 5, 3, 2, 1, 0];
  const totalWeight = hourlyWeights.reduce((a, b) => a + b, 0) || 1;
  
  const data = Array.from({ length: 15 }, (_, i) => {
    const hour = i + 8;
    const sales = Math.round((hourlyWeights[hour] / totalWeight) * totalSales);
    const avg = Math.round(totalSales / 15);
    return { hour: `${String(hour).padStart(2, "0")}:00`, sales, isPeak: sales > avg * 1.2, isCurrent: hour === currentHour, isBelow: sales < avg * 0.8 };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Försäljning per timme</h3>
        <span className="text-xs text-muted-foreground">Idag</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barCategoryGap="15%">
          <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={2} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={50}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-white/97 backdrop-blur-sm border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                  <p className="font-semibold">{d.hour}</p>
                  <p className="text-muted-foreground">{formatKr(d.sales)}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="sales" radius={[6, 6, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.isCurrent ? "#8b5cf6" : entry.isPeak ? "#10b981" : entry.isBelow ? "#93c5fd" : "#3b82f6"}
                opacity={entry.isCurrent ? 1 : 0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Topptimmar</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Normal</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" />Nu</span>
      </div>
    </div>
  );
};

export function PosKPICards({ todaySales, yesterdaySales, monthTotal, monthVat, monthRefunds }: Props) {
  const changePercent = todaySales && yesterdaySales && yesterdaySales.total_sales > 0
    ? ((todaySales.total_sales - yesterdaySales.total_sales) / yesterdaySales.total_sales) * 100
    : null;

  const todayTotal = todaySales?.total_sales || 0;
  const cardAmount = todaySales?.card_amount || 0;
  const cashAmount = todaySales?.cash_amount || 0;
  const totalPayments = cardAmount + cashAmount || 1;
  const cardPct = Math.round((cardAmount / totalPayments) * 100);
  const cashPct = 100 - cardPct;

  const diff = 0; // Mock: cash discrepancy
  const zReportDone = false; // Z-report status determined separately

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          gradient="from-emerald-500 to-teal-600"
          icon={ShoppingBag}
          label="Dagsomsättning"
          value={formatKr(todayTotal)}
          sub="Kassaförsäljning idag"
          badge={
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200" />
              </span>
              <span className="text-[10px] text-white/70">Live</span>
            </div>
          }
        />

        <KPICard
          gradient="from-blue-500 to-indigo-600"
          icon={CreditCard}
          label="Kontant vs Kort"
          value={`Kort ${cardPct}% | Kontant ${cashPct}%`}
          sub="Betalningsmetoder idag"
          extra={<MiniDonut pct={cardPct / 100} colorA="#ffffff" colorB="rgba(255,255,255,0.3)" />}
        />

        <KPICard
          gradient={diff === 0 ? "from-emerald-500 to-green-600" : "from-rose-500 to-red-600"}
          icon={Scale}
          label="Kassadifferens"
          value={diff === 0 ? "0,00 kr" : formatKr(diff)}
          sub="Differens vid stängning"
        />

        <KPICard
          gradient="from-violet-600 to-purple-700"
          icon={FileCheck}
          label="Z-rapport status"
          value={zReportDone ? "Klar" : "Ej stängd"}
          sub="Senaste Z-rapport"
          badge={zReportDone ? (
            <span className="text-[10px] bg-emerald-400/30 text-emerald-100 px-2 py-0.5 rounded-full">OK</span>
          ) : (
            <span className="text-[10px] bg-amber-400/30 text-amber-100 px-2 py-0.5 rounded-full animate-pulse">Öppen</span>
          )}
        />
      </div>

      {/* Sales by Hour Chart */}
      <SalesByHourChart todaySales={todaySales} />
    </div>
  );
}
