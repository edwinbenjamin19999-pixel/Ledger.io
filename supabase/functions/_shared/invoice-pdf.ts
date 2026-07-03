// deno-lint-ignore-file no-explicit-any
// Shared Deno-compatible invoice PDF renderer.
// Pixel-identical to src/lib/invoice-pdf.ts (frontend download).
// Used by: send-invoice, resend-invoice-email, kivra-send-content.

import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.2";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export interface SharedInvoiceLine {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}

export interface SharedInvoiceData {
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

export interface SharedCompanyData {
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

export interface SharedStampInfo {
  text: string;
  r: number; g: number; b: number;
}

export interface ReminderOptions {
  /** Reminder number, 1 or 2. */
  reminderNumber: number;
  /** Påminnelseavgift in SEK (e.g. 60). */
  reminderFee: number;
  /** Optional override for the reminder notice text. */
  noticeText?: string;
}

// ── inlined helpers (mirror src/lib/invoice-validation.ts) ──
function isValidIBAN(iban: string): boolean {
  return /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(iban.replace(/\s/g, ""));
}
function isValidBIC(bic: string): boolean {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic.replace(/\s/g, ""));
}
function isValidBankgiro(bg: string): boolean {
  return /^\d{7,8}$/.test(bg.replace(/[\s-]/g, ""));
}

interface BankPair { label: string; value: string }
interface BankResolved {
  hasBankDetails: boolean;
  primary: BankPair | null;
  secondary: BankPair | null;
}

function resolveBankDetails(company: SharedCompanyData): BankResolved {
  let primary: BankPair | null = null;
  let secondary: BankPair | null = null;

  if (company.bankgiro && isValidBankgiro(company.bankgiro)) {
    primary = { label: "Bankgiro", value: company.bankgiro };
  }
  if (company.plusgiro) {
    secondary = { label: "Plusgiro", value: company.plusgiro };
  }
  if (!primary) {
    if (company.iban && isValidIBAN(company.iban)) {
      primary = { label: "IBAN", value: company.iban };
    } else if (company.plusgiro) {
      primary = { label: "Plusgiro", value: company.plusgiro };
      secondary = null;
    }
  }
  if (!secondary && company.swift_bic && isValidBIC(company.swift_bic)) {
    secondary = { label: "BIC/SWIFT", value: company.swift_bic };
  }
  return { hasBankDetails: primary !== null, primary, secondary };
}

function canShowPaymentBox(invoice: SharedInvoiceData, company: SharedCompanyData): { canShow: boolean } {
  if (!invoice.total_amount || invoice.total_amount <= 0) return { canShow: false };
  if (!invoice.due_date?.trim()) return { canShow: false };
  if (!invoice.payment_reference?.trim() && !invoice.invoice_number?.trim()) return { canShow: false };
  return { canShow: resolveBankDetails(company).hasBankDetails };
}

// ── Deno-compatible logo loader: fetch → base64 dataURL ──
async function loadLogoForDeno(url?: string | null): Promise<{ dataUrl: string; format: "PNG" | "JPEG" } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const buf = new Uint8Array(await res.arrayBuffer());
    let format: "PNG" | "JPEG" = "PNG";
    if (ct.includes("jpeg") || ct.includes("jpg") || url.toLowerCase().match(/\.jpe?g($|\?)/)) format = "JPEG";
    // base64 encode (chunked to avoid stack overflow)
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < buf.length; i += CHUNK) {
      binary += String.fromCharCode(...buf.subarray(i, i + CHUNK));
    }
    const b64 = btoa(binary);
    return { dataUrl: `data:image/${format.toLowerCase()};base64,${b64}`, format };
  } catch (e) {
    console.error("[invoice-pdf] logo load failed:", e);
    return null;
  }
}

/**
 * Renders an invoice PDF identical to the frontend download (src/lib/invoice-pdf.ts).
 * Returns Uint8Array — caller can base64-encode for Resend / Kivra.
 */
