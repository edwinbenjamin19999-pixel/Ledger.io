/**
 * INK2 export + booking section.
 *
 * Shows the 4.3–4.15 mapping, runs the validator, and gates the
 * "Ladda ner XML" / "Bokför slutskatt" buttons on validator OK.
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertTriangle, XCircle, Download, FileText, Loader2, BookOpen, Eye } from "lucide-react";
import { buildINK2Xml, type INK2XmlInput } from "@/lib/tax/buildINK2Xml";
import { validateINK2 } from "@/lib/tax/validateINK2";
import { bookFinalTax } from "@/lib/tax/bookFinalTax";
import { toast } from "sonner";

interface INK2SectionProps {
  companyId: string;
  userId: string;
  orgNumber: string;
  companyName: string;
  fiscalYear: number;
  ink2Input: INK2XmlInput;
  glNonDeductibleCosts: number;
}

const fmt = (n: number) => new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);

interface FieldRow { code: string; label: string; value: number; sign: "+" | "-" | "="; }

export function INK2Section({ companyId, userId, orgNumber, companyName, fiscalYear, ink2Input, glNonDeductibleCosts }: INK2SectionProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookedRef, setBookedRef] = useState<string | null>(null);

  const validation = useMemo(() => validateINK2(ink2Input, { glNonDeductibleCosts }), [ink2Input, glNonDeductibleCosts]);

  const fields: FieldRow[] = [
    { code: "4.3",   label: "Resultat före skatt",            value: ink2Input.resultBeforeTax,        sign: "=" },
    { code: "4.4",   label: "Ej avdragsgilla kostnader",      value: ink2Input.nonDeductibleCosts,     sign: "+" },
    { code: "4.5a",  label: "Bokförda avskrivningar",         value: ink2Input.bookDepreciation,       sign: "+" },
    { code: "4.5b",  label: "Skattemässiga avskrivningar",    value: ink2Input.taxDepreciation,        sign: "-" },
    { code: "4.6",   label: "Räntebegränsning",               value: ink2Input.disallowedInterest,     sign: "+" },
    { code: "4.7a",  label: "Erhållet koncernbidrag",         value: ink2Input.groupContribReceived,   sign: "+" },
    { code: "4.7b",  label: "Lämnat koncernbidrag",           value: ink2Input.groupContribGiven,      sign: "-" },
    { code: "4.14a", label: "Underskott från tidigare år",    value: ink2Input.lossCarryforwardApplied, sign: "-" },
    { code: "4.6a",  label: "Periodiseringsfond",             value: ink2Input.periodiseringsfond,     sign: "-" },
    { code: "4.10",  label: "Skattemässigt resultat",         value: ink2Input.finalTaxableIncome,     sign: "=" },
    { code: "4.15",  label: "Bolagsskatt (20,6 %)",            value: ink2Input.corporateTax,           sign: "=" },
  ];

  const xml = useMemo(() => buildINK2Xml(ink2Input), [ink2Input]);

  const downloadXml = () => {
    if (!validation.isValid) { toast.error("Validering misslyckades — åtgärda fel innan export"); return; }
    const blob = new Blob([xml], { type: "application/xml;charset=ISO-8859-1" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `INK2-${orgNumber}-${fiscalYear}.xml`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("INK2 XML nedladdad");
  };

  const downloadPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rows = fields.map(f => `<tr><td>${f.code}</td><td>${f.label}</td><td style="text-align:right;font-family:monospace">${f.sign}</td><td style="text-align:right;font-family:monospace">${fmt(f.value)} kr</td></tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>INK2 ${fiscalYear}</title><style>body{font-family:Arial;margin:24px}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{padding:6px 8px;border-bottom:1px solid #ddd;font-size:12px}th{background:#f1f5f9;text-align:left}tr:last-child td{font-weight:bold;border-top:2px solid #000}@media print{body{margin:0}}</style></head><body><h1>Inkomstdeklaration 2 — ${fiscalYear}</h1><p>${companyName} · Org.nr ${orgNumber}<br/>Period: ${ink2Input.periodFrom} – ${ink2Input.periodTo}</p><table><thead><tr><th>Fält</th><th>Benämning</th><th>Tecken</th><th>Belopp</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 250);
  };

  const handleBook = async () => {
    if (!validation.isValid) { toast.error("Validering misslyckades — kan inte bokföra"); return; }
    setBooking(true);
    try {
      const result = await bookFinalTax({ companyId, userId, fiscalYear, corporateTax: ink2Input.corporateTax });
      if (!result) { toast.info("Skatt = 0 — ingen verifikation skapad"); return; }
      setBookedRef(result.journalNumber || result.journalEntryId.substring(0, 8));
      toast.success(`Slutskatt bokförd — verifikation ${result.journalNumber || result.journalEntryId.substring(0, 8)} (${result.direction === "payable" ? "skuld" : "fordran"})`);
    } catch (err: any) {
      toast.error(err?.message || "Bokföring misslyckades");
    } finally { setBooking(false); }
  };

  return (
    <Card className="rounded-[12px] border-[0.5px] border-[#E2E8F0] bg-white overflow-hidden">
      <CardHeader className="pb-2 bg-[#0F1F3D]">
        <CardTitle className="text-base flex items-center gap-2 text-white">
          <FileText className="h-4 w-4" />
          INK2 — Inkomstdeklaration 2 ({fiscalYear})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">

        {/* Field mapping table */}
        <div className="rounded-[8px] border-[0.5px] border-[#E2E8F0] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC]">
              <tr>
                <th className="text-left p-2 text-xs font-medium text-[#64748B]">SKV-fält</th>
                <th className="text-left p-2 text-xs font-medium text-[#64748B]">Benämning</th>
                <th className="text-center p-2 text-xs font-medium text-[#64748B] w-12">±</th>
                <th className="text-right p-2 text-xs font-medium text-[#64748B]">Belopp</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => {
                const isResult = f.code === "4.10" || f.code === "4.15";
                return (
                  <tr key={f.code} className={`border-t border-[#E2E8F0] ${isResult ? "bg-[#EFF6FF] font-bold" : ""}`}>
                    <td className="p-2 font-mono text-xs text-[#1E3A5F]">{f.code}</td>
                    <td className="p-2 text-[#0F1F3D]">{f.label}</td>
                    <td className="p-2 text-center text-[#64748B]">{f.sign}</td>
                    <td className="p-2 text-right font-mono tabular-nums text-[#0F1F3D]">{fmt(f.value)} kr</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Validation panel */}
        <div className={`rounded-[12px] border-[0.5px] p-3 ${validation.isValid ? "border-[#BFE6D6] bg-[#E1F5EE]" : "border-[#F4C8C8] bg-[#FCE8E8]"}`}>
          <div className="flex items-center gap-2 text-sm font-semibold mb-2">
            {validation.isValid
              ? <><CheckCircle2 className="h-4 w-4 text-[#1D9E75]" /><span className="text-[#0F1F3D]">Validering OK — exportklar</span></>
              : <><XCircle className="h-4 w-4 text-[#C73838]" /><span className="text-[#0F1F3D]">{validation.errors.length} fel måste åtgärdas</span></>}
            {validation.warnings.length > 0 && (
              <Badge variant="outline" className="ml-auto text-[10px] bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]">
                {validation.warnings.length} varning
              </Badge>
            )}
          </div>
          {validation.issues.length > 0 ? (
            <ul className="space-y-1 text-xs">
              {validation.issues.map((iss, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  {iss.severity === "error"
                    ? <XCircle className="h-3 w-3 text-[#C73838] mt-0.5 shrink-0" />
                    : <AlertTriangle className="h-3 w-3 text-[#C28A2B] mt-0.5 shrink-0" />}
                  <span className="text-[#64748B]">
                    {iss.field && <span className="font-mono mr-1 text-[#0F1F3D]">{iss.field}:</span>}
                    {iss.message}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#085041]">Balanstest grön · Skatteberäkning grön · Inga avvikelser mot huvudboken.</p>
          )}
        </div>

        {/* Preview XML */}
        {showPreview && (
          <div>
            <div className="text-xs font-medium text-[#64748B] mb-1">Förhandsgranskning XML (ISO-8859-1):</div>
            <pre className="bg-[#0F1F3D] text-white rounded-[8px] p-3 text-[11px] overflow-x-auto max-h-64 font-mono">{xml}</pre>
          </div>
        )}

        {/* Actions */}
        <Separator />
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(s => !s)} className="border-[#E2E8F0] text-[#0F1F3D]">
            <Eye className="h-3.5 w-3.5 mr-1" />{showPreview ? "Dölj förhandsgranskning" : "Förhandsgranska XML"}
          </Button>
          <Button variant="outline" size="sm" onClick={downloadPdf} className="border-[#E2E8F0] text-[#0F1F3D]">
            <Download className="h-3.5 w-3.5 mr-1" />Ladda ner PDF
          </Button>
          <Button variant="outline" size="sm" onClick={downloadXml} disabled={!validation.isValid} className="border-[#E2E8F0] text-[#0F1F3D]">
            <Download className="h-3.5 w-3.5 mr-1" />Ladda ner XML
          </Button>
          <Button size="sm" onClick={handleBook} disabled={!validation.isValid || booking || !!bookedRef} className="bg-[#0F1F3D] hover:bg-[#1E3A5F] text-white">
            {booking ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <BookOpen className="h-3.5 w-3.5 mr-1" />}
            {bookedRef ? `Bokförd (#${bookedRef})` : "Bokför slutskatt"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
