import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
  account: string;
  amount: number;
}

interface BalanceSheetData {
  assets: ReportData[];
  liabilities: ReportData[];
}

const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('sv-SE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const exportIncomeStatementPDF = (
  companyName: string,
  fromDate: Date,
  toDate: Date,
  data: ReportData[],
  totalIncome: number,
  totalExpenses: number,
  netIncome: number
) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('RESULTATRÄKNING', 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(companyName, 105, 30, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Period: ${fromDate.toLocaleDateString('sv-SE')} - ${toDate.toLocaleDateString('sv-SE')}`, 105, 38, { align: 'center' });
  
  // Income section
  const incomeData = data.filter(d => d.amount > 0);
  const expenseData = data.filter(d => d.amount < 0);
  
  autoTable(doc, {
    startY: 48,
    head: [['Konto', 'Belopp (SEK)']],
    body: [
      ...incomeData.map(item => [
        item.account, 
        formatAmount(item.amount)
      ]),
      [{ content: 'Summa intäkter', styles: { fontStyle: 'bold' } }, 
       { content: formatAmount(totalIncome), styles: { fontStyle: 'bold' } }],
      ['', ''],
      ...expenseData.map(item => [
        item.account, 
        `-${formatAmount(Math.abs(item.amount))}`
      ]),
      [{ content: 'Summa kostnader', styles: { fontStyle: 'bold' } }, 
       { content: `-${formatAmount(totalExpenses)}`, styles: { fontStyle: 'bold' } }],
      ['', ''],
      [{ content: 'NETTORESULTAT', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, 
       { content: formatAmount(netIncome), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]
    ],
    theme: 'striped',
    styles: { 
      fontSize: 10,
      cellPadding: 4
    },
    headStyles: { 
      fillColor: [66, 66, 66],
      fontSize: 11,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { halign: 'right', cellWidth: 60 }
    }
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Sida ${i} av ${pageCount} • Genererad ${new Date().toLocaleDateString('sv-SE')}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`Resultaträkning_${companyName}_${fromDate.toLocaleDateString('sv-SE').replace(/\//g, '-')}.pdf`);
};

export const exportBalanceSheetPDF = (
  companyName: string,
  asOfDate: Date,
  data: BalanceSheetData
) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('BALANSRÄKNING', 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(companyName, 105, 30, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Per: ${asOfDate.toLocaleDateString('sv-SE')}`, 105, 38, { align: 'center' });
  
  // Assets
  let currentY = 48;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TILLGÅNGAR', 14, currentY);
  
  const totalAssets = data.assets.reduce((sum, i) => sum + i.amount, 0);
  
  autoTable(doc, {
    startY: currentY + 5,
    head: [['Konto', 'Belopp (SEK)']],
    body: [
      ...data.assets.map(item => [
        item.account, 
        formatAmount(item.amount)
      ]),
      [{ content: 'SUMMA TILLGÅNGAR', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, 
       { content: formatAmount(totalAssets), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]
    ],
    theme: 'striped',
    styles: { 
      fontSize: 10,
      cellPadding: 4
    },
    headStyles: { 
      fillColor: [66, 66, 66],
      fontSize: 11,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { halign: 'right', cellWidth: 60 }
    }
  });
  
  // @ts-ignore - autoTable adds finalY property
  currentY = doc.lastAutoTable.finalY + 12;
  
  // Liabilities
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('EGET KAPITAL OCH SKULDER', 14, currentY);
  
  const totalLiabilities = data.liabilities.reduce((sum, i) => sum + i.amount, 0);
  
  autoTable(doc, {
    startY: currentY + 5,
    head: [['Konto', 'Belopp (SEK)']],
    body: [
      ...data.liabilities.map(item => [
        item.account, 
        formatAmount(item.amount)
      ]),
      [{ content: 'SUMMA EGET KAPITAL OCH SKULDER', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, 
       { content: formatAmount(totalLiabilities), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]
    ],
    theme: 'striped',
    styles: { 
      fontSize: 10,
      cellPadding: 4
    },
    headStyles: { 
      fillColor: [66, 66, 66],
      fontSize: 11,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { halign: 'right', cellWidth: 60 }
    }
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Sida ${i} av ${pageCount} • Genererad ${new Date().toLocaleDateString('sv-SE')}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`Balansräkning_${companyName}_${asOfDate.toLocaleDateString('sv-SE').replace(/\//g, '-')}.pdf`);
};