export async function generateInvoicePDFBytes(
  invoice: SharedInvoiceData,
  company: SharedCompanyData,
  lines: SharedInvoiceLine[],
  stamp?: SharedStampInfo | null,
  reminder?: ReminderOptions | null,
): Promise<Uint8Array> {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const darkGray: [number, number, number] = [51, 51, 51];
  const medGray: [number, number, number] = [100, 100, 100];
  const lightGray: [number, number, number] = [150, 150, 150];
  const accentBlue: [number, number, number] = [0, 100, 160];
  const reminderOrange: [number, number, number] = [194, 109, 35];
  const accent: [number, number, number] = reminder ? reminderOrange : accentBlue;
  const lineColor: [number, number, number] = [200, 200, 200];

  const totalWithFee = reminder
    ? invoice.total_amount + (reminder.reminderFee || 0)
    : invoice.total_amount;

  const logo = await loadLogoForDeno(company.logo_url);

  let y = 18;
  const headerTopY = 12;
  let leftHeaderBottomY = headerTopY;

  if (logo) {
    try {
      const props = (doc as any).getImageProperties(logo.dataUrl);
      const sizeMul = Math.max(0.4, Math.min(2, (company.logo_size_pct ?? 100) / 100));
      const maxW = 42 * sizeMul, maxH = 18 * sizeMul;
      const scale = Math.min(maxW / props.width, maxH / props.height, 1);
      const w = props.width * scale;
      const h = props.height * scale;
      doc.addImage(logo.dataUrl, logo.format, 14, headerTopY, w, h);
      leftHeaderBottomY = headerTopY + h;
    } catch (e) {
      console.error("[invoice-pdf] addImage failed:", e);
    }
  }

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

  const titleY = 18;
  doc.setFontSize(reminder ? 18 : 22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accent);
  const titleText = reminder
    ? `PÅMINNELSE ${reminder.reminderNumber}`
    : "Faktura";
  doc.text(titleText, pageW - 14, titleY, { align: "right" });

  y = Math.max(leftBlockY, titleY) + 8;

  // Customer block (right)
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkGray);

  const custLines: string[] = [];
  custLines.push(invoice.counterparty_name || "");
  if (invoice.counterparty_address) {
    invoice.counterparty_address.split(/[,\n]/).forEach(p => {
      const t = p.trim();
      if (t) custLines.push(t);
    });
  }
  if (invoice.counterparty_org_number) custLines.push(`Org.nr: ${invoice.counterparty_org_number}`);

  const custX = pageW - 14;
  custLines.forEach((line, i) => {
    doc.text(line, custX, y + i * 5, { align: "right" });
  });

  // Left info block
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

  infoY += 2;
  doc.setFontSize(7);
  doc.setTextColor(...lightGray);
  doc.text("Efter förfallodagen debiteras ränta enligt räntelagen", 14, infoY);

  // Payment box
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
    doc.text("Att betala", boxX + 4, boxY + 7);
    doc.text(`${fmt(totalWithFee)} kr`, boxX + boxW - 4, boxY + 7, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Förfallodatum", boxX + 4, boxY + 17);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.due_date, boxX + boxW - 4, boxY + 17, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.text("Referensnr/OCR", boxX + 4, boxY + 27);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.payment_reference || invoice.invoice_number, boxX + boxW - 4, boxY + 27, { align: "right" });
  }

  let sepY = Math.max(infoY + 8, (paymentBoxCheck.canShow ? infoStartY - 5 + 30 : infoY) + 8);
  doc.setDrawColor(...lineColor);
  doc.setLineWidth(0.3);
  doc.line(14, sepY, pageW - 14, sepY);

  // Reminder notice band (between separator and table)
  if (reminder) {
    const noticeY = sepY + 4;
    const noticeH = 14;
    doc.setFillColor(252, 243, 230);
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.3);
    doc.rect(14, noticeY, pageW - 28, noticeH, "FD");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...accent);
    doc.text(
      reminder.noticeText ||
        "Denna faktura har förfallit till betalning. Vänligen reglera snarast för att undvika ytterligare åtgärder.",
      18,
      noticeY + 5.5,
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...medGray);
    doc.text(
      `Påminnelseavgift på ${fmt(reminder.reminderFee)} SEK har tillagts enligt lag (1981:739).`,
      18,
      noticeY + 11,
    );
    sepY = noticeY + noticeH;
  }

  const tableStartY = sepY + 4;
  const tableBody = lines.map(l => [
    l.description || "",
    fmt(l.quantity),
    fmt(l.unit_price),
    fmt(l.quantity * l.unit_price),
  ]);
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
      textColor: accent,
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
    didParseCell: (data: any) => {
      if (data.section === "head") {
        data.cell.styles.halign = data.column.index === 0 ? "left" : "right";
      }
    },
    didDrawPage: () => {
      doc.setDrawColor(...accent);
      doc.setLineWidth(0.5);
      doc.line(14, tableStartY + 7, pageW - 14, tableStartY + 7);
    },
    margin: { left: 14, right: 14 },
  });

  let finalY = (doc as any).lastAutoTable?.finalY || tableStartY + 30;

  if (invoice.free_text) {
    finalY += 6;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...medGray);
    const splitText = doc.splitTextToSize(invoice.free_text, pageW - 28);
    doc.text(splitText, 14, finalY);
    finalY += splitText.length * 4 + 4;
  }

  finalY += 6;
  doc.setDrawColor(...lineColor);
  doc.setLineWidth(0.3);
  doc.line(pageW - 90, finalY, pageW - 14, finalY);

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

  if (reminder && reminder.reminderFee > 0) {
    finalY += 5;
    doc.setTextColor(...medGray);
    doc.text("Påminnelseavgift:", totLabelX, finalY);
    doc.setTextColor(...accent);
    doc.setFont("helvetica", "bold");
    doc.text(`${fmt(reminder.reminderFee)} kr`, totValueX, finalY, { align: "right" });
    doc.setFont("helvetica", "normal");
  }

  finalY += 3;
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.8);
  doc.line(totLabelX, finalY, totValueX, finalY);

  finalY += 6;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accent);
  doc.text(reminder ? "ATT BETALA:" : "SUMMA TOTALT:", totLabelX, finalY);
  doc.text(`${fmt(totalWithFee)} KR`, totValueX, finalY, { align: "right" });

  if (stamp) {
    doc.setFontSize(32);
    doc.setTextColor(stamp.r, stamp.g, stamp.b);
    doc.text(stamp.text, 14, finalY - 5);
    doc.setTextColor(0, 0, 0);
  }

  // Footer
  const footerY = pageH - 25;
  doc.setDrawColor(...lineColor);
  doc.setLineWidth(0.3);
  doc.line(14, footerY - 5, pageW - 14, footerY - 5);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...medGray);

  const col1X = 14;
  const col2X = 70;
  const col3X = 145;
  const col1MaxW = col2X - col1X - 4;
  const col2MaxW = col3X - col2X - 4;
  const col3MaxW = pageW - 14 - col3X;

  const drawWrapped = (text: string, x: number, startY: number, maxW: number): number => {
    const wrapped = doc.splitTextToSize(text, maxW);
    wrapped.forEach((line: string, i: number) => {
      doc.text(line, x, startY + i * 3.5);
    });
    return startY + wrapped.length * 3.5;
  };

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

  const out = doc.output("arraybuffer");
  return new Uint8Array(out);
}

