import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { resolveBankDetails, canShowPaymentBox } from "@/lib/invoice-validation";
import { fitPdfImageToBox, loadPdfImageAsset } from "@/lib/pdf-image";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

interface InvoiceLine {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}

interface InvoiceData {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  payment_reference?: string | null;
  counterparty_name: string;
  counterparty_org_number?: string | null;
  counterparty_address?: string | null;
  total_amount: number;
  vat_amount: number;
  status?: string;
  paid_at?: string | null;
  free_text?: string | null;
  customer_number?: string | null;
  our_reference?: string | null;
  your_reference?: string | null;
  payment_terms_days?: number | null;
}

interface CompanyData {
  name: string;
  org_number?: string | null;
  address?: string | null;
  vat_number?: string | null;
  email_inbox_address?: string | null;
  billing_email?: string | null;
  footer_email?: string | null;
  iban?: string | null;
  swift_bic?: string | null;
  bankgiro?: string | null;
  plusgiro?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  logo_url?: string | null;
  logo_size_pct?: number | null;
}

interface StampInfo {
  text: string;
  r: number; g: number; b: number;
}

/**
 * Generates a professional Swedish invoice PDF in the fakturan.nu style.
 * Layout: Logo top-left, customer address top-right, payment box, product table, totals, footer with bank details.
 */
