import { Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { BoardSummary } from "@/hooks/useBoardSummary";
import { MODE_PROFILES, type BoardModeId } from "@/lib/board-mode/modeProfiles";

const fmt = (n: number | null) => n === null ? "—" : Math.round(n).toLocaleString("sv-SE");

const formatKpiValue = (k: BoardSummary["kpis"][number]) => {
  if (k.unavailable_reason) return `Otillgänglig (${k.unavailable_reason})`;
  if (k.value === null) return "—";
  if (k.format === "currency") return `${fmt(k.value)} kr`;
  if (k.format === "percent") return `${k.value.toFixed(1)}%`;
  if (k.format === "days") return `${k.value} d`;
  return String(k.value);
};

function generatePDF(variant: BoardModeId, data: BoardSummary, summaryText: string) {
  const profile = MODE_PROFILES[variant];
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  let y = margin;

  // Header band
  doc.setFillColor(15, 20, 40);
  doc.rect(0, 0, 595, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text(profile.label, margin, 50);
  doc.setFontSize(10);
  doc.setTextColor(180, 220, 240);
  doc.text(profile.subtitle, margin, 70);
  y = 120;

  // Date
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.text(new Date(data.updated_at).toLocaleString("sv-SE"), margin, y);
  y += 24;

  // Executive summary
  doc.setTextColor(20, 20, 30);
  doc.setFontSize(13);
  doc.text("Executive summary", margin, y); y += 18;
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 70);
  const lines = doc.splitTextToSize(summaryText || data.summary, 500);
  doc.text(lines, margin, y); y += lines.length * 14 + 16;

  // KPIs
  doc.setFontSize(13); doc.setTextColor(20, 20, 30);
  doc.text("Nyckeltal", margin, y); y += 6;
  autoTable(doc, {
    startY: y + 4,
    head: [["KPI", "Värde", "Förändring"]],
    body: data.kpis.map(k => [
      k.label,
      formatKpiValue(k),
      k.delta_pct !== null ? `${k.delta_pct > 0 ? "+" : ""}${k.delta_pct.toFixed(1)}%` : "—",
    ]),
    headStyles: { fillColor: [8, 145, 178], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 24;

  // Risks
  if (data.risks.length > 0) {
    doc.setFontSize(13); doc.setTextColor(20, 20, 30);
    doc.text("Risker", margin, y); y += 6;
    autoTable(doc, {
      startY: y + 4,
      head: [["Allvarlighet", "Risk", "Påverkan"]],
      body: data.risks.map(r => [
        r.severity.toUpperCase(),
        r.title,
        r.impact ? `${fmt(r.impact)} kr` : "—",
      ]),
      headStyles: { fillColor: [220, 80, 80], textColor: 255, fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 24;
  }

  // Per entity
  if (data.per_entity_breakdown.length > 0) {
    doc.setFontSize(13); doc.setTextColor(20, 20, 30);
    doc.text("Per bolag", margin, y); y += 6;
    autoTable(doc, {
      startY: y + 4,
      head: [["Bolag", "Omsättning", "Andel", "EBIT"]],
      body: data.per_entity_breakdown.map(e => [
        e.company_name,
        `${fmt(e.revenue)} kr`,
        `${e.revenue_share_pct.toFixed(1)}%`,
        `${fmt(e.ebit)} kr`,
      ]),
      headStyles: { fillColor: [60, 60, 80], textColor: 255, fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(`Ledger.io — ${profile.label} — sida ${i} av ${pageCount}`, margin, 820);
  }

  const filename = `${profile.shortLabel.toLowerCase()}-pack-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

export const BoardExportMenu = ({
  data,
  summaryText,
  disabled,
}: {
  data: BoardSummary | null;
  summaryText: string;
  disabled?: boolean;
}) => {
  const [busy, setBusy] = useState<BoardModeId | null>(null);

  const handleExport = async (variant: BoardModeId) => {
    if (!data) { toast.error("Ingen data att exportera"); return; }
    setBusy(variant);
    try {
      generatePDF(variant, data, summaryText || data.summary);
      toast.success(`${MODE_PROFILES[variant].label} exporterat`);
    } catch (e) {
      console.error(e);
      toast.error("Export misslyckades");
    } finally {
      setBusy(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !data}
          className="gap-2 bg-white border border-gray-200 text-gray-600 text-sm rounded-lg px-4 py-2 hover:bg-gray-50 shadow-none"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportera
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-[#0f1428] border-white/10 text-white">
        <DropdownMenuItem onClick={() => handleExport("BOARD")} className="gap-2 cursor-pointer focus:bg-white/10 focus:text-white">
          <FileText className="h-4 w-4 text-[#1E3A5F]" /> Board Pack (PDF)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("INVESTOR")} className="gap-2 cursor-pointer focus:bg-white/10 focus:text-white">
          <FileText className="h-4 w-4 text-[#1E3A5F]" /> Investor Summary (PDF)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("CEO")} className="gap-2 cursor-pointer focus:bg-white/10 focus:text-white">
          <FileText className="h-4 w-4 text-orange-400" /> Management Commentary (PDF)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
