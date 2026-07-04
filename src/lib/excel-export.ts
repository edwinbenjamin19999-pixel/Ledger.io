import * as ExcelJS from "exceljs";
import { format } from "date-fns";
import type { ReportAccountRow, ReportSection } from "@/components/reports/ProfessionalReportTable";

// Number format: Swedish style with 2 decimals
const numFmt = '#,##0.00';
const pctFmt = '0.0000';

const BOLD: Partial<ExcelJS.Font> = { bold: true };
const NORMAL: Partial<ExcelJS.Font> = {};

// ── Helpers ──

function addInfoHeader(
  ws: ExcelJS.Worksheet,
  companyName: string,
  reportTitle: string,
  fromDate: Date,
  toDate: Date
) {
  // Row 1: system header
  ws.addRow([`${companyName}  ${reportTitle} ${format(new Date(), "yyyy-MM-dd HH:mm")}`]);
  // Rows 2-5: empty
  ws.addRow([]);
  ws.addRow([]);
  ws.addRow([]);
  ws.addRow([]);
}

function setNumCell(row: ExcelJS.Row, col: number, value: number, bold: boolean) {
  const cell = row.getCell(col);
  cell.value = value;
  cell.numFmt = numFmt;
  cell.alignment = { horizontal: "right" };
  if (bold) cell.font = BOLD;
}

function setPctCell(row: ExcelJS.Row, col: number, value: number, bold: boolean) {
  const cell = row.getCell(col);
  cell.value = value;
  cell.numFmt = pctFmt;
  cell.alignment = { horizontal: "right" };
  if (bold) cell.font = BOLD;
}

// ── BR Sheet ──

function buildBRSheet(
  ws: ExcelJS.Worksheet,
  companyName: string,
  fromDate: Date,
  toDate: Date,
  sections: { assets: ReportSection; equityLiabilities: ReportSection },
  showZeros: boolean
) {
  // Column widths matching example: A=5, B=28, C=12, D=8, E=12, F=12
  ws.getColumn(1).width = 7;
  ws.getColumn(2).width = 32;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 16;

  ws.properties.showGridLines = false;

  addInfoHeader(ws, companyName, "Balans- och resultaträkning", fromDate, toDate);

  // Row 6: column headers
  const fromStr = format(fromDate, "yyyy-MM-dd");
  const toStr = format(toDate, "yyyy-MM-dd");
  const headerRow = ws.addRow([
    "Konto",
    "Kontobenämning",
    `Ingående balans ${fromStr}`,
    `Ingående saldo ${fromStr}`,
    `Perioden ${format(fromDate, "MMdd")} - ${format(toDate, "MMdd")}`,
    `Utgående balans ${toStr}`,
  ]);
  headerRow.font = BOLD;
  headerRow.eachCell((cell, colNumber) => {
    cell.alignment = { horizontal: colNumber <= 2 ? "left" : "right" };
  });

  // Freeze at row 6
  ws.views = [{ state: "frozen", ySplit: 6, xSplit: 0 }];

  // Process all sections (assets then equity/liabilities)
  const allTopSections = [sections.assets, sections.equityLiabilities];
  for (const topSection of allTopSections) {
    writeBRSections(ws, [topSection], showZeros, 0);
  }

  // Balance check
  ws.addRow([]);
  const checkRow = ws.addRow(["", "BERÄKNAT RESULTAT", 0, 0, 0, 0]);
  checkRow.font = BOLD;
  for (let c = 3; c <= 6; c++) {
    checkRow.getCell(c).numFmt = numFmt;
    checkRow.getCell(c).alignment = { horizontal: "right" };
  }

  // Footer info
  ws.addRow([]);
  ws.addRow([]);
  ws.addRow([]);
  ws.addRow([]);
  ws.addRow([]);
  const selRow = ws.addRow(["Urval:", `Bokföringsår: ${format(fromDate, "yyyyMM")}`]);
  selRow.getCell(1).font = BOLD;
  ws.addRow(["", `Period: ${fromStr} - ${toStr}`]);
}

