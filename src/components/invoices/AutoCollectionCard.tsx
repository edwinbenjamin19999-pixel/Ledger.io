import { useState } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { Bot, ChevronDown, Send, Phone, Gavel, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatSEK } from "@/lib/formatNumber";

interface InvoiceLite {
  id: string;
  invoice_number: string;
  counterparty_name: string;
  total_amount: number;
  due_date: string;
  reminder_count?: number;
}

interface AutoCollectionCardProps {
  overdueInvoices: InvoiceLite[];
  customerInsights: Record<string, { avgDaysLate: number; count: number }>;
  onBulkRemind: (ids: string[]) => void;
  isBulkActing: boolean;
}

type Mode = "off" | "suggest" | "auto";

const escalation = (daysOverdue: number, reminderCount: number) => {
  if (daysOverdue > 60) return { tone: "Skarp · inkasso föreslås", icon: Gavel, channel: "Inkasso", color: "text-[#7A1F1E] bg-[#FCE8E8]" };
  if (daysOverdue > 30 || reminderCount >= 2) return { tone: "Bestämd · betalningskrav", icon: Phone, channel: "SMS + samtal", color: "text-[#7A5417] bg-[#FAEEDA]" };
  if (daysOverdue > 7) return { tone: "Tydlig · andra påminnelse", icon: Send, channel: "E-post", color: "text-[#7A5417] bg-[#FAEEDA]" };
  return { tone: "Vänlig · första påminnelse", icon: Send, channel: "E-post", color: "text-[#0C447C] bg-[#E6F4FA]" };
};

const paymentProbability = (insight: { avgDaysLate: number; count: number } | undefined, daysOverdue: number, reminderCount: number) => {
  const base = insight && insight.count >= 3
    ? Math.max(20, 90 - insight.avgDaysLate * 1.5)
    : 70;
  const overduePenalty = Math.min(40, daysOverdue * 0.5);
  const reminderBoost = reminderCount > 0 ? 8 : 0;
  return Math.max(10, Math.min(95, Math.round(base - overduePenalty + reminderBoost)));
};

export const AutoCollectionCard = ({ overdueInvoices, customerInsights, onBulkRemind, isBulkActing }: AutoCollectionCardProps) => {
  const [mode, setMode] = useState<Mode>("suggest");
  const [open, setOpen] = useState(false);

  if (overdueInvoices.length === 0) return null;

  const today = new Date();
  const ranked = [...overdueInvoices]
    .map(inv => {
      const daysOverdue = Math.abs(differenceInDays(parseISO(inv.due_date), today));
      const esc = escalation(daysOverdue, inv.reminder_count ?? 0);
      const prob = paymentProbability(customerInsights[inv.counterparty_name], daysOverdue, inv.reminder_count ?? 0);
      return { ...inv, daysOverdue, esc, prob };
    })
    .sort((a, b) => b.total_amount * (b.prob / 100) - a.total_amount * (a.prob / 100));

  const next3 = ranked.slice(0, 3);
  const totalAtRisk = ranked.reduce((s, i) => s + i.total_amount, 0);
  const expectedRecovery = ranked.reduce((s, i) => s + i.total_amount * (i.prob / 100), 0);

  return (
    <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="p-[14px] flex items-center gap-3">
          <span className="h-9 w-9 rounded-[8px] bg-[#EFF6FF] text-[#185FA5] flex items-center justify-center shrink-0 border-[0.5px] border-[#C8DDF5]">
            <Bot className="h-4 w-4" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-medium text-[#0F172A]">AI-driven inkassomotor</h3>
              <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#0C447C] bg-[#E6F4FA] border-[0.5px] border-[#C8DDF5] rounded-full px-[8px] py-px">
                <Sparkles className="inline h-2.5 w-2.5 -mt-0.5" /> Beta
              </span>
            </div>
            <p className="text-[11px] text-[#475569] mt-0.5">
              {ranked.length} förfallna · {formatSEK(totalAtRisk)} i risk · förväntad återvinning {formatSEK(Math.round(expectedRecovery))}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-[#F8FAFB] border-[0.5px] border-[#E2E8F0] rounded-full p-[2px]">
            {(["off", "suggest", "auto"] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-[10px] h-[24px] rounded-full text-[11px] font-medium transition-colors ${
                  mode === m
                    ? "bg-white text-[#1D4ED8] border-[0.5px] border-[#E2E8F0]"
                    : "text-[#475569] hover:text-[#0F172A]"
                }`}
              >
                {m === "off" ? "Av" : m === "suggest" ? "Föreslå" : "Auto"}
              </button>
            ))}
          </div>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 text-[#475569] hover:bg-[#F8FAFB]">
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="px-[14px] pb-[14px] space-y-2 border-t-[0.5px] border-[#E2E8F0] pt-3">
            <div className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">
              Nästa 3 åtgärder AI rekommenderar
            </div>
            {next3.map(inv => {
              const Icon = inv.esc.icon;
              return (
                <div key={inv.id} className="flex items-center gap-3 p-[10px] rounded-[8px] bg-[#F8FAFB] border-[0.5px] border-[#E2E8F0]">
                  <span className={`h-8 w-8 rounded-[8px] flex items-center justify-center shrink-0 ${inv.esc.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-[#0F172A] truncate">
                      {inv.counterparty_name} <span className="text-[#94A3B8] font-normal">· {inv.invoice_number}</span>
                    </div>
                    <div className="text-[11px] text-[#475569] mt-0.5">
                      {inv.daysOverdue}d förfallen · {inv.esc.tone} · {inv.esc.channel}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[12px] font-medium tabular-nums text-[#0F172A]">{formatSEK(inv.total_amount)}</div>
                    <div className={`text-[10px] font-medium ${inv.prob >= 60 ? "text-[#085041]" : inv.prob >= 35 ? "text-[#7A5417]" : "text-[#7A1F1E]"}`}>
                      {inv.prob}% sannolikhet
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-[#475569]">
                {mode === "auto"
                  ? "AI skickar påminnelser automatiskt enligt eskaleringsplan"
                  : mode === "suggest"
                  ? "AI föreslår åtgärder — du godkänner"
                  : "Manuell hantering"}
              </p>
              <Button
                size="sm"
                onClick={() => onBulkRemind(ranked.map(i => i.id))}
                disabled={isBulkActing || mode === "off"}
                className="h-[34px] text-[12px] bg-[#1D4ED8] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[8px] px-[14px] font-medium"
              >
                {isBulkActing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                Kör {ranked.length} påminnelser
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
