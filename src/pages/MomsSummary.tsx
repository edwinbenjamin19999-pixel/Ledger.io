import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Receipt,
  AlertTriangle,
  Download,
  FileText,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useVATSummary, VATRate } from "@/hooks/useVATSummary";
import { toast } from "sonner";

const fmt = (n: number) =>
  Math.round(n).toLocaleString("sv-SE") + " kr";

const formatDateSv = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const downloadFile = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const MomsSummary = () => {
  const navigate = useNavigate();
  const {
    loading,
    vatPeriodType,
    periodLabel,
    periodStart,
    periodEnd,
    dueDate,
    outgoing,
    incoming,
    outgoingTotal,
    incomingTotal,
    netToPay,
    uncertainCount,
    lines,
  } = useVATSummary();

  const [drilldown, setDrilldown] = useState<{
    title: string;
    rows: typeof lines;
  } | null>(null);

  const openDrill = (
    direction: "out" | "in" | "all",
    rate?: VATRate,
    field?: "base" | "vat"
  ) => {
    let rows = lines;
    if (direction === "out") {
      rows = rows.filter((l) => l.account_number.startsWith("3"));
    } else if (direction === "in") {
      rows = rows.filter((l) => !l.account_number.startsWith("3"));
    }
    if (rate) rows = rows.filter((l) => l.rate === rate);
    const dirLabel =
      direction === "out"
        ? "Utgående moms"
        : direction === "in"
          ? "Ingående moms"
          : "Underlag";
    const rateLabel = rate ? ` ${rate}%` : "";
    const fieldLabel = field === "vat" ? " (moms)" : field === "base" ? " (underlag)" : "";
    setDrilldown({
      title: `${dirLabel}${rateLabel}${fieldLabel}`,
      rows,
    });
  };

  const exportCSV = () => {
    const rows = [
      ["Datum", "Verifikation", "Konto", "Beskrivning", "Sats %", "Underlag", "Moms"],
      ...lines.map((l) => [
        l.entry_date,
        l.entry_id,
        `${l.account_number} ${l.account_name}`,
        l.description ?? "",
        l.rate,
        String(Math.round(l.base)),
        String(Math.round(l.vat)),
      ]),
    ];
    const csv = rows
      .map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")
      )
      .join("\n");
    downloadFile(
      `momsunderlag-${periodLabel}.csv`,
      "\ufeff" + csv,
      "text/csv;charset=utf-8"
    );
    toast.success("Excel-underlag exporterat");
  };

  const exportPDF = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Momsunderlag ${periodLabel}</title>
