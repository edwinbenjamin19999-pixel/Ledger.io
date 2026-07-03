import type { Workbook } from "exceljs";
import type { ValidationReport } from "@/lib/reports/validationEngine";
import { ARGB, FILLS, FONTS, severityFill, severityLabel } from "./excelStyleTokens";

export function buildValidationSheet(wb: Workbook, validation: ValidationReport) {
  if (validation.findings.length === 0) return;

  const ws = wb.addWorksheet("Validering", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
    properties: { tabColor: { argb: ARGB.amber600 } },
  });

  ws.columns = [
    { width: 14 },
    { width: 38 },
    { width: 60 },
    { width: 24 },
    { width: 40 },
  ];

  let r = 1;

  // Title
  ws.mergeCells(r, 1, r, 5);
  ws.getCell(r, 1).value = "Valideringsrapport";
  ws.getCell(r, 1).font = FONTS.title;
  ws.getRow(r).height = 28;
  r++;

  ws.mergeCells(r, 1, r, 5);
  ws.getCell(r, 1).value = `${validation.findings.length} fynd · ${validation.countsBySeverity.critical} kritiska · ${validation.countsBySeverity.warning} varningar · ${validation.countsBySeverity.info} info`;
  ws.getCell(r, 1).font = FONTS.subtitle;
  r += 2;

  // Header
  const labels = ["Allvar", "Titel", "Beskrivning", "Berörda konton", "Föreslagen åtgärd"];
  const headerRow = ws.getRow(r);
  labels.forEach((l, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = l;
    c.font = FONTS.header;
    c.fill = FILLS.headerBand;
    c.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  });
  headerRow.height = 22;
  r++;

  // Findings
  for (const f of validation.findings) {
    const row = ws.getRow(r);
    const sevCell = row.getCell(1);
    sevCell.value = severityLabel(f.severity);
    sevCell.font = { ...FONTS.subtotal };
    sevCell.fill = severityFill(f.severity);
    sevCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

    row.getCell(2).value = f.title;
    row.getCell(2).font = { ...FONTS.base, bold: true };
    row.getCell(2).alignment = { vertical: "middle", horizontal: "left", wrapText: true };

    row.getCell(3).value = f.message;
    row.getCell(3).font = FONTS.base;
    row.getCell(3).alignment = { vertical: "middle", horizontal: "left", wrapText: true };

    row.getCell(4).value = f.affectedAccounts.length ? f.affectedAccounts.join(", ") : "—";
    row.getCell(4).font = FONTS.base;
    row.getCell(4).alignment = { vertical: "middle", horizontal: "left", wrapText: true };

    row.getCell(5).value = f.suggestedFix ?? "—";
    row.getCell(5).font = FONTS.base;
    row.getCell(5).alignment = { vertical: "middle", horizontal: "left", wrapText: true };

    row.height = 38;
    r++;
  }
}
