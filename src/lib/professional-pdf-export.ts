import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { ReportAccountRow, ReportSection } from '@/components/reports/ProfessionalReportTable';

// ── Colors ──
const BLACK: [number, number, number] = [0, 0, 0];
const WHITE: [number, number, number] = [255, 255, 255];
const MUTED: [number, number, number] = [100, 100, 100];
const LINE_COLOR: [number, number, number] = [0, 0, 0];

// ── Number formatting (sv-SE) ──
const fmt = (n: number): string =>
  new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtPct = (n: number): string => {
  if (n === 0) return '';
  const s = (n * 100).toFixed(2).replace('.', ',');
  return s + ' %';
};

// ── Types ──
export type ComparisonType = 'none' | 'prev_year' | 'budget';

export interface PdfExportOptions {
  companyName: string;
  fromDate: Date;
  toDate: Date;
  fiscalYearStart: Date;
  logoUrl?: string | null;
  comparison: ComparisonType;
  showZeroAccounts: boolean;
}

type RowType = 'section' | 'account' | 'subtotal';

interface TableRowMeta {
  type: RowType;
  data: string[];
}

// ── Page title (top of page 1, repeated on subsequent pages) ──
function drawPageTitle(doc: jsPDF, reportTitle: string, fromDate: Date, toDate: Date) {
  const ml = 16;
  // Title with decorative prefix
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text(`\u2695 ${reportTitle}`, ml, 14);

  // Period subtitle
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(`${format(fromDate, 'yyyy-MM-dd')} - ${format(toDate, 'yyyy-MM-dd')}`, ml + 2, 20);
}

// ── Page footer ──
function drawAllFooters(doc: jsPDF, companyName: string) {
  const pageCount = doc.getNumberOfPages();
  const dateStr = format(new Date(), 'yyyy-MM-dd HH:mm');
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const ml = 16;
    const mr = 16;
    const fy = h - 8;

    // Line above footer
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.3);
    doc.line(ml, fy - 3, w - mr, fy - 3);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BLACK);
    doc.text(companyName, ml, fy);
    doc.text(dateStr, w / 2, fy, { align: 'center' });
    doc.text(`sida ${i} av ${pageCount}`, w - mr, fy, { align: 'right' });
  }
}

// ── Collect all accounts from a section tree ──
function collectAllAccounts(sections: ReportSection[]): ReportAccountRow[] {
  const result: ReportAccountRow[] = [];
  for (const s of sections) {
    if (s.accounts) result.push(...s.accounts);
    if (s.children) result.push(...collectAllAccounts(s.children));
  }
  return result;
}

// ══════════════════════════════════════════
// BALANSRÄKNING (BR) PDF
// ══════════════════════════════════════════

function flattenBR(
  sections: ReportSection[],
  showZeros: boolean,
): TableRowMeta[] {
  const rows: TableRowMeta[] = [];
  for (const section of sections) {
    rows.push({ type: 'section', data: [section.title] });

    if (section.children?.length) {
      rows.push(...flattenBR(section.children, showZeros));
    }

    const accounts = section.accounts || [];
    for (const acc of accounts) {
      if (!showZeros && Math.abs(acc.ingBalans) < 0.005 && Math.abs(acc.perioden) < 0.005 && Math.abs(acc.utgBalans) < 0.005) continue;
      rows.push({
        type: 'account',
        data: [acc.accountNumber, acc.accountName, fmt(acc.ingBalans), fmt(0), fmt(acc.perioden), fmt(acc.utgBalans)],
      });
    }

    if (section.subtotalLabel) {
      const allAccs = [...(section.accounts || []), ...collectAllAccounts(section.children || [])];
      if (allAccs.length > 0) {
        const sumIB = allAccs.reduce((s, a) => s + a.ingBalans, 0);
        const sumP = allAccs.reduce((s, a) => s + a.perioden, 0);
        const sumUB = allAccs.reduce((s, a) => s + a.utgBalans, 0);
        rows.push({
          type: 'subtotal',
          data: ['', section.subtotalLabel, fmt(sumIB), fmt(0), fmt(sumP), fmt(sumUB)],
        });
      }
    }
  }
  return rows;
}

