/**
 * Premium Statement Export — orchestrator.
 *
 * Single entry-point for PDF + Excel exports of RR / BR / Combined.
 * Reads from a `FinancialReport` (engine output), passes through the
 * StatementDocument layer, then renders via the premium PDF / XLSX renderers.
 */
import ExcelJS from "exceljs";
import { format as formatDate } from "date-fns";
import type { FinancialReport } from "@/lib/reports/engine";
import {
  buildStatementDocument,
  buildBothStatements,
} from "@/lib/reports/statementDocument";
import {
  renderStatementPDF,
  renderCombinedStatementsPDF,
} from "@/lib/reports/render/renderStatementPDF";
import { renderStatementSheet } from "@/lib/reports/render/renderStatementXLSX";

export type StatementLens = "RR" | "BR" | "combined";

const safe = (s: string) => (s || "report").replace(/[^a-z0-9-_]/gi, "_");

function downloadBlob(buffer: ArrayBuffer | Blob, filename: string, mime: string) {
  const blob = buffer instanceof Blob ? buffer : new Blob([buffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ExportStatementOptions {
  acknowledgeImbalance?: boolean;
}

/** Export a PDF for the given lens. */
export function exportStatementPDF(
  report: FinancialReport,
  lens: StatementLens,
  opts: ExportStatementOptions = {},
) {
  if (!report.hasData) throw new Error("Ingen data i vald period — exporten kan inte genereras.");
  if (lens !== "RR" && !report.validation.balanced && !opts.acknowledgeImbalance) {
    throw new Error("Balansräkningen är inte i balans. Bekräfta innan export.");
  }

  const company = safe(report.company.name);
  const period = formatDate(report.period.toDate, "yyyy-MM-dd");

  if (lens === "combined") {
    const { rr, br } = buildBothStatements(report);
    renderCombinedStatementsPDF(rr, br, `${company}_RR-BR_${period}.pdf`);
    return;
  }
  const docModel = buildStatementDocument(report, lens);
  renderStatementPDF(docModel, `${company}_${lens}_${period}.pdf`);
}

/** Export an Excel workbook (one sheet per lens). */
export async function exportStatementXLSX(
  report: FinancialReport,
  lens: StatementLens,
  opts: ExportStatementOptions = {},
) {
  if (!report.hasData) throw new Error("Ingen data i vald period — exporten kan inte genereras.");
  if (lens !== "RR" && !report.validation.balanced && !opts.acknowledgeImbalance) {
    throw new Error("Balansräkningen är inte i balans. Bekräfta innan export.");
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Ledger.io";
  wb.created = new Date();
  wb.company = report.company.name;

  if (lens === "RR" || lens === "combined") {
    renderStatementSheet(wb, buildStatementDocument(report, "RR"), "Resultaträkning");
  }
  if (lens === "BR" || lens === "combined") {
    renderStatementSheet(wb, buildStatementDocument(report, "BR"), "Balansräkning");
  }

  const company = safe(report.company.name);
  const period = formatDate(report.period.toDate, "yyyy-MM-dd");
  const tag = lens === "combined" ? "RR-BR" : lens;
  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(
    buffer as ArrayBuffer,
    `${company}_${tag}_${period}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}
