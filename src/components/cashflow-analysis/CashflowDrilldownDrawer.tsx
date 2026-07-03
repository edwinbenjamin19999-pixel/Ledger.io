import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, Building2, Banknote, Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatSEK } from "@/lib/formatNumber";
import type { CashflowDrilldownFocus } from "@/hooks/useCashflowState";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  focus: CashflowDrilldownFocus | null;
  companyId: string | null;
  fromDate: Date;
  toDate: Date;
}

interface SourceRow {
  id: string;
  date: string;
  counterparty: string;
  reference?: string;
  amount: number;
  status?: string;
  href?: string;
}
interface JournalRow {
  id: string;
  date: string;
  description: string;
  amount: number;
}
interface BankRow {
  id: string;
  date: string;
  counterparty: string;
  amount: number;
  matched: boolean;
}

export function CashflowDrilldownDrawer({ open, onOpenChange, focus, companyId, fromDate, toDate }: Props) {
  const [tab, setTab] = useState<"sources" | "verifications" | "bank">("sources");
  const [sources, setSources] = useState<SourceRow[] | null>(null);
  const [journals, setJournals] = useState<JournalRow[] | null>(null);
  const [banks, setBanks] = useState<BankRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const bucket = focus?.bucket ?? null;

  useEffect(() => {
    if (!open || !focus || !companyId) return;
    setSources(null); setJournals(null); setBanks(null); setTab("sources");
    setLoading(true);

    const fromIso = fromDate.toISOString().slice(0, 10);
    const toIso = toDate.toISOString().slice(0, 10);

    async function load() {
      try {
        const tasks: PromiseLike<unknown>[] = [];

        // 1) SOURCES per bucket
        if (bucket === "customer_in") {
          tasks.push(
            supabase
              .from("invoices")
              .select("id, invoice_number, counterparty_name, total_amount, status, paid_at, due_date")
              .eq("company_id", companyId)
              .eq("invoice_direction", "outgoing")
              .gte("paid_at", fromIso)
              .lte("paid_at", toIso)
              .order("paid_at", { ascending: false })
              .limit(50)
              .then(({ data }) => {
                setSources(
                  (data ?? []).map((r: any) => ({
                    id: r.id,
                    date: r.paid_at ?? r.due_date ?? "",
                    counterparty: r.counterparty_name ?? "Okänd kund",
                    reference: r.invoice_number,
                    amount: Number(r.total_amount ?? 0),
                    status: r.status,
                    href: `/invoices?focus=${r.id}`,
                  })),
                );
              }),
          );
        } else if (bucket === "supplier_out") {
          tasks.push(
            supabase
              .from("invoices")
              .select("id, invoice_number, counterparty_name, total_amount, status, paid_at, due_date")
              .eq("company_id", companyId)
              .eq("invoice_direction", "incoming")
              .gte("paid_at", fromIso)
              .lte("paid_at", toIso)
              .order("paid_at", { ascending: false })
              .limit(50)
              .then(({ data }) => {
                setSources(
                  (data ?? []).map((r: any) => ({
                    id: r.id,
                    date: r.paid_at ?? r.due_date ?? "",
                    counterparty: r.counterparty_name ?? "Okänd leverantör",
                    reference: r.invoice_number,
                    amount: -Math.abs(Number(r.total_amount ?? 0)),
                    status: r.status,
                    href: `/supplier-invoices?focus=${r.id}`,
                  })),
                );
              }),
          );
        } else if (bucket === "payroll_out") {
          tasks.push(
            supabase
              .from("payroll_runs")
              .select("id, period_start, period_end, total_net_pay, status, employee_count")
              .eq("company_id", companyId)
              .gte("period_start", fromIso)
              .lte("period_end", toIso)
              .order("period_start", { ascending: false })
              .limit(20)
              .then(({ data }) => {
                setSources(
                  (data ?? []).map((r: any) => ({
                    id: r.id,
                    date: r.period_start,
                    counterparty: `Lönekörning ${r.period_start} – ${r.period_end}`,
                    reference: `${r.employee_count ?? "?"} anställda`,
                    amount: -Math.abs(Number(r.total_net_pay ?? 0)),
                    status: r.status,
                    href: `/hr?run=${r.id}`,
                  })),
                );
              }),
          );
        } else if (bucket === "vat_out") {
          tasks.push(
            supabase
              .from("vat_periods")
              .select("id, period_start, period_end, vat_due, status")
              .eq("company_id", companyId)
              .gte("period_start", fromIso)
              .lte("period_end", toIso)
              .order("period_start", { ascending: false })
              .limit(12)
              .then(({ data }) => {
                setSources(
                  (data ?? []).map((r: any) => ({
                    id: r.id,
                    date: r.period_end,
                    counterparty: `Momsperiod ${r.period_start} – ${r.period_end}`,
                    amount: -Math.abs(Number(r.vat_due ?? 0)),
                    status: r.status,
                    href: `/moms`,
                  })),
                );
              }),
          );
        } else {
          setSources([]);
        }

        // 2) VERIFICATIONS (when sourceIds present, fetch those journals;
        //    else show all journals affecting cash + counter accounts within bucket range)
        const ids = focus?.sourceIds ?? [];
        if (ids.length > 0) {
          tasks.push(
            supabase
              .from("journal_entries")
              .select("id, entry_date, description, journal_entry_lines(debit, credit)")
              .in("id", ids)
              .limit(50)
              .then(({ data }) => {
                setJournals(
                  (data ?? []).map((e: any) => ({
                    id: e.id,
                    date: e.entry_date,
                    description: e.description ?? "—",
                    amount: (e.journal_entry_lines ?? []).reduce(
                      (s: number, l: any) => s + (Number(l.debit ?? 0) - Number(l.credit ?? 0)),
                      0,
                    ),
                  })),
                );
              }),
          );
        } else {
          setJournals([]);
        }

        // 3) BANK
        tasks.push(
          supabase
            .from("bank_transactions")
            .select("id, transaction_date, counterparty_name, amount, matched_at, journal_entry_id")
            .eq("company_id", companyId)
            .gte("transaction_date", fromIso)
            .lte("transaction_date", toIso)
            .order("transaction_date", { ascending: false })
            .limit(40)
            .then(({ data }) => {
              setBanks(
                (data ?? []).map((r: any) => ({
                  id: r.id,
                  date: r.transaction_date,
                  counterparty: r.counterparty_name ?? "—",
                  amount: Number(r.amount ?? 0),
                  matched: !!r.matched_at || !!r.journal_entry_id,
                })),
              );
            }),
        );

        await Promise.all(tasks);
      } catch (e) {
        console.error("[CashflowDrilldownDrawer] load failed", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [open, focus, companyId, fromDate, toDate, bucket]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{focus?.label ?? "Detaljer"}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Drilldown till verkliga källobjekt — fakturor, lönekörningar, bankhändelser och verifikationer.
          </p>
        </SheetHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sources" className="gap-1.5 text-xs"><Receipt className="h-3.5 w-3.5" />Källobjekt</TabsTrigger>
            <TabsTrigger value="verifications" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" />Verifikationer</TabsTrigger>
            <TabsTrigger value="bank" className="gap-1.5 text-xs"><Banknote className="h-3.5 w-3.5" />Bank</TabsTrigger>
          </TabsList>

          <TabsContent value="sources" className="mt-3">
            {loading && !sources ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : !sources || sources.length === 0 ? (
              <Empty text="Inga källobjekt hittades för denna kategori." />
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {sources.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate font-medium">{s.counterparty}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{s.date}</span>
                        {s.reference ? <span>· {s.reference}</span> : null}
                        {s.status ? <span>· {s.status}</span> : null}
                      </div>
                    </div>
                    <div className={cn("text-right text-sm font-semibold tabular-nums", s.amount < 0 ? "text-[#7A1A1A] dark:text-[#C73838]" : "text-[#085041] dark:text-[#1D9E75]")}>
                      {s.amount < 0 ? "−" : ""}{formatSEK(Math.abs(s.amount))}
                    </div>
                    {s.href ? (
                      <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0">
                        <Link to={s.href}><ExternalLink className="h-3.5 w-3.5" /></Link>
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="verifications" className="mt-3">
            {loading && !journals ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : !journals || journals.length === 0 ? (
              <Empty text="Inga verifikationer kopplade till denna drivare." />
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {journals.map((j) => (
                  <li key={j.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{j.description}</div>
                      <div className="text-[11px] text-muted-foreground">{j.date}</div>
                    </div>
                    <Button asChild size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs">
                      <Link to={`/verifikationer/${j.id}`}>
                        Visa <ExternalLink className="h-3 w-3" />
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="bank" className="mt-3">
            {loading && !banks ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : !banks || banks.length === 0 ? (
              <Empty text="Inga bankhändelser i perioden." />
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {banks.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{b.counterparty}</div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{b.date}</span>
                        <span className={cn(
                          "rounded-full px-1.5 py-px text-[10px]",
                          b.matched ? "bg-[#E1F5EE] text-[#085041] dark:text-emerald-300" : "bg-[#FAEEDA] text-[#7A5417] dark:text-amber-300",
                        )}>
                          {b.matched ? "Matchad" : "Omatchad"}
                        </span>
                      </div>
                    </div>
                    <div className={cn("text-right text-sm font-semibold tabular-nums", b.amount < 0 ? "text-[#7A1A1A] dark:text-[#C73838]" : "text-[#085041] dark:text-[#1D9E75]")}>
                      {b.amount < 0 ? "−" : ""}{formatSEK(Math.abs(b.amount))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
      {text}
    </div>
  );
}