export function exportProfessionalBalanceSheetPDF(
  opts: PdfExportOptions,
  assetSections: ReportSection[],
  equitySections: ReportSection[],
  assetTotals: { ingBalans: number; perioden: number; utgBalans: number },
  liabTotals: { ingBalans: number; perioden: number; utgBalans: number },
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawPageTitle(doc, 'Balansräkning', opts.fromDate, opts.toDate);

  const periodLabel = `${format(opts.fromDate, 'MMdd')} - ${format(opts.toDate, 'MMdd')}`;
  const fromStr = format(opts.fromDate, 'yyyy-MM-dd');
  const toStr = format(opts.toDate, 'yyyy-MM-dd');

  // Two-row header
  const head = [
    [
      { content: '', styles: { halign: 'left' as const } },
      { content: '', styles: { halign: 'left' as const } },
      { content: 'Ing. balans', styles: { halign: 'right' as const } },
      { content: 'Ing. saldo', styles: { halign: 'right' as const } },
      { content: 'Perioden', styles: { halign: 'right' as const } },
      { content: 'Utg. balans', styles: { halign: 'right' as const } },
    ],
    [
      { content: 'Konto', styles: { halign: 'left' as const } },
      { content: 'Benämning', styles: { halign: 'left' as const } },
      { content: fromStr, styles: { halign: 'right' as const } },
      { content: fromStr, styles: { halign: 'right' as const } },
      { content: periodLabel, styles: { halign: 'right' as const } },
      { content: toStr, styles: { halign: 'right' as const } },
    ],
  ];

  // Flatten all sections together
  const allSections: ReportSection[] = [
    { level: 1, title: 'TILLGÅNGAR', accounts: [], children: assetSections },
    { level: 1, title: 'EGET KAPITAL, AVSÄTT. O SKULD', accounts: [], children: equitySections },
  ];
  const flat = flattenBR(allSections, opts.showZeroAccounts);

  // Add BERÄKNAT RESULTAT at end
  flat.push({ type: 'subtotal', data: ['', 'BERÄKNAT RESULTAT', fmt(0), fmt(0), fmt(0), fmt(0)] });

  const colStyles: Record<number, any> = {
    0: { cellWidth: 12, halign: 'left' },
    1: { cellWidth: 58, halign: 'left' },
    2: { cellWidth: 26, halign: 'right' },
    3: { cellWidth: 22, halign: 'right' },
    4: { cellWidth: 26, halign: 'right' },
    5: { cellWidth: 28, halign: 'right' },
  };

  autoTable(doc, {
    startY: 26,
    head,
    body: flat.map(row => buildBRRow(row)),
    theme: 'plain',
    styles: {
      fontSize: 8,
      textColor: BLACK,
      cellPadding: { top: 1.2, bottom: 1.2, left: 2, right: 2 },
      lineWidth: 0,
      font: 'helvetica',
      overflow: 'ellipsize',
    },
    headStyles: {
      fillColor: WHITE,
      textColor: BLACK,
      fontSize: 8,
      fontStyle: 'normal',
      lineWidth: 0,
    },
    columnStyles: colStyles,
    margin: { top: 26, bottom: 16, left: 16, right: 16 },
    didParseCell: (data: any) => {
      // Line under the last head row
      if (data.section === 'head' && data.row.index === 1) {
        data.cell.styles.lineColor = BLACK;
        data.cell.styles.lineWidth = { bottom: 0.3 };
      }
    },
    didDrawPage: (data: any) => {
      if (data.pageNumber > 1) {
        drawPageTitle(doc, 'Balansräkning', opts.fromDate, opts.toDate);
      }
    },
  });

  drawAllFooters(doc, opts.companyName);
  const period = format(opts.toDate, 'yyyy-MM');
  doc.save(`Cogniq_BR_${opts.companyName.replace(/\s+/g, '_')}_${period}.pdf`);
}

function buildBRRow(row: TableRowMeta): any[] {
  if (row.type === 'section') {
    return [
      { content: '', styles: {} },
      { content: row.data[0], styles: { fontStyle: 'bold', fontSize: 8.5 } },
      '', '', '', '',
    ];
  }
  if (row.type === 'subtotal') {
    return row.data.map((val, i) => ({
      content: val,
      styles: {
        fontStyle: 'bold',
        halign: i >= 2 ? 'right' : 'left',
      },
    }));
  }
  // account
  return row.data.map((val, i) => ({
    content: val,
    styles: {
      halign: i >= 2 ? 'right' : 'left',
      cellPadding: { top: 1.2, bottom: 1.2, left: i === 1 ? 6 : 2, right: 2 },
    },
  }));
}

// ══════════════════════════════════════════
// RESULTATRÄKNING (RR) PDF
// ══════════════════════════════════════════

function flattenRR(
  sections: ReportSection[],
  showZeros: boolean,
): TableRowMeta[] {
  const rows: TableRowMeta[] = [];
  for (const section of sections) {
    rows.push({ type: 'section', data: [section.title] });

    if (section.children?.length) {
      rows.push(...flattenRR(section.children, showZeros));
    }

    const accounts = section.accounts || [];
    for (const acc of accounts) {
      if (!showZeros && Math.abs(acc.perioden) < 0.005 && Math.abs(acc.utgBalans) < 0.005) continue;
      rows.push({
        type: 'account',
        // Cols: Perioden, Utg saldo, Budget, Avvikelse kr, %, Föreg år, %
        data: [
          acc.accountNumber,
          acc.accountName,
          fmt(acc.perioden),
          fmt(acc.utgBalans),
          fmt(0), // budget
          fmt(acc.perioden), // avvikelse (perioden - 0)
          '', // %
          fmt(0), // föreg. år
          '', // %
        ],
      });
    }

    if (section.subtotalLabel) {
      const allAccs = [...(section.accounts || []), ...collectAllAccounts(section.children || [])];
      if (allAccs.length > 0) {
        const sumP = allAccs.reduce((s, a) => s + a.perioden, 0);
        const sumUB = allAccs.reduce((s, a) => s + a.utgBalans, 0);
        rows.push({
          type: 'subtotal',
          data: ['', section.subtotalLabel, fmt(sumP), fmt(sumUB), fmt(0), fmt(sumP), '', fmt(0), ''],
        });
      }
    }
  }
  return rows;
}

