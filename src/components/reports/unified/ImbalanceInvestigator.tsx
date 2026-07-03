/**
 * ImbalanceInvestigator — diagnostic modal that opens from the global error
 * bar / balance status card. Reads `report.imbalance` straight from the
 * engine — performs ZERO new calculations in the UI.
 *
 * Shows: total diff · likely category · suspect accounts · RR↔BR equity tree ·
 * suggested fixes. Visible from BOTH RR and BR lenses.
 */
import { AlertOctagon, ChevronRight, Sparkles, FileWarning } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";
import type { FinancialReport } from "@/lib/reports/engine";
import type { DifferenceTreeNode } from "@/lib/reports/imbalanceDiagnostics";

interface ImbalanceInvestigatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: FinancialReport;
  onAccountClick?: (accountNumber: string) => void;
  onEntryClick?: (entryId: string) => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  result_carry: "Resultatöverföring (2099)",
  equity: "Eget kapital",
  liability: "Skulder",
  asset: "Tillgångar",
  unknown: "Okänd orsak",
};

function TreeNode({ node, depth = 0 }: { node: DifferenceTreeNode; depth?: number }) {
  return (
    <div>
      <div
        className={cn(
          "flex items-center justify-between py-2 px-3 rounded-lg",
          node.highlight ? "bg-[#FCE8E8] dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40" : "",
          depth === 0 && "font-semibold text-slate-900 dark:text-slate-100",
          depth > 0 && "text-sm text-slate-700 dark:text-slate-300",
        )}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <span className="flex items-center gap-2">
          {node.children && node.children.length > 0 && (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          )}
          {node.label}
        </span>
        <span
          className={cn(
            "tabular-nums font-mono text-sm",
            node.value < 0 && "text-[#7A1A1A] dark:text-[#C73838]",
            node.value > 0 && depth === 0 && "text-slate-900 dark:text-slate-100",
          )}
        >
          {formatSEK(node.value)}
        </span>
      </div>
      {node.children && node.children.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {node.children.map((child, idx) => (
            <TreeNode key={idx} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ImbalanceInvestigator({
  open,
  onOpenChange,
  report,
  onAccountClick,
  onEntryClick,
}: ImbalanceInvestigatorProps) {
  const { imbalance, totals, validation } = report;
  const diff = validation.imbalanceDiff;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="rounded-xl w-10 h-10 flex items-center justify-center bg-[#FCE8E8] text-[#7A1A1A] dark:text-[#C73838] shrink-0">
              <AlertOctagon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-bold">Undersök obalans</p>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">
                Diagnostik byggd från samma rapportmotor som RR och BR
              </p>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Diagnostisk vy som visar trolig orsak till balansavvikelsen och föreslår åtgärder.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 pb-2">
            {/* Headline numbers */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-rose-200/60 dark:border-rose-800/40 bg-rose-50/70 dark:bg-rose-950/30 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A1A1A] dark:text-rose-300">
                  Differens
                </p>
                <p className="text-xl font-bold tabular-nums mt-1 text-[#7A1A1A] dark:text-rose-300">
                  {formatSEK(Math.abs(diff))}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Trolig orsak
                </p>
                <p className="text-sm font-semibold mt-1.5">
                  {CATEGORY_LABEL[imbalance.likelyCategory] ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Säkerhet
                </p>
                <p className="text-sm font-semibold mt-1.5">
                  {Math.round(imbalance.overallConfidence * 100)}%
                </p>
              </div>
            </div>

            {/* RR ↔ BR equity bridge */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                RR ↔ BR brygga
              </h3>
              <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Periodens resultat (RR)</span>
                  <span className="tabular-nums font-mono">{formatSEK(totals.result)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Eget kapital (BR)</span>
                  <span className="tabular-nums font-mono">{formatSEK(totals.equity)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-semibold">
                  <span>Tillgångar − (EK + Skulder)</span>
                  <span className={cn("tabular-nums font-mono", Math.abs(diff) > 1 && "text-[#7A1A1A] dark:text-[#C73838]")}>
                    {formatSEK(diff)}
                  </span>
                </div>
              </div>
            </section>

            {/* Difference tree */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Strukturell uppdelning
              </h3>
              <div className="rounded-xl border border-border bg-card p-2">
                <TreeNode node={imbalance.tree} />
              </div>
            </section>

            {/* Specifik verifikation / öppningsbalans som skapar differensen */}
            {imbalance.suspectedEntries.length > 0 && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Specifik verifikation / öppningsbalans
                </h3>
                <div className="space-y-2">
                  {imbalance.suspectedEntries.slice(0, 4).map((e) => (
                    <button
                      key={e.entryId}
                      onClick={() => onEntryClick?.(e.entryId)}
                      className={cn(
                        "w-full text-left rounded-xl border bg-card hover:border-[#3b82f6] transition-all px-4 py-3",
                        e.match === "exact"
                          ? "border-rose-300/70 bg-rose-50/40 dark:bg-rose-950/20"
                          : "border-border",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold flex items-center gap-2">
                            <FileWarning className="h-3.5 w-3.5 text-[#7A1A1A]" />
                            <span>{e.entryDate} · {e.description}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Debet − Kredit ={" "}
                            <span className="font-mono tabular-nums text-[#7A1A1A]">
                              {formatSEK(e.netDelta)} kr
                            </span>{" "}
                            {e.match === "exact" && (
                              <span className="text-[#7A1A1A] font-semibold">
                                · matchar BR-obalansen exakt
                              </span>
                            )}
                          </p>
                          <div className="mt-2 grid grid-cols-[80px_1fr_90px_90px] gap-2 text-[11px] font-mono tabular-nums">
                            {e.lines.slice(0, 6).map((ln, i) => (
                              <ContentsRow key={i} ln={ln} />
                            ))}
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {e.match === "exact" ? "EXAKT" : "Kandidat"}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Suspect accounts */}
            {imbalance.suspectedAccounts.length > 0 && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Misstänkta konton
                </h3>
                <div className="space-y-2">
                  {imbalance.suspectedAccounts.slice(0, 6).map((s) => (
                    <button
                      key={`${s.accountNumber}-${s.anomalyType}`}
                      onClick={() => onAccountClick?.(s.accountNumber)}
                      className="w-full text-left rounded-xl border border-border bg-card hover:border-[#3b82f6] hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#3b82f6] dark:text-[#3b82f6]">
                            {s.accountNumber} · {s.accountName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {s.description}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {Math.round(s.confidence * 100)}%
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Suggested fixes */}
            {imbalance.fixes.length > 0 && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Föreslagna åtgärder
                </h3>
                <div className="space-y-2">
                  {imbalance.fixes.map((f) => (
                    <div
                      key={f.id}
                      className="rounded-xl border border-blue-200/70 dark:border-[#3b82f6]/40 bg-blue-50/40 dark:bg-blue-950/20 px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-4 h-4 text-[#3b82f6] dark:text-[#1E3A5F] shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{f.title}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            {f.explanation}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => f.accountNumber && onAccountClick?.(f.accountNumber)}
                            >
                              {f.ctaLabel}
                            </Button>
                            <span className="text-[11px] text-muted-foreground">
                              Säkerhet {Math.round(f.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function ContentsRow({ ln }: { ln: { accountNumber: string; accountName: string; debit: number; credit: number } }) {
  return (
    <>
      <span className="text-muted-foreground">{ln.accountNumber}</span>
      <span className="truncate">{ln.accountName}</span>
      <span className="text-right">{ln.debit ? formatSEK(ln.debit) : "—"}</span>
      <span className="text-right">{ln.credit ? formatSEK(ln.credit) : "—"}</span>
    </>
  );
}
