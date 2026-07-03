/**
 * Premium Excel renderer for financial statements (RR + BR).
 * Mirrors the PDF: same hierarchy, same indentation, same subtotal / total
 * treatment, same dynamic column model. Designed to print clean on A4
 * portrait, fit-to-width.
 */
import type { Workbook, Worksheet } from "exceljs";
import { format as formatDate } from "date-fns";
import type { StatementColumn, StatementDocument, StatementRow } from "../statementDocument";
import { XLSX_COLOR as C, XLSX_NUMFMT as NF } from "./typography";

const FONT_NAME = "Calibri";

const numFmtFor = (col: StatementColumn) => (col.format === "percent" ? NF.percent : NF.number);

function configureSheet(ws: Worksheet, doc: StatementDocument) {
  // Column widths
  ws.columns = doc.columns.map((c) => ({ width: c.width }));
  ws.views = [{ showGridLines: false }];

  // Page setup — A4 portrait, fit-to-width
  ws.pageSetup = {
    paperSize: 9, // A4
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.5, right: 0.5, top: 0.7, bottom: 0.7, header: 0.3, footer: 0.3 },
    horizontalCentered: true,
  };
  ws.headerFooter = {
    differentFirst: false,
    oddHeader: `&L&"${FONT_NAME},Bold"&12${doc.header.title}&R&"${FONT_NAME}"&10${doc.header.company}`,
    oddFooter: `&L${doc.footer.confidentiality}&RSida &P av &N · ${formatDate(new Date(), "yyyy-MM-dd")}`,
  };
}

function writeHeader(ws: Worksheet, doc: StatementDocument): number {
  const lastCol = doc.columns.length;
  let r = 1;

  // Title row
  ws.mergeCells(r, 1, r, lastCol);
  const title = ws.getCell(r, 1);
  title.value = doc.header.title;
  title.font = { name: FONT_NAME, size: 18, bold: true, color: { argb: C.navy } };
  title.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(r).height = 28;
  r++;

  // Period + company
  ws.mergeCells(r, 1, r, lastCol);
  const sub = ws.getCell(r, 1);
  sub.value = `${doc.header.company} · ${doc.header.period}`;
  sub.font = { name: FONT_NAME, size: 11, color: { argb: C.slate600 } };
  sub.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(r).height = 18;
  r++;

  // Generated meta
  ws.mergeCells(r, 1, r, lastCol);
  const meta = ws.getCell(r, 1);
  meta.value = `Genererad ${formatDate(doc.header.generated, "yyyy-MM-dd HH:mm")} · NorthLedger`;
  meta.font = { name: FONT_NAME, size: 9, italic: true, color: { argb: C.slate400 } };
  ws.getRow(r).height = 16;
  r += 2;

  // Warnings
  for (const w of doc.warnings) {
    ws.mergeCells(r, 1, r, lastCol);
    const cell = ws.getCell(r, 1);
    cell.value = `⚠  ${w.message}`;
    cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: w.severity === "error" ? C.rose700 : C.amber700 } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: w.severity === "error" ? C.rose50 : C.amber50 } };
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(r).height = 24;
    r++;
  }
  if (doc.warnings.length > 0) r++;

  // Column headers
  doc.columns.forEach((col, i) => {
    const cell = ws.getCell(r, i + 1);
    cell.value = col.label.toUpperCase();
    cell.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } };
    cell.alignment = { vertical: "middle", horizontal: col.align, indent: i === 0 ? 1 : 0 };
    cell.border = { bottom: { style: "thin", color: { argb: C.slate300 } } };
  });
  ws.getRow(r).height = 22;
  r++;

  // Freeze panes below header
  ws.views = [{ showGridLines: false, state: "frozen", ySplit: r - 1 }];
  return r;
}

/**
 * Color helper for variance-style cells. Returns ARGB color for a given column key.
 */
const colorForValue = (colKey: string, v: number, isTotal: boolean): string => {
  if (colKey === "varKr" || colKey === "varPct" || colKey === "pyPct") {
    if (v < 0) return C.rose700;
    if (v > 0) return C.emerald700;
    return C.slate500;
  }
  if (v < 0 && !isTotal) return C.rose700;
  return isTotal ? C.navy : C.slate800;
};

