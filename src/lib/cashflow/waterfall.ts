// Pure builder: turns CashFlowPeriod[] into 9-step cash waterfall with drilldown.
import type { CashFlowPeriod, CashFlowDetail } from "@/hooks/useCashFlow";

export type WaterfallStepKind =
  | "net_result"
  | "depreciation"
  | "delta_ar"
  | "delta_ap"
  | "delta_other_wc"
  | "cfo"
  | "cfi"
  | "cff"
  | "net_change";

export interface AccountContribution {
  account_number: string;
  account_name: string;
  amount: number;
  pctOfStep: number;
  details: CashFlowDetail[];
}

export interface WaterfallStep {
  kind: WaterfallStepKind;
  label: string;
  amount: number; // signed: + inflow, - outflow
  isTotal: boolean;
  pctOfTotal: number; // share of |net change|
  deltaPrev: number; // vs previous period of same kind
  accounts: AccountContribution[];
  // Direct details for verifications drilldown
  details: CashFlowDetail[];
}

const accountLabel = (n: string): string => {
  if (!n) return "Övrigt";
  if (n.startsWith("78") || n.startsWith("77")) return "Avskrivningar / Nedskrivningar";
  if (n.startsWith("15")) return "Kundfordringar";
  if (n.startsWith("24")) return "Leverantörsskulder";
  if (n.startsWith("16") || n.startsWith("17") || n.startsWith("28") || n.startsWith("29"))
    return "Övrigt rörelsekapital";
  if (n.match(/^1[0-3]/)) return "Investeringar";
  if (n.startsWith("23") || n.match(/^20[89]/) || n.startsWith("2082")) return "Finansiering";
  return "Rörelse";
};

function groupByAccount(details: CashFlowDetail[]): AccountContribution[] {
  const map = new Map<string, AccountContribution>();
  let total = 0;
  for (const d of details) {
    const key = d.account || "—";
    const existing = map.get(key);
    if (existing) {
      existing.amount += d.amount;
      existing.details.push(d);
    } else {
      map.set(key, {
        account_number: key,
        account_name: d.counterpart || accountLabel(key),
        amount: d.amount,
        pctOfStep: 0,
        details: [d],
      });
    }
    total += Math.abs(d.amount);
  }
  const arr = Array.from(map.values()).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  for (const a of arr) a.pctOfStep = total > 0 ? (Math.abs(a.amount) / total) * 100 : 0;
  return arr;
}

export interface BuildWaterfallOptions {
  current: CashFlowPeriod;
  previous?: CashFlowPeriod | null;
}

export function buildWaterfall({ current, previous }: BuildWaterfallOptions): WaterfallStep[] {
  const details = current.details ?? [];

  // Categorize details by economic kind via account number
  const byKind = new Map<WaterfallStepKind, CashFlowDetail[]>();
  const push = (k: WaterfallStepKind, d: CashFlowDetail) => {
    if (!byKind.has(k)) byKind.set(k, []);
    byKind.get(k)!.push(d);
  };

  for (const d of details) {
    const n = d.account || "";
    if (n.startsWith("78") || n.startsWith("77")) push("depreciation", d);
    else if (n.startsWith("15")) push("delta_ar", d);
    else if (n.startsWith("24")) push("delta_ap", d);
    else if (
      n.startsWith("16") ||
      n.startsWith("17") ||
      n.startsWith("28") ||
      n.startsWith("29")
    )
      push("delta_other_wc", d);
    else if (d.category === "investing") push("cfi", d);
    else if (d.category === "financing") push("cff", d);
    else push("net_result", d);
  }

  const sumKind = (k: WaterfallStepKind) =>
    (byKind.get(k) ?? []).reduce((s, d) => s + d.amount, 0);

  const netResult = sumKind("net_result");
  const depreciation = sumKind("depreciation");
  const deltaAR = sumKind("delta_ar");
  const deltaAP = sumKind("delta_ap");
  const deltaOther = sumKind("delta_other_wc");
  const cfo = netResult + depreciation + deltaAR + deltaAP + deltaOther;
  const cfi = sumKind("cfi");
  const cff = sumKind("cff");
  const netChange = cfo + cfi + cff;

  const totalAbs = Math.max(1, Math.abs(netChange));

  const prevDelta = (k: WaterfallStepKind, val: number) => {
    if (!previous) return 0;
    // Cheap proxy: difference between current and previous of same kind
    const prevDetails = (previous.details ?? []).filter((d) => {
      const n = d.account || "";
      if (k === "depreciation") return n.startsWith("78") || n.startsWith("77");
      if (k === "delta_ar") return n.startsWith("15");
      if (k === "delta_ap") return n.startsWith("24");
      if (k === "delta_other_wc")
        return (
          n.startsWith("16") || n.startsWith("17") || n.startsWith("28") || n.startsWith("29")
        );
      if (k === "cfi") return d.category === "investing";
      if (k === "cff") return d.category === "financing";
      if (k === "net_result")
        return (
          d.category === "operating" &&
          !n.startsWith("78") &&
          !n.startsWith("77") &&
          !n.startsWith("15") &&
          !n.startsWith("24") &&
          !n.startsWith("16") &&
          !n.startsWith("17") &&
          !n.startsWith("28") &&
          !n.startsWith("29")
        );
      return false;
    });
    const prevSum = prevDetails.reduce((s, d) => s + d.amount, 0);
    return val - prevSum;
  };

  const make = (
    kind: WaterfallStepKind,
    label: string,
    amount: number,
    isTotal: boolean,
  ): WaterfallStep => {
    const stepDetails = isTotal ? [] : byKind.get(kind) ?? [];
    return {
      kind,
      label,
      amount,
      isTotal,
      pctOfTotal: (Math.abs(amount) / totalAbs) * 100,
      deltaPrev: isTotal ? 0 : prevDelta(kind, amount),
      accounts: isTotal ? [] : groupByAccount(stepDetails),
      details: stepDetails,
    };
  };

  return [
    make("net_result", "Rörelseresultat", netResult, false),
    make("depreciation", "+ Avskrivningar", depreciation, false),
    make("delta_ar", "± Δ Kundfordringar", deltaAR, false),
    make("delta_ap", "± Δ Leverantörsskulder", deltaAP, false),
    make("delta_other_wc", "± Övrigt rörelsekapital", deltaOther, false),
    make("cfo", "= Kassaflöde rörelse", cfo, true),
    make("cfi", "± Investering", cfi, false),
    make("cff", "± Finansiering", cff, false),
    make("net_change", "= Netto kassaflöde", netChange, true),
  ];
}
