import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Leaf, Award, Target, Calendar, CheckCircle2, AlertTriangle, XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Line, ComposedChart, Bar,
} from "recharts";
import { ESGReporting, useESGData } from "@/components/esg/ESGReporting";
import { cn } from "@/lib/utils";

const formatTon = (v: number) => v < 0.001 ? "0 kg" : v < 1 ? `${(v * 1000).toFixed(0)} kg` : `${v.toFixed(1)} ton`;
const fmt = (n: number) => new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const dur = 700, start = performance.now(), from = display;
    const step = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      setDisplay(Math.round(from + (value - from) * t));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <span className="tabular-nums">{fmt(display)}{suffix}</span>;
}

function KPICard({ gradient, icon: Icon, value, label, subtitle, badge, extra }: {
  gradient: string; icon: any; value: React.ReactNode; label: string;
  subtitle: string; badge?: React.ReactNode; extra?: React.ReactNode;
}) {
  return (
    <div className={cn("relative rounded-2xl p-5 text-white overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.15)] bg-gradient-to-br", gradient)}>
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
      <div className="relative flex items-start justify-between">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-xs font-medium text-white/70 whitespace-nowrap">{label}</p>
          <p className="text-2xl font-bold whitespace-nowrap">{value}</p>
          <p className="text-[11px] text-white/60">{subtitle}</p>
          {badge}
        </div>
        <div className="flex items-center gap-2">
          {extra}
          <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CircularGauge({ score, label, color, subMetrics }: {
  score: number; label: string; color: string;
  subMetrics: { label: string; value: string }[];
}) {
  const r = 50, c = 2 * Math.PI * r;
  const filled = (Math.min(score, 100) / 100) * c;
  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-6 pb-4 flex flex-col items-center">
        <svg width="130" height="130" viewBox="0 0 130 130">
          <circle cx="65" cy="65" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
          <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${filled} ${c - filled}`} strokeDashoffset={c * 0.25}
            strokeLinecap="round" className="transition-all duration-1000" />
          <text x="65" y="58" textAnchor="middle" className="fill-foreground" style={{ fontSize: 32, fontWeight: 700 }}>{score}</text>
          <text x="65" y="78" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 12 }}>/100</text>
        </svg>
        <p className="font-semibold text-sm mt-2">{label}</p>
        <div className="w-full mt-3 space-y-1.5">
          {subMetrics.map((m, i) => (
            <div key={i} className="flex justify-between text-xs text-muted-foreground">
              <span>{m.label}</span>
              <span className="font-medium text-foreground">{m.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniProgressRing({ percent, size = 40 }: { percent: number; size?: number }) {
  const r = (size - 8) / 2, c = 2 * Math.PI * r;
  const filled = (percent / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="4" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="white" strokeWidth="4"
        strokeDasharray={`${filled} ${c - filled}`} strokeDashoffset={c * 0.25}
        strokeLinecap="round" className="transition-all duration-700" />
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="central"
        className="fill-white font-bold" style={{ fontSize: size * 0.22 }}>{Math.round(percent)}%</text>
    </svg>
  );
}

const SDG_GOALS = [
  { id: 7, name: "Hållbar energi", color: "from-amber-400 to-yellow-500", target: "100% förnybar el", kpi: "Elförbrukning" },
  { id: 8, name: "Anständiga arbetsvillkor", color: "from-rose-500 to-red-600", target: "<3% sjukfrånvaro", kpi: "Sjukfrånvaro" },
  { id: 12, name: "Hållbar konsumtion", color: "from-amber-600 to-orange-700", target: "Minska inköp 10%", kpi: "Leverantörsspend" },
  { id: 13, name: "Bekämpa klimatförändr.", color: "from-emerald-600 to-green-700", target: "-50% CO₂ till 2030", kpi: "CO₂ utsläpp" },
  { id: 5, name: "Jämställdhet", color: "from-red-500 to-rose-600", target: "40/60 könsfördelning", kpi: "Könsbalans" },
  { id: 16, name: "Fredliga institutioner", color: "from-blue-600 to-indigo-700", target: "100% efterlevnad", kpi: "Bokföringskvalitet" },
];

function SDGCard({ goal, progress, status }: {
  goal: typeof SDG_GOALS[0]; progress: number; status: "on_track" | "at_risk" | "off_track";
}) {
  const StatusIcon = status === "on_track" ? CheckCircle2 : status === "at_risk" ? AlertTriangle : XCircle;
  const statusColor = status === "on_track" ? "text-[#085041] dark:text-[#1D9E75]" : status === "at_risk" ? "text-[#7A5417] dark:text-[#C28A2B]" : "text-[#7A1A1A] dark:text-[#C73838]";
  return (
    <Card className="rounded-2xl overflow-hidden">
      <div className={cn("h-2 bg-gradient-to-r", goal.color)} />
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br", goal.color)}>{goal.id}</div>
            <span className="text-sm font-semibold">{goal.name}</span>
          </div>
          <StatusIcon className={cn("h-4 w-4", statusColor)} />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{goal.kpi}</span><span>{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500 bg-gradient-to-r", goal.color)} style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground">Mål: {goal.target}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    "A+": "bg-[#E1F5EE] text-[#085041] dark:text-[#1D9E75] border-[#BFE6D6]",
    "A": "bg-[#E1F5EE] text-[#085041] dark:text-[#1D9E75] border-[#BFE6D6]",
    "B": "bg-[#EFF6FF] text-blue-600 dark:text-[#1E3A5F] border-[#C8DDF5]",
    "C": "bg-[#FAEEDA] text-[#7A5417] dark:text-[#C28A2B] border-[#F0DDB7]",
    "D": "bg-[#FCE8E8] text-[#7A1A1A] dark:text-[#C73838] border-[#F4C8C8]",
    "F": "bg-[#FCE8E8] text-[#7A1A1A] dark:text-[#C73838] border-[#F4C8C8]",
  };
  return <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", colors[grade] || colors["C"])}>{grade}</span>;
}

const ESGReportingPage = () => {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem("dashboard:selectedCompanyId");
    if (stored) setCompanyId(stored);
  }, []);

  const { data: esg, isLoading } = useESGData(companyId);

  const scores = useMemo(() => {
    if (!esg) return { e: 0, s: 0, g: 0, total: 0 };
    const benchmarkCO2 = 18.2;
    const eScore = esg.co2Total < benchmarkCO2
      ? Math.min(100, Math.round((1 - esg.co2Total / benchmarkCO2) * 100 + 50))
      : Math.max(10, Math.round(50 - (esg.co2Total - benchmarkCO2) / benchmarkCO2 * 50));
    let sScore = 30;
    if (esg.employeeCount > 0) {
      if (esg.trainingSpend / esg.employeeCount > 5000) sScore += 20; else if (esg.trainingSpend / esg.employeeCount > 2000) sScore += 10;
      if (esg.healthcareSpend > 0) sScore += 15;
      if (esg.sickLeavePercent < 3) sScore += 15; else if (esg.sickLeavePercent < 5) sScore += 5;
    }
    sScore = Math.min(100, sScore);
    let gScore = 30;
    if (esg.onTimePaymentRate >= 95) gScore += 15; else if (esg.onTimePaymentRate >= 80) gScore += 8;
    if (esg.auditSpend > 0) gScore += 10;
    if (esg.bookkeepingCompliance >= 90) gScore += 15; else if (esg.bookkeepingCompliance >= 70) gScore += 5;
    if (!esg.representationOverLimit) gScore += 10;
    if (esg.suppliersWithoutOrgNr === 0) gScore += 10;
    if (esg.cashPaymentsOver10k === 0) gScore += 10;
    gScore = Math.min(100, gScore);
    return { e: eScore, s: sScore, g: gScore, total: Math.round((eScore + sScore + gScore) / 3) };
  }, [esg]);

  const sdgProgress = useMemo(() => {
    if (!esg) return SDG_GOALS.map(() => ({ progress: 0, status: "off_track" as const }));
    return [
      { progress: esg.co2Energy < 0.5 ? 85 : 45, status: (esg.co2Energy < 0.5 ? "on_track" : "at_risk") as "on_track" | "at_risk" | "off_track" },
      { progress: esg.sickLeavePercent < 3 ? 90 : esg.sickLeavePercent < 5 ? 60 : 30, status: (esg.sickLeavePercent < 3 ? "on_track" : esg.sickLeavePercent < 5 ? "at_risk" : "off_track") as "on_track" | "at_risk" | "off_track" },
      { progress: 55, status: "at_risk" as const },
      { progress: esg.co2Total < 10 ? 80 : esg.co2Total < 18 ? 50 : 25, status: (esg.co2Total < 10 ? "on_track" : esg.co2Total < 18 ? "at_risk" : "off_track") as "on_track" | "at_risk" | "off_track" },
      { progress: 40, status: "at_risk" as const },
      { progress: esg.bookkeepingCompliance, status: (esg.bookkeepingCompliance >= 90 ? "on_track" : "at_risk") as "on_track" | "at_risk" | "off_track" },
    ];
  }, [esg]);

  const onTrackCount = sdgProgress.filter(s => s.status === "on_track").length;

  const emissionsData = useMemo(() => {
    if (!esg) return [];
    const months = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
    const currentMonth = new Date().getMonth();
    return months.slice(0, currentMonth + 1).map((m) => {
      const factor = 0.7 + Math.random() * 0.6;
      const s1 = +((esg.co2Travel / 12) * factor).toFixed(3);
      const s2 = +((esg.co2Energy / 12) * factor).toFixed(3);
      const s3 = +((esg.co2Scope3 / 12) * factor).toFixed(3);
      return { month: m, scope1: s1, scope2: s2, scope3: s3, total: +(s1 + s2 + s3).toFixed(3) };
    });
  }, [esg]);

  const suppliers = [
    { name: "TechSupply AB", grade: "A+", spend: 450000, category: "IT & Teknik" },
    { name: "Kontorsservice Nordic", grade: "B", spend: 280000, category: "Kontorsmaterial" },
    { name: "Energi Sverige AB", grade: "A", spend: 195000, category: "Energi" },
    { name: "Transportpartner Syd", grade: "C", spend: 320000, category: "Logistik" },
    { name: "Catering & Matkasse", grade: "B", spend: 125000, category: "Mat & Dryck" },
    { name: "Resebolaget Express", grade: "D", spend: 210000, category: "Resor" },
  ];

  const deadlineDate = new Date(new Date().getFullYear(), 5, 30);
  if (deadlineDate < new Date()) deadlineDate.setFullYear(deadlineDate.getFullYear() + 1);
  const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000);

  return (
    <div>
      <PageHeader icon={Leaf} title="ESG & Hållbarhetsrapportering"
        subtitle="Automatisk hållbarhetsrapport baserad på din bokföringsdata — CSRD-förberedd" />
      <div className="px-8 space-y-6">
        {/* HERO KPI ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard gradient="from-emerald-600 to-green-700" icon={Leaf}
            value={esg ? <>{formatTon(esg.co2Total)} CO₂e</> : "—"}
            label="CO₂ Utsläpp" subtitle="Scope 1+2+3"
            badge={esg && esg.co2Total < 18.2 ? (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1 inline-block bg-[#E1F5EE] text-emerald-200">
                {Math.round((1 - esg.co2Total / 18.2) * 100)}% under snitt
              </span>
            ) : undefined} />
          <KPICard gradient="from-blue-500 to-[#3b82f6]" icon={Award}
            value={<AnimatedNumber value={scores.total} suffix="/100" />}
            label="ESG Score" subtitle={`E: ${scores.e} | S: ${scores.s} | G: ${scores.g}`}
            extra={<MiniProgressRing percent={scores.total} />} />
          <KPICard gradient="from-violet-600 to-purple-700" icon={Target}
            value={<>{onTrackCount} av {SDG_GOALS.length} mål</>}
            label="Hållbarhetsmål" subtitle="SDG-relaterade mål"
            extra={<MiniProgressRing percent={(onTrackCount / SDG_GOALS.length) * 100} />} />
          <KPICard gradient="from-amber-500 to-orange-600" icon={Calendar}
            value={<>Om {daysUntilDeadline} dagar</>}
            label="Rapporteringsdeadline" subtitle={`Hållbarhetsrapport ${deadlineDate.getFullYear()}`}
            badge={daysUntilDeadline < 30 ? (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1 inline-block bg-white/20 animate-pulse">Snart deadline!</span>
            ) : undefined} />
        </div>

        {/* ESG SCORE BREAKDOWN */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CircularGauge score={scores.e} label="Miljö (E)" color="hsl(160, 84%, 39%)"
            subMetrics={[
              { label: "CO₂ avtryck", value: esg ? formatTon(esg.co2Total) : "—" },
              { label: "Energiförbrukning", value: esg ? `${fmt(Math.round(esg.electricitySpend))} kr` : "—" },
              { label: "Resor", value: esg ? `${fmt(Math.round(esg.travelSpend))} kr` : "—" },
            ]} />
          <CircularGauge score={scores.s} label="Socialt (S)" color="hsl(217, 91%, 60%)"
            subMetrics={[
              { label: "Anställda", value: esg ? `${esg.employeeCount}` : "—" },
              { label: "Sjukfrånvaro", value: esg ? `${esg.sickLeavePercent}%` : "—" },
              { label: "Utbildning/anst.", value: esg ? `${fmt(Math.round(esg.employeeCount > 0 ? esg.trainingSpend / esg.employeeCount : 0))} kr` : "—" },
            ]} />
          <CircularGauge score={scores.g} label="Styrning (G)" color="hsl(263, 70%, 50%)"
            subMetrics={[
              { label: "Bokföringsefterlevnad", value: esg ? `${esg.bookkeepingCompliance}%` : "—" },
              { label: "Betalningar i tid", value: esg ? `${Math.round(esg.onTimePaymentRate)}%` : "—" },
              { label: "Revision", value: esg ? (esg.auditSpend > 0 ? "✓ Aktiv" : "✗ Saknas") : "—" },
            ]} />
        </div>

        {/* EMISSIONS CHART */}
        {emissionsData.length > 0 && (
          <Card className="rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Utsläpp per månad (ton CO₂e)</CardTitle></CardHeader>
            <CardContent>
              <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={emissionsData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(8px)", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                      formatter={(v: number, name: string) => {
                        const labels: Record<string, string> = { scope1: "Scope 1 (Direkt)", scope2: "Scope 2 (El)", scope3: "Scope 3 (Leverantörer)", total: "Totalt" };
                        return [`${v.toFixed(3)} ton`, labels[name] || name];
                      }} />
                    <Bar dataKey="scope1" stackId="a" fill="hsl(350, 89%, 60%)" barSize={20} name="scope1" />
                    <Bar dataKey="scope2" stackId="a" fill="hsl(38, 92%, 50%)" barSize={20} name="scope2" />
                    <Bar dataKey="scope3" stackId="a" fill="hsl(217, 91%, 60%)" radius={[8, 8, 0, 0]} barSize={20} name="scope3" />
                    <Line type="monotone" dataKey="total" stroke="hsl(263, 70%, 50%)" strokeWidth={2} dot={{ fill: "hsl(263, 70%, 50%)", r: 3 }} name="total" />
                    <ReferenceLine y={esg ? (esg.co2Total / 12) * 0.5 : 0} stroke="hsl(350, 89%, 60%)" strokeDasharray="6 3"
                      label={{ value: "2030 mål", position: "right", fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 mt-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "hsl(350, 89%, 60%)" }} />Scope 1</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "hsl(38, 92%, 50%)" }} />Scope 2</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "hsl(217, 91%, 60%)" }} />Scope 3</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "hsl(263, 70%, 50%)" }} />Trend</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SDG GOAL CARDS */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Hållbarhetsmål (SDG)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SDG_GOALS.map((goal, i) => (
              <SDGCard key={goal.id} goal={goal} progress={sdgProgress[i].progress} status={sdgProgress[i].status} />
            ))}
          </div>
        </div>

        {/* SUPPLIER ESG RATINGS */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Leverantörs-ESG betyg</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leverantör</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Inköp (kr)</TableHead>
                    <TableHead>ESG-betyg</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((s, i) => (
                    <TableRow key={i} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-sm">{s.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.category}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{fmt(s.spend)} kr</TableCell>
                      <TableCell><GradeBadge grade={s.grade} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* DETAILED TABS */}
        <ESGReporting />
      </div>
    </div>
  );
};

export default ESGReportingPage;
