import type { Workbook } from "exceljs";
import { format as formatDate } from "date-fns";
import type { FinancialEngineResult } from "@/hooks/useFinancialEngine";
import { ARGB, BORDERS, FILLS, FONTS, NUM_FMT } from "./excelStyleTokens";

export interface CoverSheetInput {
  companyName: string;
  fromDate: Date;
  toDate: Date;
  engine: FinancialEngineResult;
  pack: string; // e.g. "Resultat- och balansräkning"
}

export function buildCoverSheet(wb: Workbook, input: CoverSheetInput) {
  const ws = wb.addWorksheet("Översikt", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
    properties: { tabColor: { argb: ARGB.cyan600 } },
  });

  ws.columns = [
    { width: 40 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
  ];

  let r = 1;

  // Title
  ws.mergeCells(r, 1, r, 4);
  const title = ws.getCell(r, 1);
  title.value = "Finansiell rapport";
  title.font = FONTS.title;
  ws.getRow(r).height = 30;
  r++;

  // Subtitle (company + period)
  ws.mergeCells(r, 1, r, 4);
  const sub = ws.getCell(r, 1);
  sub.value = `${input.companyName} · ${formatDate(input.fromDate, "yyyy-MM-dd")} – ${formatDate(input.toDate, "yyyy-MM-dd")}`;
  sub.font = FONTS.subtitle;
  r++;

  // Meta
  ws.mergeCells(r, 1, r, 4);
  const meta = ws.getCell(r, 1);
  meta.value = `${input.pack} · Genererad ${formatDate(new Date(), "yyyy-MM-dd HH:mm")} · Ledger.io`;
  meta.font = FONTS.meta;
  r += 2;

  // Imbalance warning row (top of sheet) when not balanced
  if (!input.engine.validation.balanced) {
    ws.mergeCells(r, 1, r, 4);
    const w = ws.getCell(r, 1);
    w.value = `⚠  Balansräkningen är ej i balans vid exportögonblicket. Differens: ${formatNum(Math.abs(input.engine.validation.imbalanceDiff))} kr`;
    w.font = FONTS.warningBold;
    w.fill = FILLS.warningBand;
    w.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(r).height = 28;
    r += 2;
  }

  // KPI section header
  ws.mergeCells(r, 1, r, 4);
  const kh = ws.getCell(r, 1);
  kh.value = "Nyckeltal";
  kh.font = FONTS.section;
  kh.fill = FILLS.sectionBand;
  ws.getRow(r).height = 22;
  r++;

  // KPI table header
  const headerRow = ws.getRow(r);
  ["Nyckeltal", "Värde", "", ""].forEach((label, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = label;
    c.font = FONTS.header;
    c.fill = FILLS.headerBand;
    c.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "right", indent: i === 0 ? 1 : 0 };
  });
  headerRow.height = 20;
  r++;

  const k = input.engine.kpis;
  const kpiRows: Array<[string, number, "number" | "percent"]> = [
    ["Intäkter", k.revenue, "number"],
    ["Kostnader", k.costs, "number"],
    ["Resultat", k.result, "number"],
    ["Marginal", k.marginPct / 100, "percent"],
    ["Tillgångar", k.assets, "number"],
    ["Eget kapital", k.equity, "number"],
    ["Skulder", k.liabilities, "number"],
  ];
  for (const [label, value, fmt] of kpiRows) {
    const row = ws.getRow(r);
    const a = row.getCell(1);
    a.value = label;
    a.font = FONTS.base;
    a.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    const b = row.getCell(2);
    b.value = value;
    b.numFmt = fmt === "percent" ? NUM_FMT.percent : NUM_FMT.number;
    b.font = { ...FONTS.base, bold: true };
    b.alignment = { vertical: "middle", horizontal: "right" };
    row.height = 18;
    r++;
  }
  r++;

  // Balance Status (dominant)
  ws.mergeCells(r, 1, r, 4);
  const bsh = ws.getCell(r, 1);
  bsh.value = "Balansstatus";
  bsh.font = FONTS.section;
  bsh.fill = FILLS.sectionBand;
  ws.getRow(r).height = 22;
  r++;

  ws.mergeCells(r, 1, r, 4);
  const bs = ws.getCell(r, 1);
  if (input.engine.validation.balanced) {
    bs.value = "✔  Balanserad — Tillgångar = Eget kapital + Skulder";
    bs.fill = FILLS.okBand;
    bs.font = { ...FONTS.subtotal, color: { argb: ARGB.emerald600 } };
  } else {
    bs.value = `❌  Ej balanserad — Differens ${formatNum(Math.abs(input.engine.validation.imbalanceDiff))} kr`;
    bs.fill = FILLS.warningBand;
    bs.font = { ...FONTS.subtotal, color: { argb: ARGB.rose700 } };
  }
  bs.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(r).height = 28;
  r += 2;

  // Confidence
  ws.mergeCells(r, 1, r, 4);
  const ch = ws.getCell(r, 1);
  ch.value = "Tilltro till data (Confidence)";
  ch.font = FONTS.section;
  ch.fill = FILLS.sectionBand;
  ws.getRow(r).height = 22;
  r++;

  const confPct = Math.round(input.engine.validation.confidence * 100);
  const confRow = ws.getRow(r);
  const cl = confRow.getCell(1);
  cl.value = "Score";
  cl.font = FONTS.base;
  cl.alignment = { horizontal: "left", indent: 1 };
  const cv = confRow.getCell(2);
  cv.value = confPct / 100;
  cv.numFmt = NUM_FMT.percent;
  cv.font = { ...FONTS.subtotal };
  cv.alignment = { horizontal: "right" };
  r++;

  const breakdown: Array<[string, number]> = [
    ["Kritiska problem", input.engine.validation.countsBySeverity.critical],
    ["Varningar", input.engine.validation.countsBySeverity.warning],
    ["Info", input.engine.validation.countsBySeverity.info],
  ];
  for (const [label, n] of breakdown) {
    const row = ws.getRow(r);
    const a = row.getCell(1);
    a.value = label;
    a.font = FONTS.base;
    a.alignment = { horizontal: "left", indent: 2 };
    const b = row.getCell(2);
    b.value = n;
    b.numFmt = NUM_FMT.number;
    b.alignment = { horizontal: "right" };
    r++;
  }

  // Footer hint
  r += 2;
  ws.mergeCells(r, 1, r, 4);
  const note = ws.getCell(r, 1);
  note.value = "Konfidentiellt · Genererad av Ledger.io";
  note.font = FONTS.meta;
  note.alignment = { horizontal: "left" };

  // Tighten header row borders
  ws.getRow(1).border = BORDERS.headerRow;
}

function formatNum(n: number): string {
  return Math.round(n).toLocaleString("sv-SE");
}
