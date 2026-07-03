import { useState } from "react";
import { Info, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CashFlowPeriod } from "@/hooks/useCashFlow";

const fmt = (n: number) => { const rounded = Math.round(n);
  return rounded >= 0 ? `+${rounded.toLocaleString("sv-SE")}` : `−${Math.abs(rounded).toLocaleString("sv-SE")}`;
};

interface Props { periods: CashFlowPeriod[];
  dismissed: boolean;
  onDismiss: () => void;
}

export function CashFlowReconciliation({ periods, dismissed, onDismiss }: Props) { const [expanded, setExpanded] = useState(false);

  if (dismissed) return null;

  return (
    <div className="rounded-lg border border-[#C8DDF5] bg-blue-50/50 dark:bg-blue-950/10 p-3 text-xs">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-foreground leading-relaxed">
            <strong>Kassaflödet visar faktiska in- och utbetalningar.</strong> Det skiljer sig från resultaträkningen eftersom intäkter bokförs vid fakturadatum, kostnader periodiseras, och avskrivningar påverkar resultatet men inte kassan.
          </p>
          <div className="flex gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] text-blue-600 hover:text-blue-700 px-2"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
              {expanded ? "Dölj detaljer" : "Läs mer"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] text-muted-foreground px-2"
              onClick={onDismiss}
            >
              Stäng
            </Button>
          </div>

          {expanded && (
            <div className="mt-3 space-y-1 font-mono text-[11px] border-t pt-2">
              <div className="flex justify-between"><span>Årets resultat (RR):</span><span>[Se resultaträkningen]</span></div>
              <div className="flex justify-between"><span>+ Avskrivningar (ej kassapåverkan):</span><span>—</span></div>
              <div className="flex justify-between"><span>− Ökning kundfordringar:</span><span>—</span></div>
              <div className="flex justify-between"><span>+ Ökning leverantörsskulder:</span><span>—</span></div>
              <div className="flex justify-between border-t pt-1 font-semibold">
                <span>= Kassaflöde från rörelseverksamhet:</span>
                <span>{fmt(periods.reduce((s, p) => s + p.operatingIn - p.operatingOut, 0))} kr</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
