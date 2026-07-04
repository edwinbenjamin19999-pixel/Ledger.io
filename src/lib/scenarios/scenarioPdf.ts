/**
 * Executive A4 PDF export for a scenario.
 * Lazy-imports jsPDF + autoTable to keep the main bundle slim.
 */
import type { ScenarioRunResult, ScenarioKpis } from "./scenarioEngine";
import type { MonteCarloResult } from "./monteCarlo";
import type { BudgetDrivers } from "@/lib/budget/driverEngine";

export interface ScenarioPdfInput {
  companyName: string;
  scenarioName: string;
  narrative?: string;
  result: ScenarioRunResult;
  kpis: ScenarioKpis;
  monteCarlo?: MonteCarloResult | null;
  risks?: string[];
  recommendations?: string[];
  /** Optional canvas snapshot of the cash/EBIT chart (data URL). */
  chartImageDataUrl?: string;
  baseDrivers: BudgetDrivers;
}

const DRIVER_LABELS: Record<keyof BudgetDrivers, string> = {
  startingCustomers: "Startkunder",
  newCustomersPerMonth: "Nya kunder/mån",
  churnRate: "Churn (%/mån)",
  averageRevenuePerCustomer: "ARPU (kr/mån)",
  priceGrowthRate: "Prisökning (%/år)",
  cogsPercent: "COGS (% av intäkt)",
  salaryMonthly: "Personalkostnad/mån",
  marketingBudget: "Marknadsföring/mån",
  adminCosts: "Admin/mån",
  rdCosts: "FoU/mån",
  dso: "DSO (dagar)",
  dpo: "DPO (dagar)",
  inventoryDays: "Lagerdagar",
  openingCash: "Ingående kassa",
  openingEquity: "Ingående eget kapital",
  openingLoans: "Ingående lån",
  openingFixedAssets: "Anläggningstillgångar",
  monthlyCapex: "Capex/mån",
  depreciationYears: "Avskrivningstid (år)",
  corporateTaxRate: "Bolagsskatt",
  interestRate: "Ränta (årlig)",
  loanRepaymentMonthly: "Amortering/mån",
};

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { maximumFractionDigits: 0 }) + " kr";

const fmtPct = (n: number) => n.toFixed(1) + " %";