export function exportProfessionalIncomeStatementPDF(
  opts: PdfExportOptions,
  sections: ReportSection[],
  totals: { ingBalans: number; perioden: number; utgBalans: number },
  revenueTotal: number,
  ebitRows: { perioden: number },
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawPageTitle(doc, 'Resultaträkning', opts.fromDate, opts.toDate);

  // Two-row header matching example
  const head = [
    [
      { content: '', styles: { halign: 'left' as const } },
      { content: '', styles: { halign: 'left' as const } },
      { content: '', styles: { halign: 'right' as const } },
      { content: '', styles: { halign: 'right' as const } },
      { content: 'Budget/prognos 1 -', styles: { halign: 'right' as const } },
      { content: '', styles: { halign: 'right' as const } },
      { content: '', styles: { halign: 'right' as const } },
      { content: 'Föregående år - t.o.m.', styles: { halign: 'right' as const } },
      { content: '', styles: { halign: 'right' as const } },
    ],
    [
      { content: 'Konto', styles: { halign: 'left' as const } },
      { content: 'Benämning', styles: { halign: 'left' as const } },
      { content: 'Perioden', styles: { halign: 'right' as const } },
      { content: 'Utg saldo', styles: { halign: 'right' as const } },
      { content: 't.o.m. perioden', styles: { halign: 'right' as const } },
      { content: 'Avvikelse kr', styles: { halign: 'right' as const } },
      { content: '%', styles: { halign: 'right' as const } },
      { content: 'perioden', styles: { halign: 'right' as const } },
      { content: '%', styles: { halign: 'right' as const } },
    ],
  ];

  const flat = flattenRR(sections, opts.showZeroAccounts);

  // ÅRETS RESULTAT at the end
  flat.push({
    type: 'subtotal',
    data: ['', 'ÅRETS RESULTAT', fmt(totals.perioden), fmt(totals.utgBalans), fmt(0), fmt(totals.perioden), '', fmt(0), ''],
  });

  // Column widths för portrait A4 (210 - 16 - 16 = 178mm usable)
  const colStyles: Record<number, any> = {
    0: { cellWidth: 11, halign: 'left' },
    1: { cellWidth: 47, halign: 'left' },
    2: { cellWidth: 20, halign: 'right' },
    3: { cellWidth: 20, halign: 'right' },
    4: { cellWidth: 20, halign: 'right' },
    5: { cellWidth: 20, halign: 'right' },
    6: { cellWidth: 10, halign: 'right' },
    7: { cellWidth: 20, halign: 'right' },
    8: { cellWidth: 10, halign: 'right' },
  };

  autoTable(doc, {
    startY: 26,
    head,
    body: flat.map(row => buildRRRow(row)),
    theme: 'plain',
    styles: {
      fontSize: 8,
      textColor: BLACK,
      cellPadding: { top: 1.2, bottom: 1.2, left: 2, right: 2 },
      lineWidth: 0,
      font: 'helvetica',
      overflow: 'ellipsize',
    },
    headStyles: {
      fillColor: WHITE,
      textColor: BLACK,
      fontSize: 8,
      fontStyle: 'normal',
      lineWidth: 0,
    },
    columnStyles: colStyles,
    margin: { top: 26, bottom: 16, left: 16, right: 16 },
    didParseCell: (data: any) => {
      if (data.section === 'head' && data.row.index === 1) {
        data.cell.styles.lineColor = BLACK;
        data.cell.styles.lineWidth = { bottom: 0.3 };
      }
    },
    didDrawPage: (data: any) => {
      if (data.pageNumber > 1) {
        drawPageTitle(doc, 'Resultaträkning', opts.fromDate, opts.toDate);
      }
    },
  });

  drawAllFooters(doc, opts.companyName);
  const period = format(opts.toDate, 'yyyy-MM');
  doc.save(`Cogniq_RR_${opts.companyName.replace(/\s+/g, '_')}_${period}.pdf`);
}

function buildRRRow(row: TableRowMeta): any[] {
  if (row.type === 'section') {
    return [
      { content: '', styles: {} },
      { content: row.data[0], styles: { fontStyle: 'bold', fontSize: 8.5 } },
      '', '', '', '', '', '', '',
    ];
  }
  if (row.type === 'subtotal') {
    return row.data.map((val, i) => ({
      content: val,
      styles: {
        fontStyle: 'bold',
        halign: i >= 2 ? 'right' : 'left',
      },
    }));
  }
  // account
  return row.data.map((val, i) => ({
    content: val,
    styles: {
      halign: i >= 2 ? 'right' : 'left',
      cellPadding: { top: 1.2, bottom: 1.2, left: i === 1 ? 6 : 2, right: 2 },
    },
  }));
}
