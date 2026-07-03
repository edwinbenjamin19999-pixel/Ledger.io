import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2 } from "lucide-react";
import { AgaruttagData } from "@/hooks/useAgaruttag";
import { toast } from "sonner";
import { exportFormToPDF, fmtPDF } from "@/lib/pdfExport";

function fmt(n: number) {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);
}

interface Props {
  data: AgaruttagData;
}

export function HistorikTab({ data }: Props) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [exporting, setExporting] = useState<string | null>(null);

  const filtered = data.withdrawals.filter(w => w.date.startsWith(year));

  const typeLabel = (type: string) => {
    switch (type) {
      case "lon": return "Lön";
      case "utdelning": return "Utdelning";
      case "privatuttag": return "Privatuttag";
      default: return type;
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "utdelning": return "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]";
      case "lon": return "bg-[#EFF6FF] text-[#1E3A5F] border-[#C8DDF5]";
      default: return "bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]";
    }
  };

  const handleExportCSV = () => {
    setExporting("csv");
    try {
      const header = "Datum,Typ,Belopp,Skatt (est.),Netto\n";
      const rows = filtered.map(w => {
        const taxRate = w.type === "utdelning" ? 0.20 : w.type === "lon" ? 0.32 : 0;
        const tax = Math.round(w.amount * taxRate);
        return `${w.date},${typeLabel(w.type)},${w.amount},${tax},${w.amount - tax}`;
      }).join("\n");
      const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agaruttag_${year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV-fil nedladdad");
    } catch (err) {
      toast.error("Kunde inte skapa CSV");
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = () => {
    setExporting("pdf");
    try {
      const fields = filtered.map(w => {
        const taxRate = w.type === "utdelning" ? 0.20 : w.type === "lon" ? 0.32 : 0;
        const tax = Math.round(w.amount * taxRate);
        return {
          label: `${w.date} — ${typeLabel(w.type)}`,
          value: `${fmtPDF(w.amount)} (skatt: ${fmtPDF(tax)}, netto: ${fmtPDF(w.amount - tax)})`,
        };
      });
      exportFormToPDF({
        title: `Ägaruttag ${year}`,
        subtitle: `Totalt: ${fmtPDF(data.totalWithdrawnThisYear)}`,
        taxYear: Number(year),
        fields: fields.length > 0 ? fields : [{ label: "Inga uttag", value: "—" }],
      });
      toast.success("PDF nedladdad");
    } catch (err) {
      toast.error("Kunde inte skapa PDF");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Ägaruttag och utdelningar</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="text-xs h-8" disabled={exporting === "csv" || filtered.length === 0} onClick={handleExportCSV}>
                {exporting === "csv" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
                CSV
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-8" disabled={exporting === "pdf" || filtered.length === 0} onClick={handleExportPDF}>
                {exporting === "pdf" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Inga uttag registrerade för {year}.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead className="text-right">Belopp</TableHead>
                    <TableHead className="text-right">Skatt (est.)</TableHead>
                    <TableHead className="text-right">Netto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(w => {
                    const taxRate = w.type === "utdelning" ? 0.20 : w.type === "lon" ? 0.32 : 0;
                    const tax = Math.round(w.amount * taxRate);
                    return (
                      <TableRow key={w.id}>
                        <TableCell className="text-sm">{w.date}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${typeColor(w.type)}`}>
                            {typeLabel(w.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{fmt(w.amount)} kr</TableCell>
                        <TableCell className="text-right text-muted-foreground">{fmt(tax)} kr</TableCell>
                        <TableCell className="text-right font-medium">{fmt(w.amount - tax)} kr</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex justify-end mt-3 text-sm">
                <span className="text-muted-foreground mr-2">Totalt {year}:</span>
                <span className="font-bold">{fmt(data.totalWithdrawnThisYear)} kr</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
