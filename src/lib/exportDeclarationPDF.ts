import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PDFField {
  code: string;
  label: string;
  value: number | string;
  comment?: string;
}

interface ExportOptions {
  title: string;
  subtitle?: string;
  fields: PDFField[];
  summaryRows?: { label: string; value: number }[];
  companyName?: string;
  taxYear?: number;
}

export function exportDeclarationPDF(options: ExportOptions) {
  const { title, subtitle, fields, summaryRows, companyName, taxYear } = options;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const now = new Date();
  const dateStr = now.toLocaleDateString("sv-SE");
  const timeStr = now.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 22);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(subtitle, 14, 30);
  }

  // Meta
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  const metaY = subtitle ? 38 : 30;
  if (companyName) doc.text(`Bolag: ${companyName}`, 14, metaY);
  if (taxYear) doc.text(`Beskattningsår: ${taxYear}`, 14, metaY + 5);
  doc.text(`Genererad: ${dateStr} ${timeStr}`, 14, metaY + (companyName ? 10 : 0) + (taxYear ? 5 : 0));

  // Fields table
  const tableStartY = metaY + (companyName ? 10 : 0) + (taxYear ? 5 : 0) + 8;

  const tableBody = fields.map((f) => [
    f.code,
    f.label,
    typeof f.value === "number"
      ? f.value.toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " kr"
      : String(f.value),
    f.comment || "",
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [["Kod", "Fält", "Värde", "Kommentar"]],
    body: tableBody,
    theme: "striped",
    headStyles: { fillColor: [30, 58, 95], fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 18, fontStyle: "bold" },
      1: { cellWidth: 75 },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 50, textColor: [100, 100, 100], fontStyle: "italic" },
    },
    margin: { left: 14, right: 14 },
  });

  // Summary rows
  if (summaryRows && summaryRows.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || tableStartY + 20;

    autoTable(doc, {
      startY: finalY + 5,
      body: summaryRows.map((r) => [
        r.label,
        r.value.toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " kr",
      ]),
      theme: "plain",
      bodyStyles: { fontSize: 10, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 50, halign: "right" },
      },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `${title} — Sida ${i} av ${pageCount} — Genererad av North Ledger AI`,
      14,
      doc.internal.pageSize.height - 8
    );
  }

  // Generate filename
  const safeName = title.replace(/[^a-zA-Z0-9åäöÅÄÖ\s-]/g, "").replace(/\s+/g, "-").toLowerCase();
  const fileName = `${safeName}-${taxYear || now.getFullYear()}-${dateStr}.pdf`;

  doc.save(fileName);
  return fileName;
}
