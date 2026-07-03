import { AlertCircle, ChevronLeft, ChevronRight, Check, Circle } from "lucide-react";
import { useState } from "react";
import type { ComplianceCheck } from "@/lib/annual-report-compliance";
import { summarize } from "@/lib/annual-report-compliance";

export interface ComplianceValidatorPanelProps {
  framework: "K2" | "K3";
  checks: ComplianceCheck[];
  onNavigate: (target: string) => void;
}

export function ComplianceValidatorPanel({ framework, checks, onNavigate }: ComplianceValidatorPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const sum = summarize(checks);

  if (collapsed) {
    return (
      <aside className="w-10 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="w-9 h-9 rounded-md bg-white hover:bg-[#F8FAFC] flex items-center justify-center"
          style={{ border: "0.5px solid #E2E8F0" }}
          aria-label="Visa regelverkskontroll"
          title="Regelverkskontroll"
        >
          <ChevronLeft className="w-4 h-4 text-[#64748B]" />
        </button>
        <div className="mt-1 text-center text-[10px] text-[#64748B] tabular-nums">{sum.complete}/{sum.total}</div>
      </aside>
    );
  }

  return (
    <aside
      className="w-72 shrink-0 bg-white rounded-[12px] p-3 self-start sticky top-20"
      style={{ border: "0.5px solid #E2E8F0", maxHeight: "calc(100vh - 100px)" }}
    >
      <header className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#64748B]">Regelverkskontroll</p>
          <h3 className="text-sm font-semibold text-[#0F172A]">{framework}</h3>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="text-[#94A3B8] hover:text-[#0F172A] p-1"
          aria-label="Dölj"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </header>

      {/* Circular progress + count */}
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#F1F5F9]">
        <CircularProgress pct={sum.pct} />
        <div>
          <p className="text-[12px] text-[#0F172A]"><span className="font-semibold">{sum.complete}</span> av <span className="font-semibold">{sum.total}</span></p>
          <p className="text-[10px] text-[#64748B]">krav uppfyllda</p>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-1 overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 260px)" }}>
        {checks.map(c => <ChecklistRow key={c.id} check={c} onNavigate={onNavigate} />)}
      </div>
    </aside>
  );
}

function ChecklistRow({ check, onNavigate }: { check: ComplianceCheck; onNavigate: (t: string) => void }) {
  const Icon = check.status === "complete" ? Check : check.status === "attention" ? AlertCircle : Circle;
  const tone =
    check.status === "complete" ? "text-[#1D9E75]" :
    check.status === "attention" ? "text-[#EF9F27]" :
    "text-[#CBD5E1]";
  const cta =
    check.status === "complete" ? null :
    check.status === "attention" ? "Åtgärda →" :
    check.section === "notes" ? "Lägg till →" : "Gå till →";

  return (
    <button
      onClick={() => onNavigate(check.navTarget)}
      className="w-full flex items-start gap-2 text-left py-1.5 px-1.5 rounded hover:bg-[#F8FAFC] group"
    >
      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${tone}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-[11px] leading-tight ${check.status === "complete" ? "text-[#0F172A]" : "text-[#334155]"}`}>
          {check.label}
        </p>
        {cta && (
          <p className="text-[10px] text-[#1D4ED8] opacity-0 group-hover:opacity-100 transition-opacity">{cta}</p>
        )}
      </div>
    </button>
  );
}

function CircularProgress({ pct }: { pct: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="relative w-12 h-12">
      <svg viewBox="0 0 44 44" className="-rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#F1F5F9" strokeWidth="4" />
        <circle
          cx="22" cy="22" r={r} fill="none"
          stroke={pct === 100 ? "#1D9E75" : "#1D4ED8"}
          strokeWidth="4"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums text-[#0F172A]">
        {pct}%
      </div>
    </div>
  );
}
