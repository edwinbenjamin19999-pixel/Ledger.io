import { AlertTriangle, Copy, Sparkles, Timer } from "lucide-react";
import type { FirmSupplierInvoiceRow } from "@/hooks/useFirmSupplierInvoices";

interface Props {
  rows: FirmSupplierInvoiceRow[];
  onAction: (kind: "show_high_risk" | "show_duplicates" | "show_overdue_unapproved") => void;
}

export function FirmSupplierAIPanel({ rows, onAction }: Props) {
  const highRisk = rows.filter((r) => r.risk === "high");
  const duplicates = rows.filter((r) => r.riskReasons.some((x) => x.startsWith("Möjlig dubblett")));
  const overdueAwait = rows.filter(
    (r) => r.stage === "awaiting_client" && r.daysToDue !== null && r.daysToDue < 0,
  );
  const totalExposure = rows
    .filter((r) => r.stage !== "paid" && r.stage !== "rejected")
    .reduce((s, r) => s + r.total_amount, 0);

  const cards: Array<{
    key: Parameters<Props["onAction"]>[0];
    icon: typeof Sparkles;
    title: string;
    desc: string;
    metric: string;
    tone: string;
    visible: boolean;
  }> = [
    {
      key: "show_high_risk",
      icon: AlertTriangle,
      title: "Ovanliga leverantörsfakturor",
      desc: "AI flaggade kraftiga avvikelser från historiken",
      metric: `${highRisk.length} st`,
      tone: "from-rose-500/10 to-rose-50 border-[#F4C8C8] text-[#7A1A1A]",
      visible: highRisk.length > 0,
    },
    {
      key: "show_duplicates",
      icon: Copy,
      title: "Möjliga dubbletter",
      desc: "Samma leverantör + belopp inom 60 dagar",
      metric: `${duplicates.length} st`,
      tone: "from-amber-500/10 to-amber-50 border-[#F0DDB7] text-[#7A5417]",
      visible: duplicates.length > 0,
    },
    {
      key: "show_overdue_unapproved",
      icon: Timer,
      title: "Förfallna utan attest",
      desc: "Kräver omedelbar klient-eskalering",
      metric: `${overdueAwait.length} st`,
      tone: "from-[#3b82f6]/10 to-blue-50 border-[#C8DDF5] text-[#3b82f6]",
      visible: overdueAwait.length > 0,
    },
  ];

  return (
    <aside className="space-y-3">
      <div className="rounded-3xl bg-white border border-[#E2E8F0] p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-[#0F1F3D] flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-[#94A3B8]">
              AI · Leverantörsanalys
            </div>
            <div className="text-sm font-semibold text-[#0F172A]">Riskradar</div>
          </div>
        </div>
        <div className="rounded-2xl bg-[#F8FAFC] border border-[#F1F5F9] px-3 py-2.5 mb-3">
          <div className="text-[10px] uppercase tracking-wide text-[#94A3B8] font-bold">
            Total exponering (öppna)
          </div>
          <div className="text-xl font-bold text-[#0F172A] tabular-nums">
            {new Intl.NumberFormat("sv-SE", {
              style: "currency",
              currency: "SEK",
              maximumFractionDigits: 0,
            }).format(totalExposure)}
          </div>
        </div>

        <div className="space-y-2">
          {cards.filter((c) => c.visible).length === 0 ? (
            <div className="text-xs text-[#64748B] py-6 text-center">
              Ingen risk upptäckt — alla leverantörsfakturor inom normalflödet.
            </div>
          ) : (
            cards
              .filter((c) => c.visible)
              .map((c) => (
                <button
                  key={c.key}
                  onClick={() => onAction(c.key)}
                  className={`w-full text-left rounded-2xl p-3 border bg-gradient-to-br ${c.tone} hover:shadow-sm transition-all`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <c.icon className="h-4 w-4 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{c.title}</div>
                        <div className="text-[11px] opacity-80 truncate">{c.desc}</div>
                      </div>
                    </div>
                    <div className="text-sm font-bold tabular-nums shrink-0">{c.metric}</div>
                  </div>
                </button>
              ))
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-slate-50 to-white border border-[#E2E8F0] p-4">
        <div className="text-[10px] uppercase tracking-wide text-[#94A3B8] font-bold mb-2">
          Attestregel
        </div>
        <p className="text-xs text-[#475569] leading-relaxed">
          Ingen leverantörsfaktura kan inkluderas i en betalningskörning innan klient/ägare har
          attesterat. BankID-flödet är förberett för framtida produktion.
        </p>
      </div>
    </aside>
  );
}
