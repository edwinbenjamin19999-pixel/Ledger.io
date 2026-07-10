import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Brain, ArrowUpRight, FileText, Bell, FilePlus, Edit2, Info, Users, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { formatSEK } from "@/lib/formatNumber";
import { CustomerProfile, SCORE_COLOR, RISK_COLOR, RISK_LABEL } from "@/hooks/useCustomerProfiles";
import { cn } from "@/lib/utils";
import { CustomerRecord } from "./CustomerProfilePanel";

interface Props {
  customers: CustomerRecord[];
  profiles: CustomerProfile[];
  onEdit: (c: CustomerRecord) => void;
  onShowProfile: (c: CustomerRecord) => void;
  onSendReminder?: (customerName: string) => void;
}

type RiskFilter = "all" | "attention" | "low";

export function CustomerIntelligenceList({ customers, profiles, onEdit, onShowProfile, onSendReminder }: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");

  const profileByName = useMemo(() => {
    const m = new Map<string, CustomerProfile>();
    for (const p of profiles) m.set(p.name.toLowerCase(), p);
    return m;
  }, [profiles]);

  const enriched = useMemo(() => {
    return customers.map(c => ({
      customer: c,
      profile: profileByName.get(c.name.toLowerCase()) || null,
    }));
  }, [customers, profileByName]);

  const requiresAttention = useMemo(() => enriched.filter(e => {
    if (!e.profile) return false;
    return e.profile.risk === "high" || e.profile.maxOverdueDays > 14;
  }), [enriched]);

  const totalOutstanding = profiles.reduce((s, p) => s + p.totalOutstanding, 0);
  const totalRisk = requiresAttention.reduce((s, e) => s + (e.profile?.totalOutstanding ?? 0), 0);
  // Snitt betaltid: inkludera både betalda (faktisk försening) och obetalda förfallna
  // (löpande dagar sedan förfallodatum). Profiler utan något av detta exkluderas.
  const latenessSamples = profiles
    .filter(p => p.paidCount > 0 || p.maxOverdueDays > 0)
    .map(p => p.paidCount > 0 ? p.avgDaysLate : p.maxOverdueDays);
  const avgPaymentTime = latenessSamples.length > 0
    ? Math.round(latenessSamples.reduce((s, n) => s + n, 0) / latenessSamples.length)
    : 0;
  // Andel hög risk = högriskkunder / totalt antal aktiva kunder (inte bara de med fakturor).
  // Kunder utan profil (ingen historik / inga öppna fakturor) räknas inte som högrisk.
  const highRiskCount = enriched.filter(e => e.profile?.risk === "high").length;
  const highRiskShare = customers.length > 0
    ? Math.round((highRiskCount / customers.length) * 100)
    : 0;

  const filtered = useMemo(() => {
    let list = enriched;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e => e.customer.name.toLowerCase().includes(q) || (e.customer.org_number || "").includes(search));
    }
    if (riskFilter === "attention") {
      list = list.filter(e => e.profile && (e.profile.risk === "high" || e.profile.maxOverdueDays > 14));
    } else if (riskFilter === "low") {
      list = list.filter(e => e.profile?.risk === "low");
    }
    return list.sort((a, b) => (b.profile?.totalOutstanding ?? 0) - (a.profile?.totalOutstanding ?? 0));
  }, [enriched, search, riskFilter]);

  return (
    <div className="space-y-6">
      {/* AI Insight Bar */}
      {requiresAttention.length > 0 ? (
        <div className="rounded-2xl border border-slate-200/70 border-l-[3px] border-l-[#0052FF] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
              <Brain className="h-5 w-5 text-[#0052FF]" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                {requiresAttention.length} kunder kräver uppmärksamhet — {formatSEK(totalRisk)} i risk
              </p>
              <p className="text-xs text-slate-500">
                Kunder med hög risk eller pågående förfall över 14 dagar. Hantera direkt i AR-agenten.
              </p>
            </div>
            <Button size="sm" className="bg-[#0052FF] hover:bg-[#0052FF] text-white" onClick={() => navigate("/ar-agent")}>
              Öppna AR-agent <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      ) : profiles.length > 0 ? (
        <div className="rounded-2xl border border-slate-200/70 border-l-[3px] border-l-emerald-500 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#E1F5EE] flex items-center justify-center">
              <Brain className="h-5 w-5 text-[#085041]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Alla kunder under kontroll</p>
              <p className="text-xs text-slate-500">Ingen kund kräver omedelbar uppföljning.</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={Users} label="Aktiva kunder" value={String(customers.length)} accent="cyan" />
        <KPI icon={TrendingUp} label="Total fordring" value={formatSEK(totalOutstanding)} accent="rose" />
        <KPI icon={Clock} label="Snitt betaltid" value={`${avgPaymentTime} d sent`} accent={avgPaymentTime > 14 ? "amber" : "emerald"} />
        <KPI icon={AlertTriangle} label="Andel hög risk" value={`${highRiskShare}%`} accent={highRiskShare > 20 ? "rose" : "emerald"} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Sök kund eller org.nr..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center gap-1.5">
          <FilterChip active={riskFilter === "all"} onClick={() => setRiskFilter("all")}>Alla ({enriched.length})</FilterChip>
          <FilterChip active={riskFilter === "attention"} onClick={() => setRiskFilter("attention")} accent="rose">Kräver åtgärd ({requiresAttention.length})</FilterChip>
          <FilterChip active={riskFilter === "low"} onClick={() => setRiskFilter("low")} accent="emerald">Låg risk</FilterChip>
        </div>
      </div>

      {/* Customer rows */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/70 bg-white p-12 text-center text-sm text-slate-500">
            Inga kunder matchar filtret.
          </div>
        ) : (
          filtered.map(({ customer, profile }) => (
            <CustomerRow
              key={customer.id ?? customer.name}
              customer={customer}
              profile={profile}
              onEdit={onEdit}
              onShowProfile={onShowProfile}
              onSendReminder={onSendReminder}
            />
          ))
        )}
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: "cyan" | "rose" | "amber" | "emerald" }) {
  const map = {
    cyan: "border-l-[#0052FF] text-[#0052FF] bg-[#EFF6FF]",
    rose: "border-l-rose-500 text-[#7A1A1A] bg-[#FCE8E8]",
    amber: "border-l-amber-500 text-[#7A5417] bg-[#FAEEDA]",
    emerald: "border-l-emerald-500 text-[#085041] bg-[#E1F5EE]",
  };
  const [borderClass, iconColor, iconBg] = map[accent].split(" ");
  return (
    <div className={cn("rounded-2xl border border-slate-200/70 border-l-[3px] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md transition-shadow", borderClass)}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", iconBg)}>
          <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        </div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">{label}</p>
      </div>
      <p className="text-xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function FilterChip({ active, onClick, children, accent }: { active: boolean; onClick: () => void; children: React.ReactNode; accent?: "rose" | "emerald" }) {
  const activeClass = accent === "rose" ? "bg-rose-600 text-white" : accent === "emerald" ? "bg-emerald-600 text-white" : "bg-[#0052FF] text-white";
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 px-3 rounded-full text-xs font-medium transition-colors border",
        active ? `${activeClass} border-transparent` : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
      )}
    >
      {children}
    </button>
  );
}

