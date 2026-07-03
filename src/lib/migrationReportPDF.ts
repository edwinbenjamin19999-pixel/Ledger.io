import jsPDF from "jspdf";

interface Job {
  id: string;
  source_system: string;
  source_format: string;
  status: string;
  stats: any;
  errors: any;
  created_at: string;
  completed_at: string | null;
}

export function generateMigrationReportPDF({
  job,
  reportText,
}: {
  job: Job;
  reportText: string;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 50;
  let y = margin;

  doc.setFontSize(20);
  doc.setTextColor("#0B4F6C");
  doc.text("Migreringsrapport — Bokfy", margin, y);
  y += 28;

  doc.setFontSize(10);
  doc.setTextColor("#64748B");
  const created = new Date(job.created_at).toLocaleString("sv-SE");
  doc.text(`Källsystem: ${job.source_system} (${job.source_format})`, margin, y);
  y += 14;
  doc.text(`Datum: ${created}`, margin, y);
  y += 14;
  doc.text(`Status: ${job.status}`, margin, y);
  y += 24;

  // Summary box
  doc.setFontSize(12);
  doc.setTextColor("#0B4F6C");
  doc.text("Sammanfattning", margin, y);
  y += 16;
  doc.setFontSize(10);
  doc.setTextColor("#0F172A");
  const stats = (job.stats || {}) as Record<string, number>;
  const lines = [
    `Kunder importerade: ${stats.customers ?? 0}`,
    `Leverantörer importerade: ${stats.suppliers ?? 0}`,
    `Kundfakturor importerade: ${stats.customerInvoices ?? stats.invoices ?? 0}`,
    `Leverantörsfakturor importerade: ${stats.supplierInvoices ?? 0}`,
  ];
  for (const line of lines) {
    doc.text(line, margin, y);
    y += 14;
  }
  y += 10;

  // AI report body
  doc.setFontSize(12);
  doc.setTextColor("#0B4F6C");
  doc.text("AI-observationer & rekommendationer", margin, y);
  y += 16;
  doc.setFontSize(10);
  doc.setTextColor("#0F172A");

  const wrapped = doc.splitTextToSize(reportText, 595 - margin * 2);
  for (const ln of wrapped) {
    if (y > 780) {
      doc.addPage();
      y = margin;
    }
    doc.text(ln, margin, y);
    y += 14;
  }

  // Errors section
  if (Array.isArray(job.errors) && job.errors.length > 0) {
    y += 10;
    if (y > 740) {
      doc.addPage();
      y = margin;
    }
    doc.setFontSize(12);
    doc.setTextColor("#991B1B");
    doc.text("Fel / hoppade över poster", margin, y);
    y += 16;
    doc.setFontSize(9);
    doc.setTextColor("#0F172A");
    const errText = JSON.stringify(job.errors, null, 2);
    const errLines = doc.splitTextToSize(errText, 595 - margin * 2);
    for (const ln of errLines) {
      if (y > 780) {
        doc.addPage();
        y = margin;
      }
      doc.text(ln, margin, y);
      y += 12;
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor("#94A3B8");
    doc.text("Rapporten genererades automatiskt av Bokfy", margin, 820);
    doc.text(`Sida ${i} / ${pageCount}`, 545, 820, { align: "right" });
  }

  doc.save(`Migreringsrapport-${job.source_system}-${job.id.slice(0, 8)}.pdf`);
}
