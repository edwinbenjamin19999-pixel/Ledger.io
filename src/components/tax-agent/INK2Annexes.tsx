import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, Minus, Bot, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface INK2AnnexesProps { companyId: string;
}

interface Annex { code: string;
  name: string;
  description: string;
  type: "obligatorisk" | "rekommenderad" | "ej_relevant";
  reason?: string;
  aiAction?: string;
}

const ANNEXES: Annex[] = [
  { code: "INK2R",
    name: "Rakenskapsschemat",
    description: "Resultat- och balansrakning i SKV-format",
    type: "obligatorisk",
    reason: "Alltid obligatorisk — hamtas automatiskt från huvudboken",
    aiAction: "Forhandsgranska",
  },
  { code: "INK2S",
    name: "Skattemassiga justeringar",
    description: "Avskrivningsdifferenser, periodiseringsfonder",
    type: "obligatorisk",
    reason: "Relevant: du har avskrivningsbara inventarier",
    aiAction: "Lägg till och fyll i automatiskt",
  },
  { code: "K10",
    name: "Famansforetag utdelning",
    description: "Beraknar gransbelopp och utdelningsutrymme",
    type: "rekommenderad",
    reason: "Edwin Ebrahimi är kvalificerad agare",
    aiAction: "Lägg till — AI beraknar gransbelopp",
  },
  { code: "N9",
    name: "FoU-avdrag",
    description: "Super-avdrag 200% på kvalificerade kostnader",
    type: "rekommenderad",
    reason: "Du har bokfort 45 000 kr på konto 6420 (IT-kostnader) — mojligt FoU-avdrag. AI utreder.",
    aiAction: "Analysera om relevant",
  },
  { code: "INK2A",
    name: "Avskrivningar byggnader/mark",
    description: "Inga fastigheter i bolaget",
    type: "ej_relevant",
  },
  { code: "INK2D",
    name: "Delagare i HB/KB",
    description: "Inga handelsbolagsandelar",
    type: "ej_relevant",
  },
];

export const INK2Annexes = ({ companyId }: INK2AnnexesProps) => { const [preparing, setPreparing] = useState<string | null>(null);

  const handlePrepare = async (code: string) => { setPreparing(code);
    await new Promise((r) => setTimeout(r, 2000));
    setPreparing(null);
    toast.success(`${code} forberedd av AI`);
  };

  const obligatoriska = ANNEXES.filter((a) => a.type === "obligatorisk");
  const rekommenderade = ANNEXES.filter((a) => a.type === "rekommenderad");
  const ejRelevanta = ANNEXES.filter((a) => a.type === "ej_relevant");

  const renderAnnex = (annex: Annex) => (
    <div
      key={annex.code}
      className={`border rounded-lg p-3 space-y-2 ${ annex.type === "ej_relevant" ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {annex.type === "obligatorisk" ? (
            <CheckCircle className="h-4 w-4 text-[#085041] flex-shrink-0" />
          ) : annex.type === "rekommenderad" ? (
            <Circle className="h-4 w-4 text-primary flex-shrink-0" />
          ) : (
            <Minus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <div>
            <span className="font-semibold text-sm">{annex.code}</span>
            <span className="text-sm text-muted-foreground ml-2">{annex.name}</span>
          </div>
        </div>
        <Badge
          variant={ annex.type === "obligatorisk" ? "default" : annex.type === "rekommenderad" ? "outline" : "secondary"
          }
          className={ annex.type === "obligatorisk"
              ? "bg-[#E1F5EE] text-[#085041] border-green-500/30 text-xs"
              : "text-xs"
          }
        >
          {annex.type === "obligatorisk" ? "Obligatorisk" : annex.type === "rekommenderad" ? "Rekommenderad" : "Ej aktuell"}
        </Badge>
      </div>

      {annex.reason && (
        <p className="text-xs text-muted-foreground ml-6">{annex.reason}</p>
      )}

      {annex.aiAction && annex.type !== "ej_relevant" && (
        <div className="ml-6">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            disabled={preparing === annex.code}
            onClick={() => handlePrepare(annex.code)}
          >
            {preparing === annex.code ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Bot className="h-3 w-3 mr-1" />
            )}
            {annex.aiAction}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Bilagor till INK2
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Obligatoriska */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Obligatoriska</p>
          {obligatoriska.map(renderAnnex)}
        </div>

        {/* Rekommenderade */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rekommenderade (baserat på bolagets data)</p>
          {rekommenderade.map(renderAnnex)}
        </div>

        {/* Ej relevanta */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ej relevanta</p>
          {ejRelevanta.map(renderAnnex)}
        </div>
      </CardContent>
    </Card>
  );
};
