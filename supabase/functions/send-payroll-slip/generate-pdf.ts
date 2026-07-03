import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

export interface PayrollSlipData {
  employee: {
    first_name: string;
    last_name: string;
    personal_number: string;
    email: string;
    employment_start: string | null;
    employment_end: string | null;
  };
  payroll: {
    period_start: string;
    period_end: string;
    payment_date: string;
    gross_salary: number;
    tax_deduction: number;
    net_salary: number;
    employer_social_fees: number;
    vacation_pay: number;
    pension: number;
    worked_hours: number | null;
  };
  adjustments: Array<{
    type: string;
    description: string;
    amount: number;
  }>;
  company: {
    name: string;
    org_number: string;
  };
}

export const generatePayrollPDF = (data: PayrollSlipData): Uint8Array => {
  const doc = new jsPDF();
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("sv-SE");
  };

  // Calculate proration info if applicable
  let prorationText = "";
  if (data.payroll.worked_hours) {
    const periodStart = new Date(data.payroll.period_start);
    const periodEnd = new Date(data.payroll.period_end);
    const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const workedDays = Math.round(data.payroll.worked_hours / 8);
    prorationText = `Arbetade dagar: ${workedDays}/${totalDays}`;
    
    if (data.employee.employment_start) {
      const empStart = new Date(data.employee.employment_start);
      if (empStart > periodStart) {
        prorationText += ` (Anställd från ${formatDate(data.employee.employment_start)})`;
      }
    }
    if (data.employee.employment_end) {
      const empEnd = new Date(data.employee.employment_end);
      if (empEnd < periodEnd) {
        prorationText += ` (Anställning slutar ${formatDate(data.employee.employment_end)})`;
      }
    }
  }

  let y = 20;

  // Header - Company name
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 64, 175); // Blue color
  doc.text(data.company.name, 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Org.nr: ${data.company.org_number}`, 20, y);
  y += 15;

  // Draw line
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);
  y += 10;

  // Section: Lönespecifikation
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 64, 175);
  doc.text("Lönespecifikation", 20, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  
  const addRow = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, 20, y);
    doc.text(value, 190, y, { align: "right" });
    y += 6;
  };

  addRow("Anställd:", `${data.employee.first_name} ${data.employee.last_name}`);
  addRow("Personnummer:", data.employee.personal_number);
  addRow("Period:", `${formatDate(data.payroll.period_start)} - ${formatDate(data.payroll.period_end)}`);
  addRow("Utbetalningsdatum:", formatDate(data.payroll.payment_date));
  
  if (prorationText) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 100, 0); // Orange color
    doc.text(prorationText, 20, y);
    doc.setTextColor(0, 0, 0);
    y += 2;
  }
  
  y += 8;

  // Section: Lönespecifikation details
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 64, 175);
  doc.text("Löneuppgifter", 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  
  addRow("Bruttolön", formatCurrency(data.payroll.gross_salary));
  
  if (data.payroll.vacation_pay > 0) {
    addRow("Semesterersättning", formatCurrency(data.payroll.vacation_pay));
  }
  
  if (data.payroll.pension > 0) {
    addRow("Pension", formatCurrency(data.payroll.pension));
  }
  
  // Adjustments
  for (const adj of data.adjustments) {
    addRow(adj.description || adj.type, formatCurrency(adj.amount));
  }
  
  y += 5;

  // Section: Avdrag
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 64, 175);
  doc.text("Avdrag", 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  addRow("Preliminärskatt", formatCurrency(data.payroll.tax_deduction));
  y += 8;

  // Net salary - highlighted
  doc.setFillColor(243, 244, 246); // Light gray background
  doc.rect(15, y - 5, 180, 12, "F");
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  addRow("Nettolön till utbetalning", formatCurrency(data.payroll.net_salary), true);
  y += 10;

  // Section: Arbetsgivaravgifter
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 64, 175);
  doc.text("Arbetsgivaravgifter", 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  addRow("Arbetsgivaravgifter (31,42%)", formatCurrency(data.payroll.employer_social_fees));
  addRow("Total kostnad för arbetsgivaren", formatCurrency(data.payroll.gross_salary + data.payroll.employer_social_fees));
  
  y += 10;

  // Footer
  doc.setDrawColor(229, 231, 235);
  doc.line(20, y, 190, y);
  y += 8;
  
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text("Detta är en automatiskt genererad lönespecifikation från NorthLedger.", 105, y, { align: "center" });

  return doc.output("arraybuffer");
};