function CustomerRow({ customer, profile, onEdit, onShowProfile, onSendReminder }: {
  customer: CustomerRecord;
  profile: CustomerProfile | null;
  onEdit: (c: CustomerRecord) => void;
  onShowProfile: (c: CustomerRecord) => void;
  onSendReminder?: (name: string) => void;
}) {
  const navigate = useNavigate();
  const initials = customer.name.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const accentBorder = profile?.risk === "high" ? "border-l-rose-500" : profile?.risk === "medium" ? "border-l-amber-500" : profile?.risk === "low" ? "border-l-emerald-500" : "border-l-slate-300";
  const microline = profile?.paidCount && profile.paidCount > 0
    ? `Betalar i snitt ${profile.avgDaysLate} dagar sent`
    : profile?.invoiceCount
      ? `${profile.invoiceCount} öppen faktura — ingen historik`
      : "Ny kund — ingen fakturahistorik";

  return (
    <div className={cn(
      "group rounded-2xl border border-slate-200/70 border-l-[3px] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]",
      "hover:shadow-md hover:-translate-y-px transition-all duration-200",
      accentBorder
    )}>
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="h-11 w-11 rounded-full bg-[#F1F5F9] flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-slate-700">{initials}</span>
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onShowProfile(customer)}
              className="text-sm font-semibold text-slate-900 hover:text-[#0052FF] truncate text-left"
            >
              {customer.name}
            </button>
            {profile ? (
              <>
                <Badge variant="outline" className={cn("border text-[10px] h-5 px-1.5", SCORE_COLOR[profile.score])}>
                  {profile.score}
                </Badge>
                <Badge variant="outline" className={cn("border text-[10px] h-5 px-1.5", RISK_COLOR[profile.risk])}>
                  {RISK_LABEL[profile.risk]}
                </Badge>
              </>
            ) : (
              <Badge variant="outline" className="border text-[10px] h-5 px-1.5 bg-slate-50 text-slate-600 border-slate-200">Ny kund</Badge>
            )}
            {customer.peppol_id && <Badge variant="secondary" className="text-[10px] h-5 px-1.5">PEPPOL</Badge>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {customer.org_number ? <span className="font-mono">{customer.org_number}</span> : "Inget org.nr"}
            {" · "}{customer.payment_terms_days ?? 30} dagars villkor · {microline}
          </p>
        </div>

        {/* Numbers */}
        <div className="hidden sm:flex flex-col items-end flex-shrink-0">
          <p className="text-xs text-slate-500">Lifetime</p>
          <p className="text-sm font-medium tabular-nums text-slate-700">{formatSEK(profile?.totalLifetime ?? 0)}</p>
        </div>
        <div className="flex flex-col items-end flex-shrink-0 min-w-[100px]">
          <p className="text-xs text-slate-500">Utestående</p>
          <p className={cn("text-lg font-bold tabular-nums", (profile?.totalOutstanding ?? 0) > 0 ? "text-[#7A1A1A]" : "text-slate-400")}>
            {formatSEK(profile?.totalOutstanding ?? 0)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 translate-x-2 group-hover:translate-x-0">
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => navigate(`/ar-agent?customer=${encodeURIComponent(customer.name)}`)} title="Öppna i AR">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => navigate(`/invoices?customer=${encodeURIComponent(customer.name)}`)} title="Visa fakturor">
            <FileText className="h-3.5 w-3.5" />
          </Button>
          {onSendReminder && profile && profile.totalOutstanding > 0 && (
            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => onSendReminder(customer.name)} title="Skicka påminnelse">
              <Bell className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => navigate(`/invoices?customer=${encodeURIComponent(customer.name)}&action=new`)} title="Skapa faktura">
            <FilePlus className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => onShowProfile(customer)} title="Visa profil">
            <Info className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => onEdit(customer)} title="Redigera">
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
