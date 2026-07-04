import { PanelRight, Download, FileText, FileSpreadsheet, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface ReportHealthPanelProps { open: boolean;
  onToggle: () => void;
  assetTotal: number;
  liabTotal: number;
  balanceDiff: number;
  revenue: number;
  expenses: number;
  netResult: number;
  fromDate: Date;
  toDate: Date;
  verificationCount: number;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onExportCSV?: () => void;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

export const ReportHealthPanel = ({ open,
  onToggle,
  assetTotal,
  liabTotal,
  balanceDiff,
  revenue,
  expenses,
  netResult,
  fromDate,
  toDate,
  verificationCount,
  onExportPDF,
  onExportExcel,
  onExportCSV,
}: ReportHealthPanelProps) => { const soliditet = assetTotal !== 0 ? ((assetTotal - liabTotal) / assetTotal) * 100 : 0;
  const ebit = netResult;
  const kassalikviditet = liabTotal !== 0 ? (assetTotal / liabTotal) * 100 : 0;

  if (!open) return null;

  return (
    <div className="w-72 border-l border-border bg-muted/30 p-4 flex flex-col gap-4 shrink-0">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Finansiell hälsa</h3>
        <Button variant="ghost" size="sm" onClick={onToggle} className="h-7 w-7 p-0">
          <PanelRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Nyckeltal */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nyckeltal</h4>
        <div className="space-y-1.5">
          {[
            { label: "Soliditet", value: fmtPct(soliditet) },
            { label: "EBIT", value: `${fmt(ebit)} kr` },
            { label: "Kassalikviditet", value: fmtPct(kassalikviditet) },
          ].map((item) => (
            <div key={item.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium text-foreground tabular-nums">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Balance check */}
      <div className={`rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-2 ${ Math.abs(balanceDiff) <= 1
          ? "bg-[#E1F5EE] text-[#085041]"
          : "bg-destructive/10 text-destructive"
      }`}>
        <span className={`w-2 h-2 rounded-full ${Math.abs(balanceDiff) <= 1 ? "bg-emerald-500" : "bg-destructive"}`} />
        {Math.abs(balanceDiff) <= 1
          ? "Balansen stämmer"
          : `Differens: ${balanceDiff.toLocaleString("sv-SE")} kr`
        }
      </div>

      {/* Period info */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Period</h4>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Räkenskapsår</span>
            <span className="font-medium text-foreground">{toDate.getFullYear()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Period</span>
            <span className="font-medium text-foreground text-xs">
              {format(fromDate, "yyyy-MM-dd")} – {format(toDate, "yyyy-MM-dd")}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Verifikationer</span>
            <span className="font-medium text-foreground tabular-nums">{verificationCount}</span>
          </div>
        </div>
      </div>

      {/* Quick export */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Snabbexport</h4>
        <div className="flex gap-1">
          {[
            { icon: FileText, label: "PDF", onClick: onExportPDF },
            { icon: FileSpreadsheet, label: "Excel", onClick: onExportExcel },
            { icon: FileDown, label: "CSV", onClick: onExportCSV },
          ].map((btn) => (
            <Button
              key={btn.label}
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs gap-1"
              onClick={btn.onClick}
            >
              <btn.icon className="w-3 h-3" />
              {btn.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
