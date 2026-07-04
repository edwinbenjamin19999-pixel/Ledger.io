import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportItem {
  account: string;
  amount: number;
  previousAmount?: number;
}

interface ConsolidatedPDFData {
  groupName: string;
  currency: string;
  year: number;
  companyCount: number;
  incomeStatement: ReportItem[];
  balanceSheet: {
    assets: ReportItem[];
    liabilities: ReportItem[];
  };
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  previousYear?: {
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    totalAssets: number;
    totalLiabilities: number;
  };
}

const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('sv-SE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
};

const addHeader = (doc: jsPDF, title: string, data: ConsolidatedPDFData) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Brand bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Accent line
  doc.setFillColor(59, 130, 246); // blue-500
  doc.rect(0, 8, pageWidth, 2, 'F');

  // Title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, 25);

  // Group info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // slate-500
  doc.text(`Koncern: ${data.groupName}`, 14, 33);
  doc.text(`Räkenskapsår: ${data.year}`, 14, 40);
  doc.text(`Antal bolag: ${data.companyCount}`, 14, 47);

  // Stamp
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Genererad: ${new Date().toLocaleDateString('sv-SE')} ${new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - 14, 33, { align: 'right' });
  doc.text(`Valuta: ${data.currency}`, pageWidth - 14, 40, { align: 'right' });

  return 55;
};

