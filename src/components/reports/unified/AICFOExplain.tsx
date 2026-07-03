/**
 * AICFOExplain — global AI narrative layer, identical in RR and BR lenses.
 * Visual: locked to Ledger.io design system (DSAICFOSummary).
 */
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";
import type { FinancialReport } from "@/lib/reports/engine";
import type { ReportLens } from "./ReportLensSwitch";
import { DSAICFOSummary } from "@/components/ds";

interface AICFOExplainProps {
  report: FinancialReport;
  lens: ReportLens;
  className?: string;
}

function buildNarrative(report: FinancialReport, lens: ReportLens): string[] {
  const { totals, validation, imbalance } = report;
  const sentences: string[] = [];

  // 1. Result driver
  if (totals.revenue > 0 || totals.costs > 0) {
    if (totals.result >= 0) {
      sentences.push(
        `Perioden visar ett positivt resultat på ${formatSEK(totals.result)} med en marginal på ${totals.marginPct.toFixed(1)}%.`,
      );
    } else {
      sentences.push(
        `Perioden visar en förlust på ${formatSEK(Math.abs(totals.result))} — kostnaderna (${formatSEK(Math.abs(totals.costs))}) överstiger intäkterna.`,
      );
    }
  } else {
    sentences.push("Inga större resultatposter har bokförts i perioden ännu.");
  }

  // 2. Balance structure
  if (totals.assets > 0 || totals.liabilities > 0) {
    const equityShare = totals.assets > 0 ? (totals.equity / totals.assets) * 100 : 0;
    sentences.push(
      `Tillgångarna uppgår till ${formatSEK(totals.assets)} och finansieras till ${equityShare.toFixed(0)}% av eget kapital.`,
    );
  }

  // 3. Consistency between RR and BR
  if (!validation.balanced) {
    const cat =
      imbalance.likelyCategory === "result_carry"
        ? "periodens resultat verkar inte vara fullt överfört till eget kapital (2099)"
        : imbalance.likelyCategory === "asset"
          ? "ett eller flera tillgångskonton ser onormala ut"
          : imbalance.likelyCategory === "equity"
            ? "eget-kapital-konton signalerar avvikelse"
            : "orsaken är inte entydig";
    sentences.push(
      `RR och BR är inte konsistenta — differens ${formatSEK(Math.abs(validation.imbalanceDiff))}. Trolig orsak: ${cat}.`,
    );
  } else if (validation.countsBySeverity.warning > 0) {
    sentences.push(
      `RR och BR är i balans, men ${validation.countsBySeverity.warning} varningar bör granskas före extern rapportering.`,
    );
  } else {
    sentences.push("RR och BR är konsistenta och balansräkningen håller den grundläggande bokföringsekvationen.");
  }

  // 4. Next-best-action — lens-aware
  if (!validation.balanced) {
    sentences.push(
      lens === "BR"
        ? "Använd Undersök obalans för att gå direkt till sannolika orsakskonton."
        : "RR påverkas inte direkt, men en saknad balanspost kan dölja resultatöverföring — undersök i BR.",
    );
  } else if (totals.revenue > 0 && totals.marginPct < 5) {
    sentences.push("Marginalen är låg — granska kostnadsfördelningen i RR för optimering.");
  } else if (totals.equity < 0) {
    sentences.push("Eget kapital är negativt — kapitalbristregler kan aktiveras, granska i BR.");
  } else {
    sentences.push("Inga akuta åtgärder krävs — fortsätt löpande granskning.");
  }

  return sentences;
}

export function AICFOExplain({ report, lens, className }: AICFOExplainProps) {
  if (!report.hasData) return null;

  const sentences = buildNarrative(report, lens);
  const lensLabel = lens === "RR" ? "Resultaträkning" : "Balansräkning";

  return (
    <DSAICFOSummary
      label={`AI CFO — ${lensLabel}`}
      className={cn(className)}
    >
      {sentences.join(" ")}
    </DSAICFOSummary>
  );
}
