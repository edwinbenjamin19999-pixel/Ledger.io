import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";

interface EliminationExportRow {
  nr: number;
  type: string;
  entityA: string;
  entityB: string;
  description: string;
  amount: number;
  autoManual: string;
  status: string;
  lines?: { account_no: string; account_name: string | null; debit: number; credit: number }[];
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

export const exportEliminationsPDF = (rows: EliminationExportRow[], groupName: string, period: string) => {
  const doc = new jsPDF("landscape", "mm", "a4");
  
  doc.setFontSize(16);
  doc.text(`Elimineringsjournal — ${groupName}`, 14, 18);
  doc.setFontSize(10);
  doc.text(`Period: ${period}`, 14, 25);
  doc.text(`Genererad: ${new Date().toLocaleDateString("sv-SE")}`, 14, 30);

  // Summary table
  autoTable(doc, {
    startY: 36,
    head: [["Nr", "Typ", "Bolag A", "Bolag B", "Beskrivning", "Belopp", "Auto/Man", "Status"]],
    body: rows.map(r => [
      r.nr,
      r.type,
      r.entityA,
      r.entityB || "—",
      r.description || "—",
      fmt(r.amount),
      r.autoManual,
      r.status,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 33, 55] },
  });

  // Detail pages with lines
  const detailRows = rows.filter(r => r.lines && r.lines.length > 0);
  if (detailRows.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text("Elimineringsposter — Detaljer", 14, 18);
    let yPos = 26;

    for (const r of detailRows) {
      if (yPos > 170) { doc.addPage(); yPos = 18; }
      doc.setFontSize(10);
      doc.text(`#${r.nr} ${r.type} — ${r.entityA}${r.entityB ? ` ↔ ${r.entityB}` : ""}`, 14, yPos);
      yPos += 4;

      autoTable(doc, {
        startY: yPos,
        head: [["Konto", "Kontonamn", "Debet", "Kredit"]],
        body: (r.lines || []).map(l => [
          l.account_no,
          l.account_name || "",
          l.debit ? fmt(l.debit) : "",
          l.credit ? fmt(l.credit) : "",
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [15, 33, 55] },
      });
      yPos = (doc as any).lastAutoTable?.finalY + 8 || yPos + 30;
    }
  }

  doc.save(`elimineringsjournal_${groupName.replace(/\s/g, "_")}.pdf`);
};

export const exportEliminationsExcel = async (rows: EliminationExportRow[], groupName: string, period: string) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Ledger.io";

  // Summary sheet
  const ws = wb.addWorksheet("Elimineringar");
  ws.columns = [
    { header: "Nr", key: "nr", width: 6 },
    { header: "Typ", key: "type", width: 22 },
    { header: "Bolag A", key: "entityA", width: 20 },
    { header: "Bolag B", key: "entityB", width: 20 },
    { header: "Beskrivning", key: "description", width: 30 },
    { header: "Belopp", key: "amount", width: 14 },
    { header: "Auto/Manuell", key: "autoManual", width: 14 },
    { header: "Status", key: "status", width: 12 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2137" } };

  rows.forEach(r => {
    ws.addRow({
      nr: r.nr,
      type: r.type,
      entityA: r.entityA,
      entityB: r.entityB || "—",
      description: r.description || "",
      amount: r.amount,
      autoManual: r.autoManual,
      status: r.status,
    });
  });

  // Detail sheet
  const ds = wb.addWorksheet("Detaljposter");
  ds.columns = [
    { header: "Eliminering Nr", key: "elimNr", width: 14 },
    { header: "Typ", key: "type", width: 22 },
    { header: "Konto", key: "account_no", width: 10 },
    { header: "Kontonamn", key: "account_name", width: 25 },
    { header: "Debet", key: "debit", width: 14 },
    { header: "Kredit", key: "credit", width: 14 },
  ];

  const dHeaderRow = ds.getRow(1);
  dHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  dHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2137" } };

  rows.forEach(r => {
    (r.lines || []).forEach(l => {
      ds.addRow({
        elimNr: r.nr,
        type: r.type,
        account_no: l.account_no,
        account_name: l.account_name || "",
        debit: l.debit || 0,
        credit: l.credit || 0,
      });
    });
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `elimineringsjournal_${groupName.replace(/\s/g, "_")}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
};