export async function exportScenarioPdf(input: ScenarioPdfInput): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  // ── Cover ─────────────────────────────────────────────
  doc.setFillColor(8, 145, 178); // blue-600
  doc.rect(0, 0, pageW, 110, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(input.scenarioName, margin, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(input.companyName, margin, 82);
  doc.text(new Date().toLocaleDateString("sv-SE"), pageW - margin, 82, { align: "right" });

  y = 140;
  doc.setTextColor(15, 23, 42);

  if (input.narrative) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(input.narrative, pageW - 2 * margin);
    doc.text(lines, margin, y);
    y += lines.length * 13 + 12;
  }

  // ── KPI block ────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Nyckeltal", margin, y);
  y += 16;

  const kpiRows: [string, string][] = [
    ["Runway", input.kpis.runwayMonths != null ? `${input.kpis.runwayMonths} mån` : "Lönsam"],
    ["Break-even", input.kpis.breakEvenMonth != null ? `Mån ${input.kpis.breakEvenMonth + 1}` : "—"],
    ["Kassa december", fmt(input.kpis.endingCash)],
    ["Årets EBIT", fmt(input.kpis.annualEbit)],
    ["EBITDA-marginal", fmtPct(input.kpis.ebitMarginPct)],
  ];

  autoTable(doc, {
    startY: y,
    head: [["KPI", "Värde"]],
    body: kpiRows,
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [8, 145, 178], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 6 },
    theme: "grid",
  });
  // @ts-expect-error – autoTable adds lastAutoTable
  y = doc.lastAutoTable.finalY + 16;

  // ── Chart snapshot ───────────────────────────────────
  if (input.chartImageDataUrl) {
    if (y > pageH - 240) { doc.addPage(); y = margin; }
    const w = pageW - 2 * margin;
    const h = 200;
    try {
      doc.addImage(input.chartImageDataUrl, "PNG", margin, y, w, h);
      y += h + 16;
    } catch {
      // ignore broken image
    }
  }

  // ── Assumptions ──────────────────────────────────────
  if (y > pageH - 200) { doc.addPage(); y = margin; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Antaganden", margin, y);
  y += 8;

  const driverRows: [string, string, string][] = [];
  (Object.keys(input.result.drivers) as (keyof BudgetDrivers)[]).forEach((k) => {
    const base = Number(input.baseDrivers[k] ?? 0);
    const next = Number(input.result.drivers[k] ?? 0);
    const delta = next - base;
    const label = DRIVER_LABELS[k] ?? String(k);
    driverRows.push([
      label,
      typeof next === "number" && Number.isFinite(next)
        ? next.toLocaleString("sv-SE", { maximumFractionDigits: 2 })
        : String(next),
      delta === 0 ? "—" : (delta > 0 ? "+" : "") + delta.toLocaleString("sv-SE", { maximumFractionDigits: 2 }),
    ]);
  });

  autoTable(doc, {
    startY: y + 6,
    head: [["Drivare", "Värde", "Δ vs bas"]],
    body: driverRows,
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [8, 145, 178], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 4 },
    theme: "striped",
  });
  // @ts-expect-error – autoTable adds lastAutoTable
  y = doc.lastAutoTable.finalY + 16;

  // ── Monte Carlo ──────────────────────────────────────
  if (input.monteCarlo) {
    if (y > pageH - 140) { doc.addPage(); y = margin; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Monte Carlo (osäkerhet)", margin, y);
    y += 16;

    const mc = input.monteCarlo;
    autoTable(doc, {
      startY: y,
      head: [["Mått", "Värde"]],
      body: [
        ["Iterationer", String(mc.iterations)],
        ["Sannolikhet att överleva (kassa > 0)", `${mc.survivalPct.toFixed(0)} %`],
        ["Sannolikhet att nå mål", Number.isFinite(mc.targetHitPct) ? `${mc.targetHitPct.toFixed(0)} %` : "—"],
        ["Kassa dec — P10", fmt(mc.p10Cash[11])],
        ["Kassa dec — P50", fmt(mc.p50Cash[11])],
        ["Kassa dec — P90", fmt(mc.p90Cash[11])],
      ],
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [8, 145, 178], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 6 },
      theme: "grid",
    });
    // @ts-expect-error – autoTable adds lastAutoTable
    y = doc.lastAutoTable.finalY + 16;
  }

  // ── Risks + recommendations ──────────────────────────
  if ((input.risks?.length || 0) > 0 || (input.recommendations?.length || 0) > 0) {
    if (y > pageH - 160) { doc.addPage(); y = margin; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Risker & rekommendationer", margin, y);
    y += 14;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(190, 18, 60);
    doc.text("Risker", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    (input.risks || []).forEach((r) => {
      const lines = doc.splitTextToSize("• " + r, pageW - 2 * margin);
      doc.text(lines, margin, y);
      y += lines.length * 12;
    });

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(5, 150, 105);
    doc.text("Rekommendationer", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    (input.recommendations || []).forEach((r) => {
      const lines = doc.splitTextToSize("• " + r, pageW - 2 * margin);
      doc.text(lines, margin, y);
      y += lines.length * 12;
    });
  }

  // ── Footer ───────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Genererad av Cogniq · ${new Date().toLocaleDateString("sv-SE")}`,
      pageW / 2,
      pageH - 20,
      { align: "center" },
    );
    doc.text(`${i} / ${pageCount}`, pageW - margin, pageH - 20, { align: "right" });
  }

  const filename = `${input.scenarioName.replace(/[^a-z0-9_-]+/gi, "_")}_strategi.pdf`;
  doc.save(filename);
}
