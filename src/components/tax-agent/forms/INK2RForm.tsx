import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bot, Download, Loader2, CheckCircle, AlertTriangle, Info, RefreshCw, Search, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { DeclarationFormView } from "../shared/DeclarationFormView";
import { useAIFillEngine } from "../shared/useAIFillEngine";
import { DeclarationField, FormStatus, fmt } from "../shared/types";
import { exportFormToPDF, fmtPDF } from "@/lib/pdfExport";
import { calculateINK2RValues, type SruCalculationResult } from "@/lib/tax/calculateInk2R";
import { INK2R_SECTIONS, getSruLabel } from "@/lib/tax/basSruMapping";

interface INK2RFormProps {
  companyId: string;
  taxYear: number;
}

export const INK2RForm = ({ companyId, taxYear }: INK2RFormProps) => {
  const engine = useAIFillEngine(companyId, taxYear);
  const [fields, setFields] = useState<DeclarationField[]>([]);
  const [status, setStatus] = useState<FormStatus>("not_started");
  const [isExporting, setIsExporting] = useState(false);
  const [sruResults, setSruResults] = useState<SruCalculationResult[]>([]);
  const [calcInfo, setCalcInfo] = useState({ transactionCount: 0, accountCount: 0 });
  const [sruLoading, setSruLoading] = useState(false);

  const fiscalYearStart = `${taxYear}-01-01`;
  const fiscalYearEnd = `${taxYear}-12-31`;

  const loadSruData = async () => {
    setSruLoading(true);
    try {
      const { results, transactionCount, accountCount } = await calculateINK2RValues(
        companyId, fiscalYearStart, fiscalYearEnd
      );
      setSruResults(results);
      setCalcInfo({ transactionCount, accountCount });

      // Build fields from SRU results
      const f: DeclarationField[] = [];
      for (const section of INK2R_SECTIONS) {
        for (const sruCode of section.sruCodes) {
          const result = results.find((r) => r.sruCode === sruCode);
          const value = result ? Math.round(result.value) : 0;
          const hasContributions = result && result.contributions.length > 0;
          f.push({
            code: sruCode,
            label: result?.label || getSruLabel(sruCode),
            value,
            aiValue: value,
            confidence: hasContributions ? "high" : value === 0 ? "low" : "medium",
            explanation: hasContributions
              ? `Konto ${result.contributions.map((c) => c.accountNumber).join(", ")}`
              : "Inget konto matchar denna rad i er kontoplan",
            type: "amount",
            editable: true,
          });
        }
      }

      setFields(f);
      setStatus("ready_review");
    } catch (e) {
      console.error(e);
      toast.error("Kunde inte beräkna SRU-värden");
    } finally {
      setSruLoading(false);
    }
  };

  useEffect(() => {
    loadSruData();
  }, [companyId, taxYear]);

  // Section totals
  const getSectionTotal = (sectionId: string) => {
    const section = INK2R_SECTIONS.find((s) => s.id === sectionId);
    if (!section) return 0;
    return section.sruCodes.reduce((sum, code) => {
      const field = fields.find((f) => f.code === code);
      return sum + (field?.value ?? 0);
    }, 0);
  };

  const totalAssets = getSectionTotal("BR_ASSETS");
  const totalEquityLiabilities = getSectionTotal("BR_EQUITY_LIABILITIES");
  const obalans = Math.abs(totalAssets - totalEquityLiabilities) > 1;

  const getFieldValue = (code: string) => fields.find((f) => f.code === code)?.value ?? 0;

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const sections = INK2R_SECTIONS.map((sec) => ({
        heading: sec.title,
        fields: sec.sruCodes.map((code) => ({
          ruta: code,
          label: getSruLabel(code),
          value: fmtPDF(getFieldValue(code)),
        })),
      }));

      exportFormToPDF({
        title: "INK2R — Inkomstdeklaration 2",
        subtitle: "Räkenskapsschema",
        taxYear,
        sections,
        fields: [],
      });
    } finally {
      setIsExporting(false);
    }
  };

  const diagnostics = [
    ...(obalans
      ? [`⚠️ Obalans: Tillgångar (${fmt(totalAssets)} kr) ≠ Skulder + EK (${fmt(totalEquityLiabilities)} kr)`]
      : []),
    ...(calcInfo.transactionCount > 0
      ? [`Beräknat från ${calcInfo.transactionCount.toLocaleString("sv-SE")} transaktioner · ${calcInfo.accountCount} konton · Räkenskapsår ${fiscalYearStart} – ${fiscalYearEnd}`]
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* Verification button in toolbar area */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {sruLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          {!sruLoading && calcInfo.transactionCount > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <CheckCircle className="h-3 w-3 text-[#085041]" />
              {calcInfo.accountCount} konton mappade
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <VerificationSheet sruResults={sruResults} />
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={loadSruData} disabled={sruLoading}>
            <RefreshCw className={`h-3 w-3 ${sruLoading ? "animate-spin" : ""}`} />
            Uppdatera
          </Button>
        </div>
      </div>

      <DeclarationFormView
        title={`INK2R — Räkenskapsschemat ${taxYear}`}
        subtitle="Resultat- och balansräkning i SKV-format (SRU-koder)"
        breadcrumb={["Skattedeklarationsagent", "INK2", "INK2R"]}
        fields={fields}
        status={status}
        diagnostics={diagnostics}
        loading={sruLoading}
        onFetchData={loadSruData}
        onFieldChange={(i, v) => {
          const nf = [...fields];
          nf[i] = { ...nf[i], value: v };
          setFields(nf);
        }}
        onFieldComment={(i, c) => {
          const nf = [...fields];
          nf[i] = { ...nf[i], comment: c };
          setFields(nf);
        }}
        onResetField={(i) => {
          const nf = [...fields];
          nf[i] = { ...nf[i], value: nf[i].aiValue };
          setFields(nf);
        }}
        onExportPDF={handleExportPDF}
        isExporting={isExporting}
        onSubmit={() => toast.info("INK2R bifogas INK2")}
        summaryRows={[
          { label: "Summa tillgångar", value: totalAssets, bold: true },
          { label: "Summa skulder + EK", value: totalEquityLiabilities, bold: true },
        ]}
      />
    </div>
  );
};

// --- Verification Sheet ---

const VerificationSheet = ({ sruResults }: { sruResults: SruCalculationResult[] }) => {
  const [search, setSearch] = useState("");

  const filtered = sruResults.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.sruCode.includes(q) ||
      r.label.toLowerCase().includes(q) ||
      r.contributions.some((c) => c.accountNumber.includes(q) || c.accountName.toLowerCase().includes(q))
    );
  });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1.5">
          <Search className="h-3 w-3" />
          Verifiering
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            BAS → SRU Verifiering
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <Input
            placeholder="Sök SRU-kod, kontonamn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />

          <div className="space-y-3">
            {filtered.map((result) => (
              <div key={result.sruCode} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      SRU {result.sruCode}
                    </Badge>
                    <span className="text-xs font-medium">{result.label}</span>
                  </div>
                  <span className="text-sm font-mono font-semibold tabular-nums">
                    {result.value === 0 ? "—" : `${Math.round(result.value).toLocaleString("sv-SE")} kr`}
                  </span>
                </div>

                {result.contributions.length > 0 ? (
                  <div className="space-y-1 pl-2 border-l-2 border-muted">
                    {result.contributions.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          <span className="font-mono">{c.accountNumber}</span>{" "}
                          <span>{c.accountName}</span>
                        </span>
                        <span className="font-mono tabular-nums">
                          {Math.round(c.amount).toLocaleString("sv-SE")} kr
                        </span>
                      </div>
                    ))}
                    {result.contributions.length > 1 && (
                      <>
                        <Separator className="my-1" />
                        <div className="flex items-center justify-between text-[11px] font-medium">
                          <span>Summa</span>
                          <span className="font-mono tabular-nums">
                            {Math.round(result.value).toLocaleString("sv-SE")} kr
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Inget konto matchar denna rad i er kontoplan
                  </p>
                )}
              </div>
            ))}

            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Inga SRU-koder matchar sökningen
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
