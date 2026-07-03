import type { Workbook } from "exceljs";
import { ARGB, FILLS, FONTS } from "./excelStyleTokens";

export interface AICommentaryInput {
  summary?: string;
  keyDrivers?: string[];
  riskSignals?: string[];
  recommendedActions?: string[];
  confidenceReasoning?: string;
}

export function buildAICommentarySheet(wb: Workbook, input: AICommentaryInput): boolean {
  const hasContent =
    !!input.summary ||
    (input.keyDrivers?.length ?? 0) > 0 ||
    (input.riskSignals?.length ?? 0) > 0 ||
    (input.recommendedActions?.length ?? 0) > 0 ||
    !!input.confidenceReasoning;
  if (!hasContent) return false;

  const ws = wb.addWorksheet("AI CFO-analys", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
    properties: { tabColor: { argb: ARGB.cyan600 } },
  });
  ws.columns = [{ width: 26 }, { width: 90 }];

  let r = 1;

  ws.mergeCells(r, 1, r, 2);
  ws.getCell(r, 1).value = "AI CFO-analys";
  ws.getCell(r, 1).font = FONTS.title;
  ws.getRow(r).height = 28;
  r++;

  ws.mergeCells(r, 1, r, 2);
  ws.getCell(r, 1).value = "Genererad av NorthLedger · Validera alltid mot underlag innan extern presentation.";
  ws.getCell(r, 1).font = FONTS.meta;
  r += 2;

  const writeSection = (label: string, body: string | string[]) => {
    const headerRow = ws.getRow(r);
    headerRow.getCell(1).value = label;
    headerRow.getCell(1).font = FONTS.section;
    headerRow.getCell(1).fill = FILLS.sectionBand;
    headerRow.getCell(2).fill = FILLS.sectionBand;
    headerRow.height = 22;
    r++;

    if (Array.isArray(body)) {
      for (const item of body) {
        const row = ws.getRow(r);
        row.getCell(1).value = "•";
        row.getCell(1).alignment = { horizontal: "right", vertical: "top" };
        row.getCell(2).value = item;
        row.getCell(2).font = FONTS.base;
        row.getCell(2).alignment = { wrapText: true, vertical: "top" };
        row.height = Math.min(60, Math.max(20, Math.ceil(item.length / 80) * 18));
        r++;
      }
    } else {
      const row = ws.getRow(r);
      row.getCell(2).value = body;
      row.getCell(2).font = FONTS.base;
      row.getCell(2).alignment = { wrapText: true, vertical: "top" };
      row.height = Math.min(120, Math.max(28, Math.ceil(body.length / 80) * 18));
      r++;
    }
    r++;
  };

  if (input.summary) writeSection("Sammanfattning", input.summary);
  if (input.keyDrivers?.length) writeSection("Drivkrafter", input.keyDrivers);
  if (input.riskSignals?.length) writeSection("Risksignaler", input.riskSignals);
  if (input.recommendedActions?.length) writeSection("Rekommenderade åtgärder", input.recommendedActions);
  if (input.confidenceReasoning) writeSection("Confidence-resonemang", input.confidenceReasoning);

  return true;
}
