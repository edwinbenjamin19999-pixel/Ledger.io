import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MigrationState } from "../MigrationWizard";
import { FileSpreadsheet, ArrowRight, BookOpen } from "lucide-react";
import { SIEExportGuide } from "../SIEExportGuide";

const SOURCES = [
  { id: "fortnox" as const,
    name: "Fortnox",
    description: "Anslut direkt via API — eller använd SIE4-fil",
    methods: ["Direkt API (OAuth)", "SIE4-fil"],
    exportGuide: "Direktanslutning hämtar kunder, leverantörer och fakturor automatiskt",
    popular: true,
  },
  { id: "visma" as const,
    name: "Visma eEkonomi",
    description: "Anslut direkt via API — eller använd SIE4-fil",
    methods: ["Direkt API (OAuth)", "SIE4-fil"],
    exportGuide: "Direktanslutning hämtar kunder, leverantörer och fakturor automatiskt",
    popular: true,
  },
  { id: "bokio" as const,
    name: "Bokio",
    description: "Importera all bokföringsdata från Bokio",
    methods: ["SIE4-fil"],
    exportGuide: "Inställningar → Exportera data → SIE4",
    popular: false,
  },
  { id: "sie" as const,
    name: "Annat system (SIE-fil)",
    description: "Importera från valfritt bokföringsprogram via SIE-standard",
    methods: ["SIE1", "SIE2", "SIE3", "SIE4"],
    exportGuide: "Exportera SIE4-fil från ditt nuvarande system",
    popular: false,
  },
  { id: "pdf" as const,
    name: "E-postarkiv / PDF-fakturor",
    description: "Har du fakturor som PDF i din e-post eller på din dator? AI läser dem automatiskt och skapar poster i Ledger.io.",
    methods: ["PDF"],
    exportGuide: "Ladda upp PDF-filer — AI extraherar leverantör, belopp, datum och moms",
    popular: false,
  },
];

interface Props { state: MigrationState;
  updateState: (u: Partial<MigrationState>) => void;
}

export const MigrationSourceStep = ({ state, updateState }: Props) => { return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Varifrån migrerar du?</h2>
          <p className="text-muted-foreground text-sm">Välj ditt nuvarande bokföringsprogram. Systemet anpassar importen automatiskt.</p>
        </div>
        <SIEExportGuide defaultSource={(state.source || "fortnox") as any} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {SOURCES.map(source => { const isSelected = state.source === source.id;
          return (
            <Card
              key={source.id}
              className={`cursor-pointer transition-all hover:shadow-md ${ isSelected ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"
              }`}
              onClick={() => updateState({ source: source.id, method: "file" })}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <h3 className="font-semibold">{source.name}</h3>
                  </div>
                  {source.popular && <Badge variant="secondary" className="text-[10px]">Populär</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mb-3">{source.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {source.methods.map(m => (
                    <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>
                  ))}
                </div>
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded p-2 mb-2">
                  <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                  <span>{source.exportGuide}</span>
                </div>
                <SIEExportGuide
                  defaultSource={source.id as any}
                  trigger={
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <BookOpen className="h-3 w-3" />
                      Visa fullständig guide & felsökning
                    </button>
                  }
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {state.source && state.source !== "fortnox" && state.source !== "visma" && (
        <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-[#BFE6D6] dark:border-emerald-900">
          <CardContent className="p-4 flex items-start gap-3">
            <FileSpreadsheet className="h-5 w-5 text-[#085041] mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-[#085041] dark:text-emerald-200">
                Migrering sker via SIE4-fil
              </p>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-1">
                SIE4-export importerar exakt samma data — kontoplan, verifikationer, kunder och leverantörer — och tar bara några minuter.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {(state.source === "fortnox" || state.source === "visma") && (
        <Card className="bg-[#EFF6FF] border-[#B5D4F4]">
          <CardContent className="p-4 flex items-start gap-3">
            <FileSpreadsheet className="h-5 w-5 text-[#0B4F6C] mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-[#0B4F6C]">Direktanslutning tillgänglig</p>
              <p className="text-xs text-[#0B4F6C]/80 mt-1">
                Du kan välja mellan att ansluta direkt via {state.source === "fortnox" ? "Fortnox" : "Visma eEkonomi"} OAuth (rekommenderas) eller ladda upp en SIE4-fil. Fortsätt till nästa steg.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
