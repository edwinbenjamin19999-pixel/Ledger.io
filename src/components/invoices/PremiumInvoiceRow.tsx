import { differenceInDays, parseISO, addDays, format } from "date-fns";
import { Bell, Gavel, Eye, CheckCircle2, AlertTriangle, Sparkles, TrendingUp, Send, Mail, Clock, Pencil, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatSEK } from "@/lib/formatNumber";
import { InvoiceActions } from "./InvoiceActions";
import { validateInvoiceDraft, type InvoiceValidationResult } from "@/lib/invoiceValidation";

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  counterparty_name: string;
  total_amount: number;
  status: string;
  invoice_type: string;
  paid_at?: string;
  sent_at?: string;
  reminder_count?: number;
  last_reminder_sent_at?: string;
}

interface PaymentInsight {
  avgDaysLate: number;
  count: number;
}

interface PremiumInvoiceRowProps {
  invoice: Invoice;
  effectiveStatus: string;
  insight?: PaymentInsight;
  reminderCount?: number;
  accent: "rose" | "amber" | "emerald" | "slate";
  companyId?: string;
  onPreview: () => void;
  onRemind: () => void;
  onCollections: () => void;
  onMarkPaid: () => void;
  onUpdate?: () => void;
  onEdit?: () => void;
}

const ACCENT_DOT: Record<string, string> = {
  rose: "bg-[#E24B4A]",
  amber: "bg-[#C68316]",
  emerald: "bg-[#1D9E75]",
  slate: "bg-[#94A3B8]",
};

const Avatar = ({ name }: { name: string }) => {
  const initials = name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
  return (
    <div className="h-9 w-9 rounded-[8px] bg-[#F1F5F9] text-[#475569] flex items-center justify-center text-[11px] font-medium shrink-0">
      {initials}
    </div>
  );
};