export async function generateInvoicePDF(
  invoice: InvoiceData,
  company: CompanyData,
  lines: InvoiceLine[],
  stamp?: StampInfo | null,
): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Colors
  const darkGray: [number, number, number] = [51, 51, 51];
  const medGray: [number, number, number] = [100, 100, 100];
  const lightGray: [number, number, number] = [150, 150, 150];
  const accentBlue: [number, number, number] = [0, 100, 160];
  const lineColor: [number, number, number] = [200, 200, 200];

  const logoAsset = await loadPdfImageAsset(company.logo_url);

  let y = 18;

  // ─── HEADER: Logo + company block (left) + "Faktura" title (right) ───
  const headerTopY = 12;
  let leftHeaderBottomY = y;

  if (logoAsset) {
    const sizeMul = Math.max(0.4, Math.min(2, (company.logo_size_pct ?? 100) / 100));
    const logoBox = fitPdfImageToBox(logoAsset.width, logoAsset.height, 42 * sizeMul, 18 * sizeMul);
    doc.addImage(logoAsset.dataUrl, logoAsset.format, 14, headerTopY, logoBox.width, logoBox.height);
    leftHeaderBottomY = headerTopY + logoBox.height;
  } else {
    leftHeaderBottomY = headerTopY;
  }

  // Company name + org.nr UNDER logo (left side) — never in the right corner
  const companyNameY = leftHeaderBottomY + 6;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkGray);
  doc.text(company.name || "Företag", 14, companyNameY);

  let leftBlockY = companyNameY;
  if (company.org_number) {
    leftBlockY += 4;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...medGray);
    doc.text(`Org.nr: ${company.org_number}`, 14, leftBlockY);
  }

  // "Faktura" title — top-right, but only the title (no company info)
  const titleY = 18;
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accentBlue);
  doc.text("Faktura", pageW - 14, titleY, { align: "right" });

  // Customer address starts below BOTH the title and the left block
  y = Math.max(leftBlockY, titleY) + 8;

  // ─── Customer address block (right, under "Faktura") ───
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkGray);

  const custLines: string[] = [];
  custLines.push(invoice.counterparty_name || "");
  if (invoice.counterparty_address) {
    invoice.counterparty_address.split(/[,\n]/).forEach(part => {
      const t = part.trim();
      if (t) custLines.push(t);
    });
  }
  if (invoice.counterparty_org_number) custLines.push(`Org.nr: ${invoice.counterparty_org_number}`);

  const custX = pageW - 14;
  custLines.forEach((line, i) => {
    doc.text(line, custX, y + i * 5, { align: "right" });
  });

  // ─── Left info block: Kundnr, Fakturanr, Referens, Betalningsvillkor, Datum ───
  const infoStartY = y + custLines.length * 5 + 6;
  doc.setFontSize(8);
  doc.setTextColor(...medGray);

  const leftLabels: [string, string][] = [];
  if (invoice.customer_number) leftLabels.push(["Kundnr", invoice.customer_number]);
  leftLabels.push(["Fakturanr", invoice.invoice_number]);
  if (invoice.your_reference) leftLabels.push(["Er referens", invoice.your_reference]);
  if (invoice.our_reference) leftLabels.push(["Vår referens", invoice.our_reference]);
  if (invoice.payment_terms_days) leftLabels.push(["Betalningsvillkor", `${invoice.payment_terms_days} dagar netto`]);
  leftLabels.push(["Fakturadatum", invoice.invoice_date]);

  let infoY = infoStartY;
  leftLabels.forEach(([label, value]) => {
    doc.setTextColor(...medGray);
    doc.text(label, 14, infoY);
    doc.setTextColor(...darkGray);
    doc.text(value, 50, infoY);
    infoY += 5;
  });

  // Extra text under left info
  infoY += 2;
  doc.setFontSize(7);
  doc.setTextColor(...lightGray);
  doc.text("Efter förfallodagen debiteras ränta enligt räntelagen", 14, infoY);

  // ─── Payment box (right side) — only if conditions met ───
  const paymentBoxCheck = canShowPaymentBox(invoice, company);

  if (paymentBoxCheck.canShow) {
    const boxX = 125;
    const boxW = pageW - 14 - boxX;
    const boxY = infoStartY - 5;
    const boxH = 30;

    doc.setDrawColor(...lineColor);
    doc.setLineWidth(0.5);
    doc.rect(boxX, boxY, boxW, boxH);

    doc.line(boxX, boxY + 10, boxX + boxW, boxY + 10);
    doc.line(boxX, boxY + 20, boxX + boxW, boxY + 20);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkGray);

    // Row 1: Att betala
    doc.text("Att betala", boxX + 4, boxY + 7);
    doc.text(`${fmt(invoice.total_amount)} kr`, boxX + boxW - 4, boxY + 7, { align: "right" });

    // Row 2: Förfallodatum
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Förfallodatum", boxX + 4, boxY + 17);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.due_date, boxX + boxW - 4, boxY + 17, { align: "right" });

    // Row 3: Referensnr/OCR
    doc.setFont("helvetica", "normal");
    doc.text("Referensnr/OCR", boxX + 4, boxY + 27);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.payment_reference || invoice.invoice_number, boxX + boxW - 4, boxY + 27, { align: "right" });
  }

  // ─── Separator line before product table ───
  const sepY = Math.max(infoY + 8, (paymentBoxCheck.canShow ? infoStartY - 5 + 30 : infoY) + 8);
  doc.setDrawColor(...lineColor);
  doc.setLineWidth(0.3);
  doc.line(14, sepY, pageW - 14, sepY);

  // ─── Product / tjänst table ───
  const tableStartY = sepY + 4;

  const tableBody = lines.map(l => {
    const lineDesc = l.description || "";
    return [
      lineDesc,
      fmt(l.quantity),
      fmt(l.unit_price),
      fmt(l.quantity * l.unit_price),
    ];
  });

  if (tableBody.length === 0) {
    tableBody.push(["Totalbelopp", "1,00", fmt(invoice.total_amount - invoice.vat_amount), fmt(invoice.total_amount - invoice.vat_amount)]);
  }

  autoTable(doc, {
    startY: tableStartY,
    head: [["Produkt / tjänst", "Antal", "Å-pris", "Belopp"]],
    body: tableBody,
    theme: "plain",
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: accentBlue,
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
    },
    styles: {
      fontSize: 9,
      textColor: darkGray,
      cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
      lineWidth: 0,
    },
    columnStyles: {
      0: { cellWidth: 90, halign: "left" },
      1: { halign: "right", cellWidth: 25 },
      2: { halign: "right", cellWidth: 35 },
      3: { halign: "right", cellWidth: 35 },
    },
    // Apply per-column halign to the header row so headers align with their values
    didParseCell: (data) => {
      if (data.section === "head") {
        if (data.column.index === 0) {
          data.cell.styles.halign = "left";
        } else {
          data.cell.styles.halign = "right";
        }
      }
    },
    didDrawPage: () => {
      // Draw header underline
      doc.setDrawColor(...accentBlue);
      doc.setLineWidth(0.5);
      doc.line(14, tableStartY + 7, pageW - 14, tableStartY + 7);
    },
    margin: { left: 14, right: 14 },
  });

  let finalY = (doc as any).lastAutoTable?.finalY || tableStartY + 30;

  // ─── Free text ───
  if (invoice.free_text) {
    finalY += 6;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...medGray);
    const splitText = doc.splitTextToSize(invoice.free_text, pageW - 28);
    doc.text(splitText, 14, finalY);
    finalY += splitText.length * 4 + 4;
  }

  // ─── Separator before totals ───
  finalY += 6;
  doc.setDrawColor(...lineColor);
  doc.setLineWidth(0.3);
  doc.line(pageW - 90, finalY, pageW - 14, finalY);

  // ─── Totals block (right-aligned) ───
  finalY += 7;
  const totLabelX = pageW - 88;
  const totValueX = pageW - 14;
  const subtotal = invoice.total_amount - invoice.vat_amount;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...medGray);
  doc.text("Netto:", totLabelX, finalY);
  doc.setTextColor(...darkGray);
  doc.text(fmt(subtotal), totValueX, finalY, { align: "right" });

  // Group VAT by rate
  const vatByRate: Record<number, { base: number; vat: number }> = {};
  lines.forEach(l => {
    const rate = l.vat_rate || 0;
    const lineNet = l.quantity * l.unit_price;
    const lineVat = lineNet * rate / 100;
    if (!vatByRate[rate]) vatByRate[rate] = { base: 0, vat: 0 };
    vatByRate[rate].base += lineNet;
    vatByRate[rate].vat += lineVat;
  });

  Object.entries(vatByRate).forEach(([rate, data]) => {
    if (Number(rate) > 0) {
      finalY += 5;
      doc.setTextColor(...medGray);
      doc.text(`Moms ${rate}%:`, totLabelX, finalY);
      doc.setTextColor(...darkGray);
      doc.text(`${fmt(data.vat)} kr`, totValueX, finalY, { align: "right" });
    }
  });

  // Öresutjämning — only show if non-zero
  const calculatedNet = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const calculatedVat = lines.reduce((s, l) => s + l.quantity * l.unit_price * l.vat_rate / 100, 0);
  const oresutjamning = invoice.total_amount - (calculatedNet + calculatedVat);
  if (Math.abs(oresutjamning) >= 0.01) {
    finalY += 5;
    doc.setTextColor(...medGray);
    doc.text("Öresutjämning:", totLabelX, finalY);
    doc.setTextColor(...darkGray);
    doc.text(`${fmt(oresutjamning)} kr`, totValueX, finalY, { align: "right" });
  }

  // SUMMA TOTALT
  finalY += 3;
  doc.setDrawColor(...accentBlue);
  doc.setLineWidth(0.8);
  doc.line(totLabelX, finalY, totValueX, finalY);

  finalY += 6;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accentBlue);
  doc.text("SUMMA TOTALT:", totLabelX, finalY);
  doc.text(`${fmt(invoice.total_amount)} KR`, totValueX, finalY, { align: "right" });

  // ─── Status stamp (if paid/cancelled) ───
  if (stamp) {
    doc.setFontSize(32);
    doc.setTextColor(stamp.r, stamp.g, stamp.b);
    doc.text(stamp.text, 14, finalY - 5);
    doc.setTextColor(0, 0, 0);
  }

  // ─── Footer with bank/contact details ───
  const footerY = pageH - 25;

  // Separator line above footer
  doc.setDrawColor(...lineColor);
  doc.setLineWidth(0.3);
  doc.line(14, footerY - 5, pageW - 14, footerY - 5);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...medGray);

  // Footer columns with safe widths to prevent overflow into next column
  const col1X = 14;
  const col2X = 70;   // moved 65 → 70 to give address more room
  const col3X = 145;  // moved 140 → 145
  const col1MaxW = col2X - col1X - 4; // ~52mm
  const col2MaxW = col3X - col2X - 4; // ~71mm
  const col3MaxW = pageW - 14 - col3X; // ~51mm

  const drawWrapped = (text: string, x: number, startY: number, maxW: number): number => {
    const wrapped = doc.splitTextToSize(text, maxW);
    wrapped.forEach((line: string, i: number) => {
      doc.text(line, x, startY + i * 3.5);
    });
    return startY + wrapped.length * 3.5;
  };

  // Column 1: Address
  doc.setFont("helvetica", "bold");
  doc.text("Adress", col1X, footerY);
  doc.setFont("helvetica", "normal");
  let aY = footerY + 4;
  aY = drawWrapped(company.name || "", col1X, aY, col1MaxW);
  if (company.address) {
    aY = drawWrapped(company.address, col1X, aY + 0.5, col1MaxW);
  }
  doc.setTextColor(...lightGray);
  doc.text("Godkänd för F-skatt", col1X, aY + 1);
  doc.setTextColor(...medGray);

  // Column 2: Bank — smart selection (max 2 methods)
  doc.setFont("helvetica", "bold");
  const bankResult = resolveBankDetails(company);
  doc.text("Bankuppgifter", col2X, footerY);
  doc.setFont("helvetica", "normal");
  if (bankResult.hasBankDetails) {
    let bY = footerY + 4;
    if (bankResult.primary) {
      bY = drawWrapped(`${bankResult.primary.label}: ${bankResult.primary.value}`, col2X, bY, col2MaxW);
    }
    if (bankResult.secondary) {
      drawWrapped(`${bankResult.secondary.label}: ${bankResult.secondary.value}`, col2X, bY + 0.5, col2MaxW);
    }
  } else {
    doc.text("Betaluppgifter saknas", col2X, footerY + 4);
  }

  // Column 3: Contact — prefer footer_email (settings) → billing_email → email_inbox
  doc.setFont("helvetica", "bold");
  doc.text("Kontakt", col3X, footerY);
  doc.setFont("helvetica", "normal");
  let cY = footerY + 4;
  const contactEmail = company.footer_email || company.billing_email || company.email_inbox_address;
  if (contactEmail) {
    cY = drawWrapped(`E-post: ${contactEmail}`, col3X, cY, col3MaxW);
    cY += 0.5;
  }
  if (company.vat_number) {
    drawWrapped(`Momsreg.nr: ${company.vat_number}`, col3X, cY, col3MaxW);
  }

  return doc;
}
