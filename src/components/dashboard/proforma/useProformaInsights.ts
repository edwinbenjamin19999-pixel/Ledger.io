import { useMemo } from "react";

export interface ForecastPoint {
  period: string;
  predicted_income: number;
  predicted_expenses: number;
  predicted_result: number;
  confidence: number;
  seasonal_factor?: number;
}

export interface SeasonalPattern {
  month: string;
  avg_income: number;
  avg_expenses: number;
  pattern_strength: number;
}

export type InsightTone = "neutral" | "warning" | "critical" | "positive";

export interface ProformaInsight {
  id: "growth" | "margin" | "season" | "confidence" | "empty";
  tone: InsightTone;
  headline: string;
  detail?: string;
  metric?: string;
  actionLabel?: string;
  targetPeriod?: string;
}

export interface ConfidenceBandPoint {
  period: string;
  confLow: number;
  confHigh: number;
}

export interface ProformaInsightsBundle {
  primary: ProformaInsight;
  secondary: ProformaInsight[];
  riskMonths: Set<string>;
  confidenceBand: ConfidenceBandPoint[];
  avgConfidence: number;
  hasData: boolean;
}

const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`;
const fmtK = (v: number) =>
  `${v >= 0 ? "+" : "−"}${Math.round(Math.abs(v) / 1000)}k`;

export function useProformaInsights(
  forecast: ForecastPoint[],
  seasonal: SeasonalPattern[],
): ProformaInsightsBundle {
  return useMemo(() => {
    const hasData = forecast.length > 0;

    if (!hasData) {
      return {
        primary: {
          id: "empty",
          tone: "neutral",
          headline: "Mer historik krävs",
          detail: "Minst 6 månaders data behövs för att generera prognos.",
        },
        secondary: [],
        riskMonths: new Set(),
        confidenceBand: [],
        avgConfidence: 0,
        hasData: false,
      };
    }

    // Confidence band
    const avgConfidence =
      forecast.reduce((s, d) => s + d.confidence, 0) / forecast.length;
    const confidenceBand: ConfidenceBandPoint[] = forecast.map((d) => {
      const spread = Math.abs(d.predicted_result) * (1 - d.confidence);
      return {
        period: d.period,
        confLow: d.predicted_result - spread,
        confHigh: d.predicted_result + spread,
      };
    });

    // Risk months (margin < 10% or negative result)
    const riskMonths = new Set<string>();
    let worstMargin: { period: string; margin: number; result: number } | null =
      null;
    forecast.forEach((d) => {
      const margin = d.predicted_income > 0
        ? (d.predicted_result / d.predicted_income) * 100
        : -100;
      if (margin < 10 || d.predicted_result < 0) riskMonths.add(d.period);
      if (!worstMargin || margin < worstMargin.margin) {
        worstMargin = { period: d.period, margin, result: d.predicted_result };
      }
    });

    // Growth: first half vs second half
    const mid = Math.floor(forecast.length / 2);
    const firstHalf = forecast.slice(0, mid).reduce((s, d) => s + d.predicted_income, 0);
    const secondHalf = forecast.slice(mid).reduce((s, d) => s + d.predicted_income, 0);
    const growthPct = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

    // Seasonality: lowest seasonal_factor or pattern_strength
    let weakestSeason: { month: string; deviation: number } | null = null;
    forecast.forEach((d) => {
      if (d.seasonal_factor !== undefined && d.seasonal_factor < 0.85) {
        const dev = (d.seasonal_factor - 1) * 100;
        if (!weakestSeason || dev < weakestSeason.deviation) {
          weakestSeason = { month: d.period, deviation: dev };
        }
      }
    });
    if (!weakestSeason && seasonal.length > 0) {
      const sorted = [...seasonal].sort((a, b) => a.pattern_strength - b.pattern_strength);
      const w = sorted[0];
      if (w && w.pattern_strength < 0.85) {
        weakestSeason = { month: w.month, deviation: (w.pattern_strength - 1) * 100 };
      }
    }

    // Build insights
    const allNegative = forecast.every((d) => d.predicted_result < 0);
    const totalResult = forecast.reduce((s, d) => s + d.predicted_result, 0);

    let primary: ProformaInsight;
    if (allNegative) {
      primary = {
        id: "margin",
        tone: "critical",
        headline: `Negativt resultat förväntat alla ${forecast.length} månader`,
        detail: `Totalt prognosticerat resultat: ${fmtK(totalResult)} kr — granska kostnadsbas omgående.`,
      };
    } else if (avgConfidence < 0.5) {
      primary = {
        id: "confidence",
        tone: "warning",
        headline: "Låg träffsäkerhet — prognosen är osäker",
        detail: `AI-konfidens ${(avgConfidence * 100).toFixed(0)}%. Mer historisk data ger bättre prognos.`,
      };
    } else if (worstMargin && (worstMargin as any).margin < 10) {
      const wm = worstMargin as { period: string; margin: number; result: number };
      primary = {
        id: "margin",
        tone: wm.result < 0 ? "critical" : "warning",
        headline: `Marginal faller under 10% i ${wm.period}`,
        detail: `Resultat ${fmtK(wm.result)} kr (${wm.margin.toFixed(0)}% marginal) — bevaka likviditet.`,
        actionLabel: "Se detalj",
        targetPeriod: wm.period,
      };
    } else if (growthPct >= 5) {
      primary = {
        id: "growth",
        tone: "positive",
        headline: `Omsättning väntas öka ${growthPct.toFixed(0)}% kommande period`,
        detail: `Stark tillväxttrend i andra halvan av prognoshorisonten.`,
      };
    } else {
      primary = {
        id: "growth",
        tone: "positive",
        headline: "Stabil prognos — inga varningar",
        detail: `${forecast.length} månader inom marginalmål. AI-konfidens ${(avgConfidence * 100).toFixed(0)}%.`,
      };
    }

    const secondary: ProformaInsight[] = [
      {
        id: "growth",
        tone: growthPct >= 0 ? "positive" : "warning",
        headline: "Tillväxt",
        metric: fmtPct(growthPct),
        detail: `${forecast.length} mån prognos`,
      },
      weakestSeason
        ? {
            id: "season",
            tone: "warning",
            headline: "Svagaste säsong",
            metric: `${(weakestSeason as any).month}`,
            detail: `${fmtPct((weakestSeason as any).deviation)} mot snitt`,
          }
        : {
            id: "season",
            tone: "neutral",
            headline: "Säsong",
            metric: "Stabil",
            detail: "Ingen tydlig avvikelse",
          },
      {
        id: "confidence",
        tone: avgConfidence >= 0.7 ? "positive" : avgConfidence >= 0.5 ? "neutral" : "warning",
        headline: "Träffsäkerhet",
        metric: `${(avgConfidence * 100).toFixed(0)}%`,
        detail: `Baserat på ${seasonal.length || 24} mån historik`,
      },
    ];

    return {
      primary,
      secondary,
      riskMonths,
      confidenceBand,
      avgConfidence,
      hasData: true,
    };
  }, [forecast, seasonal]);
}
