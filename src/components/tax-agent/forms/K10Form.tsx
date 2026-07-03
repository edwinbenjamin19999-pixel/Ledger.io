import { useState, useEffect } from "react";
import { DeclarationFormView } from "../shared/DeclarationFormView";
import { useAIFillEngine } from "../shared/useAIFillEngine";
import { DeclarationField, FormStatus } from "../shared/types";
import { toast } from "sonner";
import { exportFormToPDF, fmtPDF } from "@/lib/pdfExport";
import { calculateK10 } from "@/lib/tax/calculateK10";
import { K10_2025 } from "@/lib/tax/k10Constants2025";

interface K10FormProps {
  companyId: string;
  taxYear: number;
}

export const K10Form = ({ companyId, taxYear }: K10FormProps) => {
  const engine = useAIFillEngine(companyId, taxYear);
  const [fields, setFields] = useState<DeclarationField[]>([]);
  const [status, setStatus] = useState<FormStatus>("not_started");
  const [isExporting, setIsExporting] = useState(false);

  const buildFields = (bals: any[]) => {
    const { sumRange } = engine;
    const aktiekapital = -sumRange(bals, "2081", "2081");

    // Approximate payroll from account 7010
    const totalSalaries = sumRange(bals, "7010", "7019");
    const ownerSalary = totalSalaries; // simplified: single owner

    const result = calculateK10({
      ownershipPercent: 100,
      ownerSalary,
      companyTotalSalaries: totalSalaries,
      previousGransbelopp: 0,
      acquisitionCost: Math.round(aktiekapital) || 25000,
      plannedDividend: 0,
    });

    const f: DeclarationField[] = [
      {
        code: "K100", label: "Anskaffningsvärde andelar",
        value: Math.round(aktiekapital) || 25000, aiValue: Math.round(aktiekapital) || 25000,
        confidence: aktiekapital !== 0 ? "high" : "low",
        explanation: "Konto 2081: aktiekapital", type: "amount", editable: true,
      },
      {
        code: "K110", label: "Omkostnadsbelopp",
        value: Math.round(aktiekapital) || 25000, aiValue: Math.round(aktiekapital) || 25000,
        confidence: "medium", explanation: "Normalt = anskaffningsvärdet", type: "amount", editable: true,
      },
      {
        code: "K200", label: "Sparat utdelningsutrymme föregående år",
        value: 0, aiValue: 0, confidence: "low",
        explanation: "Hämtas från föregående års K10", type: "amount", editable: true,
      },
      {
        code: "K210", label: `Gränsbelopp förenklingsregeln (${K10_2025.schablonbelopp.toLocaleString("sv-SE")} kr)`,
        value: result.schablonGransbelopp, aiValue: result.schablonGransbelopp,
        confidence: "high",
        explanation: `2,75 × IBB (${K10_2025.ibb.toLocaleString("sv-SE")}) = ${K10_2025.schablonbelopp.toLocaleString("sv-SE")} kr`,
        type: "amount", editable: true,
      },
      {
        code: "K215", label: "Bolagets totala löner",
        value: Math.round(totalSalaries), aiValue: Math.round(totalSalaries),
        confidence: totalSalaries !== 0 ? "high" : "low",
        explanation: "Summa konto 7010–7019 · Hämtat från huvudbok",
        type: "amount", editable: true,
      },
      {
        code: "K216", label: `Minimilön för löneunderlag`,
        value: result.minLon, aiValue: result.minLon,
        confidence: "high",
        explanation: `6 × IBB + 5% av totala löner = ${result.minLon.toLocaleString("sv-SE")} kr`,
        type: "calculated", editable: false,
      },
      {
        code: "K220", label: "Löneunderlag (50% av löner)",
        value: result.lonunderlag, aiValue: result.lonunderlag,
        confidence: result.canUseLonunderlag ? "high" : "low",
        explanation: result.canUseLonunderlag
          ? "50% av löneunderlaget"
          : `Lönekrav ej uppfyllt (${ownerSalary.toLocaleString("sv-SE")} < ${result.minLon.toLocaleString("sv-SE")})`,
        type: "amount", editable: true,
      },
      {
        code: "K230", label: "Gränsbelopp (lönebaserat)",
        value: result.lonunderlag, aiValue: result.lonunderlag,
        confidence: result.canUseLonunderlag ? "medium" : "low",
        explanation: result.canUseLonunderlag ? "Löneunderlagsregeln kvalificerad" : "Ej kvalificerad — schablonregeln används",
        type: "calculated", editable: false,
      },
      {
        code: "K300", label: "Årets gränsbelopp (högst av K210/K230)",
        value: result.gransbeloppThisYear, aiValue: result.gransbeloppThisYear,
        confidence: "high",
        explanation: `Metod: ${result.methodUsed === "loner" ? "Löneunderlagsregeln" : "Förenklingsregeln"}`,
        type: "calculated", editable: false,
      },
      {
        code: "K310", label: "Utdelning inom gränsbelopp (20% skatt)",
        value: 0, aiValue: 0, confidence: "low",
        explanation: "Beskattas som kapitalinkomst (20%)", type: "amount", editable: true,
      },
      {
        code: "K320", label: "Utdelning över gränsbelopp (tjänst ~52%)",
        value: 0, aiValue: 0, confidence: "low",
        explanation: `Beskattas som tjänsteinkomst (max 90 × IBB = ${(K10_2025.tjansteskatt_max_ibb * K10_2025.ibb).toLocaleString("sv-SE")} kr)`,
        type: "amount", editable: true,
      },
    ];

    setFields(f);
    setStatus("ready_review");
  };

  const handleFetch = async () => {
    const bals = await engine.loadData();
    if (bals) buildFields(bals);
  };

  useEffect(() => {
    handleFetch();
  }, [companyId, taxYear]);

  const getFieldValue = (code: string) => fields.find(f => f.code === code)?.value ?? 0;

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      exportFormToPDF({
        title: 'K10 — Utdelning och kapitalvinst på kvalificerade andelar',
        subtitle: 'Fåmansföretag 3:12-reglerna',
        taxYear,
        fields: [
          { ruta: 'K100', label: 'Anskaffningsvärde andelar', value: fmtPDF(getFieldValue('K100')) },
          { ruta: 'K110', label: 'Omkostnadsbelopp', value: fmtPDF(getFieldValue('K110')) },
          { ruta: 'K200', label: 'Sparat utdelningsutrymme föregående år', value: fmtPDF(getFieldValue('K200')) },
          { ruta: 'K210', label: 'Gränsbelopp (förenklingsregeln)', value: fmtPDF(getFieldValue('K210')) },
          { ruta: 'K215', label: 'Bolagets totala löner', value: fmtPDF(getFieldValue('K215')) },
          { ruta: 'K216', label: 'Minimilön för löneunderlag', value: fmtPDF(getFieldValue('K216')) },
          { ruta: 'K220', label: 'Löneunderlag (50%)', value: fmtPDF(getFieldValue('K220')) },
          { ruta: 'K230', label: 'Gränsbelopp (lönebaserat)', value: fmtPDF(getFieldValue('K230')) },
          { ruta: 'K300', label: 'Årets gränsbelopp', value: fmtPDF(getFieldValue('K300')) },
          { ruta: 'K310', label: 'Utdelning inom gränsbelopp (20%)', value: fmtPDF(getFieldValue('K310')) },
          { ruta: 'K320', label: 'Utdelning över gränsbelopp (tjänst)', value: fmtPDF(getFieldValue('K320')) },
        ],
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border border-[#F0DDB7] bg-[#FAEEDA] dark:bg-yellow-950/10 rounded-lg p-3 text-xs text-muted-foreground">
        <strong>OBS:</strong> K10 är ett underlag. Slutlig K10-blankett fylls i av delägaren personligen och bifogas privat INK1.
      </div>
      <DeclarationFormView
        title={`K10 — Fåmansföretag 3:12 (${taxYear})`}
        subtitle="Utdelning och kapitalvinst i kvalificerade andelar"
        breadcrumb={["Skattedeklarationsagent", "INK2", "K10"]}
        fields={fields}
        status={status}
        diagnostics={engine.diagnostics}
        loading={engine.loading}
        onFetchData={handleFetch}
        onFieldChange={(i, v) => { const nf = [...fields]; nf[i] = { ...nf[i], value: v }; setFields(nf); }}
        onFieldComment={(i, c) => { const nf = [...fields]; nf[i] = { ...nf[i], comment: c }; setFields(nf); }}
        onResetField={(i) => { const nf = [...fields]; nf[i] = { ...nf[i], value: nf[i].aiValue }; setFields(nf); }}
        onExportPDF={handleExportPDF}
        isExporting={isExporting}
        onSubmit={() => toast.info("K10 bifogas privat INK1")}
        summaryRows={[
          { label: "Gränsbelopp (årets)", value: getFieldValue('K300'), bold: true },
          { label: "Metod", value: getFieldValue('K230') > getFieldValue('K210') ? 1 : 0 },
        ]}
      />
    </div>
  );
};