/** Helper: stamp info from invoice status (matches frontend logic). */
export function stampForStatus(status?: string | null): SharedStampInfo | null {
  if (status === "paid") return { text: "BETALD", r: 34, g: 139, b: 34 };
  if (status === "cancelled") return { text: "ANNULLERAD", r: 220, g: 38, b: 38 };
  return null;
}

/** Helper: chunked base64 encoding for large PDFs. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** Map a DB invoice row + company + lines into renderer inputs. */
export function mapInvoiceRowToRenderer(invoice: any, company: any, lines: any[]): {
  inv: SharedInvoiceData; comp: SharedCompanyData; ln: SharedInvoiceLine[];
} {
  const inv: SharedInvoiceData = {
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,
    payment_reference: invoice.collection_reference || invoice.ocr_number || null,
    counterparty_name: invoice.counterparty_name || "Kund",
    counterparty_org_number: invoice.counterparty_org_number || null,
    counterparty_address: invoice.counterparty_address || null,
    total_amount: Number(invoice.total_amount) || 0,
    vat_amount: Number(invoice.vat_amount) || 0,
    status: invoice.status,
    paid_at: invoice.paid_at,
    free_text: invoice.free_text || null,
    customer_number: invoice.customer_number || null,
    our_reference: invoice.our_reference || null,
    your_reference: invoice.your_reference || null,
    payment_terms_days: invoice.payment_terms_days || null,
  };
  const comp: SharedCompanyData = {
    name: company?.name || "Företag",
    org_number: company?.org_number,
    address: company?.address,
    vat_number: company?.vat_number,
    email_inbox_address: company?.email_inbox_address,
    billing_email: company?.billing_email,
    footer_email: company?.footer_email || null,
    iban: company?.iban,
    swift_bic: company?.swift_bic,
    bankgiro: company?.bankgiro,
    plusgiro: company?.plusgiro,
    bank_name: company?.bank_name,
    bank_account_number: company?.bank_account_number,
    logo_url: company?.logo_url,
  };
  const ln: SharedInvoiceLine[] = (lines || []).map((l: any) => ({
    description: l.description || "",
    quantity: Number(l.quantity) || 1,
    unit_price: Number(l.unit_price) || 0,
    vat_rate: Number(l.vat_rate) || 0,
  }));
  return { inv, comp, ln };
}
