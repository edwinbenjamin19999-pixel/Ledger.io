import { useState, useEffect } from "react";
import { DeclarationFormView } from "../shared/DeclarationFormView";
import { useAIFillEngine } from "../shared/useAIFillEngine";
import { DeclarationField, FormStatus } from "../shared/types";
import { toast } from "sonner";
import { exportFormToPDF, fmtPDF } from "@/lib/pdfExport";

interface N9FormProps { companyId: string;
  taxYear: number;
}

export const N9Form = ({ companyId, taxYear }: N9FormProps) => { const engine = useAIFillEngine(companyId, taxYear);
  const [fields, setFields] = useState<DeclarationField[]>([]);
  const [status, setStatus] = useState<FormStatus>("not_started");
  const [isExporting, setIsExporting] = useState(false);

  const buildFields = (bals: any[]) => { const { sumRange } = engine;
    const rantekostnader = sumRange(bals, "8400", "8499");
    const ranteintakter = -sumRange(bals, "8300", "8399");
    const revenue = -sumRange(bals, "3000", "3999");
    const expenses = sumRange(bals, "4000", "7999");
    const avskrivningar = sumRange(bals, "7800", "7899");
    const ebitda = revenue - expenses + avskrivningar + rantekostnader - ranteintakter;
    const maxAvdrag = Math.round(ebitda * 0.30);
    const ejAvdragsgill = Math.max(0, Math.round(rantekostnader - maxAvdrag));

    const f: DeclarationField[] = [
      { code: "N901", label: "Räntekostnader", value: Math.round(rantekostnader), aiValue: Math.round(rantekostnader), confidence: "high", explanation: "Konto 8400-8499", type: "amount", editable: true },
      { code: "N902", label: "Ränteinkomster", value: Math.round(ranteintakter), aiValue: Math.round(ranteintakter), confidence: "high", explanation: "Konto 8300-8399", type: "amount", editable: true },
      { code: "N903", label: "Justerat rörelseresultat (EBITDA)", value: Math.round(ebitda), aiValue: Math.round(ebitda), confidence: "medium", explanation: "Intäkter − kostnader + avskrivningar + räntor", type: "calculated", editable: false },
      { code: "N904", label: "Maximalt ränteavdrag (30% av EBITDA)", value: maxAvdrag, aiValue: maxAvdrag, confidence: "medium", type: "calculated", editable: false },
      { code: "N905", label: "Ej avdragsgill ränta", value: ejAvdragsgill, aiValue: ejAvdragsgill, confidence: ejAvdragsgill > 0 ? "high" : "medium", explanation: ejAvdragsgill > 0 ? "Räntekostnaderna överstiger 30%-gränsen" : "Inga begränsningar — alla räntor är avdragsgilla", type: "calculated", editable: false },
    ];

    setFields(f);
    setStatus("ready_review");
  };

  const handleFetch = async () => { const bals = await engine.loadData();
    if (bals) buildFields(bals);
  };

  useEffect(() => { handleFetch(); }, [companyId, taxYear]);

  const getFieldValue = (code: string) => fields.find(f => f.code === code)?.value ?? 0;

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      exportFormToPDF({
        title: 'N9 — Ränteavdragsbegränsning',
        subtitle: 'EBITDA-regeln (30%) — beräknar maximalt ränteavdrag',
        taxYear,
        fields: [
          { ruta: 'N901', label: 'Räntekostnader', value: fmtPDF(getFieldValue('N901')) },
          { ruta: 'N902', label: 'Ränteinkomster', value: fmtPDF(getFieldValue('N902')) },
          { ruta: 'N903', label: 'Justerat rörelseresultat (EBITDA)', value: fmtPDF(getFieldValue('N903')) },
          { ruta: 'N904', label: 'Maximalt ränteavdrag (30% av EBITDA)', value: fmtPDF(getFieldValue('N904')) },
          { ruta: 'N905', label: 'Ej avdragsgill ränta', value: fmtPDF(getFieldValue('N905')) },
        ],
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DeclarationFormView
      title={`N9 — Ränteavdragsbegränsning ${taxYear}`}
      subtitle="EBITDA-regeln (30%) — beräknar maximalt ränteavdrag"
      breadcrumb={["Skattedeklarationsagent", "INK2", "N9"]}
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
      onSubmit={() => toast.info("N9 bifogas INK2")}
    />
  );
};
