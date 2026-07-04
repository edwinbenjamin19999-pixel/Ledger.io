import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileBarChart, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
// jsPDF & autoTable loaded lazily via dynamic import

interface ExpenseReportProps { companyId: string;
}

export function ReceiptExpenseReport({ companyId }: ExpenseReportProps) { const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState("");
  const [format, setFormat] = useState("pdf");
  const [generating, setGenerating] = useState(false);

  // Generate period options (last 12 months)
  const periodOptions = Array.from({ length: 12 }, (_, i) => { const d = new Date();
    d.setMonth(d.getMonth() - i);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("sv-SE", { year: "numeric", month: "long" });
    return { val, label };
  });

  useEffect(() => { if (!period && periodOptions.length > 0) setPeriod(periodOptions[0].val);
  }, []);

  const generate = async () => { if (!period) return;
    setGenerating(true);

    try { const [year, month] = period.split("-").map(Number);
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, "0")}-01`;

      // Fetch booked agent entries för this period
      const { data: bookings } = await supabase
        .from("agent_bookings")
        .select("*")
        .eq("company_id", companyId)
        .eq("source_type", "receipt")
        .gte("created_at", startDate)
        .lt("created_at", endDate)
        .order("created_at");

      const entries = bookings || [];

      if (entries.length === 0) { toast({ title: "Inga kvitton", description: "Inga bokförda kvitton hittades för vald period.", variant: "destructive" });
        setGenerating(false);
        return;
      }

      if (format === "csv") { generateCSV(entries, period);
      } else { generatePDF(entries, period);
      }

      toast({ title: "Rapport genererad!", description: `${entries.length} kvitton exporterade` });
    } catch (err: any) { toast({ title: "Fel", description: err.message, variant: "destructive" });
    } finally { setGenerating(false);
    }
  };

  const generatePDF = async (entries: any[], periodStr: string) => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new jsPDF();
    const periodLabel = periodOptions.find(p => p.val === periodStr)?.label || periodStr;

    doc.setFontSize(16);
    doc.text("Utgiftsrapport", 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${periodLabel}`, 14, 28);
    doc.text(`Genererad: ${new Date().toLocaleDateString("sv-SE")}`, 14, 34);

    const grouped: Record<string, { name: string; entries: any[]; total: number }> = {};
    for (const e of entries) { const key = e.account_number || "Oklassificerat";
      if (!grouped[key]) grouped[key] = { name: e.account_name || key, entries: [], total: 0 };
      grouped[key].entries.push(e);
      grouped[key].total += Math.abs(e.amount || 0);
    }

    const body = entries.map(e => [
      new Date(e.created_at).toLocaleDateString("sv-SE"),
      e.counterparty || "Okänd",
      `${e.account_number} ${e.account_name}`,
      `${Math.abs(e.amount || 0).toLocaleString("sv-SE")} kr`,
      e.vat_code ? `${e.vat_code}%` : "—",
    ]);

    autoTable(doc, { startY: 42,
      head: [["Datum", "Leverantör", "Konto", "Belopp", "Moms"]],
      body,
      theme: "striped",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    const summaryY = (doc as any).lastAutoTable?.finalY + 10 || 150;
    doc.setFontSize(12);
    doc.text("Sammanfattning per konto", 14, summaryY);

    const summaryBody = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, g]) => [key, g.name, String(g.entries.length), `${g.total.toLocaleString("sv-SE")} kr`]);

    const grandTotal = entries.reduce((s, e) => s + Math.abs(e.amount || 0), 0);
    summaryBody.push(["", "TOTALT", String(entries.length), `${grandTotal.toLocaleString("sv-SE")} kr`]);

    autoTable(doc, { startY: summaryY + 4,
      head: [["Konto", "Namn", "Antal", "Totalt"]],
      body: summaryBody,
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    const vatY = (doc as any).lastAutoTable?.finalY + 10 || 220;
    doc.setFontSize(12);
    doc.text("Momsunderlag", 14, vatY);

    const vatGroups: Record<string, number> = {};
    for (const e of entries) { const rate = e.vat_code || "0";
      vatGroups[rate] = (vatGroups[rate] || 0) + Math.abs(e.amount || 0);
    }

    const vatBody = Object.entries(vatGroups).map(([rate, total]) => { const vatAmount = total * (parseInt(rate) / (100 + parseInt(rate)));
      return [
        `${rate}%`,
        `${total.toLocaleString("sv-SE")} kr`,
        `${Math.round(vatAmount).toLocaleString("sv-SE")} kr`,
        parseInt(rate) > 0 ? "Avdragsgill" : "Ej avdragsgill",
      ];
    });

    autoTable(doc, { startY: vatY + 4,
      head: [["Momssats", "Brutto", "Momsbelopp", "Status"]],
      body: vatBody,
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const generateCSV = (entries: any[], periodStr: string) => { const header = "Datum;Leverantör;Konto;Kontonamn;Belopp;Momssats;Momsbelopp\n";
    const rows = entries.map(e => { const amount = Math.abs(e.amount || 0);
      const rate = parseInt(e.vat_code || "0");
      const vat = amount * rate / (100 + rate);
      return `${new Date(e.created_at).toLocaleDateString("sv-SE")};${e.counterparty || ""};${e.account_number};${e.account_name};${amount};${rate}%;${Math.round(vat)}`;
    }).join("\n");

    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `utgiftsrapport_${periodStr}.csv`;
    a.click();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1.5 bg-[#0040CC] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[8px] text-[12px] font-medium px-[14px] h-[34px]">
        <FileBarChart className="h-4 w-4" /> Generera utgiftsrapport
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileBarChart className="h-5 w-5 text-primary" />
              Utgiftsrapport
            </DialogTitle>
            <DialogDescription>
              Generera en rapport med alla godkända kvitton för vald period.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label>Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {periodOptions.map(p => (
                    <SelectItem key={p.val} value={p.val}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV (Excel-kompatibel)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p>Rapporten innehåller:</p>
              <p>• Alla bokförda kvitton grupperade per konto</p>
              <p>• Totalsummor per kategori</p>
              <p>• Momsåtervinningsunderlag (avdragsgill vs ej avdragsgill)</p>
            </div>

            <Button onClick={generate} disabled={generating || !period} className="w-full gap-1.5">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Ladda ner rapport
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
