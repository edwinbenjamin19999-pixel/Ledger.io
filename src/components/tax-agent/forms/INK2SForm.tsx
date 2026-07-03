import { useState, useEffect } from "react";
import { DeclarationFormView } from "../shared/DeclarationFormView";
import { useAIFillEngine } from "../shared/useAIFillEngine";
import { DeclarationField, FormStatus } from "../shared/types";
import { toast } from "sonner";
import { exportFormToPDF, fmtPDF } from "@/lib/pdfExport";

interface INK2SFormProps { companyId: string;
  taxYear: number;
}

export const INK2SForm = ({ companyId, taxYear }: INK2SFormProps) => { const engine = useAIFillEngine(companyId, taxYear);
  const [fields, setFields] = useState<DeclarationField[]>([]);
  const [status, setStatus] = useState<FormStatus>("not_started");
  const [isExporting, setIsExporting] = useState(false);

  const buildFields = (bals: any[]) => { const { sumRange, getConfidence } = engine;
    const bokAvskr = sumRange(bals, "7810", "7840");

    const f: DeclarationField[] = [
      { code: "S100", label: "IB anskaffningsvärde inventarier", value: Math.round(sumRange(bals, "1200", "1260")), aiValue: Math.round(sumRange(bals, "1200", "1260")), confidence: "medium", explanation: "Konto 1200-1260 (bruttovärde)", type: "amount", editable: true },
      { code: "S110", label: "Årets inköp", value: 0, aiValue: 0, confidence: "low", explanation: "Fyll i årets nyanskaffningar", type: "amount", editable: true },
      { code: "S120", label: "Årets försäljning/utrangering", value: 0, aiValue: 0, confidence: "low", type: "amount", editable: true },
      { code: "S130", label: "UB anskaffningsvärde", value: 0, aiValue: 0, confidence: "low", explanation: "IB + inköp − försäljning", type: "calculated", editable: false },
      { code: "S200", label: "Bokföringsmässig avskrivning", value: Math.round(bokAvskr), aiValue: Math.round(bokAvskr), confidence: "high", explanation: "Konto 7810-7840", type: "amount", editable: true },
      { code: "S210", label: "Skattemässig avskrivning (30% regeln)", value: 0, aiValue: 0, confidence: "low", explanation: "Huvudregel: 30% av UB anskaffningsvärde efter försäljning", type: "amount", editable: true },
      { code: "S220", label: "Skattemässig avskrivning (20% regeln)", value: 0, aiValue: 0, confidence: "low", explanation: "Kompletteringsregel: 20% per år i 5 år", type: "amount", editable: true },
      { code: "S300", label: "Skillnad bokf. vs skattemässig avskrivning", value: 0, aiValue: 0, confidence: "low", explanation: "Överavskrivning/underavskrivning", type: "calculated", editable: false },
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
        title: 'INK2S — Skattemässiga justeringar',
        subtitle: 'Specifikation av avskrivningar och nedskrivningar',
        taxYear,
        fields: [
          { ruta: 'S100', label: 'IB anskaffningsvärde inventarier', value: fmtPDF(getFieldValue('S100')) },
          { ruta: 'S110', label: 'Årets inköp', value: fmtPDF(getFieldValue('S110')) },
          { ruta: 'S120', label: 'Årets försäljning/utrangering', value: fmtPDF(getFieldValue('S120')) },
          { ruta: 'S130', label: 'UB anskaffningsvärde', value: fmtPDF(getFieldValue('S130')) },
          { ruta: 'S200', label: 'Bokföringsmässig avskrivning', value: fmtPDF(getFieldValue('S200')) },
          { ruta: 'S210', label: 'Skattemässig avskrivning (30% regeln)', value: fmtPDF(getFieldValue('S210')) },
          { ruta: 'S220', label: 'Skattemässig avskrivning (20% regeln)', value: fmtPDF(getFieldValue('S220')) },
          { ruta: 'S300', label: 'Skillnad bokf. vs skattemässig avskrivning', value: fmtPDF(getFieldValue('S300')) },
        ],
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DeclarationFormView
      title={`INK2S — Avskrivningar ${taxYear}`}
      subtitle="Specifikation av avskrivningar och nedskrivningar"
      breadcrumb={["Skattedeklarationsagent", "INK2", "INK2S"]}
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
      onSubmit={() => toast.info("INK2S bifogas INK2")}
    />
  );
};
