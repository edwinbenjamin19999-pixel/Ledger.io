/**
 * AI Insight Panel — embedded sidecar in the AP Review Workspace.
 * NOT a tab. Always visible while reviewing an invoice. Reacts to invoice data,
 * supplier history and live risk signals — never static text.
 *
 * Sections:
 *   A. Confidence score (AI match %)
 *   B. Accounting summary (chosen account + reason)
 *   C. Supplier status (known / new / suspicious)
 *   D. Fraud check (BG/PG change, unusual amount, unknown supplier, duplicates)
 *   E. Warnings (live risk signals)
 *   F. Actions (Acceptera AI-förslag / Justera kontering)
 */
import { useMemo, useState } from "react";
import {
  Sparkles,
  Info,
  CheckCircle2,
  TrendingUp,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Banknote,
  Receipt,
  AlertTriangle,
  Wand2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { APInvoice } from "@/hooks/useAPInvoices";
import { useRiskSignals, RISK_KIND_LABELS, type RiskSignal } from "@/hooks/useRiskSignals";
import { useOverbillingActions } from "@/hooks/useOverbillingActions";
import { useInvoiceWorkflow } from "@/hooks/useInvoiceWorkflow";

interface Props {
  invoice: APInvoice;
}

const FRAUD_KINDS: Record<string, { label: string; icon: typeof Banknote }> = {
  bg_changed: { label: "BG/PG har ändrats", icon: Banknote },
  amount_anomaly: { label: "Belopp avviker från snittet", icon: TrendingUp },
  duplicate: { label: "Möjlig dubblettfaktura", icon: Receipt },
  duplicate_period: { label: "Dubblett samma period", icon: Receipt },
  unit_price_drift: { label: "Enhetspris avviker", icon: TrendingUp },
  frequency_anomaly: { label: "Avvikande fakturafrekvens", icon: AlertTriangle },
};

export function AIInsightPanel({ invoice }: Props) {
  const wf = useInvoiceWorkflow(invoice.company_id);
  const confidencePct = invoice.ai_confidence ? Math.round(invoice.ai_confidence * 100) : null;
  const { data: signals = [], isLoading } = useRiskSignals(invoice.id);

  const liveSignals = useMemo(() => signals.filter((s) => !s.resolved_at), [signals]);
  const overbilling = liveSignals.find((s) => s.kind === "overbilling");
  const newSupplierSignal = liveSignals.find((s) => s.kind === "new_supplier");
  const fraudSignals = liveSignals.filter((s) => s.kind in FRAUD_KINDS);
  const warnings = liveSignals.filter(
    (s) => s.kind !== "overbilling" && !(s.kind in FRAUD_KINDS),
  );

  // Supplier status: known if linked supplier_id and no new_supplier signal,
  // suspicious if any high/critical signal, otherwise new.
  const isKnownSupplier = !!invoice.supplier_id && !newSupplierSignal;
  const isSuspicious = liveSignals.some((s) => s.severity === "high" || s.severity === "critical");
  const supplierStatus: "known" | "new" | "suspicious" = isSuspicious
    ? "suspicious"
    : isKnownSupplier
      ? "known"
      : "new";

  // Confidence tone
  const confTone =
    confidencePct === null
      ? "muted"
      : confidencePct >= 90
        ? "ok"
        : confidencePct >= 70
          ? "warn"
          : "bad";

  const canAcceptSuggestion =
    confidencePct !== null && confidencePct >= 70 && !invoice.is_blocked && !overbilling;

  return (
    <div className="space-y-3">
      {/* ───────── A. Header + confidence ───────── */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-[#0052FF] flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider font-bold text-[#475569]">
              AI · Granskning
            </div>
            <div className="text-sm font-semibold text-[#0F172A] truncate">
              Realtidsbedömning
            </div>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#475569]">Konfidens</span>
            <span
              className={cn(
                "font-bold tabular-nums",
                confTone === "ok" && "text-[#085041]",
                confTone === "warn" && "text-[#7A5417]",
                confTone === "bad" && "text-[#7A1F1E]",
                confTone === "muted" && "text-[#475569]",
              )}
            >
              {confidencePct !== null ? `${confidencePct}% match` : "Ej beräknad"}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500",
                confTone === "ok" && "bg-[#E1F5EE]0",
                confTone === "warn" && "bg-[#FAEEDA]0",
                confTone === "bad" && "bg-[#FCE8E8]0",
                confTone === "muted" && "bg-slate-300",
              )}
              style={{ width: `${confidencePct ?? 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* ───────── B. Accounting summary ───────── */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 space-y-2">
        <div className="text-[10px] uppercase tracking-wider font-bold text-[#475569]">
          Kontering (AI-förslag)
        </div>
        <div className="space-y-1.5 text-xs">
          <Row label="Konto" value="Föreslås av AI" />
          <Row label="Moms" value={invoice.vat_code ?? "—"} />
          <Row
            label="Periodisering"
            value={invoice.periodization_plan ? "Förslag tillgängligt" : "Ingen"}
          />
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-[#F8FAFB] p-2 text-[11px] text-[#475569]">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            {confidencePct !== null && confidencePct >= 90
              ? "AI matchade utifrån tidigare bokningar för denna leverantör."
              : confidencePct !== null && confidencePct >= 70
                ? "AI hittade liknande mönster men inte exakt match — verifiera."
                : "Lågt underlag — AI lär sig av din korrigering."}
          </span>
        </div>
      </div>

      {/* ───────── C. Supplier status ───────── */}
      <SupplierStatusCard status={supplierStatus} invoice={invoice} signal={newSupplierSignal} />

      {/* ───────── D. Fraud check ───────── */}
      <FraudCheckCard signals={fraudSignals} loading={isLoading} />

      {/* ───────── E. Warnings (overbilling + others) ───────── */}
      {overbilling && <OverbillingBlock invoice={invoice} signal={overbilling} />}

      {warnings.length > 0 && (
        <div className="rounded-2xl border border-[#E8C589] bg-[#FAEEDA]/60 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#7A5417]">
            <AlertTriangle className="h-3.5 w-3.5" />
            Övriga varningar
          </div>
          <div className="space-y-1.5">
            {warnings.map((s) => (
              <div key={s.id} className="text-[11px] text-amber-900/90">
                · {RISK_KIND_LABELS[s.kind] ?? s.kind}
                {typeof s.details?.message === "string" && (
                  <span className="text-amber-900/70"> — {s.details.message}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────── F. Actions ───────── */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3 space-y-2">
        <div className="text-[10px] uppercase tracking-wider font-bold text-[#475569]">
          AI-åtgärder
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          <Button
            size="sm"
            disabled={!canAcceptSuggestion || wf.savePreAccounting.isPending}
            className="bg-[#0052FF] text-white hover:bg-[#0040CC] justify-start"
            onClick={() => {
              wf.savePreAccounting.mutate({
                invoice_id: invoice.id,
                company_id: invoice.company_id,
                account: null,
                vat_code: invoice.vat_code ?? null,
              });
            }}
          >
            {wf.savePreAccounting.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5 mr-1.5" />
            )}
            Acceptera AI-förslag
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="justify-start"
            onClick={() => {
              const el = document.querySelector("[data-preaccounting-panel]");
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Justera kontering
          </Button>
        </div>
        {!canAcceptSuggestion && confidencePct !== null && (
          <div className="text-[10px] text-[#475569]">
            {overbilling
              ? "Acceptans blockeras tills prisavvikelse hanterats."
              : confidencePct < 70
                ? "Konfidens under 70 % — granska manuellt först."
                : "Häv blockering innan AI-förslag kan accepteras."}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── Subcomponents ───────── */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[#475569] shrink-0">{label}</span>
      <span className="font-medium text-[#0F172A] text-right truncate">{value}</span>
    </div>
  );
}

function SupplierStatusCard({
  status,
  invoice,
  signal,
}: {
  status: "known" | "new" | "suspicious";
  invoice: APInvoice;
  signal: RiskSignal | undefined;
}) {
  const cfg = {
    known: {
      Icon: UserCheck,
      label: "Känd leverantör",
      tone: "border-[#5DCAA5] bg-[#E1F5EE]/70",
      text: "text-[#085041]",
      badge: "bg-[#E1F5EE] text-[#085041] border-[#5DCAA5]",
      desc: "Leverantören är verifierad och har historik i bolaget.",
    },
    new: {
      Icon: UserX,
      label: "Ny leverantör",
      tone: "border-[#E8C589] bg-[#FAEEDA]/70",
      text: "text-[#7A5417]",
      badge: "bg-[#FAEEDA] text-[#7A5417] border-[#E8C589]",
      desc: "Leverantören saknar tidigare historik — bekräfta innan attest.",
    },
    suspicious: {
      Icon: ShieldAlert,
      label: "Misstänkt leverantör",
      tone: "border-[#F1A1A0] bg-[#FCE8E8]/70",
      text: "text-[#7A1A1A]",
      badge: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F1A1A0]",
      desc: "Höga risksignaler kopplade till leverantören — kräver granskning.",
    },
  }[status];

  const Icon = cfg.Icon;

  return (
    <div className={cn("rounded-2xl border p-4 space-y-2", cfg.tone)}>
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", cfg.text)} />
        <span className={cn("text-sm font-semibold", cfg.text)}>{cfg.label}</span>
        <Badge variant="outline" className={cn("ml-auto text-[10px]", cfg.badge)}>
          {invoice.counterparty_name?.slice(0, 28) ?? "Okänd"}
        </Badge>
      </div>
      <p className={cn("text-[11px] leading-snug", cfg.text, "opacity-80")}>{cfg.desc}</p>
      {signal && typeof signal.details?.message === "string" && (
        <p className={cn("text-[10px]", cfg.text, "opacity-70")}>· {signal.details.message}</p>
      )}
    </div>
  );
}

function FraudCheckCard({
  signals,
  loading,
}: {
  signals: RiskSignal[];
  loading: boolean;
}) {
  const checks = [
    { kind: "bg_changed", label: "BG/PG-byte" },
    { kind: "amount_anomaly", label: "Avvikande belopp" },
    { kind: "duplicate", label: "Dubblett" },
  ] as const;

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 space-y-2">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[#0F172A]" />
        <span className="text-sm font-semibold text-[#0F172A]">Bedrägerikontroll</span>
      </div>
      {loading ? (
        <div className="text-[11px] text-[#475569]">Analyserar…</div>
      ) : (
        <div className="space-y-1">
          {checks.map((c) => {
            const hit = signals.find(
              (s) => s.kind === c.kind || (c.kind === "duplicate" && s.kind === "duplicate_period"),
            );
            return (
              <div key={c.kind} className="flex items-center justify-between text-[11px]">
                <span className="text-[#475569]">{c.label}</span>
                {hit ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-5 text-[10px]",
                      hit.severity === "high" || hit.severity === "critical"
                        ? "bg-[#FCE8E8] text-[#7A1F1E] border-[#F1A1A0]"
                        : "bg-[#FAEEDA] text-[#7A5417] border-[#E8C589]",
                    )}
                  >
                    Träff
                  </Badge>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[#085041]">
                    <CheckCircle2 className="h-3 w-3" />
                    OK
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OverbillingBlock({
  invoice,
  signal,
}: {
  invoice: APInvoice;
  signal: RiskSignal;
}) {
  const [mode, setMode] = useState<null | "accept" | "investigate">(null);
  const [text, setText] = useState("");
  const { acceptDeviation, flagSupplier, openInvestigation } = useOverbillingActions({
    invoiceId: invoice.id,
    companyId: invoice.company_id,
    supplierId: invoice.supplier_id,
  });

  const baseline = Number(signal.details?.baseline ?? 0);
  const devPct = Number(signal.details?.deviation_pct ?? 0);
  const source = String(signal.details?.source ?? "history");
  const message = typeof signal.details?.message === "string" ? signal.details.message : null;
  const isHigh = signal.severity === "high" || signal.severity === "critical";

  const ringCls = isHigh ? "border-rose-300 bg-[#FCE8E8]" : "border-[#F0DDB7] bg-[#FAEEDA]";
  const titleCls = isHigh ? "text-[#7A1A1A]" : "text-[#7A5417]";
  const busy = acceptDeviation.isPending || flagSupplier.isPending || openInvestigation.isPending;

  return (
    <div className={`rounded-2xl border ${ringCls} p-4 space-y-2`}>
      <div className={`flex items-center gap-2 text-sm font-semibold ${titleCls}`}>
        <TrendingUp className="h-4 w-4" />
        Prisavvikelse upptäckt
      </div>
      <div className="text-[12px] text-[#0F172A]">
        <span className="font-semibold">{invoice.counterparty_name}:</span>{" "}
        {invoice.total_amount.toLocaleString("sv-SE")} kr —{" "}
        <span className="font-bold tabular-nums">{devPct}%</span> över{" "}
        {source === "contract" ? "avtalspris" : "snittet"}{" "}
        {baseline > 0 && (
          <span className="text-[#475569]">
            ({baseline.toLocaleString("sv-SE")} kr {source === "contract" ? "/mån" : "snitt 12 mån"})
          </span>
        )}
      </div>
      {message && !devPct && <div className="text-[11px] text-[#475569]">{message}</div>}

      {!mode && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setMode("accept")} disabled={busy}>
            Acceptera avvikelse
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setMode("investigate")} disabled={busy}>
            Utred
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] border-rose-300 text-[#7A1F1E] hover:bg-[#FCE8E8]"
            onClick={() => flagSupplier.mutate()}
            disabled={busy || !invoice.supplier_id}
          >
            {flagSupplier.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            Flagga leverantör
          </Button>
        </div>
      )}

      {mode && (
        <div className="space-y-2 pt-1">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={mode === "accept" ? "Motivering (krävs, loggas)..." : "Beskriv vad som ska utredas..."}
            className="h-8 text-xs"
            disabled={busy}
          />
          <div className="flex gap-1.5">
            <Button
              size="sm"
              className="h-7 text-[11px]"
              disabled={!text.trim() || busy}
              onClick={() => {
                if (mode === "accept") {
                  acceptDeviation.mutate(text, { onSuccess: () => { setMode(null); setText(""); } });
                } else {
                  openInvestigation.mutate(text, { onSuccess: () => { setMode(null); setText(""); } });
                }
              }}
            >
              {(acceptDeviation.isPending || openInvestigation.isPending) && (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              )}
              {mode === "accept" ? "Bekräfta acceptans" : "Starta utredning"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => { setMode(null); setText(""); }} disabled={busy}>
              Avbryt
            </Button>
          </div>
        </div>
      )}

      {isHigh && (
        <div className="text-[10px] text-[#475569] pt-1 border-t border-[#F1A1A0]">
          ⚠ Betalning blockeras tills avvikelsen accepterats eller signerats.
        </div>
      )}
    </div>
  );
}
