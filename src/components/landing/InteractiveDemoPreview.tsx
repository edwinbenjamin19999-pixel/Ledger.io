import { useEffect, useState } from "react";

import {
  ArrowRight,
  FileText,
  Sparkles,
  CheckCircle2,
  Banknote,
  Link2,
  Receipt,
  TrendingUp,
  LineChart,
  LayoutDashboard,
  Bell,
  Zap,
  Calendar,
} from "lucide-react";


type DemoKey = "bookkeeping" | "reconciliation" | "vat" | "forecast" | "command";

const TABS: { key: DemoKey; label: string }[] = [
  { key: "bookkeeping", label: "AI bokför faktura" },
  { key: "reconciliation", label: "Bankavstämning" },
  { key: "vat", label: "Momsdeklaration" },
  { key: "forecast", label: "Budget & prognos" },
  { key: "command", label: "Command Center" },
];

// ─── Demo 1: Bookkeeping ──────────────────────────────────────────────
const BOOK_STEPS = [
  { label: "Faktura mottagen", icon: FileText },
  { label: "AI tolkar och konterar", icon: Sparkles },
  { label: "Bokförd · 4010 / 2641", icon: CheckCircle2 },
];

const BookkeepingDemo = ({ step }: { step: number }) => (
  <div className="grid md:grid-cols-2 gap-px bg-white/5">
    <div className="bg-[#0F1B2D] p-8">
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <div className="text-xs text-white/40 uppercase tracking-wider mb-3">Faktura</div>
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-sm text-white/80 font-medium">Office Supplies AB</div>
            <div className="text-xs text-white/40 mt-1">Org: 556789-1234</div>
          </div>
          <div className="text-xs text-white/40 font-mono">#2401</div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-white/60">
            <span>Kontorsmaterial</span>
            <span className="font-mono">9 960 kr</span>
          </div>
          <div className="flex justify-between text-white/60">
            <span>Moms 25%</span>
            <span className="font-mono">2 490 kr</span>
          </div>
          <div className="flex justify-between text-white pt-2 border-t border-white/10 font-medium">
            <span>Totalt</span>
            <span className="font-mono">12 450 kr</span>
          </div>
        </div>
      </div>
    </div>
    <div className="bg-[#0F1B2D] p-8">
      <div className="space-y-3">
        {BOOK_STEPS.map((s, i) => {
          const active = step >= i;
          const Icon = s.icon;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-500 ${
                active ? "border-[#3b82f6]/30 bg-[#3b82f6]/5" : "border-white/5 bg-white/[0.02] opacity-40"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  active ? "bg-[#3b82f6]/20 text-[#3b82f6]" : "bg-white/5 text-[#3b82f6]/30"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-sm font-medium ${active ? "text-white" : "text-white/40"}`}>
                {s.label}
              </span>
              {active && i === step - 1 && (
                <span className="ml-auto relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3b82f6] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3b82f6]" />
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-6 text-xs text-white/40">
        Konfidens: <span className="text-[#3b82f6] font-mono">98%</span> · Spårbar i revisionsloggen
      </div>
    </div>
  </div>
);

// ─── Demo 2: Bank reconciliation ──────────────────────────────────────
const ReconciliationDemo = ({ step }: { step: number }) => (
  <div className="bg-[#0F1B2D] p-10 min-h-[420px]">
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6">
      {/* Bank tx */}
      <div
        className={`rounded-lg border p-5 transition-all duration-500 ${
          step >= 0 ? "border-[#3b82f6]/30 bg-[#3b82f6]/[0.04]" : "border-white/5 bg-white/[0.02] opacity-40"
        }`}
      >
        <div className="flex items-center gap-2 text-xs text-white/40 uppercase tracking-wider mb-3">
          <Banknote className="w-3.5 h-3.5" /> Bank
        </div>
        <div className="text-sm text-white/80 font-medium">Office Supplies AB</div>
        <div className="text-xs text-white/40 mt-1 font-mono">REF: OCR 240156789</div>
        <div className="mt-4 text-xl text-white font-mono">−12 450,00 kr</div>
        <div className="text-[10px] text-white/40 mt-1">2026-04-12</div>
      </div>

      {/* Connector */}
      <div className="flex items-center justify-center py-4 md:py-0">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
            step >= 1 ? "bg-[#3b82f6]/20 text-[#3b82f6] scale-100" : "bg-white/5 text-[#3b82f6]/20 scale-90"
          }`}
        >
          <Link2 className="w-5 h-5" />
        </div>
      </div>

      {/* Invoice */}
      <div
        className={`rounded-lg border p-5 transition-all duration-500 ${
          step >= 1 ? "border-[#3b82f6]/30 bg-[#3b82f6]/[0.04]" : "border-white/5 bg-white/[0.02] opacity-40"
        }`}
      >
        <div className="flex items-center gap-2 text-xs text-white/40 uppercase tracking-wider mb-3">
          <Receipt className="w-3.5 h-3.5" /> Leverantörsfaktura
        </div>
        <div className="text-sm text-white/80 font-medium">Office Supplies AB · #2401</div>
        <div className="text-xs text-white/40 mt-1 font-mono">OCR: 240156789</div>
        <div className="mt-4 text-xl text-white font-mono">12 450,00 kr</div>
        <div className="text-[10px] text-white/40 mt-1">Förfaller 2026-04-12</div>
      </div>
    </div>

    <div
      className={`mt-8 flex items-center justify-center gap-2 text-sm transition-all duration-500 ${
        step >= 2 ? "opacity-100 text-[#3b82f6]" : "opacity-0"
      }`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3b82f6] opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3b82f6]" />
      </span>
      <CheckCircle2 className="w-4 h-4" />
      <span className="font-medium">Avstämd automatiskt · 99% match</span>
    </div>
  </div>
);

// ─── Demo 3: VAT declaration ──────────────────────────────────────────
const VAT_BOXES = [
  { code: "05", label: "Försäljning Sverige", value: "486 200" },
  { code: "10", label: "Utgående moms 25%", value: "121 550" },
  { code: "30", label: "Inköp varor EU", value: "84 300" },
  { code: "48", label: "Ingående moms", value: "92 410" },
];

const VatDemo = ({ step }: { step: number }) => (
  <div className="bg-[#0F1B2D] p-10 relative">
    {/* Success badge top-right */}
    <div
      className={`absolute top-5 right-5 inline-flex items-center gap-1.5 rounded-full border transition-opacity duration-500 ${
        step >= VAT_BOXES.length + 1 ? "opacity-100" : "opacity-0"
      }`}
      style={{
        padding: "5px 12px",
        background: "rgba(34,197,94,0.10)",
        borderColor: "rgba(34,197,94,0.25)",
      }}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
      </span>
      <span className="text-[11px] font-medium text-green-400">Skickad till SKV</span>
    </div>

    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-white/40 uppercase tracking-wider">SKV 4700</div>
          <div className="text-sm text-white/80 font-medium mt-1">Momsdeklaration · Q1 2026</div>
        </div>
        <div className="text-xs text-white/40 font-mono">Period stängd</div>
      </div>

      <div className="space-y-2">
        {VAT_BOXES.map((b, i) => {
          const filled = step > i;
          return (
            <div
              key={b.code}
              className={`flex items-center gap-4 px-4 py-3 rounded-lg border transition-all duration-500 ${
                filled ? "border-[#3b82f6]/20 bg-[#3b82f6]/[0.03]" : "border-white/5 bg-white/[0.02]"
              }`}
            >
              <div className="text-xs font-mono text-white/40 w-8">{b.code}</div>
              <div className="text-sm text-white/70 flex-1">{b.label}</div>
              <div
                className={`font-mono text-sm transition-all duration-500 ${
                  filled ? "text-white" : "text-white/20"
                }`}
              >
                {filled ? `${b.value} kr` : "— —"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Att betala — visually distinct */}
      <div
        className={`mt-6 flex items-center justify-between px-4 py-4 rounded-lg transition-all duration-500 ${
          step >= VAT_BOXES.length + 1 ? "opacity-100" : "opacity-40"
        }`}
        style={{
          background: "rgba(37,99,235,0.06)",
          borderBottom: "2px solid rgba(37,99,235,0.4)",
        }}
      >
        <span className="text-white font-semibold" style={{ fontSize: 18 }}>
          Att betala
        </span>
        <span
          className="text-white font-mono font-bold tabular-nums"
          style={{ fontSize: 18 }}
        >
          29 140 kr
        </span>
      </div>

      {/* Godkänn & skicka button — bottom right */}
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg font-medium transition-all hover:brightness-95"
          style={{
            background: "#FFFFFF",
            color: "#000000",
            padding: "10px 18px",
            fontSize: 13,
          }}
        >
          Godkänn & skicka
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
);

// ─── Demo 4: Budget & forecast ────────────────────────────────────────
const ForecastDemo = ({ step }: { step: number }) => {
  const heights = [40, 55, 48, 62, 70, 65, 78, 82, 88, 92, 96, 100];
  const visibleBars = Math.min(heights.length, step * 3);

  return (
    <div className="bg-[#0F1B2D] p-10">
      <div className="grid md:grid-cols-[260px_1fr] gap-8">
        <div className="space-y-4">
          <div>
            <div className="text-xs text-white/40 uppercase tracking-wider">Prognos · 2026</div>
            <div className="text-sm text-white/80 font-medium mt-1">Resultat (EBITDA)</div>
          </div>
          <div className="space-y-3">
            {[
              { label: "Intäkter", value: "+12,4%", icon: TrendingUp, active: step >= 1 },
              { label: "Driftkostnader", value: "+3,1%", icon: LineChart, active: step >= 2 },
              { label: "EBITDA-marginal", value: "21,8%", icon: Sparkles, active: step >= 3 },
            ].map((m, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-500 ${
                  m.active ? "border-[#3b82f6]/25 bg-[#3b82f6]/[0.04]" : "border-white/5 bg-white/[0.02] opacity-40"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    m.active ? "bg-[#3b82f6]/20 text-[#3b82f6]" : "bg-white/5 text-[#3b82f6]/30"
                  }`}
                >
                  <m.icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs text-white/70 flex-1">{m.label}</span>
                <span className={`text-xs font-mono ${m.active ? "text-[#3b82f6]" : "text-[#3b82f6]/30"}`}>
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-end justify-between h-[200px] gap-1.5">
            {heights.map((h, i) => {
              const visible = i < visibleBars;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t transition-all duration-700 ${
                    visible ? "bg-gradient-to-t from-[#3b82f6]/60 to-[#3b82f6]/30" : "bg-white/5"
                  }`}
                  style={{ height: visible ? `${h}%` : "8%" }}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-3 text-[10px] text-white/30 font-mono">
            <span>Jan</span>
            <span>Apr</span>
            <span>Jul</span>
            <span>Okt</span>
            <span>Dec</span>
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-xs">
            <span className="text-white/50">AI-prognos · 12 mån</span>
            <span className="text-[#3b82f6] font-mono">+18,2% YoY</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Demo 5: Command Center ───────────────────────────────────────────
const COMMAND_ITEMS = [
  { icon: Bell, label: "Moms Q1 förbereds", meta: "Auto · 12 dagar kvar", tone: "info" },
  { icon: CheckCircle2, label: "AGI mars inlämnad", meta: "Skatteverket · 09:14", tone: "ok" },
  { icon: Zap, label: "47 verifikationer bokförda", meta: "AI · senaste timmen", tone: "ok" },
  { icon: Sparkles, label: "Avvikelse upptäckt: 6580", meta: "+184% mot snitt", tone: "warn" },
];

const CommandDemo = ({ step }: { step: number }) => (
  <div className="bg-[#0F1B2D] p-10">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-9 h-9 rounded-lg bg-[#3b82f6]/15 text-[#3b82f6] flex items-center justify-center">
        <LayoutDashboard className="w-4.5 h-4.5" />
      </div>
      <div>
        <div className="text-sm text-white font-medium">Command Center</div>
        <div className="text-xs text-white/40">Realtidsstatus · alla automationer</div>
      </div>
      <div className="ml-auto flex items-center gap-2 text-xs text-[#3b82f6]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3b82f6] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3b82f6]" />
        </span>
        Live
      </div>
    </div>

    <div className="grid md:grid-cols-2 gap-3">
      {COMMAND_ITEMS.map((item, i) => {
        const visible = step > i;
        const toneClass =
          item.tone === "warn"
            ? "border-amber-400/20 bg-amber-400/[0.04]"
            : item.tone === "ok"
            ? "border-[#3b82f6]/20 bg-[#3b82f6]/[0.03]"
            : "border-white/10 bg-white/[0.02]";
        const iconClass =
          item.tone === "warn"
            ? "bg-amber-400/15 text-amber-300"
            : item.tone === "ok"
            ? "bg-[#3b82f6]/15 text-[#3b82f6]"
            : "bg-white/5 text-white/60";
        return (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-500 ${
              visible ? `${toneClass} opacity-100 translate-y-0` : "border-white/5 bg-white/[0.02] opacity-0 translate-y-1"
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconClass}`}>
              <item.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white/85 font-medium truncate">{item.label}</div>
              <div className="text-[11px] text-white/40 font-mono mt-0.5">{item.meta}</div>
            </div>
          </div>
        );
      })}
    </div>

    <div className="mt-6 text-xs text-white/40 text-center">
      4 automationer aktiva · 0 manuella ingrepp idag
    </div>
  </div>
);

// ─── Container ────────────────────────────────────────────────────────
const STEP_COUNTS: Record<DemoKey, number> = {
  bookkeeping: 4,
  reconciliation: 4,
  vat: 6,
  forecast: 5,
  command: 6,
};

export const InteractiveDemoPreview = () => {
  const [active, setActive] = useState<DemoKey>("bookkeeping");
  const [step, setStep] = useState(0);

  // Reset step on tab change
  useEffect(() => {
    setStep(0);
  }, [active]);

  // Step animation within current demo
  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => (s + 1) % STEP_COUNTS[active]);
    }, 1400);
    return () => clearInterval(id);
  }, [active]);

  // Auto-rotate tabs
  useEffect(() => {
    const id = setInterval(() => {
      setActive((curr) => {
        const idx = TABS.findIndex((t) => t.key === curr);
        return TABS[(idx + 1) % TABS.length].key;
      });
    }, 9000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="section-shell">
      <div className="section-inner">
        <p className="section-label">Produktdemo</p>
        <h2
          className="section-headline text-4xl md:text-5xl font-[700] leading-[1.05]"
          style={{ letterSpacing: "-0.8px" }}
        >
          Se produkten <span style={{ color: "#3b82f6" }}>i arbete.</span>
        </h2>
        <p className="section-lede text-[15px] leading-relaxed max-w-2xl">
          Det här är inte mockups — det är så systemet faktiskt fungerar. Fem flöden som körs autonomt: bokföring, bank, moms, prognos och kontroll.
        </p>

        {/* Tab selector */}
        <div className="flex flex-wrap justify-center gap-1 mb-8 border-b border-white/5">
          {TABS.map((t) => {
            const isActive = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                  isActive
                    ? "text-white border-[#3b82f6]"
                    : "text-white/50 hover:text-white/80 border-transparent"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div
          className="overflow-hidden bg-[#0F1B2D]"
          style={{
            borderRadius: 20,
            boxShadow:
              "0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(37,99,235,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          {/* Browser chrome */}
          <div
            className="flex items-center gap-2 px-4 border-b border-white/5 bg-white/[0.02]"
            style={{ height: 40 }}
          >
            <div className="flex gap-2">
              <div
                style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F57" }}
              />
              <div
                style={{ width: 12, height: 12, borderRadius: "50%", background: "#FFBD2E" }}
              />
              <div
                style={{ width: 12, height: 12, borderRadius: "50%", background: "#28CA41" }}
              />
            </div>
            <div
              className="ml-3 flex-1 max-w-[280px] flex items-center px-3 rounded-md"
              style={{
                height: 22,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span className="text-[11px] text-white/45 font-mono truncate">
                app.bokfy.se/{active}
              </span>
            </div>
          </div>

          <div key={active} className="animate-fade-in">
            {active === "bookkeeping" && <BookkeepingDemo step={step} />}
            {active === "reconciliation" && <ReconciliationDemo step={step} />}
            {active === "vat" && <VatDemo step={step} />}
            {active === "forecast" && <ForecastDemo step={step} />}
            {active === "command" && <CommandDemo step={step} />}
          </div>
        </div>

        {/* Launch-date CTA — de-emphasized, scrolls to signup */}
        <a
          href="#signup"
          onClick={(e) => {
            const el = document.getElementById("signup");
            if (el) {
              e.preventDefault();
              el.scrollIntoView({ behavior: "smooth" });
            }
          }}
          className="mt-10 w-full flex items-center justify-center gap-2 text-center font-medium transition-colors border border-white/10 text-white/50 hover:text-white/70 hover:border-white/20"
          style={{
            fontSize: 15,
            padding: "16px 32px",
            borderRadius: 12,
          }}
        >
          <Calendar className="w-4 h-4" />
          Tillgänglig för pilotföretag — säkra din plats
        </a>
      </div>
    </section>
  );
};
