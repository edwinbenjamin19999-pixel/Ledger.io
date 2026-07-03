import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText, Download, Users } from "lucide-react";
import { toast } from "sonner";
import { exportFormToPDF, fmtPDF } from "@/lib/pdfExport";
import { fmt } from "../shared/types";

interface KUFormsProps { companyId: string;
  taxYear: number;
}

interface KURow { name: string;
  personnr: string;
  bruttolohn: number;
  formaner: number;
  avdragenSkatt: number;
}

export const KUForms = ({ companyId, taxYear }: KUFormsProps) => { const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<KURow[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const fetchFromPayroll = async () => { setLoading(true);
    try { const { data: employees } = await supabase
        .from("employees")
        .select("id, first_name, last_name, personal_number, monthly_salary")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (!employees?.length) { toast.info("Inga anställda hittades");
        setLoading(false);
        return;
      }

      const kuRows: KURow[] = employees.map(e => ({ name: `${e.first_name} ${e.last_name}`,
        personnr: e.personal_number || "********",
        bruttolohn: (e.monthly_salary || 0) * 12,
        formaner: 0,
        avdragenSkatt: Math.round((e.monthly_salary || 0) * 12 * 0.30),
      }));

      setRows(kuRows);
    } catch { toast.error("Kunde inte hämta lönedata");
    } finally { setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const totalBrutto = rows.reduce((s, r) => s + r.bruttolohn, 0);
      const totalFormaner = rows.reduce((s, r) => s + r.formaner, 0);
      const totalSkatt = rows.reduce((s, r) => s + r.avdragenSkatt, 0);

      exportFormToPDF({
        title: 'KU10 — Kontrolluppgifter',
        subtitle: 'Sammanställning av kontrolluppgifter för anställda',
        taxYear,
        sections: [
          ...rows.map((r, i) => ({
            heading: `${r.name} (${r.personnr})`,
            fields: [
              { ruta: '011', label: 'Kontant ersättning (bruttolön)', value: fmtPDF(r.bruttolohn) },
              { ruta: '012', label: 'Förmåner', value: fmtPDF(r.formaner) },
              { ruta: '014', label: 'Avdragen preliminärskatt', value: fmtPDF(r.avdragenSkatt) },
            ],
          })),
          {
            heading: 'Totalt',
            fields: [
              { ruta: '', label: 'Summa bruttolön', value: fmtPDF(totalBrutto) },
              { ruta: '', label: 'Summa förmåner', value: fmtPDF(totalFormaner) },
              { ruta: '', label: 'Summa avdragen skatt', value: fmtPDF(totalSkatt) },
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
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Skattedeklarationsagent</span>
        <span>›</span>
        <span className="font-medium text-foreground">Kontrolluppgifter</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Kontrolluppgifter {taxYear}</h2>
            <p className="text-xs text-muted-foreground">KU10 (lön), KU13 (ränta), KU14 (utdelning)</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchFromPayroll} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
          Hämta från lönedata
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">KU10 — Lön och förmåner</CardTitle>
          <CardDescription>En rad per anställd — deadline 31 januari</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">
              Klicka "Hämta från lönedata" för att generera kontrolluppgifter
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left font-medium">Namn</th>
                  <th className="p-2 text-left font-medium">Personnr</th>
                  <th className="p-2 text-right font-medium">Bruttolön</th>
                  <th className="p-2 text-right font-medium">Förmåner</th>
                  <th className="p-2 text-right font-medium">Avdragen skatt</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{r.name}</td>
                    <td className="p-2 font-mono text-xs">{r.personnr}</td>
                    <td className="p-2 text-right font-mono">{fmt(r.bruttolohn)}</td>
                    <td className="p-2 text-right font-mono">{fmt(r.formaner)}</td>
                    <td className="p-2 text-right font-mono">{fmt(r.avdragenSkatt)}</td>
                  </tr>
                ))}
                <tr className="bg-muted/20 font-semibold">
                  <td className="p-2" colSpan={2}>Totalt</td>
                  <td className="p-2 text-right font-mono">{fmt(rows.reduce((s, r) => s + r.bruttolohn, 0))}</td>
                  <td className="p-2 text-right font-mono">{fmt(rows.reduce((s, r) => s + r.formaner, 0))}</td>
                  <td className="p-2 text-right font-mono">{fmt(rows.reduce((s, r) => s + r.avdragenSkatt, 0))}</td>
                </tr>
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExportPDF} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporterar...' : 'Exportera KU-filer'}
          </Button>
        </div>
      )}
    </div>
  );
};
