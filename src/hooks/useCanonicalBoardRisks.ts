import { useEffect, useState } from "react";
import { computeUnifiedRunway } from "@/lib/cash/getRunway";
import type { BoardRisk } from "@/hooks/useBoardSummary";

/**
 * Genererar kanoniska risker från samma källa som Dashboard
 * (computeUnifiedRunway → liquidCash + avgMonthlyBurn + runwayDays).
 *
 * Syftet är att Styrelseläge ALDRIG ska visa "allt under kontroll" när
 * Dashboard flaggar kritiska likviditetsrisker. Risks härifrån ska mergas
 * in i resultatet från generate-board-summary innan rendering.
 */
export function useCanonicalBoardRisks(companyId: string | null) {
  const [risks, setRisks] = useState<BoardRisk[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) { setRisks([]); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const u = await computeUnifiedRunway(companyId);
        if (cancelled) return;
        const out: BoardRisk[] = [];
        const cash = u.liquidCash;
        const days = u.runwayDays;
        const monthlyBurn = u.avgMonthlyBurn;

        // 1) Negativ kassa → alltid kritiskt
        if (cash < 0) {
          out.push({
            id: "canonical_negative_cash",
            severity: "critical",
            title: "Negativ kassa",
            explanation: `Likvida medel ${Math.round(cash).toLocaleString("sv-SE")} kr. Bolaget kan inte möta löpande betalningar.`,
            impact: cash,
            action_label: "Öppna kassaflöde",
            action_type: "open_cashflow",
          });
        }

        // 2) Runway 0 eller mycket kort
        if (days !== null && monthlyBurn > 0) {
          if (days <= 0 || cash <= 0) {
            out.push({
              id: "canonical_runway_zero",
              severity: "critical",
              title: "Runway 0 månader",
              explanation: `Vid nuvarande burn (${Math.round(monthlyBurn).toLocaleString("sv-SE")} kr/mån) räcker kassan inte längre.`,
              impact: -Math.round(monthlyBurn),
              action_label: "Granska kostnader",
              action_type: "open_costs",
            });
          } else if (days < 90) {
            out.push({
              id: "canonical_runway_low",
              severity: days < 30 ? "critical" : "high",
              title: `Runway ${Math.round(days / 30)} mån (${days} d)`,
              explanation: `Kassan ${Math.round(cash).toLocaleString("sv-SE")} kr räcker ca ${days} dagar vid nuvarande burn.`,
              impact: -Math.round(monthlyBurn),
              action_label: "Öppna runway",
              action_type: "open_runway",
            });
          }
        }

        // 3) Hög burn relativt kassa (kassaprognos negativ inom kvartal)
        if (monthlyBurn > 0 && cash > 0 && days !== null && days < 180 && !out.find(r => r.id.startsWith("canonical_runway"))) {
          out.push({
            id: "canonical_burn_rate",
            severity: "high",
            title: "Hög burn rate",
            explanation: `Burn ${Math.round(monthlyBurn).toLocaleString("sv-SE")} kr/mån vs kassa ${Math.round(cash).toLocaleString("sv-SE")} kr → kassaprognos negativ inom 6 mån.`,
            impact: -Math.round(monthlyBurn),
            action_label: "Öppna burn",
            action_type: "open_burn",
          });
        }

        setRisks(out);
      } catch {
        if (!cancelled) setRisks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  return { risks, loading };
}

/**
 * Slår ihop kanoniska risker med risker från generate-board-summary.
 * Kanoniska risker går alltid först (prioritet) och dedupliceras på title.
 */
export function mergeBoardRisks(canonical: BoardRisk[], fromSummary: BoardRisk[]): BoardRisk[] {
  const seen = new Set<string>();
  const out: BoardRisk[] = [];
  for (const r of [...canonical, ...fromSummary]) {
    const key = (r.title || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}
