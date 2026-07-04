import { Bell, Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, LayoutDashboard, FileText, Calculator, BarChart3, Settings, Users } from "lucide-react";
import { OnboardingDraft } from "@/hooks/useOnboardingDraft";

interface Props {
  draft: OnboardingDraft;
}

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Calculator, label: "Bokföring" },
  { icon: FileText, label: "Fakturor" },
  { icon: BarChart3, label: "Rapporter" },
  { icon: Users, label: "Kunder" },
  { icon: Settings, label: "Inställningar" },
];

const KPIS = [
  { label: "Omsättning", value: "1 248 500", unit: "kr", delta: "+12%", trend: "up" as const },
  { label: "Resultat", value: "287 200", unit: "kr", delta: "+8%", trend: "up" as const },
  { label: "Likviditet", value: "412 800", unit: "kr", delta: "-3%", trend: "down" as const },
];

export function PreviewMockup({ draft }: Props) {
  const primary = draft.primary_color;
  const name = draft.name || "Din plattform";
  const aiName = draft.ai_name || "AI Ekonom";
  const slug = draft.slug || "dittnamn";
  const initials = name.substring(0, 2).toUpperCase();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_24px_64px_-24px_rgba(15,23,42,0.18)] overflow-hidden">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-rose-300" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        </div>
        <div className="flex-1 mx-3 px-3 py-1 rounded-md bg-white border border-slate-100 text-[11px] text-slate-500 font-mono text-center">
          {slug}.cogniq.se/dashboard
        </div>
      </div>

      <div className="flex min-h-[480px]">
        {/* Sidebar */}
        <aside className="w-[200px] bg-slate-950 text-white p-3 hidden md:block">
          <div className="flex items-center gap-2 px-2 py-2 mb-4">
            {draft.logo_url ? (
              <img src={draft.logo_url} alt={name} className="h-8 w-8 rounded-lg object-contain bg-white/5 p-1" />
            ) : (
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                style={{ background: primary }}
              >
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">{name}</div>
              <div className="text-[9px] text-white/40 uppercase tracking-wider">Workspace</div>
            </div>
          </div>
          <div className="space-y-0.5">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] transition-colors cursor-pointer ${
                    item.active ? "" : "text-white/55 hover:bg-white/5 hover:text-white/80"
                  }`}
                  style={item.active ? { background: `${primary}26`, color: primary } : {}}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 bg-[#FAFBFC] p-5 sm:p-6 space-y-4">
          {/* Topbar */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">Översikt</div>
              <h2 className="text-lg font-bold text-slate-900">God morgon, {name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                style={{ background: `${primary}14`, color: primary }}
              >
                <Sparkles className="h-3 w-3" /> {aiName}
              </div>
              <div className="h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                <Bell className="h-3.5 w-3.5 text-slate-500" />
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            {KPIS.map((kpi, i) => (
              <div
                key={kpi.label}
                className="rounded-xl bg-white border border-slate-100 p-3 hover:-translate-y-0.5 hover:shadow-md transition-all cursor-default"
              >
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">{kpi.label}</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-base sm:text-lg font-bold text-slate-900">{kpi.value}</span>
                  <span className="text-[10px] text-slate-400">{kpi.unit}</span>
                </div>
                <div
                  className={`mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold ${
                    kpi.trend === "up" ? "text-[#085041]" : "text-[#7A1A1A]"
                  }`}
                >
                  {kpi.trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {kpi.delta}
                </div>
                {/* Sparkline-like bar in primary */}
                <div className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${60 + i * 10}%`, background: primary }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* AI Insight (dark premium) */}
          <div className="rounded-xl bg-slate-950 text-white p-4 relative overflow-hidden">
            <div
              className="absolute -top-12 -right-12 h-32 w-32 rounded-full blur-3xl opacity-30"
              style={{ background: primary }}
            />
            <div className="relative flex items-start gap-3">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${primary}33`, color: primary }}
              >
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-1">
                  {aiName} · insikt
                </div>
                <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
                  Din kassalikviditet sjönk 3% denna månad — men 4 stora fakturor på totalt
                  186 400 kr förfaller inom 7 dagar. Inga åtgärder krävs.
                </p>
              </div>
            </div>
          </div>

          {/* Risk center */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-white border border-amber-100 p-3 flex items-start gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-[#FAEEDA] flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-3.5 w-3.5 text-[#7A5417]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900">Momsdeklaration förfaller om 12 dagar</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Period 2026-Q1 · 47 200 kr beräknat</div>
              </div>
            </div>
            <div className="rounded-xl bg-white border border-emerald-100 p-3 flex items-start gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-[#E1F5EE] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#085041]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900">Alla 124 transaktioner bokförda</div>
                <div className="text-[11px] text-slate-500 mt-0.5">94% autonomt av {aiName} · 6% manuellt</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
