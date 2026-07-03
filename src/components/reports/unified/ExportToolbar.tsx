import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, ChevronDown, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { FinancialReport } from "@/lib/reports/engine";
import {
  exportStatementPDF,
  exportStatementXLSX,
  type StatementLens,
} from "@/lib/reports/exportStatement";
import { toast } from "sonner";
import { formatSEK } from "@/lib/formatNumber";

interface ExportToolbarProps {
  report: FinancialReport;
  /** Active lens — preselects the matching menu item. */
  activeView?: "rr" | "br" | "combined";
  /** CSV passthrough for power-users. */
  onExportCsvRR?: () => void;
  onExportCsvBR?: () => void;
}

export function ExportToolbar({
  report,
  activeView = "combined",
  onExportCsvRR,
  onExportCsvBR,
}: ExportToolbarProps) {
  const [confirmLens, setConfirmLens] = useState<StatementLens | null>(null);
  const [confirmFormat, setConfirmFormat] = useState<"pdf" | "xlsx">("pdf");
  const [acknowledged, setAcknowledged] = useState(false);

  const isBalanced = report.validation.balanced;
  const imbalanceDiff = report.validation.imbalanceDiff;

  const run = async (lens: StatementLens, format: "pdf" | "xlsx", ack = false) => {
    try {
      if (format === "pdf") {
        exportStatementPDF(report, lens, { acknowledgeImbalance: ack });
      } else {
        await exportStatementXLSX(report, lens, { acknowledgeImbalance: ack });
      }
      toast.success(`${format.toUpperCase()} exporterad`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Exporten misslyckades");
    }
  };

  const handle = (lens: StatementLens, format: "pdf" | "xlsx") => {
    if (lens !== "RR" && !isBalanced) {
      // Need explicit ack
      setConfirmLens(lens);
      setConfirmFormat(format);
      setAcknowledged(false);
      return;
    }
    run(lens, format, false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[8px] text-[12px] text-[#475569] px-[12px] h-[34px] hover:bg-[#F8FAFB] flex items-center gap-[6px] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Exportera
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="text-xs uppercase tracking-wide text-slate-500">PDF</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handle("RR", "pdf")} className="gap-2">
            <FileText className="w-4 h-4 text-[#7A1A1A]" />
            <div className="flex flex-col">
              <span className="text-sm">Resultaträkning</span>
              <span className="text-[11px] text-slate-500">Premium A4 · Board-ready</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handle("BR", "pdf")} className="gap-2">
            <FileText className="w-4 h-4 text-[#7A1A1A]" />
            <div className="flex flex-col">
              <span className="text-sm">Balansräkning</span>
              <span className="text-[11px] text-slate-500">Tillgångar + Eget kapital & skulder</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handle("combined", "pdf")} className="gap-2">
            <FileText className="w-4 h-4 text-[#7A1A1A]" />
            <div className="flex flex-col">
              <span className="text-sm">Komplett rapport (RR + BR)</span>
              <span className="text-[11px] text-slate-500">Två sammanhållna dokument</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs uppercase tracking-wide text-slate-500">Excel</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handle("combined", "xlsx")} className="gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#085041]" />
            <div className="flex flex-col">
              <span className="text-sm">Premium-arbetsbok (RR + BR)</span>
              <span className="text-[11px] text-slate-500">A4 print-ready · samma layout som PDF</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handle("RR", "xlsx")} className="gap-2 text-sm">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600/70" />
            Endast Resultaträkning (Excel)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handle("BR", "xlsx")} className="gap-2 text-sm">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600/70" />
            Endast Balansräkning (Excel)
          </DropdownMenuItem>

          {(onExportCsvRR || onExportCsvBR) && <DropdownMenuSeparator />}
          {onExportCsvRR && (
            <DropdownMenuItem onClick={onExportCsvRR} className="gap-2 text-sm">
              <Download className="w-4 h-4 text-slate-500" />
              CSV (RR)
            </DropdownMenuItem>
          )}
          {onExportCsvBR && (
            <DropdownMenuItem onClick={onExportCsvBR} className="gap-2 text-sm">
              <Download className="w-4 h-4 text-slate-500" />
              CSV (BR)
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmLens !== null} onOpenChange={(o) => !o && setConfirmLens(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#7A1A1A]" />
              Balansräkningen är inte i balans
            </DialogTitle>
            <DialogDescription>
              Differens {formatSEK(Math.abs(imbalanceDiff))}. En tydlig varning skrivs in i dokumentet.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-2 cursor-pointer text-sm py-2">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5"
            />
            <span>Jag förstår och vill exportera ändå</span>
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLens(null)}>
              Avbryt
            </Button>
            <Button
              disabled={!acknowledged}
              onClick={() => {
                if (confirmLens) run(confirmLens, confirmFormat, true);
                setConfirmLens(null);
              }}
            >
              Exportera ändå
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
