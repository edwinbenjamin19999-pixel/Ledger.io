import { useState, useEffect } from "react";
import { DeclarationFormView } from "../shared/DeclarationFormView";
import { useAIFillEngine } from "../shared/useAIFillEngine";
import { DeclarationField, FormStatus } from "../shared/types";
import { exportFormToPDF, fmtPDF } from "@/lib/pdfExport";

interface INK4FormProps { companyId: string;
  taxYear: number;
}

export const INK4Form = ({ companyId, taxYear }: INK4FormProps) => { const engine = useAIFillEngine(companyId, taxYear);
  const [fields, setFields] = useState<DeclarationField[]>([]);
  const [status, setStatus] = useState<FormStatus>("not_started");
  const [isExporting, setIsExporting] = useState(false);

  const buildFields = (bals: any[]) => { const { sumRange } = engine;
    const revenue = -sumRange(bals, "3000", "3999");
    const expenses = sumRange(bals, "4000", "8999");
    const resultat = revenue - expenses;

    const f: DeclarationField[] = [
      { code: "I401", label: "Verksamhetens intäkter", value: Math.round(revenue), aiValue: Math.round(revenue), confidence: "high", explanation: "Klass 3: 3000-3999", type: "amount", editable: true },
      { code: "I402", label: "Verksamhetens kostnader", value: Math.round(expenses), aiValue: Math.round(expenses), confidence: "high", explanation: "Klass 4-8: 4000-8999", type: "amount", editable: true },
      { code: "I403", label: "Verksamhetens resultat", value: Math.round(resultat), aiValue: Math.round(resultat), confidence: "medium", type: "calculated", editable: false },
      { code: "I410", label: "Fördelning delägare 1 (%)", value: 50, aiValue: 50, confidence: "low", explanation: "Fyll i enligt bolagsavtal", type: "amount", editable: true },
      { code: "I411", label: "Andel delägare 1 (kr)", value: Math.round(resultat * 0.5), aiValue: Math.round(resultat * 0.5), confidence: "low", type: "calculated", editable: false },
      { code: "I420", label: "Fördelning delägare 2 (%)", value: 50, aiValue: 50, confidence: "low", type: "amount", editable: true },
      { code: "I421", label: "Andel delägare 2 (kr)", value: Math.round(resultat * 0.5), aiValue: Math.round(resultat * 0.5), confidence: "low", type: "calculated", editable: false },
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
        title: 'INK4 — Inkomstdeklaration 4',
        subtitle: 'Handelsbolag/kommanditbolag — resultatfördelning per delägare',
        taxYear,
        fields: [
          { ruta: 'I401', label: 'Verksamhetens intäkter', value: fmtPDF(getFieldValue('I401')) },
          { ruta: 'I402', label: 'Verksamhetens kostnader', value: fmtPDF(getFieldValue('I402')) },
          { ruta: 'I403', label: 'Verksamhetens resultat', value: fmtPDF(getFieldValue('I403')) },
          { ruta: 'I410', label: 'Fördelning delägare 1 (%)', value: `${getFieldValue('I410')}%` },
          { ruta: 'I411', label: 'Andel delägare 1 (kr)', value: fmtPDF(getFieldValue('I411')) },
          { ruta: 'I420', label: 'Fördelning delägare 2 (%)', value: `${getFieldValue('I420')}%` },
          { ruta: 'I421', label: 'Andel delägare 2 (kr)', value: fmtPDF(getFieldValue('I421')) },
        ],
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DeclarationFormView
      title={`INK4 — Inkomstdeklaration HB/KB ${taxYear}`}
      subtitle="Handelsbolag/kommanditbolag — resultatfördelning per delägare"
      breadcrumb={["Skattedeklarationsagent", "INK4"]}
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
      onSubmit={undefined}
    />
  );
};
