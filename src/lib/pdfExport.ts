import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FormField {
  label: string;
  value: string | number | null | undefined;
  ruta?: string;
}

interface PDFExportOptions {
  title: string;
  subtitle?: string;
  companyName?: string;
  orgNumber?: string;
  taxYear?: number | string;
  fields: FormField[];
  sections?: {
    heading: string;
    fields: FormField[];
  }[];
  footer?: string;
}

export function exportFormToPDF(options: PDFExportOptions): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = margin;

  // Header — blå bakgrund
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Logotyp-text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Bokfy AI', margin, 16);

  // Formulärnamn
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(options.title, margin, 26);
  if (options.subtitle) {
    doc.setFontSize(9);
    doc.text(options.subtitle, margin, 33);
  }

  // Taxeringsår till höger
  if (options.taxYear) {
    doc.setFontSize(10);
    doc.text(`Taxeringsår ${options.taxYear}`, pageWidth - margin, 22, { align: 'right' });
  }

  y = 50;

  // Företagsinfo
  if (options.companyName || options.orgNumber) {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    if (options.companyName) {
      doc.text(options.companyName, margin, y);
      y += 6;
    }
    if (options.orgNumber) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Org.nr: ${options.orgNumber}`, margin, y);
      y += 10;
    }
  }

  // Separator
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  const renderSections = options.sections && options.sections.length > 0;

  if (renderSections) {
    for (const section of options.sections!) {
      doc.setTextColor(37, 99, 235);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(section.heading, margin, y);
      y += 6;

      const tableData = section.fields.map(f => [
        f.ruta ? `${f.ruta}` : '',
        f.label,
        f.value !== null && f.value !== undefined ? String(f.value) : '—',
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Ruta', 'Beskrivning', 'Värde']],
        body: tableData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 3, textColor: [15, 23, 42] },
        headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontStyle: 'bold', lineColor: [226, 232, 240], lineWidth: 0.3 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 0: { cellWidth: 16, halign: 'center' }, 2: { halign: 'right', cellWidth: 35 } },
        didDrawPage: (data) => { y = data.cursor?.y ?? y; },
      });

      y = (doc as any).lastAutoTable.finalY + 10;
    }
  } else {
    const tableData = options.fields.map(f => [
      f.ruta ? `${f.ruta}` : '',
      f.label,
      f.value !== null && f.value !== undefined ? String(f.value) : '—',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Ruta', 'Beskrivning', 'Värde']],
      body: tableData,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 3, textColor: [15, 23, 42] },
      headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontStyle: 'bold', lineColor: [226, 232, 240], lineWidth: 0.3 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: { 0: { cellWidth: 16, halign: 'center' }, 2: { halign: 'right', cellWidth: 35 } },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Footer
  const footerText = options.footer ?? `Genererad av Bokfy AI — ${new Date().toLocaleDateString('sv-SE')}`;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - 12, { align: 'center' });

  // Spara filen
  const filename = `${options.title.replace(/\s+/g, '_')}_${options.taxYear ?? new Date().getFullYear()}.pdf`;
  doc.save(filename);
}

// Formatera SEK för PDF
export function fmtPDF(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num === null || num === undefined || isNaN(num as number)) return '0 kr';
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num as number);
}