function writeBRSections(
  ws: ExcelJS.Worksheet,
  sections: ReportSection[],
  showZeros: boolean,
  depth: number
) {
  for (const section of sections) {
    // Section header row - only in column B, bold
    const headerRow = ws.addRow(["", section.title]);
    headerRow.font = BOLD;

    if (section.children && section.children.length > 0) {
      writeBRSections(ws, section.children, showZeros, depth + 1);
    }

    // Account rows
    if (section.accounts) {
      for (const acc of section.accounts) {
        if (!showZeros && Math.abs(acc.ingBalans) < 0.005 && Math.abs(acc.perioden) < 0.005 && Math.abs(acc.utgBalans) < 0.005) continue;
        const row = ws.addRow([]);
        row.getCell(1).value = parseInt(acc.accountNumber) || acc.accountNumber;
        row.getCell(2).value = acc.accountName;
        setNumCell(row, 3, acc.ingBalans, false);
        setNumCell(row, 4, 0, false); // Ingående saldo
        setNumCell(row, 5, acc.perioden, false);
        setNumCell(row, 6, acc.utgBalans, false);
      }
    }

    // Subtotal row
    if (section.subtotalLabel) {
      const stRow = ws.addRow([]);
      stRow.getCell(2).value = section.subtotalLabel;
      stRow.font = BOLD;

      const accounts = section.accounts || [];
      const childAccounts = collectAllAccounts(section.children || []);
      const allAccounts = [...accounts, ...childAccounts];

      const sumIB = allAccounts.reduce((s, a) => s + a.ingBalans, 0);
      const sumPeriod = allAccounts.reduce((s, a) => s + a.perioden, 0);
      const sumUB = allAccounts.reduce((s, a) => s + a.utgBalans, 0);

      setNumCell(stRow, 3, sumIB, true);
      setNumCell(stRow, 4, 0, true);
      setNumCell(stRow, 5, sumPeriod, true);
      setNumCell(stRow, 6, sumUB, true);
    }
  }
}

function collectAllAccounts(sections: ReportSection[]): ReportAccountRow[] {
  const result: ReportAccountRow[] = [];
  for (const s of sections) {
    if (s.accounts) result.push(...s.accounts);
    if (s.children) result.push(...collectAllAccounts(s.children));
  }
  return result;
}

// ── RR Sheet ──

function buildRRSheet(
  ws: ExcelJS.Worksheet,
  companyName: string,
  fromDate: Date,
  toDate: Date,
  sections: ReportSection[],
  showZeros: boolean,
  totals: { ingBalans: number; ingSaldo: number; perioden: number; utgBalans: number },
  rows: ReportAccountRow[]
) {
  // Column widths matching example: A=5, B=24, C=11, D=11, E=5(spacer), F=8, G=11, H=5, I=11, J=5
  ws.getColumn(1).width = 7;
  ws.getColumn(2).width = 28;
  ws.getColumn(3).width = 13;
  ws.getColumn(4).width = 13;
  ws.getColumn(5).width = 5;
  ws.getColumn(6).width = 13;
  ws.getColumn(7).width = 13;
  ws.getColumn(8).width = 10;
  ws.getColumn(9).width = 13;
  ws.getColumn(10).width = 10;

  ws.properties.showGridLines = false;

  addInfoHeader(ws, companyName, "Balans- och resultaträkning", fromDate, toDate);

  // Row 6: column headers
  const periodLabel = `${format(fromDate, "MMdd")} - ${format(toDate, "MMdd")}`;
  const headerRow = ws.addRow([
    "Konto",
    "Kontobenämning",
    "Periodens saldo",
    "Utgående saldo",
    "", // spacer
    "Budget/prognos 1 - t.o.m. perioden",
    "Avvikelse 1 - belopp",
    "Avvikelse 1 - procent",
    "Föregående år - t.o.m. perioden",
    "Avvikelse 2 - procent",
  ]);
  headerRow.font = BOLD;
  headerRow.eachCell((cell, colNumber) => {
    cell.alignment = { horizontal: colNumber <= 2 ? "left" : "right" };
  });

  ws.views = [{ state: "frozen", ySplit: 6, xSplit: 0 }];

  // Process sections
  writeRRSections(ws, sections, showZeros);

  // ÅRETS RESULTAT grand total
  ws.addRow([]);
  const totalRow = ws.addRow([]);
  totalRow.getCell(2).value = "ÅRETS RESULTAT";
  totalRow.font = BOLD;
  setNumCell(totalRow, 3, totals.perioden, true);
  setNumCell(totalRow, 4, totals.utgBalans, true);
  setNumCell(totalRow, 6, 0, true);
  setNumCell(totalRow, 7, totals.perioden, true);
  setPctCell(totalRow, 8, 0, true);
  setNumCell(totalRow, 9, 0, true);
  setPctCell(totalRow, 10, 0, true);

  // Footer info
  ws.addRow([]);
  ws.addRow([]);
  ws.addRow([]);
  ws.addRow([]);
  ws.addRow([]);
  const selRow = ws.addRow(["Urval:", `Bokföringsår: ${format(fromDate, "yyyyMM")}`]);
  selRow.getCell(1).font = BOLD;
  ws.addRow(["", `Period: ${format(fromDate, "yyyy-MM-dd")} - ${format(toDate, "yyyy-MM-dd")}`]);
}

