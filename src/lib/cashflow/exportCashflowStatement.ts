/**
 * Export orchestrator for the Kassaflödesanalys.
 * Mirrors `exportStatement.ts` — PDF + XLSX go through the existing premium
 * renderers; CSV is a simple flat dump.
 */
import ExcelJS from "exceljs";
import { format as formatDate } from "date-fns";
import type { StatementDocument } from "@/lib/reports/statementDocument";
import { renderStatementPDF } from "@/lib/reports/render/renderStatementPDF";
import { renderStatementSheet } from "@/lib/reports/render/renderStatementXLSX";

const safe = (s: string) => (s || "kassaflode").replace(/[^a-z0-9-_]/gi, "_");

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

export function exportCashflowPDF(doc: StatementDocument) {
  const company = safe(doc.header.company);
  const period = doc.header.period.split(" ").pop() ?? formatDate(new Date(), "yyyy-MM-dd");
  renderStatementPDF(doc, `${company}_Kassaflode_${period}.pdf`);
}

export async function exportCashflowXLSX(doc: StatementDocument) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "NorthLedger";
  wb.created = new Date();
  wb.company = doc.header.company;
  renderStatementSheet(wb, doc, "Kassaflödesanalys");
  const company = safe(doc.header.company);
  const period = doc.header.period.split(" ").pop() ?? formatDate(new Date(), "yyyy-MM-dd");
  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(
    buffer as ArrayBuffer,
    `${company}_Kassaflode_${period}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}

export function exportCashflowCSV(doc: StatementDocument) {
  const lines: string[] = [];
  const headers = doc.columns.map((c) => `"${c.label}"`).join(",");
  lines.push(`"Sektion",${headers}`);

  let currentSection = "";
  const fmt = (v: number, kind: string) => {
    if (!Number.isFinite(v)) return "";
    if (kind === "percent") return (v * 100).toFixed(1).replace(".", ",");
    return v.toFixed(0);
  };

  for (const row of doc.rows) {
    if (row.kind === "section") {
      currentSection = row.label;
      continue;
    }
    if (row.kind === "spacer") continue;
    const cells: string[] = [`"${currentSection}"`];
    if (row.kind === "account") {
      cells.push(`"${row.code}"`, `"${row.label}"`);
      const valueCols = doc.columns.slice(2);
      row.values.forEach((v, i) => cells.push(fmt(v, valueCols[i]?.format || "number")));
    } else {
      // subtotal / total / group
      cells.push("", `"${row.label}"`);
      const values = "values" in row ? row.values : [];
      const valueCols = doc.columns.slice(2);
      values.forEach((v, i) => cells.push(fmt(v, valueCols[i]?.format || "number")));
    }
    lines.push(cells.join(","));
  }

  const csv = "\uFEFF" + lines.join("\n"); // BOM for Excel
  const company = safe(doc.header.company);
  const period = doc.header.period.split(" ").pop() ?? formatDate(new Date(), "yyyy-MM-dd");
  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `${company}_Kassaflode_${period}.csv`,
    "text/csv",
  );
}
