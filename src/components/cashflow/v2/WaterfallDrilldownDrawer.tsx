import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, ExternalLink, FileText, User, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { WaterfallStep, AccountContribution } from "@/lib/cashflow/waterfall";
import type { CashFlowDetail } from "@/hooks/useCashFlow";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n));

interface Props {
  step: WaterfallStep | null;
  onClose: () => void;
}

interface SourceDoc {
  invoice?: { id: string; invoice_number: string | null; counterparty_name: string | null; total_amount: number; due_date: string | null };
  documentUrl?: string | null;
}

export function WaterfallDrilldownDrawer({ step, onClose }: Props) {
  const navigate = useNavigate();
  const [account, setAccount] = useState<AccountContribution | null>(null);
  const [verification, setVerification] = useState<CashFlowDetail | null>(null);
  const [source, setSource] = useState<SourceDoc | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);

  useEffect(() => {
    if (!step) {
      setAccount(null);
      setVerification(null);
      setSource(null);
    }
  }, [step]);

  useEffect(() => {
    if (!verification) return;
    let cancelled = false;
    setLoadingSource(true);
    (async () => {
      const { data: je } = await supabase
        .from("journal_entries")
        .select("id, document_id")
        .eq("id", verification.verificationId)
        .maybeSingle();

      // Resolve invoice via agent_bookings (source_type='invoice')
      let invoice: SourceDoc["invoice"] | undefined;
      const { data: booking } = await supabase
        .from("agent_bookings")
        .select("source_id, source_type")
        .eq("journal_entry_id", verification.verificationId)
        .eq("source_type", "invoice")
        .maybeSingle();
      if (booking?.source_id) {
        const { data: inv } = await supabase
          .from("invoices")
          .select("id, invoice_number, counterparty_name, total_amount, due_date")
          .eq("id", booking.source_id)
          .maybeSingle();
        if (inv) invoice = inv as SourceDoc["invoice"];
      }

      let documentUrl: string | null | undefined = null;
      if (je?.document_id) {
        const { data: doc } = await supabase
          .from("documents")
          .select("file_path, storage_url")
          .eq("id", je.document_id)
          .maybeSingle();
        documentUrl = (doc as { storage_url?: string } | null)?.storage_url ?? null;
      }
      if (!cancelled) {
        setSource({ invoice, documentUrl });
        setLoadingSource(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [verification]);

  if (!step) return null;

  const level = verification ? 4 : account ? 3 : 1;

  return (
    <Sheet open={!!step} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1">
            <button onClick={() => { setAccount(null); setVerification(null); }} className="hover:text-foreground">
              {step.label}
            </button>
            {account && (
              <>
                <ChevronRight className="h-3 w-3" />
                <button onClick={() => setVerification(null)} className="hover:text-foreground">
                  {account.account_number}
                </button>
              </>
            )}
            {verification && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span>Verifikation</span>
              </>
            )}
          </div>
          <SheetTitle className="text-xl">
            {verification
              ? `Underlag · ${verification.counterpart || "—"}`
              : account
                ? `${account.account_number} · ${account.account_name}`
                : step.label}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          {/* L1: Step summary */}
          {!account && !verification && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Belopp</div>
                  <div className={`mt-1 text-lg font-semibold tabular-nums ${step.amount >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"}`}>
                    {step.amount >= 0 ? "+" : ""}{fmt(step.amount)}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Andel</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">{step.pctOfTotal.toFixed(1)}%</div>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Δ vs förra</div>
                  <div className={`mt-1 text-lg font-semibold tabular-nums ${step.deltaPrev >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"}`}>
                    {step.deltaPrev >= 0 ? "+" : ""}{fmt(step.deltaPrev)}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Konton</h3>
                <div className="space-y-1">
                  {step.accounts.length === 0 && (
                    <p className="text-xs text-muted-foreground p-3">Inga konteringar i steget.</p>
                  )}
                  {step.accounts.map((a) => (
                    <button
                      key={a.account_number}
                      onClick={() => setAccount(a)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left transition-colors"
                    >
                      <div>
                        <div className="text-sm font-medium">{a.account_number}</div>
                        <div className="text-xs text-muted-foreground">{a.account_name}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold tabular-nums ${a.amount >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"}`}>
                          {a.amount >= 0 ? "+" : ""}{fmt(a.amount)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{a.pctOfStep.toFixed(0)}%</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* L2/L3: Account → verifications */}
          {account && !verification && (
            <>
              <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setAccount(null)}>
                <ArrowLeft className="h-3 w-3 mr-1" /> Tillbaka
              </Button>
              <div className="space-y-1">
                {account.details.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => setVerification(v)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium">{v.counterpart || "—"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {v.date} · ver {v.verificationId.slice(0, 8)}
                      </div>
                    </div>
                    <div className={`text-sm font-semibold tabular-nums ${v.amount >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"}`}>
                      {v.amount >= 0 ? "+" : ""}{fmt(v.amount)}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* L4: Source document */}
          {verification && (
            <>
              <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setVerification(null)}>
                <ArrowLeft className="h-3 w-3 mr-1" /> Tillbaka
              </Button>
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Verifikation</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/journal-entries/${verification.verificationId}`)}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Öppna verifikation
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Datum: </span>
                    <span className="tabular-nums">{verification.date}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Konto: </span>
                    <span className="tabular-nums">{verification.account}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Motpart: </span>
                    <span>{verification.counterpart || "—"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Belopp: </span>
                    <span className={`tabular-nums font-semibold ${verification.amount >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"}`}>
                      {verification.amount >= 0 ? "+" : ""}{fmt(verification.amount)} kr
                    </span>
                  </div>
                </div>
              </div>

              {loadingSource ? (
                <Skeleton className="h-32 rounded-lg" />
              ) : (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Källdokument</div>
                  {source?.invoice ? (
                    <>
                      <div className="text-sm font-medium">
                        Faktura {source.invoice.invoice_number || source.invoice.id.slice(0, 8)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {source.invoice.counterparty_name} · {fmt(source.invoice.total_amount)} kr · förfaller {source.invoice.due_date ?? "—"}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/invoices/${source.invoice!.id}`)}>
                          <FileText className="h-3 w-3 mr-1" /> Öppna faktura
                        </Button>
                        {source.invoice.counterparty_name && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/customers?q=${encodeURIComponent(source.invoice!.counterparty_name!)}`)}
                          >
                            <User className="h-3 w-3 mr-1" /> Visa kund
                          </Button>
                        )}
                        {source.documentUrl && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={source.documentUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" /> Originaldokument
                            </a>
                          </Button>
                        )}
                      </div>
                    </>
                  ) : source?.documentUrl ? (
                    <Button size="sm" variant="outline" asChild>
                      <a href={source.documentUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" /> Öppna originaldokument
                      </a>
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Inget kopplat källdokument. Öppna verifikationen för full kontering.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Bridge links — jump to report or command */}
        <div className="mt-6 pt-4 border-t flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { onClose(); navigate("/cash-flow-report"); }}>
            <FileText className="h-3 w-3 mr-1" /> Dokumentera i rapport
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { onClose(); navigate("/cash-command"); }}>
            <ExternalLink className="h-3 w-3 mr-1" /> Hantera i Cash Command
          </Button>
        </div>

        <div className="mt-3 text-[10px] text-muted-foreground text-right">Nivå {level} av 4</div>
      </SheetContent>
    </Sheet>
  );
}
