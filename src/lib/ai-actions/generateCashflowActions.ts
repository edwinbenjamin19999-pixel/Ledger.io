import { ACTION_THRESHOLDS, deriveConfidence, type AIAction } from "./types";
import type {
  CapitalItem,
  MonthlyCapitalNeed,
} from "@/hooks/useMonthlyCapitalNeed";

interface GenerateInput {
  data: MonthlyCapitalNeed;
  onNavigate: (path: string) => void;
}

export function generateCashflowActions({
  data,
  onNavigate,
}: GenerateInput): AIAction[] {
  const actions: AIAction[] = [];

  // 1. Overdue receivables → AR follow-up (high impact)
  const today = new Date();
  const overdueIncoming = data.items.filter(
    (i: CapitalItem) =>
      i.category === "customer_invoices" && new Date(i.date) < today,
  );
  const overdueTotal = overdueIncoming.reduce((a, b) => a + b.amount, 0);

  if (overdueTotal > 0) {
    actions.push({
      id: "cash.overdue.ar",
      kind: "financial",
      module: "cashflow",
      title: "Driv in förfallna kundfakturor först",
      explanation: `${overdueIncoming.length} kundfaktura(or) är förfallna i denna period. Att samla in dessa stärker kassan direkt utan att behöva skjuta upp betalningar.`,
      impact: { amount: overdueTotal, label: "att hämta hem" },
      confidence: deriveConfidence(overdueIncoming.length),
      primary: {
        label: "Öppna AR-agent",
        onClick: () => onNavigate("/finance"),
      },
      secondary: {
        label: "Visa fakturor",
        onClick: () => onNavigate("/customer-ledger"),
      },
      evidence: [{ label: `${overdueIncoming.length} förfallna fakturor` }],
    });
  }

  // 2. Negative buffer → defer supplier payments (risk)
  if (data.status === "red" && data.bufferAfter < 0) {
    const supplierItems = data.items.filter((i) => i.category === "supplier_invoices");
    const supplierTotal = supplierItems.reduce((a, b) => a + b.amount, 0);
    actions.push({
      id: "cash.defer.suppliers",
      kind: "risk",
      module: "cashflow",
      title: "Skjut upp eller delbetala leverantörsfakturor",
      explanation: `Saldot saknar ${Math.abs(Math.round(data.bufferAfter)).toLocaleString("sv-SE")} kr för att täcka månadens utflöden. Identifiera leverantörer som kan vänta utan dröjsmålsränta.`,
      impact: { amount: supplierTotal, label: "möjligt att senarelägga" },
      confidence: deriveConfidence(supplierItems.length),
      primary: {
        label: "Öppna betalningar",
        onClick: () => onNavigate("/direct-payment"),
      },
      evidence: [{ label: `${supplierItems.length} leverantörsfakturor` }],
    });
  }

  // 3. Mid-month dip even if month ends positive (warning)
  if (data.riskDate && data.bufferAfter >= 0) {
    actions.push({
      id: "cash.mid.dip",
      kind: "optimization",
      module: "cashflow",
      title: "Tillfällig dipp under månaden",
      explanation: `Saldot går negativt ${new Date(data.riskDate).toLocaleDateString("sv-SE", { day: "numeric", month: "long" })} även om månaden slutar plus. Aktivera checkkredit eller tidigarelägg en kundfaktura för att undvika övertrasseringsavgift.`,
      impact: { label: "Förebygg övertrassering" },
      confidence: "medium",
      primary: {
        label: "Tidigarelägg fakturering",
        onClick: () => onNavigate("/invoicing"),
      },
      secondary: {
        label: "Visa kassaflöde",
        onClick: () => onNavigate("/cashflow-forecast"),
      },
      evidence: [{ label: `Risk: ${new Date(data.riskDate).toLocaleDateString("sv-SE")}` }],
    });
  }

  return actions.slice(0, 3);
}
