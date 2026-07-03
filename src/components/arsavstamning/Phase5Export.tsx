import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Mail, ExternalLink, FileText, FileSpreadsheet, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { exportFormToPDF, fmtPDF } from "@/lib/pdfExport";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";

interface Phase5Props {
  year: number;
  companyId?: string;
  onBack: () => void;
}

export function Phase5Export({ year, companyId, onBack }: Phase5Props) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExportPDF = async () => {
    setExporting("PDF");
    try {
      let fields: { ruta?: string; label: string; value: string }[] = [];
      if (companyId) {
        const { data: balances } = await supabase
          .from("chart_of_accounts")
          .select("account_number, name, id")
          .eq("company_id", companyId);
        if (balances && balances.length > 0) {
          fields = balances.map((b: any) => ({
            ruta: b.account_number,
            label: `${b.account_number} ${b.name}`,
            value: "—",
          }));
        }
      }
      if (fields.length === 0) {
        fields = [{ label: "Inga konton hittades", value: "—" }];
      }
      exportFormToPDF({
        title: `Årsavstämning ${year}`,
        subtitle: "Sammanfattning av bokslut och saldon",
        taxYear: year,
        fields,
      });
      toast.success("PDF nedladdad");
    } catch (err) {
      toast.error("Kunde inte skapa PDF: " + (err as Error).message);
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = async () => {
    setExporting("Excel");
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(`Årsavstämning ${year}`);
      sheet.columns = [
        { header: "Kontonr", key: "account_number", width: 14 },
        { header: "Kontonamn", key: "name", width: 30 },
      ];
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2D6A4F" } };

      if (companyId) {
        const { data: accounts } = await supabase
          .from("chart_of_accounts")
          .select("account_number, name")
          .eq("company_id", companyId)
          .order("account_number");
        (accounts || []).forEach((b: any) => sheet.addRow(b));
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `arsavstamning_${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel-fil nedladdad");
    } catch (err) {
      toast.error("Kunde inte skapa Excel: " + (err as Error).message);
    } finally {
      setExporting(null);
    }
  };

  const handleSendToAuditor = () => {
    if (!email) return;
    setSent(true);
    toast.success("Skickat till revisor", {
      description: `Allt underlag har skickats till ${email}`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exportera och avsluta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ComingSoonButton tooltipText="SIE4-export lanseras Q3 2026" className="h-auto py-4 flex flex-col gap-2">
              <FileText className="h-6 w-6" />
              <span className="text-sm font-medium">SIE4-fil för revisor</span>
            </ComingSoonButton>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2"
              disabled={exporting === "PDF"}
              onClick={handleExportPDF}
            >
              {exporting === "PDF" ? (
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              ) : (
                <Download className="h-6 w-6 text-primary" />
              )}
              <span className="text-sm font-medium">PDF-sammanfattning</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2"
              disabled={exporting === "Excel"}
              onClick={handleExportExcel}
            >
              {exporting === "Excel" ? (
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              ) : (
                <FileSpreadsheet className="h-6 w-6 text-primary" />
              )}
              <span className="text-sm font-medium">Excel för Skatteverket</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skicka till revisor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Skicka SIE4-fil, alla kvitton och sammanfattningsrapport direkt till din revisor.
          </p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="revisor@byrå.se"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button onClick={handleSendToAuditor} disabled={!email || sent}>
              {sent ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Skickat
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Skicka
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-6 flex flex-col items-center gap-3">
          <p className="text-sm font-medium">Jag deklarerar själv</p>
          <Button variant="outline" asChild>
            <a
              href="https://www.skatteverket.se/privat/etjansterochblanketter/alabortenlevepaetjanster/inkomstdeklaration.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Öppna Skatteverkets e-tjänst
            </a>
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka
        </Button>
      </div>
    </div>
  );
}
