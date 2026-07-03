export type PeriodKey = "this-month" | "last-month" | "this-quarter" | "this-year" | "custom";

export interface DateRange {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  label: string;
}

export type WidgetId =
  | "result"
  | "revenue"
  | "gross-margin"
  | "liquidity"
  | "ar"
  | "ap"
  | "runway"
  | "vat-position"
  | "upcoming-payments"
  | "top-customers";

export interface WidgetMeta {
  id: WidgetId;
  title: string;
  description: string;
  isDefault: boolean;
}

export const WIDGET_LIBRARY: WidgetMeta[] = [
  { id: "result", title: "Resultat", description: "Nettoresultat denna period vs föregående år", isDefault: true },
  { id: "revenue", title: "Omsättning", description: "Intäkter denna period vs föregående", isDefault: true },
  { id: "gross-margin", title: "Bruttomarginal", description: "Bruttomarginal % + 6-månaderstrend", isDefault: true },
  { id: "liquidity", title: "Likviditet", description: "Aktuellt banksaldo + förändring sedan igår", isDefault: true },
  { id: "ar", title: "Kundfordringar", description: "Utestående kundfakturor + förfallet belopp", isDefault: false },
  { id: "ap", title: "Leverantörsskulder", description: "Utestående leverantörsskulder", isDefault: false },
  { id: "runway", title: "Likviditetshorisont", description: "Antal månader kassan räcker vid nuvarande utgiftstakt.", isDefault: false },
  { id: "vat-position", title: "Momsposition", description: "Netto moms att betala/få tillbaka", isDefault: false },
  { id: "upcoming-payments", title: "Kommande betalningar", description: "Utgående betalningar nästa 7 dagar", isDefault: false },
  { id: "top-customers", title: "Bästa kunder", description: "Topp 3 kunder efter intäkt denna period", isDefault: false },
];

export const DEFAULT_WIDGETS: WidgetId[] = WIDGET_LIBRARY.filter((w) => w.isDefault).map((w) => w.id);

export function computeRange(period: PeriodKey, custom?: { start: Date; end: Date }): DateRange {
  const now = new Date();
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

  let start: Date, end: Date, prevStart: Date, prevEnd: Date, label: string;

  switch (period) {
    case "last-month": {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      start = startOfMonth(lm);
      end = endOfMonth(lm);
      prevStart = startOfMonth(new Date(lm.getFullYear(), lm.getMonth() - 1, 1));
      prevEnd = endOfMonth(new Date(lm.getFullYear(), lm.getMonth() - 1, 1));
      label = lm.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
      break;
    }
    case "this-quarter": {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1);
      end = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59);
      prevStart = new Date(now.getFullYear(), q * 3 - 3, 1);
      prevEnd = new Date(now.getFullYear(), q * 3, 0, 23, 59, 59);
      label = `Q${q + 1} ${now.getFullYear()}`;
      break;
    }
    case "this-year": {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      label = String(now.getFullYear());
      break;
    }
    case "custom": {
      start = custom?.start ?? startOfMonth(now);
      end = custom?.end ?? endOfMonth(now);
      const diffMs = end.getTime() - start.getTime();
      prevStart = new Date(start.getTime() - diffMs - 1);
      prevEnd = new Date(start.getTime() - 1);
      label = `${start.toLocaleDateString("sv-SE")} – ${end.toLocaleDateString("sv-SE")}`;
      break;
    }
    case "this-month":
    default: {
      start = startOfMonth(now);
      end = endOfMonth(now);
      prevStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      prevEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      label = now.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
      break;
    }
  }

  return { start, end, prevStart, prevEnd, label };
}

export function fmtSEK(n: number, opts?: { compact?: boolean }): string {
  if (opts?.compact && Math.abs(n) >= 1_000_000) {
    return `${(n / 1_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} mkr`;
  }
  if (opts?.compact && Math.abs(n) >= 10_000) {
    return `${(n / 1_000).toLocaleString("sv-SE", { maximumFractionDigits: 0 })} tkr`;
  }
  return `${Math.round(n).toLocaleString("sv-SE")} kr`;
}

export function pctChange(curr: number, prev: number): number | null {
  if (!prev || !isFinite(prev)) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}
