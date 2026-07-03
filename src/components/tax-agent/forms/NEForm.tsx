import { useState, useEffect } from "react";
import { DeclarationFormView } from "../shared/DeclarationFormView";
import { useAIFillEngine } from "../shared/useAIFillEngine";
import { DeclarationField, FormStatus } from "../shared/types";
import { toast } from "sonner";
import { exportFormToPDF, fmtPDF } from "@/lib/pdfExport";

interface NEFormProps { companyId: string;
  taxYear: number;
}

export const NEForm = ({ companyId, taxYear }: NEFormProps) => { const engine = useAIFillEngine(companyId, taxYear);
  const [fields, setFields] = useState<DeclarationField[]>([]);
  const [status, setStatus] = useState<FormStatus>("not_started");
  const [isExporting, setIsExporting] = useState(false);

  const buildFields = (bals: any[]) => { const { sumRange } = engine;
    const nettoomsattning = -sumRange(bals, "3000", "3799");
    const varuinkop = sumRange(bals, "4000", "4999");
    const ovrigaExterna = sumRange(bals, "5000", "6999");
    const personalkostnader = sumRange(bals, "7000", "7699");
    const avskrivningar = sumRange(bals, "7800", "7899");
    const rantekostnader = sumRange(bals, "8400", "8499");
    const ovrigaRorelseintakter = -sumRange(bals, "3800", "3999");

    const resultat = nettoomsattning + ovrigaRorelseintakter - varuinkop - ovrigaExterna - personalkostnader - avskrivningar - rantekostnader;
    const egenavgifter = Math.round(Math.max(0, resultat) * 0.2897);
    const overskott = Math.max(0, resultat - egenavgifter);
    const maxPeriodisering = Math.round(overskott * 0.30);
    const maxExpansion = Math.round(overskott * 0.79);

    const f: DeclarationField[] = [
      { code: "NE01", label: "Nettoomsättning", value: Math.round(nettoomsattning), aiValue: Math.round(nettoomsattning), confidence: "high", explanation: "Konto 3000-3799", type: "amount", editable: true },
      { code: "NE02", label: "Övriga rörelseintäkter", value: Math.round(ovrigaRorelseintakter), aiValue: Math.round(ovrigaRorelseintakter), confidence: "high", explanation: "Konto 3800-3999", type: "amount", editable: true },
      { code: "NE03", label: "Råvaror och förnödenheter", value: Math.round(varuinkop), aiValue: Math.round(varuinkop), confidence: "high", explanation: "Konto 4000-4999", type: "amount", editable: true },
      { code: "NE04", label: "Övriga externa kostnader", value: Math.round(ovrigaExterna), aiValue: Math.round(ovrigaExterna), confidence: "high", explanation: "Konto 5000-6999", type: "amount", editable: true },
      { code: "NE05", label: "Personalkostnader", value: Math.round(personalkostnader), aiValue: Math.round(personalkostnader), confidence: "high", explanation: "Konto 7000-7699", type: "amount", editable: true },
      { code: "NE06", label: "Avskrivningar", value: Math.round(avskrivningar), aiValue: Math.round(avskrivningar), confidence: "high", explanation: "Konto 7800-7899", type: "amount", editable: true },
      { code: "NE07", label: "Räntekostnader", value: Math.round(rantekostnader), aiValue: Math.round(rantekostnader), confidence: "high", explanation: "Konto 8400-8499", type: "amount", editable: true },
      { code: "NE10", label: "Resultat före egenavgifter", value: Math.round(resultat), aiValue: Math.round(resultat), confidence: "medium", type: "calculated", editable: false },
      { code: "NE11", label: "Beräknade egenavgifter (28,97%)", value: egenavgifter, aiValue: egenavgifter, confidence: "medium", explanation: "Under 65 år: 28,97% på överskottet", type: "amount", editable: true },
      { code: "NE12", label: "Överskott av näringsverksamhet", value: overskott, aiValue: overskott, confidence: "medium", type: "calculated", editable: false },
      { code: "NE20", label: "Periodiseringsfond (max 30%)", value: 0, aiValue: 0, confidence: "low", explanation: `Max avsättning: ${maxPeriodisering.toLocaleString("sv-SE")} kr`, type: "amount", editable: true },
      { code: "NE21", label: "Expansionsfond (max 79%)", value: 0, aiValue: 0, confidence: "low", explanation: `Max avsättning: ${maxExpansion.toLocaleString("sv-SE")} kr`, type: "amount", editable: true },
    ];

    setFields(f);
    setStatus("ready_review");
  };

  const handleFetch = async () => { const bals = await engine.loadData();
    if (bals) buildFields(bals);
  };

  useEffect(() => { handleFetch(); }, [companyId, taxYear]);

  const overskott = fields.find(f => f.code === "NE12")?.value || 0;
  const getFieldValue = (code: string) => fields.find(f => f.code === code)?.value ?? 0;

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      exportFormToPDF({
        title: 'NE — Enskild näringsverksamhet',
        subtitle: 'Bilaga till INK1 — alla intäkter och kostnader',
        taxYear,
        sections: [
          {
            heading: 'Intäkter',
            fields: [
              { ruta: 'NE01', label: 'Nettoomsättning', value: fmtPDF(getFieldValue('NE01')) },
              { ruta: 'NE02', label: 'Övriga rörelseintäkter', value: fmtPDF(getFieldValue('NE02')) },
            ],
          },
          {
            heading: 'Kostnader',
            fields: [
              { ruta: 'NE03', label: 'Råvaror och förnödenheter', value: fmtPDF(getFieldValue('NE03')) },
              { ruta: 'NE04', label: 'Övriga externa kostnader', value: fmtPDF(getFieldValue('NE04')) },
              { ruta: 'NE05', label: 'Personalkostnader', value: fmtPDF(getFieldValue('NE05')) },
              { ruta: 'NE06', label: 'Avskrivningar', value: fmtPDF(getFieldValue('NE06')) },
              { ruta: 'NE07', label: 'Räntekostnader', value: fmtPDF(getFieldValue('NE07')) },
            ],
          },
          {
            heading: 'Resultat & Avsättningar',
            fields: [
              { ruta: 'NE10', label: 'Resultat före egenavgifter', value: fmtPDF(getFieldValue('NE10')) },
              { ruta: 'NE11', label: 'Beräknade egenavgifter (28,97%)', value: fmtPDF(getFieldValue('NE11')) },
              { ruta: 'NE12', label: 'Överskott av näringsverksamhet', value: fmtPDF(getFieldValue('NE12')) },
              { ruta: 'NE20', label: 'Periodiseringsfond (max 30%)', value: fmtPDF(getFieldValue('NE20')) },
              { ruta: 'NE21', label: 'Expansionsfond (max 79%)', value: fmtPDF(getFieldValue('NE21')) },
            ],
          },
        ],
        fields: [],
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DeclarationFormView
      title={`NE — Enskild näringsverksamhet ${taxYear}`}
      subtitle="Bilaga till INK1 — alla intäkter och kostnader"
      breadcrumb={["Skattedeklarationsagent", "INK1", "NE"]}
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
      onSubmit={() => toast.info("NE bifogas INK1")}
      summaryRows={[{ label: "Överskott av näringsverksamhet", value: overskott, bold: true }]}
    />
  );
};
