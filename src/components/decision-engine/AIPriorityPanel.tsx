/**
 * AIPriorityPanel — top-3 insights med [Simulera] [Justera] [Tillämpa]-knappar.
 * Använder useCFOPriorities; fallback-statiska insikter när ingen company.
 */
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCFOPriorities, type CFOPriority } from "@/hooks/useCFOPriorities";
import { useDecisionEngine } from "@/contexts/DecisionEngineContext";
import { useFinancialOSOptional } from "@/contexts/FinancialOSContext";
import type { DriverPatch } from "@/lib/scenarios/scenarioEngine";

interface FallbackInsight {
  id: string;
  title: string;
  impact_sek: number;
  confidence: number;
  tier: "critical" | "high" | "medium" | "low";
  patch: DriverPatch;
}

const FALLBACK: FallbackInsight[] = [
  { id: "f1", title: "Personalkostnader -10% frigör likviditet", impact_sek: 240_000, confidence: 0.78, tier: "high",
    patch: { salaryMonthly: 180_000 } },
  { id: "f2", title: "Höj pris +5% för att nå EBITDA-mål", impact_sek: 320_000, confidence: 0.72, tier: "high",
    patch: { priceGrowthRate: 0.05 } },
  { id: "f3", title: "Förkorta DSO 35→25 dagar", impact_sek: 95_000, confidence: 0.68, tier: "medium",
    patch: { dso: 25 } },
];

const TIER_TONE: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  high: "bg-warning/10 text-warning border-warning/20",
  medium: "bg-primary/10 text-primary border-primary/20",
  low: "bg-muted text-muted-foreground border-border",
};

interface InsightRowProps {
  title: string;
  impact: number;
  confidence: number;
  tier: string;
  onSimulate: () => void;
  onApply: () => void;
}

function InsightRow({ title, impact, confidence, tier, onSimulate, onApply }: InsightRowProps) {
  const Icon = tier === "critical" ? AlertTriangle : tier === "high" ? Sparkles : Brain;
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-start gap-2">
        <span className={cn("inline-flex items-center justify-center h-7 w-7 rounded-md border", TIER_TONE[tier] ?? TIER_TONE.medium)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground line-clamp-2">{title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Effekt: <span className="font-semibold text-foreground">{(impact / 1000).toFixed(0)} tkr</span> · Säkerhet {(confidence * 100).toFixed(0)} %
          </div>
        </div>
      </div>
      <div className="flex gap-1.5 pl-9">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onSimulate}>Simulera</Button>
        <Button size="sm" className="h-7 text-xs bg-[hsl(192_91%_36%)] hover:bg-[hsl(192_91%_30%)] text-white" onClick={onApply}>Tillämpa</Button>
      </div>
    </div>
  );
}

export function AIPriorityPanel() {
  const fos = useFinancialOSOptional();
  const { applyDriverPatch, openSimulation } = useDecisionEngine();
  const { data, loading } = useCFOPriorities(fos?.companyId ?? null);

  const cfoToPatch = (p: CFOPriority): DriverPatch => {
    // Heuristic mapping (real action_type → driver) — extends as backend exposes payload
    if (p.action_type === "create_accrual") return { adminCosts: 0 };
    return {};
  };

  const items = data?.top.slice(0, 3) ?? [];

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">AI Prioriteringar</h3>
        </div>
        <span className="text-xs text-muted-foreground">Top 3</span>
      </div>

      {loading && <div className="text-xs text-muted-foreground">Beräknar prioriteringar…</div>}

      {!loading && items.length > 0 && items.map((p) => (
        <InsightRow
          key={p.id}
          title={p.title}
          impact={p.impact_sek}
          confidence={p.confidence}
          tier={p.tier}
          onSimulate={() => { applyDriverPatch(cfoToPatch(p)); openSimulation(); }}
          onApply={() => applyDriverPatch(cfoToPatch(p))}
        />
      ))}

      {!loading && items.length === 0 && FALLBACK.map((f) => (
        <InsightRow
          key={f.id}
          title={f.title}
          impact={f.impact_sek}
          confidence={f.confidence}
          tier={f.tier}
          onSimulate={() => { applyDriverPatch(f.patch); openSimulation(); }}
          onApply={() => applyDriverPatch(f.patch)}
        />
      ))}
    </Card>
  );
}
