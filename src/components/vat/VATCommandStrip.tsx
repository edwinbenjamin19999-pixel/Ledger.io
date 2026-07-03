/**
 * VAT Command Strip — single condensed summary row.
 */
import { Calendar, Sparkles, ShieldCheck, AlertTriangle, ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";

type Status =
  | "draft" | "ai_reviewed" | "review_required" | "ready"
  | "filed" | "settled" | "paid" | "refunded" | "closed";

const STATUS_META: Record<Status, { label: string; bg: string; fg: string; border: string; dot: string; icon: typeof Calendar }> = {
  draft:           { label: "Utkast",            bg: "bg-[#F1F5F9]", fg: "text-[#475569]", border: "border-[#E2E8F0]", dot: "bg-[#94A3B8]", icon: Calendar },
  ai_reviewed:     { label: "AI-granskad",       bg: "bg-[#EFF6FF]", fg: "text-[#1E3A5F]", border: "border-[#C8DDF5]", dot: "bg-[#1E3A5F]", icon: Sparkles },
  review_required: { label: "Granskning krävs",  bg: "bg-[#FAEEDA]", fg: "text-[#7A5417]", border: "border-[#F0DDB7]", dot: "bg-[#C28A2B]", icon: AlertTriangle },
  ready:           { label: "Klar att lämna in", bg: "bg-[#E1F5EE]", fg: "text-[#085041]", border: "border-[#BFE6D6]", dot: "bg-[#1D9E75]", icon: ShieldCheck },
  filed:           { label: "Inskickad",         bg: "bg-[#EFF6FF]", fg: "text-[#1E3A5F]", border: "border-[#C8DDF5]", dot: "bg-[#1E3A5F]", icon: ShieldCheck },
  settled:         { label: "Bokförd",           bg: "bg-[#EFF6FF]", fg: "text-[#1E3A5F]", border: "border-[#C8DDF5]", dot: "bg-[#1E3A5F]", icon: Wallet },
  paid:            { label: "Betald",            bg: "bg-[#E1F5EE]", fg: "text-[#085041]", border: "border-[#BFE6D6]", dot: "bg-[#1D9E75]", icon: Wallet },
  refunded:        { label: "Återbetald",        bg: "bg-[#E1F5EE]", fg: "text-[#085041]", border: "border-[#BFE6D6]", dot: "bg-[#1D9E75]", icon: Wallet },
  closed:          { label: "Stängd",            bg: "bg-[#F1F5F9]", fg: "text-[#475569]", border: "border-[#E2E8F0]", dot: "bg-[#94A3B8]", icon: ShieldCheck },
};

interface VATCommandStripProps {
  vatPayable: number;
  outputVat: number;
  inputVat: number;
  status: Status;
  confidence: number | null;
  periodLabel: string;
}

function confTone(c: number | null) {
  if (c === null) return { dot: "bg-[#94A3B8]", text: "text-[#475569]" };
  if (c >= 85) return { dot: "bg-[#1D9E75]", text: "text-[#085041]" };
  if (c >= 60) return { dot: "bg-[#C28A2B]", text: "text-[#7A5417]" };
  return { dot: "bg-[#C73838]", text: "text-[#7A1A1A]" };
}

export function VATCommandStrip({ vatPayable, outputVat, inputVat, status, confidence, periodLabel }: VATCommandStripProps) {
  const isOwing = vatPayable >= 0;
  const stat = STATUS_META[status] ?? STATUS_META.draft;
  const StatIcon = stat.icon;
  const c = confTone(confidence);

  return (
    <div className="rounded-[12px] bg-white border-[0.5px] border-[#E2E8F0]">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-0 divide-x divide-[#E2E8F0]">
        <div className="p-5">
          <div className="text-[10px] uppercase tracking-widest text-[#64748B] font-semibold">
            Moms att {isOwing ? "betala" : "återfå"}
          </div>
          <div className="text-2xl md:text-3xl font-semibold font-mono tabular-nums mt-1 leading-tight text-[#0F1F3D]">
            {formatSEK(Math.abs(vatPayable))}
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5">Ruta 49 · {periodLabel}</div>
        </div>

        <div className="p-5">
          <div className="text-[10px] uppercase tracking-widest text-[#64748B] font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> Utgående moms
          </div>
          <div className="text-xl md:text-2xl font-semibold font-mono tabular-nums mt-1 text-[#0F1F3D]">
            {formatSEK(outputVat)}
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5">Rutor 10–12, 30–32, 60–62</div>
        </div>

        <div className="p-5">
          <div className="text-[10px] uppercase tracking-widest text-[#64748B] font-semibold flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3" /> Ingående moms
          </div>
          <div className="text-xl md:text-2xl font-semibold font-mono tabular-nums mt-1 text-[#0F1F3D]">
            {formatSEK(inputVat)}
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5">Ruta 48</div>
        </div>

        <div className="p-5">
          <div className="text-[10px] uppercase tracking-widest text-[#64748B] font-semibold">Status</div>
          <div className={cn(
            "inline-flex items-center gap-1.5 mt-2 px-2.5 h-[22px] rounded-full border-[0.5px] text-[11px] font-medium",
            stat.bg, stat.fg, stat.border
          )}>
            <StatIcon className="w-3 h-3" />
            {stat.label}
          </div>
        </div>

        <div className="p-5 col-span-2 md:col-span-1">
          <div className="text-[10px] uppercase tracking-widest text-[#64748B] font-semibold">Konfidens</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={cn("w-2.5 h-2.5 rounded-full", c.dot)} />
            <span className={cn("text-2xl font-semibold font-mono tabular-nums leading-tight", c.text)}>
              {confidence === null ? "—" : `${confidence}`}
            </span>
            {confidence !== null && <span className={cn("text-sm font-medium", c.text)}>/100</span>}
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5">Baseras på 5 dimensioner</div>
        </div>
      </div>
    </div>
  );
}
