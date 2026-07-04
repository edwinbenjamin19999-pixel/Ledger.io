import { differenceInDays, parseISO } from "date-fns";

export type APClass = "pay_now" | "pay_soon" | "can_wait" | "strategic_delay";

export interface ClassifiableInvoice {
  id: string;
  due_date: string;
  status: string;
  counterparty_name: string;
  total_amount: number;
}

const CRITICAL_KEYWORDS = ["el", "elnät", "vattenfall", "fortum", "ellevio", "hyra", "fastighets", "telia", "skatteverk", "kronofogd"];

export function classify(
  invoice: ClassifiableInvoice,
  paymentTerms: number = 30,
): APClass {
  const days = differenceInDays(parseISO(invoice.due_date), new Date());
  const name = (invoice.counterparty_name || "").toLowerCase();
  const isCritical = CRITICAL_KEYWORDS.some(k => name.includes(k));

  if (days <= 2 || (isCritical && days <= 5)) return "pay_now";
  if (days <= 7) return "pay_soon";
  if (paymentTerms >= 45 || days > 30) return "strategic_delay";
  return "can_wait";
}

export const CLASS_META: Record<APClass, {
  label: string;
  short: string;
  border: string;
  borderL: string;
  bg: string;
  chipBg: string;
  chipText: string;
  dot: string;
  defaultOpen: boolean;
}> = {
  pay_now: {
    label: "Betala nu",
    short: "Kritisk",
    border: "border-rose-200",
    borderL: "border-l-4 border-l-rose-500",
    bg: "bg-rose-50/40",
    chipBg: "bg-rose-100",
    chipText: "text-rose-700",
    dot: "bg-rose-500",
    defaultOpen: true,
  },
  pay_soon: {
    label: "Betala snart",
    short: "Snart",
    border: "border-amber-200",
    borderL: "border-l-4 border-l-amber-500",
    bg: "bg-amber-50/40",
    chipBg: "bg-amber-100",
    chipText: "text-amber-700",
    dot: "bg-amber-500",
    defaultOpen: true,
  },
  can_wait: {
    label: "Kan vänta",
    short: "Kan vänta",
    border: "border-blue-200",
    borderL: "border-l-4 border-l-[#3b82f6]",
    bg: "bg-blue-50/30",
    chipBg: "bg-blue-100",
    chipText: "text-[#3b82f6]",
    dot: "bg-[#3b82f6]",
    defaultOpen: false,
  },
  strategic_delay: {
    label: "Strategisk fördröjning",
    short: "Strategisk",
    border: "border-slate-200",
    borderL: "border-l-4 border-l-slate-400",
    bg: "bg-slate-50/40",
    chipBg: "bg-slate-100",
    chipText: "text-slate-700",
    dot: "bg-slate-400",
    defaultOpen: false,
  },
};