<style>body{font-family:-apple-system,Arial,sans-serif;padding:32px;color:#0f172a}h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:24px 0 8px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:left}td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}</style>
</head><body>
<h1>Momsunderlag — ${periodLabel}</h1>
<p style="color:#64748b;font-size:12px">${periodStart} → ${periodEnd}</p>
<h2>Utgående moms</h2><table><thead><tr><th>Sats</th><th class="num">Underlag</th><th class="num">Moms</th></tr></thead><tbody>
${outgoing.map((r) => `<tr><td>${r.rate}%</td><td class="num">${fmt(r.base)}</td><td class="num">${fmt(r.vat)}</td></tr>`).join("")}
<tr><td><strong>Totalt</strong></td><td></td><td class="num"><strong>${fmt(outgoingTotal)}</strong></td></tr>
</tbody></table>
<h2>Ingående moms</h2><table><thead><tr><th>Sats</th><th class="num">Underlag</th><th class="num">Moms</th></tr></thead><tbody>
${incoming.map((r) => `<tr><td>${r.rate}%</td><td class="num">${fmt(r.base)}</td><td class="num">${fmt(r.vat)}</td></tr>`).join("")}
<tr><td><strong>Totalt</strong></td><td></td><td class="num"><strong>${fmt(incomingTotal)}</strong></td></tr>
</tbody></table>
<h2>Netto</h2>
<p>${netToPay >= 0 ? "Att betala" : "Att återfå"}: <strong>${fmt(Math.abs(netToPay))}</strong></p>
<p style="color:#64748b;font-size:12px">Förfallodatum: ${formatDateSv(dueDate)}</p>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Tillåt popup för PDF-export");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const periodTypeLabel = useMemo(
    () =>
      vatPeriodType === "monthly"
        ? "Månadsvis"
        : vatPeriodType === "quarterly"
          ? "Kvartalsvis"
          : "Årsvis",
    [vatPeriodType]
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-400" />
            <h1 className="text-2xl font-semibold">Momssammanställning</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {periodLabel} · {periodTypeLabel} · förfaller {formatDateSv(dueDate)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF} disabled={loading}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </header>

      {uncertainCount > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {uncertainCount} transaktion{uncertainCount === 1 ? "" : "er"} har osäker
              momshantering
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              AI-konfidens under 80%. Granska innan du låser deklarationen.
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => openDrill("all")}>
            Granska
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      )}

      {/* Section 1 — Utgående */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>1. Utgående moms (försäljning)</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {fmt(outgoingTotal)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border/50">
                <th className="text-left px-4 py-2 font-normal">Sats</th>
                <th className="text-right px-4 py-2 font-normal">Underlag</th>
                <th className="text-right px-4 py-2 font-normal">Moms</th>
              </tr>
            </thead>
            <tbody>
              {outgoing.map((r) => (
                <tr key={r.rate} className="border-b border-border/30 hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{r.rate}%</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    <button
                      onClick={() => openDrill("out", r.rate, "base")}
                      className="hover:underline"
                    >
                      {fmt(r.base)}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    <button
                      onClick={() => openDrill("out", r.rate, "vat")}
                      className="hover:underline"
                    >
                      {fmt(r.vat)}
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="font-medium bg-muted/30">
                <td className="px-4 py-2">Totalt</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {fmt(outgoing.reduce((s, r) => s + r.base, 0))}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {fmt(outgoingTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Section 2 — Ingående */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>2. Ingående moms (inköp)</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {fmt(incomingTotal)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border/50">
                <th className="text-left px-4 py-2 font-normal">Sats</th>
                <th className="text-right px-4 py-2 font-normal">Underlag</th>
                <th className="text-right px-4 py-2 font-normal">Moms</th>
              </tr>
            </thead>
            <tbody>
              {incoming.map((r) => (
                <tr key={r.rate} className="border-b border-border/30 hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{r.rate}%</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    <button
                      onClick={() => openDrill("in", r.rate, "base")}
                      className="hover:underline"
                    >
                      {fmt(r.base)}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    <button
                      onClick={() => openDrill("in", r.rate, "vat")}
                      className="hover:underline"
                    >
                      {fmt(r.vat)}
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="font-medium bg-muted/30">
                <td className="px-4 py-2">Totalt</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {fmt(incoming.reduce((s, r) => s + r.base, 0))}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {fmt(incomingTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Section 3 — Netto */}
      <Card
        className={
          netToPay >= 0
            ? "border-blue-500/30 bg-blue-500/5"
            : "border-emerald-500/30 bg-emerald-500/5"
        }
      >
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              3. Netto
            </p>
            <p className="text-lg font-semibold mt-1">
              {netToPay >= 0
                ? `Att betala till Skatteverket: ${fmt(netToPay)}`
                : `Att återfå: ${fmt(Math.abs(netToPay))}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Förfallodatum: {formatDateSv(dueDate)}
            </p>
          </div>
          <Button
            onClick={() => navigate(`/vat-reports`)}
            disabled={loading}
            size="lg"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Förbered momsdeklaration
          </Button>
        </CardContent>
      </Card>

      {loading && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 inline animate-spin mr-2" />
          Beräknar momsunderlag…
        </div>
      )}

      {/* Drilldown */}
      <Sheet open={!!drilldown} onOpenChange={(o) => !o && setDrilldown(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{drilldown?.title}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {drilldown?.rows.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Inga transaktioner i detta segment.
              </p>
            )}
            {drilldown?.rows.map((l) => (
              <div
                key={l.id}
                className="rounded-lg border border-border/50 p-3 hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {formatDateSv(l.entry_date)}
                    </p>
                    <p className="text-sm font-medium truncate">
                      {l.account_number} {l.account_name}
                    </p>
                    {l.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {l.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">{l.rate}%</p>
                    <p className="text-sm font-medium tabular-nums">
                      {fmt(l.vat)}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      underlag {fmt(l.base)}
                    </p>
                  </div>
                </div>
                {l.uncertain && (
                  <div className="mt-2 text-xs text-amber-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    AI-konfidens &lt; 80% — granska innan låsning
                  </div>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MomsSummary;