export const PremiumInvoiceRow = ({
  invoice, effectiveStatus, insight, reminderCount = 0, accent, companyId,
  onPreview, onRemind, onCollections, onMarkPaid, onUpdate, onEdit,
}: PremiumInvoiceRowProps) => {
  const today = new Date();
  const daysToDue = differenceInDays(parseISO(invoice.due_date), today);
  const isOverdue = effectiveStatus === "overdue";
  const isPaid = invoice.status === "paid";
  const isDraft = invoice.status === "draft";
  const validation: InvoiceValidationResult = isDraft
    ? validateInvoiceDraft(invoice)
    : { ok: true, issues: [] };
  const hasErrors = isDraft && !validation.ok;

  const dueLabel = isPaid
    ? `Betald ${invoice.paid_at?.substring(0, 10) ?? ""}`
    : isOverdue
    ? `${Math.abs(daysToDue)} dagar förfallen`
    : daysToDue === 0
    ? "Förfaller idag"
    : `${daysToDue} dagar kvar`;

  const insightText = insight && insight.count >= 3
    ? insight.avgDaysLate > 14
      ? `Hög risk för sen betalning · betalar i snitt ${insight.avgDaysLate} dagar sent (${insight.count} fakturor)`
      : insight.avgDaysLate > 0
      ? `Betalar i snitt ${insight.avgDaysLate} dagar sent — historik ${insight.count} fakturor`
      : `Pålitlig betalare — historik ${insight.count} fakturor`
    : null;

  const isHighRisk = insight && insight.count >= 3 && insight.avgDaysLate > 14;

  // Real per-invoice payment probability (7d). Drives the AI insight chip
  // — never hardcoded, so two invoices with different age/history show
  // different numbers.
  const daysOverdue = Math.max(0, -daysToDue);
  const probBase = insight && insight.count >= 2
    ? insight.avgDaysLate <= 0 ? 92
      : insight.avgDaysLate <= 5 ? 80
      : insight.avgDaysLate <= 15 ? 60
      : insight.avgDaysLate <= 30 ? 40
      : 22
    : 65;
  const ageDrop = daysOverdue > 60 ? 35 : daysOverdue > 30 ? 22 : daysOverdue > 14 ? 10 : 0;
  const reminderDrop = Math.min(20, (reminderCount ?? 0) * 7);
  const payProb = Math.max(3, Math.min(97, Math.round(probBase - ageDrop - reminderDrop)));
  const probTooltip = insight && insight.count >= 2
    ? `Historik: betalar i snitt ${insight.avgDaysLate}d sent (${insight.count} fakturor)`
    : "Ingen tidigare historik för denna kund — använder baslinje 65%";

  // AI insight microline
  const aiInsight = !isPaid && insight && insight.count >= 2
    ? insight.avgDaysLate > 14
      ? { text: `Hög risk · ${insight.count} förseningar i rad · ${payProb}% sannolikhet 7d`, tone: "rose" as const, icon: AlertTriangle }
      : insight.avgDaysLate > 0
      ? { text: `Betalar ofta sent · ${insight.avgDaysLate}d snitt · ${payProb}% sannolikhet 7d`, tone: "amber" as const, icon: Clock }
      : { text: `Pålitlig betalare · ${payProb}% sannolikhet 7d`, tone: "emerald" as const, icon: CheckCircle2 }
    : isOverdue
    ? { text: `Följ upp idag · ${payProb}% sannolikhet 7d`, tone: "rose" as const, icon: TrendingUp }
    : !isPaid
    ? { text: `${payProb}% sannolikhet betalning inom 7d`, tone: payProb >= 70 ? "emerald" as const : payProb >= 40 ? "amber" as const : "rose" as const, icon: TrendingUp }
    : null;

  const aiToneClass =
    aiInsight?.tone === "rose" ? "text-[#7A1F1E]" :
    aiInsight?.tone === "amber" ? "text-[#7A5417]" :
    aiInsight?.tone === "emerald" ? "text-[#085041]" : "";

  // Cash flow impact: due date + avg days late
  const expectedPayDate = !isPaid
    ? addDays(parseISO(invoice.due_date), insight?.avgDaysLate ?? 0)
    : null;
  const cashFlowLabel = expectedPayDate ? format(expectedPayDate, "d MMM") : null;

  const dotClass = hasErrors
    ? "bg-[#E24B4A]"
    : isDraft
    ? "bg-[#C68316]"
    : ACCENT_DOT[accent];

  return (
    <div className="group relative bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] hover:bg-[#F8FAFB] transition-colors p-[14px]">
      <div className="flex items-center gap-3">
        <span className={`h-[7px] w-[7px] rounded-full shrink-0 ${dotClass}`} />
        <Avatar name={invoice.counterparty_name} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {/* Invoice number with hover mini-timeline */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  onClick={onPreview}
                  className="font-mono text-[10px] font-medium text-[#475569] hover:text-[#0040CC] transition-colors"
                >
                  {invoice.invoice_number}
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="start" className="w-72 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-3">
                  Faktura-tidslinje
                </div>
                <div className="space-y-2.5">
                  <TimelineDot
                    icon={Send}
                    label="Skickad"
                    date={invoice.sent_at?.substring(0, 10) ?? invoice.invoice_date}
                    done
                  />
                  {(reminderCount > 0 || invoice.last_reminder_sent_at) && (
                    <TimelineDot
                      icon={Mail}
                      label={`${reminderCount || 1} påminnelse${(reminderCount || 1) > 1 ? "r" : ""}`}
                      date={invoice.last_reminder_sent_at?.substring(0, 10)}
                      done
                    />
                  )}
                  {isPaid ? (
                    <TimelineDot icon={CheckCircle2} label="Betald" date={invoice.paid_at?.substring(0, 10)} done tone="emerald" />
                  ) : (
                    <TimelineDot
                      icon={TrendingUp}
                      label="Förväntad betalning"
                      date={cashFlowLabel ?? undefined}
                      done={false}
                      tone={isOverdue ? "rose" : "cyan"}
                    />
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {isDraft && !hasErrors && (
              <Badge className="bg-[#FAEEDA] text-[#7A5417] border-[0.5px] border-[#E8C589] hover:bg-[#FAEEDA] rounded-full text-[10px] font-medium uppercase tracking-[0.07em] px-[8px] py-px">
                Utkast
              </Badge>
            )}
            {hasErrors && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                      className="inline-flex items-center gap-1 rounded-full bg-[#FCE8E8] text-[#7A1F1E] border-[0.5px] border-[#F1A1A0] px-[8px] py-px text-[10px] font-medium uppercase tracking-[0.07em] hover:bg-[#F8DADA] transition-colors"
                    >
                      <FileWarning className="h-2.5 w-2.5" /> Behöver åtgärd
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start" className="max-w-xs">
                    <div className="text-xs font-semibold mb-1">Saknas för att skicka:</div>
                    <ul className="text-xs space-y-0.5 list-disc list-inside">
                      {validation.issues.map((iss) => (
                        <li key={iss.field}>{iss.message}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {isHighRisk && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.07em] text-[#7A1F1E] bg-[#FCE8E8] border-[0.5px] border-[#F1A1A0] rounded-full px-[8px] py-px">
                <AlertTriangle className="h-2.5 w-2.5" /> Hög risk
              </span>
            )}
            {reminderCount > 0 && (
              <span className="text-[10px] text-[#94A3B8]">
                · {reminderCount} {reminderCount === 1 ? "påminnelse" : "påminnelser"}
              </span>
            )}
          </div>
          <p className="text-[13px] font-medium text-[#0F172A] truncate">{invoice.counterparty_name}</p>

          {/* AI insight microline */}
          {aiInsight && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`inline-flex items-center gap-1.5 text-[11px] mt-1 cursor-help ${aiToneClass}`}>
                    <Sparkles className="h-3 w-3" />
                    <span>{aiInsight.text}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="max-w-xs text-xs">
                  <div className="font-semibold mb-1">Så beräknas {payProb}%</div>
                  <div>{probTooltip}</div>
                  {daysOverdue > 0 && <div>Förfallen i {daysOverdue} dagar (−{daysOverdue > 60 ? 35 : daysOverdue > 30 ? 22 : daysOverdue > 14 ? 10 : 0}%)</div>}
                  {(reminderCount ?? 0) > 0 && <div>{reminderCount} påminnelse{(reminderCount ?? 0) > 1 ? "r" : ""} ignorerade (−{Math.min(20, (reminderCount ?? 0) * 7)}%)</div>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <div className="flex items-center gap-2 mt-1 text-[11px] text-[#94A3B8]">
            <span>{invoice.invoice_date}</span>
            <span className="text-[#CBD5E1]">→</span>
            <span>{invoice.due_date}</span>
            <span className={`${isOverdue ? "text-[#7A1F1E]" : daysToDue <= 7 && !isPaid ? "text-[#7A5417]" : "text-[#94A3B8]"}`}>
              · {dueLabel}
            </span>
            {cashFlowLabel && !isPaid && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#0C447C] bg-[#E6F4FA] border-[0.5px] border-[#C8DDF5] rounded-full px-[8px] py-px ml-1">
                <TrendingUp className="h-2.5 w-2.5" /> Påverkar kassa {cashFlowLabel}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 w-[280px] flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {isDraft && onEdit && (
            <Button size="sm" variant="outline" onClick={onEdit} className={`h-[30px] text-[11px] bg-white border-[0.5px] border-[#E2E8F0] rounded-[8px] hover:bg-[#F8FAFB] ${hasErrors ? "text-[#7A1F1E] border-[#F1A1A0]" : "text-[#475569]"}`}>
              <Pencil className="h-3 w-3" /> {hasErrors ? "Korrigera" : "Redigera"}
            </Button>
          )}
          {(effectiveStatus === "overdue" || effectiveStatus === "partial") && (
            <Button size="sm" variant="outline" onClick={onRemind} className="h-[30px] text-[11px] bg-white border-[0.5px] border-[#E2E8F0] text-[#475569] rounded-[8px] hover:bg-[#F8FAFB]">
              <Bell className="h-3 w-3" /> Påminn
            </Button>
          )}
          {effectiveStatus === "overdue" && Math.abs(daysToDue) > 60 && (
            <Button size="sm" variant="outline" onClick={onCollections} className="h-[30px] text-[11px] bg-white border-[0.5px] border-[#F1A1A0] text-[#7A1F1E] rounded-[8px] hover:bg-[#FCE8E8]">
              <Gavel className="h-3 w-3" /> Inkasso
            </Button>
          )}
          {!isPaid && !isDraft && (
            <Button size="sm" variant="outline" onClick={onMarkPaid} title="Markera fakturan som betald" className="h-[30px] text-[11px] bg-white border-[0.5px] border-[#5DCAA5] text-[#085041] rounded-[8px] hover:bg-[#E1F5EE]">
              <CheckCircle2 className="h-3 w-3" /> Markera betald
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onPreview} className="h-[30px] text-[11px] text-[#475569] hover:bg-[#F8FAFB] rounded-[8px]">
            <Eye className="h-3 w-3" /> Detaljer
          </Button>
        </div>

        <div className="shrink-0 w-[140px] flex items-center justify-end">
          <div className="text-[14px] font-medium tabular-nums text-[#0F172A]">{formatSEK(invoice.total_amount)}</div>
        </div>

        {/* 3-dot action menu — alltid synlig */}
        {companyId && (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <InvoiceActions
              invoiceId={invoice.id}
              invoiceNumber={invoice.invoice_number}
              status={invoice.status}
              companyId={companyId}
              invoiceType={invoice.invoice_type}
              onUpdate={onUpdate ?? (() => {})}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const TimelineDot = ({
  icon: Icon, label, date, done, tone = "slate",
}: { icon: React.ElementType; label: string; date?: string; done: boolean; tone?: "slate" | "emerald" | "rose" | "cyan" }) => {
  const toneClass =
    tone === "emerald" ? "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]" :
    tone === "rose" ? "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]" :
    tone === "cyan" ? "bg-[#EFF6FF] text-[#3b82f6] border-[#C8DDF5]" :
    done ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-white text-slate-400 border-slate-200 border-dashed";
  return (
    <div className="flex items-center gap-3">
      <span className={`h-7 w-7 rounded-full border flex items-center justify-center shrink-0 ${toneClass}`}>
        <Icon className="h-3 w-3" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-slate-900">{label}</div>
        {date && <div className="text-[11px] text-slate-500">{date}</div>}
      </div>
    </div>
  );
};
