import { useMemo, useState } from "react";
import { differenceInDays, parseISO, startOfDay, isBefore } from "date-fns";
import { ChevronDown, ChevronRight, Link2, MinusCircle, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { classify } from "@/lib/supplier-ledger/classifyAP";

export type GroupKey = "due" | "supplier" | "priority";

interface Inv {
  id: string;
  invoice_number: string;
  supplier_name: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  currency: string;
  status: string;
  bankgiro: string | null;
  iban: string | null;
  selected: boolean;
}

interface Props {
  invoices: Inv[];
  groupBy: GroupKey;
  onGroupByChange: (g: GroupKey) => void;
  matchedCredits: Map<string, { invoice_number: string; total_amount: number }>;
  availableCreditsBySupplier: (supplier: string) => Inv[];
  onToggleOne: (id: string) => void;
  onToggleMany: (ids: string[], select: boolean) => void;
  onOpenCreditMatch: (inv: Inv) => void;
  onUnmatchCredit: (id: string) => void;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt0 = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

const DUE_BUCKETS = [
  { key: "overdue", label: "Förfallna", dot: "bg-rose-500", textTone: "text-[#7A1A1A]" },
  { key: "today", label: "Idag", dot: "bg-rose-400", textTone: "text-[#7A1A1A]" },
  { key: "tomorrow", label: "Imorgon", dot: "bg-amber-500", textTone: "text-[#7A5417]" },
  { key: "thisweek", label: "Denna vecka", dot: "bg-amber-400", textTone: "text-[#7A5417]" },
  { key: "nextweek", label: "Nästa vecka", dot: "bg-[#3b82f6]", textTone: "text-[#3b82f6]" },
  { key: "later", label: "Senare", dot: "bg-slate-400", textTone: "text-slate-600" },
] as const;

function dueBucket(date: string | null): typeof DUE_BUCKETS[number]["key"] {
  if (!date) return "later";
  const d = differenceInDays(parseISO(date), startOfDay(new Date()));
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d <= 7) return "thisweek";
  if (d <= 14) return "nextweek";
  return "later";
}

const PRIO_META = {
  pay_now: { label: "Kritisk", dot: "bg-rose-500", textTone: "text-[#7A1A1A]" },
  pay_soon: { label: "Hög", dot: "bg-amber-500", textTone: "text-[#7A5417]" },
  can_wait: { label: "Normal", dot: "bg-[#3b82f6]", textTone: "text-[#3b82f6]" },
  strategic_delay: { label: "Låg", dot: "bg-slate-400", textTone: "text-slate-600" },
} as const;

export function PaymentGroupedList(props: Props) {
  const { invoices, groupBy, matchedCredits, availableCreditsBySupplier } = props;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    if (groupBy === "due") {
      const map = new Map<string, Inv[]>();
      for (const inv of invoices) {
        const k = dueBucket(inv.due_date);
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(inv);
      }
      return DUE_BUCKETS
        .filter(b => map.has(b.key))
        .map(b => ({ id: b.key, label: b.label, dot: b.dot, textTone: b.textTone, items: map.get(b.key)! }));
    }
    if (groupBy === "supplier") {
      const map = new Map<string, Inv[]>();
      for (const inv of invoices) {
        const k = inv.supplier_name || "Okänd leverantör";
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(inv);
      }
      return [...map.entries()]
        .sort((a, b) => b[1].reduce((s, i) => s + i.total_amount, 0) - a[1].reduce((s, i) => s + i.total_amount, 0))
        .map(([k, items]) => ({ id: k, label: k, dot: "bg-slate-400", textTone: "text-slate-700", items }));
    }
    // priority
    const map = new Map<string, Inv[]>();
    for (const inv of invoices) {
      const c = classify({
        id: inv.id, due_date: inv.due_date, status: inv.status,
        counterparty_name: inv.supplier_name, total_amount: inv.total_amount,
      });
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(inv);
    }
    const order: (keyof typeof PRIO_META)[] = ["pay_now", "pay_soon", "can_wait", "strategic_delay"];
    return order
      .filter(k => map.has(k))
      .map(k => ({ id: k, label: PRIO_META[k].label, dot: PRIO_META[k].dot, textTone: PRIO_META[k].textTone, items: map.get(k)! }));
  }, [invoices, groupBy]);

  if (invoices.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Group-by chips */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
        <span className="text-[11px] uppercase tracking-wide text-slate-500 mr-1">Gruppera efter</span>
        {([
          { v: "due", l: "Förfallodag" },
          { v: "supplier", l: "Leverantör" },
          { v: "priority", l: "Prioritet" },
        ] as { v: GroupKey; l: string }[]).map(o => (
          <button
            key={o.v}
            type="button"
            onClick={() => props.onGroupByChange(o.v)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              groupBy === o.v
                ? "bg-[#EFF6FF] text-[#3b82f6] border border-[#C8DDF5]"
                : "text-slate-600 hover:bg-slate-50 border border-transparent",
            )}
          >
            {o.l}
          </button>
        ))}
      </div>

      <div className="divide-y divide-slate-100">
        {groups.map(g => {
          const isCollapsed = collapsed.has(g.id) || (groupBy === "supplier" && !collapsed.has(`__open_${g.id}`));
          // For supplier groups, default collapsed
          const open = groupBy === "supplier" ? collapsed.has(`__open_${g.id}`) : !collapsed.has(g.id);
          const total = g.items.reduce((s, i) => s + i.total_amount, 0);
          const allSelected = g.items.every(i => i.selected);

          return (
            <div key={g.id}>
              <div className={cn(
                "flex items-center gap-3 px-5 py-3 bg-slate-50/60",
              )}>
                <button
                  type="button"
                  onClick={() => {
                    const next = new Set(collapsed);
                    const key = groupBy === "supplier" ? `__open_${g.id}` : g.id;
                    if (next.has(key)) next.delete(key); else next.add(key);
                    setCollapsed(next);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <span className={cn("h-2 w-2 rounded-full", g.dot)} />
                <span className={cn("text-sm font-medium", g.textTone)}>{g.label}</span>
                <Badge variant="outline" className="text-[10px] font-normal">{g.items.length}</Badge>
                <span className="text-sm font-mono tabular-nums text-slate-700 ml-auto">{fmt0(total)} kr</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => props.onToggleMany(g.items.map(i => i.id), !allSelected)}
                >
                  {allSelected ? "Avmarkera grupp" : "Välj alla i grupp"}
                </Button>
              </div>

              {open && (
                <div className="divide-y divide-slate-50">
                  {g.items.map(inv => {
                    const overdue = inv.due_date && isBefore(parseISO(inv.due_date), startOfDay(new Date()));
                    const credit = matchedCredits.get(inv.id);
                    const netAmount = credit ? inv.total_amount + credit.total_amount : inv.total_amount;
                    const availableCredits = availableCreditsBySupplier(inv.supplier_name);
                    const daysUntilDue = inv.due_date ? differenceInDays(parseISO(inv.due_date), startOfDay(new Date())) : null;

                    return (
                      <div
                        key={inv.id}
                        className={cn(
                          "flex items-center gap-3 px-5 py-3 group hover:bg-slate-50/40",
                          inv.selected && "bg-blue-50/40",
                        )}
                      >
                        <Checkbox checked={inv.selected} onCheckedChange={() => props.onToggleOne(inv.id)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium text-slate-900 truncate">{inv.supplier_name}</span>
                            <span className="font-mono text-[11px] text-slate-400">{inv.invoice_number}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                            <span>{inv.bankgiro || inv.iban || "Saknar betalinfo"}</span>
                            {inv.due_date && (
                              <span className={cn(
                                "inline-flex items-center gap-1",
                                overdue && "text-[#7A1A1A] font-medium",
                              )}>
                                · Förfaller {inv.due_date}
                                {daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 3 && (
                                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                                    {daysUntilDue === 0 ? "idag" : `${daysUntilDue}d`}
                                  </Badge>
                                )}
                                {overdue && <AlertTriangle className="h-3 w-3" />}
                              </span>
                            )}
                          </div>
                        </div>

                        {credit ? (
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-blue-600" onClick={() => props.onUnmatchCredit(inv.id)}>
                            <Link2 className="h-3 w-3" />
                            <span className="text-[10px]">−{fmt0(Math.abs(credit.total_amount))}</span>
                          </Button>
                        ) : availableCredits.length > 0 ? (
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-slate-500 hover:text-blue-600" onClick={() => props.onOpenCreditMatch(inv)}>
                            <MinusCircle className="h-3 w-3" />
                            <span className="text-[10px]">{availableCredits.length} kredit</span>
                          </Button>
                        ) : null}

                        <div className="text-right">
                          <p className="text-base font-mono tabular-nums font-semibold text-slate-900">{fmt(inv.total_amount)} kr</p>
                          {credit && (
                            <p className="text-[11px] text-[#085041] font-mono">Netto {fmt(netAmount)} kr</p>
                          )}
                          <p className="text-[10px] text-slate-400">{inv.currency || "SEK"}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm py-16 px-6 text-center">
      <div className="mx-auto h-14 w-14 rounded-full bg-[#E1F5EE] flex items-center justify-center mb-4">
        <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-[#085041]">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-base font-semibold text-slate-900">Du är fullt uppdaterad</p>
      <p className="text-sm text-slate-500 mt-1">Inga utestående leverantörsbetalningar just nu.</p>
    </div>
  );
}
