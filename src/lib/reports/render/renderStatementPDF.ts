/**
 * Premium unified PDF renderer for RR (Resultaträkning) + BR (Balansräkning).
 *
 * One design system, one set of primitives → RR and BR feel like sister
 * documents in the same investor-grade report.
 *
 *   • RR  — A4 portrait, vertical sections (Intäkter → Kostnader → Resultat)
 *   • BR  — A4 landscape, two-column split: Tillgångar | Eget kapital & Skulder
 *   • Combined — RR portrait page(s) followed by BR landscape page(s) in ONE PDF
 *
 * All three modes share:
 *   - Identical header (title left, period below, company right, divider)
 *   - Identical footer (Cogniq · timestamp · Sida X av Y)
 *   - Identical typography levels L1–L6 (PDF_TYPE)
 *   - Identical spacing scale (PDF_SPACING)
 *   - Identical number formatting via formatPdfNumber (negatives in parentheses)
 *   - Identical row primitive `drawRow` so column drift is impossible
 */
import { jsPDF } from "jspdf";
import { format as formatDate } from "date-fns";
import type { StatementDocument, StatementRow, StatementColumn } from "../statementDocument";
import {
  PDF_COLOR as C,
  PDF_LAYOUT as L,
  PDF_TYPE,
  PDF_SPACING as S,
  PDF_RULE,
  A4_PORTRAIT,
  A4_LANDSCAPE,
  formatPdfNumber,
  formatPdfPercent,
} from "./typography";

const FONT = "helvetica";

// ─────────────────────────────────────────────────────────────────────────
// Low-level helpers
// ─────────────────────────────────────────────────────────────────────────

type ColorKey = keyof typeof C;
const colorOf = (key: ColorKey | string): [number, number, number] =>
  (C as Record<string, [number, number, number]>)[key] ?? C.slate800;

function setText(pdf: jsPDF, key: ColorKey | string) {
  const [r, g, b] = colorOf(key);
  pdf.setTextColor(r, g, b);
}
function setDraw(pdf: jsPDF, key: ColorKey | string) {
  const [r, g, b] = colorOf(key);
  pdf.setDrawColor(r, g, b);
}
function setFill(pdf: jsPDF, key: ColorKey | string) {
  const [r, g, b] = colorOf(key);
  pdf.setFillColor(r, g, b);
}

interface TypeStyle {
  size: number;
  weight: "bold" | "normal";
  color: string;
  transform: "none" | "upper";
  tracking?: number;
}

function applyType(pdf: jsPDF, t: TypeStyle) {
  pdf.setFont(FONT, t.weight);
  pdf.setFontSize(t.size);
  setText(pdf, t.color);
}

function transformLabel(label: string, transform: "none" | "upper"): string {
  return transform === "upper" ? label.toUpperCase() : label;
}

function fitText(pdf: jsPDF, text: string, maxWidth: number): string {
  if (pdf.getTextWidth(text) <= maxWidth) return text;
  let s = text;
  while (s.length > 4 && pdf.getTextWidth(s + "…") > maxWidth) {
    s = s.slice(0, -1);
  }
  return s + "…";
}

// ─────────────────────────────────────────────────────────────────────────
// Page geometry
// ─────────────────────────────────────────────────────────────────────────

interface PageGeom {
  width: number;
  height: number;
  innerLeft: number;
  innerRight: number;
  innerTop: number;
  innerBottom: number;
  innerWidth: number;
}

