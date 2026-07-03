import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePosZReports, formatKr } from "@/hooks/useKassaregister";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";
import { Plus, FileText, Search } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function ZReportArchive() { const { reports, isLoading, addReport } = usePosZReports();
  const companyId = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Add form
  const [reportDate, setReportDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reportNumber, setReportNumber] = useState("");
  const [totalSales, setTotalSales] = useState("");
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [swish, setSwish] = useState("");
  const [notes, setNotes] = useState("");

  const filtered = reports.filter((r) =>
    searchTerm
      ? r.report_date.includes(searchTerm) || r.report_number?.includes(searchTerm)
      : true
  );

  const handleAdd = () => { if (!companyId || !totalSales) return;
    addReport.mutate(
      { company_id: companyId,
        report_date: reportDate,
        report_number: reportNumber || null,
        total_sales: parseFloat(totalSales),
        cash_amount: cash ? parseFloat(cash) : null,
        card_amount: card ? parseFloat(card) : null,
        swish_amount: swish ? parseFloat(swish) : null,
        returns_amount: 0,
        source: "manual",
        notes: notes || null,
      },
      { onSuccess: () => { setShowAdd(false);
          setTotalSales("");
          setCash("");
          setCard("");
          setSwish("");
          setNotes("");
          setReportNumber("");
        },
      }
    );
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Sök datum eller nummer..."
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-1.5 bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white">
          <Plus className="h-4 w-4" />
          Ladda upp Z-rapport
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {reports.length === 0 ? "Inga Z-rapporter sparade" : "Inga resultat"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(r.report_date), "d MMMM yyyy", { locale: sv })}
                      {r.report_number && <span className="text-muted-foreground ml-2">#{r.report_number}</span>}
                    </p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {r.cash_amount != null && <span>Kontant: {formatKr(r.cash_amount)}</span>}
                      {r.card_amount != null && <span>Kort: {formatKr(r.card_amount)}</span>}
                      {r.swish_amount != null && <span>Swish: {formatKr(r.swish_amount)}</span>}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-bold">{formatKr(r.total_sales)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Lägg till Z-rapport</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Datum</Label>
                <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
              </div>
              <div>
                <Label>Rapportnummer</Label>
                <Input value={reportNumber} onChange={(e) => setReportNumber(e.target.value)} placeholder="Valfritt" />
              </div>
            </div>
            <div>
              <Label>Total försäljning (kr)</Label>
              <Input type="number" value={totalSales} onChange={(e) => setTotalSales(e.target.value)} placeholder="0" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Kontant</Label>
                <Input type="number" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="0" className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Kort</Label>
                <Input type="number" value={card} onChange={(e) => setCard(e.target.value)} placeholder="0" className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Swish</Label>
                <Input type="number" value={swish} onChange={(e) => setSwish(e.target.value)} placeholder="0" className="h-8 text-sm" />
              </div>
            </div>
            <div>
              <Label>Anteckningar</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Valfritt" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Avbryt</Button>
              <Button onClick={handleAdd} disabled={addReport.isPending || !totalSales} className="bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white">
                {addReport.isPending ? "Sparar..." : "Spara"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