function writeRRSections(
  ws: ExcelJS.Worksheet,
  sections: ReportSection[],
  showZeros: boolean
) {
  for (const section of sections) {
    // Section header
    const headerRow = ws.addRow(["", section.title]);
    headerRow.font = BOLD;

    if (section.children && section.children.length > 0) {
      writeRRSections(ws, section.children, showZeros);
    }

    // Account rows
    if (section.accounts) {
      for (const acc of section.accounts) {
        if (!showZeros && Math.abs(acc.perioden) < 0.005 && Math.abs(acc.utgBalans) < 0.005) continue;
        const row = ws.addRow([]);
        row.getCell(1).value = parseInt(acc.accountNumber) || acc.accountNumber;
        row.getCell(2).value = acc.accountName;
        setNumCell(row, 3, acc.perioden, false);
        setNumCell(row, 4, acc.utgBalans, false);
        setNumCell(row, 5, 0, false); // spacer
        setNumCell(row, 6, 0, false); // budget
        setNumCell(row, 7, acc.perioden, false); // avvikelse (= perioden since budget=0)
        setPctCell(row, 8, 0, false); // avvikelse %
        setNumCell(row, 9, 0, false); // föregående år
        setPctCell(row, 10, 0, false); // föreg. år %
      }
    }

    // Subtotal
    if (section.subtotalLabel) {
      const stRow = ws.addRow([]);
      stRow.getCell(2).value = section.subtotalLabel;
      stRow.font = BOLD;

      const accounts = section.accounts || [];
      const childAccounts = collectAllAccounts(section.children || []);
      const allAccounts = [...accounts, ...childAccounts];

      const sumPeriod = allAccounts.reduce((s, a) => s + a.perioden, 0);
      const sumUB = allAccounts.reduce((s, a) => s + a.utgBalans, 0);

      setNumCell(stRow, 3, sumPeriod, true);
      setNumCell(stRow, 4, sumUB, true);
      setNumCell(stRow, 5, 0, true);
      setNumCell(stRow, 6, 0, true);
      setNumCell(stRow, 7, sumPeriod, true);
      setPctCell(stRow, 8, 0, true);
      setNumCell(stRow, 9, 0, true);
      setPctCell(stRow, 10, 0, true);
    }
  }
}

// ── PUBLIC EXPORT ──

export async function exportProfessionalExcel(
  companyName: string,
  fromDate: Date,
  toDate: Date,
  fiscalYearStart: Date,
  showZeroAccounts: boolean,
  bsSections: { assets: ReportSection; equityLiabilities: ReportSection },
  isSections: ReportSection[],
  assetTotals: { ingBalans: number; ingSaldo: number; perioden: number; utgBalans: number },
  liabTotals: { ingBalans: number; ingSaldo: number; perioden: number; utgBalans: number },
  isTotals: { ingBalans: number; ingSaldo: number; perioden: number; utgBalans: number },
  isRows: ReportAccountRow[]
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Cogniq";
  wb.created = new Date();

  // Sheet 1: Resultaträkning
  const wsRR = wb.addWorksheet("Resultaträkning");
  buildRRSheet(wsRR, companyName, fromDate, toDate, isSections, showZeroAccounts, isTotals, isRows);

  // Sheet 2: Balansräkning
  const wsBR = wb.addWorksheet("Balansräkning");
  buildBRSheet(wsBR, companyName, fromDate, toDate, bsSections, showZeroAccounts);

  // Download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const link = document.createElement("a");
  const period = format(toDate, "yyyy-MM");
  link.href = URL.createObjectURL(blob);
  link.download = `Cogniq_BR_RR_${companyName.replace(/\s+/g, "_")}_${period}.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
}