function pageGeom(orientation: "portrait" | "landscape"): PageGeom {
  const p = orientation === "portrait" ? A4_PORTRAIT : A4_LANDSCAPE;
  return {
    width: p.width,
    height: p.height,
    innerLeft: L.margin.left,
    innerRight: p.width - L.margin.right,
    innerTop: L.margin.top,
    innerBottom: p.height - L.margin.bottom,
    innerWidth: p.width - L.margin.left - L.margin.right,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Column model — used by RR (full width) and each BR half (half width)
// ─────────────────────────────────────────────────────────────────────────

interface ColLayout {
  cols: StatementColumn[];
  /** right-edge x for each column */
  rightX: number[];
  /** left-edge x for each column */
  leftX: number[];
  /** width of each column */
  width: number[];
  /** total spanned width */
  totalWidth: number;
}

function layoutColumns(
  cols: StatementColumn[],
  blockLeft: number,
  blockRight: number,
): ColLayout {
  const blockWidth = blockRight - blockLeft;
  // Percentage allocation by column key — when optional columns (budget/PY)
  // are absent the remaining columns expand to fill 100% of the block width.
  // Locked 8-column accounting grid (sums to 1.00).
  // Konto + Benämning sit visually together (6 + 34 = 40% left block).
  const PCT: Record<string, number> = {
    code: 0.06,
    label: 0.34,
    perioden: 0.12,
    ingBalans: 0.12,
    utgSaldo: 0.12,
    budget: 0.10,
    varKr: 0.08,
    varPct: 0.06,
    // Legacy keys — kept tiny so any stray column still renders, but spec drops them.
    py: 0,
    pyPct: 0,
  };
  const rawPcts = cols.map((c) => PCT[c.key] ?? 0.1);
  const sum = rawPcts.reduce((s, p) => s + p, 0) || 1;
  const widths = rawPcts.map((p) => (p / sum) * blockWidth);

  const leftX: number[] = [];
  const rightX: number[] = [];
  let cur = blockLeft;
  widths.forEach((w) => {
    leftX.push(cur);
    cur += w;
    rightX.push(cur);
  });
  return { cols, leftX, rightX, width: widths, totalWidth: cur - blockLeft };
}

// ─────────────────────────────────────────────────────────────────────────
// Unified header + footer (same on every page, both reports)
// ─────────────────────────────────────────────────────────────────────────

interface HeaderCtx {
  title: string;
  period: string;
  company: string;
  /** Optional small label e.g. "(forts.)" or "Tillgångar" */
  subtitle?: string;
}

function renderUnifiedHeader(pdf: jsPDF, geom: PageGeom, h: HeaderCtx): number {
  // Title (L1)
  applyType(pdf, PDF_TYPE.L1_title);
  pdf.text(h.title, geom.innerLeft, geom.innerTop - 18);

  // Period (meta) directly under title
  applyType(pdf, PDF_TYPE.meta);
  pdf.text(h.period, geom.innerLeft, geom.innerTop - 6);

  // Company name top-right, small caps style
  applyType(pdf, PDF_TYPE.micro);
  pdf.text(h.company.toUpperCase(), geom.innerRight, geom.innerTop - 18, { align: "right" });

  if (h.subtitle) {
    applyType(pdf, PDF_TYPE.meta);
    pdf.text(h.subtitle, geom.innerRight, geom.innerTop - 6, { align: "right" });
  }

  // Thin divider line
  setDraw(pdf, PDF_RULE.divider.color);
  pdf.setLineWidth(PDF_RULE.divider.width);
  pdf.line(geom.innerLeft, geom.innerTop, geom.innerRight, geom.innerTop);

  return geom.innerTop + S.headerGap;
}

function renderUnifiedFooter(
  pdf: jsPDF,
  geom: PageGeom,
  page: number,
  total: number,
) {
  applyType(pdf, PDF_TYPE.footer);
  const y = geom.height - L.margin.bottom + 28;
  pdf.text(
    `Genererad av Cogniq · ${formatDate(new Date(), "yyyy-MM-dd HH:mm")}`,
    geom.innerLeft,
    y,
  );
  pdf.text(`Sida ${page} av ${total}`, geom.innerRight, y, { align: "right" });
}

// ─────────────────────────────────────────────────────────────────────────
// Column header strip (top of body, also repeats per page)
// ─────────────────────────────────────────────────────────────────────────

function drawColumnHeaders(pdf: jsPDF, layout: ColLayout, y: number): number {
  applyType(pdf, PDF_TYPE.micro);
  layout.cols.forEach((col, i) => {
    const label = col.label.toUpperCase();
    if (col.align === "right") {
      pdf.text(label, layout.rightX[i] - 2, y + 7);
    } else {
      pdf.text(label, layout.leftX[i], y + 7);
    }
  });
  setDraw(pdf, PDF_RULE.hairline.color);
  pdf.setLineWidth(PDF_RULE.hairline.width);
  pdf.line(layout.leftX[0], y + 10, layout.rightX[layout.rightX.length - 1], y + 10);
  return y + 10 + S.bodyGap;
}

// ─────────────────────────────────────────────────────────────────────────
// drawRow — single row primitive used by RR + BR halves
// ─────────────────────────────────────────────────────────────────────────

function drawValues(
  pdf: jsPDF,
  layout: ColLayout,
  values: number[],
  y: number,
  weight: "bold" | "normal",
  color: ColorKey,
) {
  pdf.setFont(FONT, weight);
  setText(pdf, color);
  const baseSize = pdf.getFontSize();
  let valIdx = 0;
  for (let i = 0; i < layout.cols.length; i++) {
    const col = layout.cols[i];
    if (col.align !== "right") continue;
    const v = values[valIdx];
    const text =
      col.format === "percent" ? formatPdfPercent(v) : formatPdfNumber(v);
    const cellW = layout.width[i] - 4;
    // shrink-to-fit (never wrap): measure → drop 1pt at a time, floor at 7pt
    let size = baseSize;
    pdf.setFontSize(size);
    while (pdf.getTextWidth(text) > cellW && size > 7) {
      size -= 0.5;
      pdf.setFontSize(size);
    }
    pdf.text(text, layout.rightX[i] - 2, y);
    if (size !== baseSize) pdf.setFontSize(baseSize);
    valIdx++;
  }
}

interface RowCtx {
  pdf: jsPDF;
  layout: ColLayout;
  y: number;
}

function drawRow(ctx: RowCtx, row: StatementRow): number {
  const { pdf, layout } = ctx;
  let { y } = ctx;

  switch (row.kind) {
    case "spacer":
      return y + S.spacer;

    case "section": {
      y += S.sectionGap;
      applyType(pdf, PDF_TYPE.L2_section);
      pdf.text(transformLabel(row.label, "upper"), layout.leftX[0], y + 9);
      setDraw(pdf, PDF_RULE.divider.color);
      pdf.setLineWidth(PDF_RULE.divider.width);
      pdf.line(layout.leftX[0], y + S.sectionH - 2, layout.rightX[layout.rightX.length - 1], y + S.sectionH - 2);
      return y + S.sectionH;
    }

    case "group": {
      y += S.groupGap;
      applyType(pdf, PDF_TYPE.L3_group);
      pdf.text(row.label, layout.leftX[0], y + 9);
      return y + S.groupH;
    }

    case "account": {
      // Konto + Benämning grouped: code at column-left, label starts immediately
      // after the code's measured width + 6pt — no visual gap.
      applyType(pdf, PDF_TYPE.L4_account);
      pdf.text(row.code, layout.leftX[0], y + 8);
      const codeW = pdf.getTextWidth(row.code);
      const labelStartX = layout.leftX[0] + codeW + 6;
      applyType(pdf, PDF_TYPE.L4_value);
      const labelMax = layout.rightX[1] - labelStartX - 2;
      pdf.text(fitText(pdf, row.label, labelMax), labelStartX, y + 8);
      drawValues(pdf, layout, row.values, y + 8, "normal", "slate800");
      return y + S.rowH;
    }

    case "subtotal": {
      y += S.beforeTotal;
      const firstNumIdx = layout.cols.findIndex((c) => c.align === "right");
      setDraw(pdf, PDF_RULE.subtotal.color);
      pdf.setLineWidth(PDF_RULE.subtotal.width);
      pdf.line(layout.leftX[firstNumIdx], y, layout.rightX[layout.rightX.length - 1], y);
      applyType(pdf, PDF_TYPE.L5_subtotal);
      pdf.text(row.label, layout.leftX[0], y + 10);
      drawValues(pdf, layout, row.values, y + 10, "bold", "slate900");
      return y + S.subtotalH;
    }

    case "total": {
      y += S.beforeTotal;
      setDraw(pdf, PDF_RULE.total.color);
      pdf.setLineWidth(PDF_RULE.total.width);
      pdf.line(layout.leftX[0], y, layout.rightX[layout.rightX.length - 1], y);
      pdf.setLineWidth(PDF_RULE.totalUnder.width);
      pdf.line(layout.leftX[0], y + 2, layout.rightX[layout.rightX.length - 1], y + 2);
      applyType(pdf, PDF_TYPE.L6_total);
      pdf.text(transformLabel(row.label, "upper"), layout.leftX[0], y + 13);
      drawValues(pdf, layout, row.values, y + 13, "bold", "slate900");
      setDraw(pdf, PDF_RULE.totalUnder.color);
      pdf.setLineWidth(PDF_RULE.totalUnder.width);
      pdf.line(layout.leftX[0], y + S.totalH - 2, layout.rightX[layout.rightX.length - 1], y + S.totalH - 2);
      return y + S.totalH + S.afterTotal;
    }
  }
}

// Estimated height for a row — used for keep-with-next pagination
function rowHeight(row: StatementRow): number {
  switch (row.kind) {
    case "spacer":   return S.spacer;
    case "section":  return S.sectionGap + S.sectionH;
    case "group":    return S.groupGap + S.groupH;
    case "account":  return S.rowH;
    case "subtotal": return S.beforeTotal + S.subtotalH + S.afterTotal / 2;
    case "total":    return S.beforeTotal + S.totalH + S.afterTotal;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Warning band (page 1 only)
// ─────────────────────────────────────────────────────────────────────────

function drawWarnings(
  pdf: jsPDF,
  geom: PageGeom,
  warnings: StatementDocument["warnings"],
  y: number,
): number {
  if (warnings.length === 0) return y;
  for (const w of warnings) {
    const bandH = 24;
    setFill(pdf, w.severity === "error" ? "amber50" : "slate50");
    pdf.rect(geom.innerLeft, y, geom.innerWidth, bandH, "F");
    setFill(pdf, w.severity === "error" ? "rose700" : "amber700");
    pdf.rect(geom.innerLeft, y, 3, bandH, "F");
    pdf.setFont(FONT, "bold");
    pdf.setFontSize(9);
    setText(pdf, w.severity === "error" ? "rose700" : "amber700");
    pdf.text(`! ${w.message}`, geom.innerLeft + 12, y + bandH / 2 + 3);
    y += bandH + 6;
  }
  return y + 4;
}

// ─────────────────────────────────────────────────────────────────────────
// PORTRAIT renderer (RR)
// ─────────────────────────────────────────────────────────────────────────

function renderPortraitBody(
  pdf: jsPDF,
  doc: StatementDocument,
  geom: PageGeom,
): { pages: number } {
  const layout = layoutColumns(doc.columns, geom.innerLeft, geom.innerRight);
  let currentSection = "";

  let y = renderUnifiedHeader(pdf, geom, {
    title: doc.header.title,
    period: doc.header.period,
    company: doc.header.company,
  });
  y = drawWarnings(pdf, geom, doc.warnings, y);
  y = drawColumnHeaders(pdf, layout, y);

  let pageNum = 1;
  const newPage = (subtitle?: string) => {
    pdf.addPage("a4", "landscape");
    pageNum += 1;
    y = renderUnifiedHeader(pdf, geom, {
      title: doc.header.title,
      period: doc.header.period,
      company: doc.header.company,
      subtitle,
    });
    y = drawColumnHeaders(pdf, layout, y);
  };

  if (doc.rows.length === 0) {
    pdf.setFont(FONT, "italic");
    pdf.setFontSize(10);
    setText(pdf, "slate500");
    pdf.text("Inga poster i vald period.", geom.innerLeft, y + 18);
    return { pages: pageNum };
  }

  for (let i = 0; i < doc.rows.length; i++) {
    const row = doc.rows[i];
    if (row.kind === "section") currentSection = row.label;

    // keep-with-next: section + first child shouldn't break
    let needed = rowHeight(row);
    if (row.kind === "section" && i + 1 < doc.rows.length) {
      needed += rowHeight(doc.rows[i + 1]);
    }
    if (row.kind === "group" && i + 1 < doc.rows.length) {
      needed += rowHeight(doc.rows[i + 1]);
    }
    if (y + needed > geom.innerBottom) {
      newPage(currentSection ? `${currentSection.toUpperCase()} (forts.)` : undefined);
    }

    y = drawRow({ pdf, layout, y }, row);
  }

  return { pages: pageNum };
}

// ─────────────────────────────────────────────────────────────────────────
// LANDSCAPE renderer (BR — Tillgångar | EK & Skulder side-by-side)
// ─────────────────────────────────────────────────────────────────────────

interface BRSplit {
  assetRows: StatementRow[];
  liabRows: StatementRow[];
  assetTotal: StatementRow | null;
  liabTotal: StatementRow | null;
  warnings: StatementDocument["warnings"];
  columns: StatementColumn[];
}

/**
 * Split a BR document into the two halves expected by the landscape layout.
 * We rely on the Swedish section names produced by the engine.
 */
function splitBalanceSheet(doc: StatementDocument): BRSplit {
  const assets: StatementRow[] = [];
  const liabs: StatementRow[] = [];
  let bucket: "asset" | "liab" | null = null;
  let assetTotal: StatementRow | null = null;
  let liabTotal: StatementRow | null = null;

  for (const row of doc.rows) {
    if (row.kind === "section") {
      const u = row.label.toUpperCase();
      // EK + skulder side
      if (u.includes("EGET KAPITAL") || u.includes("SKULDER") || u.includes("AVSÄTTNING")) {
        bucket = "liab";
      } else if (u.includes("TILLGÅNG")) {
        bucket = "asset";
      }
      // fall through and push into current bucket
    }
    if (row.kind === "total") {
      const u = row.label.toUpperCase();
      if (u.includes("SUMMA TILLGÅNG")) { assetTotal = row; continue; }
      if (u.includes("SUMMA EGET KAPITAL") || u.includes("SUMMA EK")) { liabTotal = row; continue; }
    }
    if (bucket === "asset") assets.push(row);
    else if (bucket === "liab") liabs.push(row);
    // rows before any section are ignored (shouldn't happen in BR)
  }

  // Trim leading spacers
  const trim = (arr: StatementRow[]) => {
    while (arr.length && arr[0].kind === "spacer") arr.shift();
    return arr;
  };

  return {
    assetRows: trim(assets),
    liabRows: trim(liabs),
    assetTotal,
    liabTotal,
    warnings: doc.warnings,
    columns: doc.columns,
  };
}

function renderLandscapeBody(
  pdf: jsPDF,
  doc: StatementDocument,
  geom: PageGeom,
): { pages: number } {
  const split = splitBalanceSheet(doc);
  const gutter = 28;
  const halfWidth = (geom.innerWidth - gutter) / 2;
  const leftBlock = { l: geom.innerLeft, r: geom.innerLeft + halfWidth };
  const rightBlock = { l: geom.innerLeft + halfWidth + gutter, r: geom.innerRight };

  const leftLayout = layoutColumns(split.columns, leftBlock.l, leftBlock.r);
  const rightLayout = layoutColumns(split.columns, rightBlock.l, rightBlock.r);

  let y = renderUnifiedHeader(pdf, geom, {
    title: doc.header.title,
    period: doc.header.period,
    company: doc.header.company,
  });
  y = drawWarnings(pdf, geom, split.warnings, y);

  // Twin column-header strips
  const headerRowY = y;
  const yAfterHeaders = Math.max(
    drawColumnHeaders(pdf, leftLayout, headerRowY),
    drawColumnHeaders(pdf, rightLayout, headerRowY),
  );

  // Half-titles ("TILLGÅNGAR" | "EGET KAPITAL OCH SKULDER")
  applyType(pdf, PDF_TYPE.L2_section);
  pdf.text("TILLGÅNGAR", leftLayout.leftX[0], yAfterHeaders + 12);
  pdf.text("EGET KAPITAL OCH SKULDER", rightLayout.leftX[0], yAfterHeaders + 12);
  setDraw(pdf, PDF_RULE.divider.color);
  pdf.setLineWidth(PDF_RULE.divider.width);
  pdf.line(leftLayout.leftX[0], yAfterHeaders + 18, leftLayout.rightX[leftLayout.rightX.length - 1], yAfterHeaders + 18);
  pdf.line(rightLayout.leftX[0], yAfterHeaders + 18, rightLayout.rightX[rightLayout.rightX.length - 1], yAfterHeaders + 18);

  const bodyStartY = yAfterHeaders + 28;

  // Center gutter divider
  const gutterX = leftBlock.r + gutter / 2;
  setDraw(pdf, PDF_RULE.hairline.color);
  pdf.setLineWidth(PDF_RULE.hairline.width);
  pdf.line(gutterX, headerRowY, gutterX, geom.innerBottom - 24);

  // Render both columns independently — each filters its own section headers
  // since we already provided the half-title.
  const renderHalf = (
    layout: ColLayout,
    rows: StatementRow[],
    finalTotal: StatementRow | null,
    startY: number,
  ): number => {
    let cy = startY;
    // skip the top-most section row (we already drew the half-title)
    let skipFirstSection = true;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (skipFirstSection && r.kind === "section") {
        skipFirstSection = false;
        continue;
      }
      if (cy + rowHeight(r) > geom.innerBottom - 40) break; // landscape BR fits on one page in practice
      cy = drawRow({ pdf, layout, y: cy }, r);
    }
    if (finalTotal) {
      cy = drawRow({ pdf, layout, y: cy }, finalTotal);
    }
    return cy;
  };

  const leftEndY = renderHalf(leftLayout, split.assetRows, split.assetTotal, bodyStartY);
  const rightEndY = renderHalf(rightLayout, split.liabRows, split.liabTotal, bodyStartY);

  // Balanskontroll band at the bottom
  const bandY = Math.max(leftEndY, rightEndY) + 16;
  if (bandY < geom.innerBottom - 12) {
    const balanced = split.warnings.length === 0;
    setFill(pdf, balanced ? "slate50" : "amber50");
    pdf.rect(geom.innerLeft, bandY, geom.innerWidth, 22, "F");
    pdf.setFont(FONT, "bold");
    pdf.setFontSize(9);
    setText(pdf, balanced ? "slate800" : "amber700");
    const msg = balanced
      ? "Balanskontroll: Tillgångar = Eget kapital + Skulder ✓"
      : "Balanskontroll: Tillgångar ≠ Eget kapital + Skulder — se varning ovan";
    pdf.text(msg, geom.innerLeft + 12, bandY + 14);
  }

  return { pages: 1 };
}

// ─────────────────────────────────────────────────────────────────────────
// Public entry points
// ─────────────────────────────────────────────────────────────────────────

/** Render one statement — ALWAYS A4 landscape (RR + BR unified). */
export function renderStatementPDF(doc: StatementDocument, filename?: string): jsPDF {
  const isBR = doc.header.title.toLowerCase().startsWith("balans");
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const geom = pageGeom("landscape");

  if (isBR) renderLandscapeBody(pdf, doc, geom);
  else renderPortraitBody(pdf, doc, geom);

  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    renderUnifiedFooter(pdf, geom, i, total);
  }

  if (filename) pdf.save(filename);
  return pdf;
}

/** Render BOTH RR + BR into a single landscape PDF. */
export function renderCombinedStatementsPDF(
  rr: StatementDocument,
  br: StatementDocument,
  filename?: string,
): jsPDF {
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const geom = pageGeom("landscape");

  // RR landscape page(s)
  renderPortraitBody(pdf, rr, geom);

  // BR landscape page(s) — same orientation, no switching
  pdf.addPage("a4", "landscape");
  renderLandscapeBody(pdf, br, geom);

  // Unified footers on every page
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    renderUnifiedFooter(pdf, geom, i, total);
  }

  if (filename) pdf.save(filename);
  return pdf;
}
