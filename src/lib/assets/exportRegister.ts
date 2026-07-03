import * as ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { FixedAsset, DepreciationEntry } from "@/hooks/useAssets";

const fmt = (n: number) => Math.round(n).toLocaleString("sv-SE");

const statusLabel = (a: FixedAsset, bookValue: number) => {
  if (a.status === "sold" || a.status === "scrapped" || a.disposal_date) return "Avyttrad";
  if (a.status === "fully_depreciated") return "Fullt avskriven";
  if (bookValue <= (a.residual_value || 0) + 0.01) return "Fullt avskriven";
  return "Aktiv";
};

const methodLabel = (m: string) =>
  m === "straight_line" ? "Linjär" :
  m === "declining_balance_30" ? "Degressiv 30%" :
  m === "declining_balance_20" ? "Degressiv 20%" :
  m === "none" ? "Ingen" : m;

interface RegisterRow {
  asset: FixedAsset;
  bookValue: number;
  accumulated: number;
}

const buildRows = (
  assets: FixedAsset[],
  getBookValue: (a: FixedAsset) => number,
  getAccumulated: (a: FixedAsset) => number,
): RegisterRow[] =>
  assets.map((a) => ({
    asset: a,
    bookValue: getBookValue(a),
    accumulated: getAccumulated(a),
  }));

export async function exportAssetRegisterExcel(
  assets: FixedAsset[],
  entries: DepreciationEntry[],
  getBookValue: (a: FixedAsset) => number,
  getAccumulated: (a: FixedAsset) => number,
  companyName: string,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Bokfy";
  wb.created = new Date();

  // === Register sheet ===
  const ws = wb.addWorksheet("Anläggningsregister");
  ws.columns = [
    { header: "Tillgång", key: "name", width: 32 },
    { header: "Kategori", key: "cat", width: 18 },
    { header: "Anskaffningsvärde", key: "cost", width: 18 },
    { header: "Anskaffningsdatum", key: "date", width: 16 },
    { header: "Metod", key: "method", width: 16 },
    { header: "Nyttjandeperiod (år)", key: "life", width: 18 },
    { header: "Restvärde", key: "residual", width: 14 },
    { header: "Ack. avskrivningar", key: "acc", width: 18 },
    { header: "Bokfört värde", key: "book", width: 16 },
    { header: "Status", key: "status", width: 16 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F1F35" },
  };
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  const rows = buildRows(assets, getBookValue, getAccumulated);
  rows.forEach((r) => {
    ws.addRow({
      name: r.asset.asset_name,
      cat: r.asset.category || r.asset.asset_type,
      cost: Number(r.asset.acquisition_cost),
      date: r.asset.acquisition_date,
      method: methodLabel(r.asset.depreciation_method),
      life: r.asset.useful_life_years,
      residual: Number(r.asset.residual_value || 0),
      acc: r.accumulated,
      book: r.bookValue,
      status: statusLabel(r.asset, r.bookValue),
    });
  });

  // Totals row with formulas
  const lastDataRow = rows.length + 1;
  if (rows.length > 0) {
    const totalRow = ws.addRow({
      name: "TOTALT",
      cost: { formula: `SUM(C2:C${lastDataRow})` },
      acc: { formula: `SUM(H2:H${lastDataRow})` },
      book: { formula: `SUM(I2:I${lastDataRow})` },
    });
    totalRow.font = { bold: true };
    totalRow.border = { top: { style: "thin" } };
  }

  // Number formatting
  ["C", "G", "H", "I"].forEach((col) => {
    ws.getColumn(col).numFmt = "#,##0";
    ws.getColumn(col).alignment = { horizontal: "right" };
  });

  // === Depreciation schedule sheet ===
  const ws2 = wb.addWorksheet("Avskrivningsplan");
  ws2.columns = [
    { header: "Tillgång", key: "name", width: 32 },
    { header: "Period start", key: "ps", width: 14 },
    { header: "Period slut", key: "pe", width: 14 },
    { header: "Avskrivning", key: "amt", width: 14 },
    { header: "Ack. avskrivningar", key: "acc", width: 18 },
    { header: "Bokfört värde", key: "book", width: 14 },
  ];
  ws2.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws2.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F1F35" },
  };

  const byAsset = new Map<string, FixedAsset>(assets.map((a) => [a.id, a]));
  entries
    .slice()
    .sort((a, b) => a.period_start.localeCompare(b.period_start))
    .forEach((e) => {
      ws2.addRow({
        name: byAsset.get(e.fixed_asset_id)?.asset_name || "—",
        ps: e.period_start,
        pe: e.period_end,
        amt: Number(e.depreciation_amount),
        acc: Number(e.accumulated_depreciation),
        book: Number(e.book_value),
      });
    });
  ["D", "E", "F"].forEach((col) => {
    ws2.getColumn(col).numFmt = "#,##0";
    ws2.getColumn(col).alignment = { horizontal: "right" };
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Anlaggningsregister_${companyName.replace(/\s+/g, "_")}_${new Date()
    .toISOString()
    .slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAssetRegisterPDF(
  assets: FixedAsset[],
  getBookValue: (a: FixedAsset) => number,
  getAccumulated: (a: FixedAsset) => number,
  companyName: string,
) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text("Anläggningsregister", 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(companyName, 14, 21);
  doc.text(`Utskrivet: ${new Date().toLocaleDateString("sv-SE")}`, 14, 26);

  const rows = buildRows(assets, getBookValue, getAccumulated);
  const totalCost = rows.reduce((s, r) => s + Number(r.asset.acquisition_cost), 0);
  const totalAcc = rows.reduce((s, r) => s + r.accumulated, 0);
  const totalBook = rows.reduce((s, r) => s + r.bookValue, 0);

  autoTable(doc, {
    startY: 32,
    head: [[
      "Tillgång", "Kategori", "Ansk.värde", "Ansk.datum",
      "Metod", "Nyttj.år", "Ack. avskr.", "Bokfört", "Status",
    ]],
    body: rows.map((r) => [
      r.asset.asset_name,
      r.asset.category || r.asset.asset_type,
      fmt(Number(r.asset.acquisition_cost)),
      r.asset.acquisition_date,
      methodLabel(r.asset.depreciation_method),
      String(r.asset.useful_life_years),
      fmt(r.accumulated),
      fmt(r.bookValue),
      statusLabel(r.asset, r.bookValue),
    ]),
    foot: [[
      "TOTALT", "", fmt(totalCost), "", "", "",
      fmt(totalAcc), fmt(totalBook), "",
    ]],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 31, 53], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold" },
    columnStyles: {
      2: { halign: "right" }, 5: { halign: "right" },
      6: { halign: "right" }, 7: { halign: "right" },
    },
  });

  doc.save(
    `Anlaggningsregister_${companyName.replace(/\s+/g, "_")}_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`,
  );
}
