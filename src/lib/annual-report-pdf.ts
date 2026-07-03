import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// ── Types ──
interface ReportLine {
  label: string;
  autoValue: number;
  adjustedValue: number;
  accountRange?: string;
  isHeader?: boolean;
  isTotal?: boolean;
  isNet?: boolean;
  indent?: number;
}

interface NoteData {
  id: string;
  title: string;
  content: string;
}

interface ForvaltningData {
  verksamhet: string;
  handelser: string;
  vinstdisposition: string;
  framtid: string;
}

interface AnnualReportPdfOptions {
  companyName: string;
  orgNumber: string;
  year: number;
  regelverk: 'K2' | 'K3';
  bsLines: ReportLine[];
  isLines: ReportLine[];
  notes: NoteData[];
  forvaltning: ForvaltningData;
}

const BLACK: [number, number, number] = [0, 0, 0];
const MUTED: [number, number, number] = [100, 100, 100];
const WHITE: [number, number, number] = [255, 255, 255];

const fmt = (n: number): string =>
  n === 0 ? '-' : new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(n);

// ── Page header (every page except cover) ──
function drawPageHeader(doc: jsPDF, companyName: string, orgNumber: string, pageNum: number, totalPages: number) {
  const w = doc.internal.pageSize.getWidth();
  const ml = 20;
  const mr = 20;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text(companyName, ml, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(orgNumber, ml, 19);
  doc.text(`${pageNum}(${totalPages})`, w - mr, 14, { align: 'right' });
}

// ── Cover page ──
function drawCoverPage(doc: jsPDF, opts: AnnualReportPdfOptions) {
  const w = doc.internal.pageSize.getWidth();
  const centerX = w / 2;
  const startDate = `${opts.year}-01-01`;
  const endDate = `${opts.year}-12-31`;

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BLACK);
  doc.text('Årsredovisning för', centerX, 60, { align: 'center' });

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(opts.companyName, centerX, 78, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(opts.orgNumber, centerX, 90, { align: 'center' });

  doc.setFontSize(11);
  doc.text('Räkenskapsåret', centerX, 110, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(`${startDate} - ${endDate}`, centerX, 120, { align: 'center' });

  // Table of contents
  const tocY = 160;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Innehållsförteckning:', 60, tocY);
  doc.text('Sida', 150, tocY, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const tocItems = [
    ['Förvaltningsberättelse', '1'],
    ['Resultaträkning', '2'],
    ['Balansräkning', '3'],
    ['Noter', '4'],
  ];
  tocItems.forEach(([label, page], i) => {
    doc.text(label, 60, tocY + 14 + i * 8);
    doc.text(page, 150, tocY + 14 + i * 8, { align: 'right' });
  });
}

// ── Förvaltningsberättelse ──
function drawForvaltning(doc: jsPDF, opts: AnnualReportPdfOptions) {
  let y = 30;
  const ml = 20;
  const maxW = doc.internal.pageSize.getWidth() - 40;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text('Förvaltningsberättelse', ml, y);
  doc.setLineWidth(0.5);
  doc.line(ml, y + 2, ml + 60, y + 2);
  y += 12;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Styrelsen för ${opts.companyName}, ${opts.orgNumber}, får härmed avge årsredovisning för räkenskapsåret ${opts.year}.`,
    ml, y, { maxWidth: maxW }
  );
  y += 14;

  // Verksamheten
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Verksamheten', ml, y);
  y += 6;

  if (opts.forvaltning.verksamhet) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bolditalic');
    doc.text('Allmänt om verksamheten', ml, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(opts.forvaltning.verksamhet, maxW);
    doc.text(lines, ml, y);
    y += lines.length * 4.5 + 6;
  }

  if (opts.forvaltning.handelser) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bolditalic');
    doc.text('Väsentliga händelser under räkenskapsåret', ml, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(opts.forvaltning.handelser, maxW);
    doc.text(lines, ml, y);
    y += lines.length * 4.5 + 6;
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bolditalic');
    doc.text('Väsentliga händelser under räkenskapsåret', ml, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text('Inga väsentliga händelser har inträffat under räkenskapsåret', ml, y);
    y += 10;
  }

  // Flerårsöversikt
  const revenue = opts.isLines.find(r => r.label === 'Nettoomsättning')?.adjustedValue || 0;
  const resultAfterFin = opts.isLines.find(r => r.label === 'Resultat efter finansiella poster')?.adjustedValue || 0;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Flerårsöversikt', ml, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [['', `${opts.year}`, ''].map((v, i) => ({
      content: v,
      styles: {
        halign: i === 0 ? 'left' as const : 'right' as const,
        fontStyle: i === 0 ? 'bold' as const : 'italic' as const,
        fontSize: 8,
        textColor: BLACK,
        fillColor: WHITE,
      },
    }))],
    body: [
      ['Nettoomsättning', fmt(revenue), ''],
      ['Resultat efter finansiella poster', fmt(resultAfterFin), ''],
    ],
    theme: 'plain',
    styles: { fontSize: 8, textColor: BLACK, cellPadding: { top: 1, bottom: 1, left: 2, right: 2 } },
    columnStyles: {
      0: { halign: 'left', cellWidth: 60 },
      1: { halign: 'right', cellWidth: 30 },
      2: { halign: 'right', cellWidth: 30 },
    },
    margin: { left: ml, right: 20 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Resultatdisposition
  const netResult = opts.isLines.find(r => r.label === 'Årets resultat')?.adjustedValue || 0;
  const balanserat = opts.bsLines.find(r => r.label === 'Balanserat resultat')?.adjustedValue || 0;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Resultatdisposition', ml, y);
  y += 4;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Styrelsen föreslår att fritt eget kapital, ${fmt(balanserat + netResult)} kronor, disponeras enligt följande:`, ml, y, { maxWidth: maxW });
  y += 10;

  const dispLines = [
    ['Balanserat resultat', fmt(balanserat)],
    ['Årets resultat', fmt(netResult)],
    ['Totalt', fmt(balanserat + netResult)],
    ['', ''],
    ['Disponeras för', ''],
    ['Balanseras i ny räkning', fmt(balanserat + netResult)],
    ['Summa', fmt(balanserat + netResult)],
  ];

  autoTable(doc, {
    startY: y,
    body: dispLines.map(([label, val]) => [
      {
        content: label,
        styles: {
          fontStyle: (label === 'Totalt' || label === 'Summa') ? 'bold' as const : 'normal' as const,
          fontSize: 8,
          textColor: BLACK,
        },
      },
      {
        content: val,
        styles: {
          halign: 'right' as const,
          fontStyle: (label === 'Totalt' || label === 'Summa') ? 'bold' as const : 'normal' as const,
          fontSize: 8,
          textColor: BLACK,
        },
      },
    ]),
    theme: 'plain',
    styles: { cellPadding: { top: 1, bottom: 1, left: 2, right: 2 } },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { halign: 'right', cellWidth: 30 },
    },
    margin: { left: ml + 20, right: 80 },
  });
}

// ── Resultaträkning ──
function drawResultatrakning(doc: jsPDF, opts: AnnualReportPdfOptions) {
  let y = 30;
  const ml = 20;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text('Resultaträkning', ml, y);
  doc.setLineWidth(0.5);
  doc.line(ml, y + 2, ml + 50, y + 2);
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Belopp i kr', ml, y);

  const startDate = `${opts.year}-01-01-`;
  const endDate = `${opts.year}-12-31`;
  const prevStart = `${opts.year - 1}-01-01-`;
  const prevEnd = `${opts.year - 1}-12-31`;

  // Build table rows
  type RowStyle = 'normal' | 'header' | 'subtotal' | 'total' | 'net';

  const rows: { cells: string[]; style: RowStyle }[] = [];

  // RR structure matching the example
  const rrStructure: { label: string; style: RowStyle; value?: number }[] = [
    { label: 'Rörelseintäkter, lagerförändring m.m.', style: 'header' },
  ];

  // Map isLines to structured output
  for (const line of opts.isLines) {
    if (line.isHeader) {
      rows.push({ cells: [line.label, '', '', ''], style: 'header' });
    } else if (line.isNet) {
      rows.push({ cells: [line.label, '', fmt(line.adjustedValue), ''], style: 'net' });
    } else if (line.isTotal) {
      rows.push({ cells: [line.label, '', fmt(line.adjustedValue), ''], style: 'subtotal' });
    } else {
      rows.push({ cells: [line.label, '', fmt(line.adjustedValue), ''], style: 'normal' });
    }
  }

  const head = [
    ['', 'Not', `${opts.year}-01-01-\n${opts.year}-12-31`, `${opts.year - 1}-01-01-\n${opts.year - 1}-12-31`].map((v, i) => ({
      content: v,
      styles: {
        halign: i === 0 ? 'left' as const : i === 1 ? 'center' as const : 'right' as const,
        fontStyle: 'italic' as const,
        fontSize: 8,
        textColor: BLACK,
        fillColor: WHITE,
        lineColor: BLACK,
        lineWidth: i >= 2 ? { bottom: 0.3 } : 0,
      },
    })),
  ];

  autoTable(doc, {
    startY: y + 4,
    head,
    body: rows.map(row => row.cells.map((val, i) => ({
      content: val,
      styles: {
        fontStyle: (row.style === 'header' || row.style === 'subtotal' || row.style === 'net')
          ? (row.style === 'header' ? 'bolditalic' as const : 'bold' as const)
          : 'normal' as const,
        fontSize: row.style === 'net' ? 9 : 8,
        halign: i >= 2 ? 'right' as const : 'left' as const,
        textColor: BLACK,
        cellPadding: {
          top: (row.style === 'subtotal' || row.style === 'net') ? 2 : 1,
          bottom: 1,
          left: (i === 0 && row.style === 'normal') ? 6 : 2,
          right: 2,
        },
        lineColor: BLACK,
        lineWidth: row.style === 'net' ? { top: 0.3, bottom: 0.5 } :
                   row.style === 'subtotal' ? { top: 0.2 } : 0,
      },
    }))),
    theme: 'plain',
    styles: { fontSize: 8, textColor: BLACK, cellPadding: { top: 1, bottom: 1, left: 2, right: 2 } },
    columnStyles: {
      0: { cellWidth: 80, halign: 'left' },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
    margin: { left: ml, right: 20 },
  });
}

// ── Balansräkning ──
function drawBalansrakning(doc: jsPDF, opts: AnnualReportPdfOptions) {
  let y = 30;
  const ml = 20;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text('Balansräkning', ml, y);
  doc.setLineWidth(0.5);
  doc.line(ml, y + 2, ml + 48, y + 2);
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Belopp i kr', ml, y);

  const head = [
    ['', 'Not', `${opts.year}-12-31`, `${opts.year - 1}-12-31`].map((v, i) => ({
      content: v,
      styles: {
        halign: i === 0 ? 'left' as const : i === 1 ? 'center' as const : 'right' as const,
        fontStyle: 'italic' as const,
        fontSize: 8,
        textColor: BLACK,
        fillColor: WHITE,
        lineColor: BLACK,
        lineWidth: i >= 2 ? { bottom: 0.3 } : 0,
      },
    })),
  ];

  // Build rows from bsLines
  const rows: { cells: string[]; style: 'normal' | 'header' | 'subtotal' | 'net' }[] = [];
  for (const line of opts.bsLines) {
    if (line.isHeader) {
      rows.push({ cells: [line.label, '', '', ''], style: 'header' });
    } else if (line.isNet) {
      rows.push({ cells: [line.label, '', fmt(line.adjustedValue), ''], style: 'net' });
    } else if (line.isTotal) {
      rows.push({ cells: [line.label, '', fmt(line.adjustedValue), ''], style: 'subtotal' });
    } else {
      rows.push({ cells: [line.label, '', fmt(line.adjustedValue), ''], style: 'normal' });
    }
  }

  autoTable(doc, {
    startY: y + 4,
    head,
    body: rows.map(row => row.cells.map((val, i) => ({
      content: val,
      styles: {
        fontStyle: (row.style === 'header' || row.style === 'subtotal' || row.style === 'net')
          ? (row.style === 'header' ? 'bold' as const : 'bold' as const)
          : 'normal' as const,
        fontSize: row.style === 'net' ? 9 : 8,
        halign: i >= 2 ? 'right' as const : 'left' as const,
        textColor: BLACK,
        cellPadding: {
          top: (row.style === 'header') ? 3 : (row.style === 'subtotal' || row.style === 'net') ? 2 : 1,
          bottom: 1,
          left: (i === 0 && row.style === 'normal') ? 6 : 2,
          right: 2,
        },
        lineColor: BLACK,
        lineWidth: row.style === 'net' ? { top: 0.3, bottom: 0.5 } :
                   row.style === 'subtotal' ? { top: 0.2 } : 0,
      },
    }))),
    theme: 'plain',
    styles: { fontSize: 8, textColor: BLACK, cellPadding: { top: 1, bottom: 1, left: 2, right: 2 } },
    columnStyles: {
      0: { cellWidth: 80, halign: 'left' },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
    margin: { left: ml, right: 20 },
  });
}

// ── Noter ──
function drawNoter(doc: jsPDF, opts: AnnualReportPdfOptions) {
  let y = 30;
  const ml = 20;
  const maxW = doc.internal.pageSize.getWidth() - 40;
  const pageH = doc.internal.pageSize.getHeight();

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text('Noter', ml, y);
  y += 8;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Belopp i kr om inget annat anges.', ml, y);
  y += 10;

  for (const note of opts.notes) {
    if (!note.content && !note.title) continue;

    // Check if we need a new page
    if (y > pageH - 40) {
      doc.addPage();
      y = 30;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Not ${note.id}  ${note.title}`, ml, y);
    y += 6;

    if (note.content) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(note.content, maxW);
      doc.text(lines, ml, y);
      y += lines.length * 4 + 8;
    }
  }
}

// ── Main export function ──
export function exportAnnualReportPDF(opts: AnnualReportPdfOptions) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Page 1: Cover
  drawCoverPage(doc, opts);

  // Page 2: Förvaltningsberättelse
  doc.addPage();
  drawForvaltning(doc, opts);

  // Page 3: Resultaträkning
  doc.addPage();
  drawResultatrakning(doc, opts);

  // Page 4: Balansräkning
  doc.addPage();
  drawBalansrakning(doc, opts);

  // Page 5+: Noter
  doc.addPage();
  drawNoter(doc, opts);

  // Add page headers to all pages except cover (page 1)
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageHeader(doc, opts.companyName, opts.orgNumber, i - 1, totalPages - 1);
  }

  doc.save(`${opts.companyName.replace(/\s+/g, '_')}_Årsredovisning_${opts.year}.pdf`);
}