/** Write the right-aligned numeric cells for an account/subtotal/total row. */
function writeNumericCells(
  ws: Worksheet,
  doc: StatementDocument,
  r: number,
  values: number[],
  variant: "account" | "subtotal" | "total",
) {
  // First numeric column starts after the leading text columns (code+label OR just label).
  // The model always has 2 leading text columns (code, label).
  const NUMERIC_START_COL = 3;
  const isBold = variant !== "account";
  const isTotal = variant === "total";
  const fontSize = variant === "account" ? 9 : variant === "subtotal" ? 10 : 11;

  let valIdx = 0;
  for (let i = 0; i < doc.columns.length; i++) {
    const col = doc.columns[i];
    if (col.align !== "right") continue;
    const v = values[valIdx];
    const cell = ws.getCell(r, NUMERIC_START_COL + valIdx);
    cell.value = Number.isFinite(v) ? v : null;
    cell.numFmt = numFmtFor(col);
    cell.font = {
      name: FONT_NAME,
      size: fontSize,
      bold: isBold,
      color: { argb: colorForValue(col.key, v ?? 0, isTotal) },
    };
    cell.alignment = { vertical: "middle", horizontal: "right" };

    if (variant === "subtotal") {
      cell.border = { top: { style: "thin", color: { argb: C.slate400 } } };
    } else if (variant === "total") {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.slate50 } };
      cell.border = {
        top: { style: "medium", color: { argb: C.navy } },
        bottom: { style: "medium", color: { argb: C.navy } },
      };
    }
    valIdx++;
  }
}

function writeRow(ws: Worksheet, doc: StatementDocument, row: StatementRow, r: number): number {
  const lastCol = doc.columns.length;
  switch (row.kind) {
    case "spacer": {
      ws.getRow(r).height = 6;
      return r + 1;
    }
    case "section": {
      ws.mergeCells(r, 1, r, lastCol);
      const c = ws.getCell(r, 1);
      c.value = row.label;
      c.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: C.navy } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.slate100 } };
      c.alignment = { vertical: "middle", horizontal: "left", indent: 0 };
      c.border = { bottom: { style: "thin", color: { argb: C.slate400 } } };
      ws.getRow(r).height = 24;
      return r + 1;
    }
    case "group": {
      ws.mergeCells(r, 1, r, 2);
      const c = ws.getCell(r, 1);
      c.value = row.label;
      c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.slate700 } };
      c.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      ws.getRow(r).height = 18;
      return r + 1;
    }
    case "account": {
      const code = ws.getCell(r, 1);
      code.value = row.code;
      code.font = { name: FONT_NAME, size: 9, color: { argb: C.slate500 } };
      code.alignment = { vertical: "middle", horizontal: "left", indent: 2 };

      const label = ws.getCell(r, 2);
      label.value = row.label;
      label.font = { name: FONT_NAME, size: 9, color: { argb: C.slate800 } };
      label.alignment = { vertical: "middle", horizontal: "left" };

      writeNumericCells(ws, doc, r, row.values, "account");
      ws.getRow(r).height = 16;
      return r + 1;
    }
    case "subtotal": {
      ws.mergeCells(r, 1, r, 2);
      const label = ws.getCell(r, 1);
      label.value = row.label;
      label.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.slate800 } };
      label.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      label.border = { top: { style: "thin", color: { argb: C.slate400 } } };

      writeNumericCells(ws, doc, r, row.values, "subtotal");
      ws.getRow(r).height = 20;
      return r + 1;
    }
    case "total": {
      ws.mergeCells(r, 1, r, 2);
      const label = ws.getCell(r, 1);
      label.value = row.label.toUpperCase();
      label.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: C.navy } };
      label.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.slate50 } };
      label.alignment = { vertical: "middle", horizontal: "left", indent: 0 };
      label.border = {
        top: { style: "medium", color: { argb: C.navy } },
        bottom: { style: "medium", color: { argb: C.navy } },
      };

      writeNumericCells(ws, doc, r, row.values, "total");
      ws.getRow(r).height = 26;
      return r + 1;
    }
  }
}

/** Add ONE statement as a new sheet in `wb`. */
export function renderStatementSheet(wb: Workbook, doc: StatementDocument, sheetName: string): Worksheet {
  const ws = wb.addWorksheet(sheetName, {
    properties: { tabColor: { argb: C.navy } },
    pageSetup: { paperSize: 9, orientation: "portrait" },
  });
  configureSheet(ws, doc);
  let r = writeHeader(ws, doc);

  if (doc.rows.length === 0) {
    const cell = ws.getCell(r, 1);
    ws.mergeCells(r, 1, r, doc.columns.length);
    cell.value = "Inga poster i vald period.";
    cell.font = { name: FONT_NAME, size: 11, italic: true, color: { argb: C.slate500 } };
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    return ws;
  }

  for (const row of doc.rows) {
    r = writeRow(ws, doc, row, r);
  }

  // Repeat header rows on every printed page (covers title+period+col headers).
  ws.pageSetup.printTitlesRow = "1:6";
  return ws;
}