const addFooter = (doc: jsPDF) => {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Bottom bar
    doc.setFillColor(241, 245, 249);
    doc.rect(0, pageHeight - 14, pageWidth, 14, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Cogniq – Koncernkonsolidering`, 14, pageHeight - 5);
    doc.text(`Sida ${i} av ${pageCount}`, pageWidth - 14, pageHeight - 5, { align: 'right' });
  }
};

const hasPrevYear = (data: ConsolidatedPDFData) => !!data.previousYear;

export const exportConsolidatedIncomeStatementPDF = (data: ConsolidatedPDFData) => {
  const doc = new jsPDF();
  const startY = addHeader(doc, 'KONCERNRESULTATRÄKNING', data);
  const withPrev = hasPrevYear(data);

  const incomeItems = data.incomeStatement.filter(i => i.amount > 0);
  const expenseItems = data.incomeStatement.filter(i => i.amount <= 0);

  const head = withPrev
    ? [['Konto', `${data.year} (${data.currency})`, `${data.year - 1} (${data.currency})`, 'Förändr.']]
    : [['Konto', `Belopp (${data.currency})`]];

  const buildRow = (label: string, amount: number, prev?: number, bold = false) => {
    const style = bold ? { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } : {};
    if (withPrev) {
      const change = prev != null ? amount - prev : 0;
      const changeStr = prev != null ? (change >= 0 ? '+' : '') + formatAmount(change) : '–';
      return [
        { content: label, styles: style },
        { content: formatAmount(amount), styles: { ...style, halign: 'right' as const } },
        { content: prev != null ? formatAmount(prev) : '–', styles: { ...style, halign: 'right' as const } },
        { content: changeStr, styles: { ...style, halign: 'right' as const } },
      ];
    }
    return [
      { content: label, styles: style },
      { content: formatAmount(amount), styles: { ...style, halign: 'right' as const } },
    ];
  };

  const body: any[][] = [
    buildRow('RÖRELSEINTÄKTER', 0, undefined, false), // section header will be styled
    ...incomeItems.map(i => buildRow(i.account, i.amount, i.previousAmount)),
    buildRow('Summa intäkter', data.totalIncome, data.previousYear?.totalIncome, true),
    ...(withPrev ? [buildRow('', 0)] : [buildRow('', 0)]),
    ...expenseItems.map(i => buildRow(i.account, i.amount, i.previousAmount)),
    buildRow('Summa kostnader', -data.totalExpenses, data.previousYear ? -data.previousYear.totalExpenses : undefined, true),
    buildRow('', 0),
    buildRow('ÅRETS RESULTAT', data.netIncome, data.previousYear?.netIncome, true),
  ];

  // Remove the empty section header row
  body[0] = withPrev
    ? [{ content: 'RÖRELSEINTÄKTER', styles: { fontStyle: 'bold', textColor: [59, 130, 246] } }, '', '', '']
    : [{ content: 'RÖRELSEINTÄKTER', styles: { fontStyle: 'bold', textColor: [59, 130, 246] } }, ''];

  autoTable(doc, {
    startY,
    head,
    body,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.2 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    columnStyles: withPrev
      ? { 0: { cellWidth: 80 }, 1: { halign: 'right', cellWidth: 35 }, 2: { halign: 'right', cellWidth: 35 }, 3: { halign: 'right', cellWidth: 30 } }
      : { 0: { cellWidth: 120 }, 1: { halign: 'right', cellWidth: 60 } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  addFooter(doc);
  doc.save(`Koncern_RR_${data.groupName}_${data.year}.pdf`);
};

export const exportConsolidatedBalanceSheetPDF = (data: ConsolidatedPDFData) => {
  const doc = new jsPDF();
  const withPrev = hasPrevYear(data);
  let startY = addHeader(doc, 'KONCERNBALANSRÄKNING', data);

  const head = withPrev
    ? [['Konto', `${data.year} (${data.currency})`, `${data.year - 1} (${data.currency})`, 'Förändr.']]
    : [['Konto', `Belopp (${data.currency})`]];

  const buildRow = (label: string, amount: number, prev?: number, bold = false) => {
    const style = bold ? { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } : {};
    if (withPrev) {
      const change = prev != null ? amount - prev : 0;
      const changeStr = prev != null ? (change >= 0 ? '+' : '') + formatAmount(change) : '–';
      return [
        { content: label, styles: style },
        { content: formatAmount(amount), styles: { ...style, halign: 'right' as const } },
        { content: prev != null ? formatAmount(prev) : '–', styles: { ...style, halign: 'right' as const } },
        { content: changeStr, styles: { ...style, halign: 'right' as const } },
      ];
    }
    return [
      { content: label, styles: style },
      { content: formatAmount(amount), styles: { ...style, halign: 'right' as const } },
    ];
  };

  // Assets section
  const sectionHeader = (text: string) => withPrev
    ? [{ content: text, styles: { fontStyle: 'bold', textColor: [59, 130, 246] } }, '', '', '']
    : [{ content: text, styles: { fontStyle: 'bold', textColor: [59, 130, 246] } }, ''];

  const assetBody: any[][] = [
    sectionHeader('TILLGÅNGAR'),
    ...data.balanceSheet.assets.map(i => buildRow(i.account, i.amount, i.previousAmount)),
    buildRow('SUMMA TILLGÅNGAR', data.totalAssets, data.previousYear?.totalAssets, true),
  ];

  autoTable(doc, {
    startY,
    head,
    body: assetBody,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.2 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    columnStyles: withPrev
      ? { 0: { cellWidth: 80 }, 1: { halign: 'right', cellWidth: 35 }, 2: { halign: 'right', cellWidth: 35 }, 3: { halign: 'right', cellWidth: 30 } }
      : { 0: { cellWidth: 120 }, 1: { halign: 'right', cellWidth: 60 } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // @ts-ignore
  const afterAssets = doc.lastAutoTable.finalY + 10;

  // Liabilities section
  const liabBody: any[][] = [
    sectionHeader('EGET KAPITAL OCH SKULDER'),
    ...data.balanceSheet.liabilities.map(i => buildRow(i.account, i.amount, i.previousAmount)),
    buildRow('SUMMA EGET KAPITAL OCH SKULDER', data.totalLiabilities, data.previousYear?.totalLiabilities, true),
  ];

  autoTable(doc, {
    startY: afterAssets,
    head,
    body: liabBody,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.2 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    columnStyles: withPrev
      ? { 0: { cellWidth: 80 }, 1: { halign: 'right', cellWidth: 35 }, 2: { halign: 'right', cellWidth: 35 }, 3: { halign: 'right', cellWidth: 30 } }
      : { 0: { cellWidth: 120 }, 1: { halign: 'right', cellWidth: 60 } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  addFooter(doc);
  doc.save(`Koncern_BR_${data.groupName}_${data.year}.pdf`);
};

export const exportConsolidatedFullPDF = (data: ConsolidatedPDFData) => {
  const doc = new jsPDF();
  const withPrev = hasPrevYear(data);

  // ===== PAGE 1: Cover =====
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Accent
  doc.setFillColor(59, 130, 246);
  doc.rect(14, 80, 60, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('Koncernbokslut', 14, 105);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  doc.text(data.groupName, 14, 120);

  doc.setFontSize(14);
  doc.text(`Räkenskapsår ${data.year}`, 14, 135);

  doc.setFontSize(11);
  doc.setTextColor(148, 163, 184);
  doc.text(`Antal koncernbolag: ${data.companyCount}`, 14, 155);
  doc.text(`Valuta: ${data.currency}`, 14, 165);
  doc.text(`Genererad: ${new Date().toLocaleDateString('sv-SE')}`, 14, 175);

  // KPI summary
  const kpiY = 210;
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(14, kpiY, pageWidth - 28, 50, 3, 3, 'F');

  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  const col1 = 30;
  const col2 = 80;
  const col3 = 130;

  doc.text('Totala intäkter', col1, kpiY + 15);
  doc.text('Totala kostnader', col2, kpiY + 15);
  doc.text('Koncernresultat', col3, kpiY + 15);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(formatAmount(data.totalIncome), col1, kpiY + 30);
  doc.text(formatAmount(data.totalExpenses), col2, kpiY + 30);

  if (data.netIncome >= 0) {
    doc.setTextColor(74, 222, 128); // green
  } else {
    doc.setTextColor(248, 113, 113); // red
  }
  doc.text(formatAmount(data.netIncome), col3, kpiY + 30);

  // ===== PAGE 2: RR =====
  doc.addPage();
  let startY = addHeader(doc, 'KONCERNRESULTATRÄKNING', data);

  const head = withPrev
    ? [['Konto', `${data.year}`, `${data.year - 1}`, 'Förändring']]
    : [['Konto', `Belopp (${data.currency})`]];

  const buildRow = (label: string, amount: number, prev?: number, bold = false) => {
    const style = bold ? { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } : {};
    if (withPrev) {
      const change = prev != null ? amount - prev : 0;
      const changeStr = prev != null ? (change >= 0 ? '+' : '') + formatAmount(change) : '–';
      return [
        { content: label, styles: style },
        { content: formatAmount(amount), styles: { ...style, halign: 'right' as const } },
        { content: prev != null ? formatAmount(prev) : '–', styles: { ...style, halign: 'right' as const } },
        { content: changeStr, styles: { ...style, halign: 'right' as const } },
      ];
    }
    return [
      { content: label, styles: style },
      { content: formatAmount(amount), styles: { ...style, halign: 'right' as const } },
    ];
  };

  const incomeItems = data.incomeStatement.filter(i => i.amount > 0);
  const expenseItems = data.incomeStatement.filter(i => i.amount <= 0);

  const rrBody: any[][] = [
    ...incomeItems.map(i => buildRow(i.account, i.amount, i.previousAmount)),
    buildRow('Summa intäkter', data.totalIncome, data.previousYear?.totalIncome, true),
    buildRow('', 0),
    ...expenseItems.map(i => buildRow(i.account, i.amount, i.previousAmount)),
    buildRow('Summa kostnader', -data.totalExpenses, data.previousYear ? -data.previousYear.totalExpenses : undefined, true),
    buildRow('', 0),
    buildRow('ÅRETS RESULTAT', data.netIncome, data.previousYear?.netIncome, true),
  ];

  autoTable(doc, {
    startY,
    head,
    body: rrBody,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.2 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    columnStyles: withPrev
      ? { 0: { cellWidth: 80 }, 1: { halign: 'right', cellWidth: 35 }, 2: { halign: 'right', cellWidth: 35 }, 3: { halign: 'right', cellWidth: 30 } }
      : { 0: { cellWidth: 120 }, 1: { halign: 'right', cellWidth: 60 } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // ===== PAGE 3: BR =====
  doc.addPage();
  startY = addHeader(doc, 'KONCERNBALANSRÄKNING', data);

  const assetBody: any[][] = [
    ...data.balanceSheet.assets.map(i => buildRow(i.account, i.amount, i.previousAmount)),
    buildRow('SUMMA TILLGÅNGAR', data.totalAssets, data.previousYear?.totalAssets, true),
  ];

  autoTable(doc, {
    startY,
    head: withPrev
      ? [['Tillgångar', `${data.year}`, `${data.year - 1}`, 'Förändring']]
      : [['Tillgångar', `Belopp (${data.currency})`]],
    body: assetBody,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.2 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    columnStyles: withPrev
      ? { 0: { cellWidth: 80 }, 1: { halign: 'right', cellWidth: 35 }, 2: { halign: 'right', cellWidth: 35 }, 3: { halign: 'right', cellWidth: 30 } }
      : { 0: { cellWidth: 120 }, 1: { halign: 'right', cellWidth: 60 } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // @ts-ignore
  const afterAssets = doc.lastAutoTable.finalY + 10;

  const liabBody: any[][] = [
    ...data.balanceSheet.liabilities.map(i => buildRow(i.account, i.amount, i.previousAmount)),
    buildRow('SUMMA EGET KAPITAL OCH SKULDER', data.totalLiabilities, data.previousYear?.totalLiabilities, true),
  ];

  autoTable(doc, {
    startY: afterAssets,
    head: withPrev
      ? [['Eget kapital och skulder', `${data.year}`, `${data.year - 1}`, 'Förändring']]
      : [['Eget kapital och skulder', `Belopp (${data.currency})`]],
    body: liabBody,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.2 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    columnStyles: withPrev
      ? { 0: { cellWidth: 80 }, 1: { halign: 'right', cellWidth: 35 }, 2: { halign: 'right', cellWidth: 35 }, 3: { halign: 'right', cellWidth: 30 } }
      : { 0: { cellWidth: 120 }, 1: { halign: 'right', cellWidth: 60 } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  addFooter(doc);
  doc.save(`Koncernbokslut_${data.groupName}_${data.year}.pdf`);
};
