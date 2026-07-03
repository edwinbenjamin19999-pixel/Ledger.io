import {
  ACTION_THRESHOLDS,
  deriveConfidence,
  type AIAction,
} from "./types";
import type {
  AgeingBucket,
  CounterpartySummary,
} from "@/components/reports/ageing/ageingUtils";
import {
  handleSendReminder,
  handleMarkFollowup,
} from "@/components/reports/ageing/AgeingActions";

interface GenerateInput {
  buckets: AgeingBucket[];
  grouped: CounterpartySummary[];
  companyId: string;
  type: "AR" | "AP";
  onDrillCustomer?: (name: string) => void;
}

export function generateAgeingActions({
  buckets,
  grouped,
  companyId,
  type,
  onDrillCustomer,
}: GenerateInput): AIAction[] {
  const actions: AIAction[] = [];
  const overdueBuckets = buckets.slice(1);
  const overdueTotal = overdueBuckets.reduce((s, b) => s + b.total, 0);
  const overdueInvoices = overdueBuckets.flatMap((b) => b.invoices);
  const grandTotal = buckets.reduce((s, b) => s + b.total, 0);

  // 1. Total overdue exceeds threshold → bulk reminder
  if (
    type === "AR" &&
    overdueTotal >= ACTION_THRESHOLDS.OVERDUE_TOTAL_SEK &&
    overdueInvoices.length > 0
  ) {
    const counterparties = Array.from(
      new Set(overdueInvoices.map((i) => i.counterparty_name).filter(Boolean)),
    );
    actions.push({
      id: "ar.overdue.bulk",
      kind: "financial",
      module: "ageing",
      title: "Driv in förfallna kundfakturor",
      explanation: `${overdueInvoices.length} faktura(or) är förfallna. Skicka påminnelse till alla kunder samtidigt — historiskt återbetalas 60 % inom 7 dagar.`,
      impact: { amount: overdueTotal, label: "i risk" },
      confidence: deriveConfidence(overdueInvoices.length),
      primary: {
        label: `Skicka påminnelse (${counterparties.length})`,
        onClick: () => handleSendReminder(counterparties, companyId, type),
      },
      secondary: {
        label: "Markera för uppföljning",
        onClick: () => handleMarkFollowup(counterparties, companyId, type),
      },
      evidence: [
        { label: `${overdueInvoices.length} fakturor` },
        { label: `${counterparties.length} kunder` },
      ],
    });
  }

  // 2. Single counterparty with severe overdue (>90d or large amount)
  const heavyOverdue = grouped
    .filter((g) => g.buckets[4] > 0 || g.overdue >= ACTION_THRESHOLDS.OVERDUE_INVOICE_SEK)
    .slice(0, 1);

  heavyOverdue.forEach((g) => {
    const has90Plus = g.buckets[4] > 0;
    actions.push({
      id: `ar.heavy.${g.name}`,
      kind: "risk",
      module: "ageing",
      title: has90Plus
        ? `${g.name}: 90+ dagar förfallet`
        : `${g.name}: stor utestående post`,
      explanation: has90Plus
        ? `Faktura(or) över 90 dagar förfallna. Eskalera till inkasso eller direktkontakt — risk för kreditförlust ökar markant efter 90 dagar.`
        : `Stort utestående belopp hos en kund. Kontakta direkt innan beloppet växer.`,
      impact: { amount: g.overdue, label: "förfallet" },
      confidence: deriveConfidence(g.invoices.length),
      primary: {
        label: type === "AR" ? "Skicka påminnelse" : "Granska",
        onClick: () => handleSendReminder([g.name], companyId, type),
      },
      secondary: onDrillCustomer
        ? {
            label: "Visa fakturor",
            onClick: () => onDrillCustomer(g.name),
          }
        : undefined,
      evidence: [
        { label: `${g.invoices.length} fakturor` },
        { label: has90Plus ? "90+ dagar" : "Stor post" },
      ],
    });
  });

  // 3. Concentration risk: top 3 = >50% of outstanding
  if (grouped.length >= 3 && grandTotal > 0) {
    const top3 = grouped.slice(0, 3);
    const top3Total = top3.reduce((s, g) => s + g.total, 0);
    const concentration = top3Total / grandTotal;
    if (concentration > ACTION_THRESHOLDS.CONCENTRATION_TOP3_PCT) {
      actions.push({
        id: "ar.concentration.top3",
        kind: "risk",
        module: "ageing",
        title: "Hög kundkoncentration",
        explanation: `Top 3 kunder står för ${Math.round(concentration * 100)} % av utestående belopp (${top3.map((g) => g.name).join(", ")}). Sprid risk genom att aktivt prospektera nya kunder.`,
        impact: { amount: top3Total, label: `${Math.round(concentration * 100)} % av total` },
        confidence: deriveConfidence(grouped.length),
        primary: {
          label: "Visa koncentration",
          onClick: () => onDrillCustomer?.(top3[0].name),
        },
        evidence: top3.map((g) => ({ label: g.name })),
      });
    }
  }

  return actions.slice(0, 3);
}
