import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowUp, Plus } from "lucide-react";
import { toast } from "sonner";
import type { ESGData } from "./ESGReporting";

interface Props { esg: ESGData;
  scores: { e: number; s: number; g: number; total: number };
}

interface Action { id: string;
  title: string;
  description: string;
  category: "E" | "S" | "G";
  scoreImpact: number;
  effort: "Låg" | "Medel" | "Hög";
  condition: boolean;
}

export function ESGScoreAdvisor({ esg, scores }: Props) { const actions: Action[] = ([
    { id: "scope3",
      title: "Mät och rapportera Scope 3-utsläpp",
      description: "Hämtas automatiskt från bokföring — begär verifiering från topp-leverantörer.",
      category: "E",
      scoreImpact: 15,
      effort: "Låg",
      condition: esg.co2Scope3 === 0 || esg.estimatePercent > 50,
    },
    { id: "renewable",
      title: "Byt till 100% förnybar el",
      description: "Kräv förnybart elavtal från hyresvärd — eliminerar Scope 2 helt.",
      category: "E",
      scoreImpact: 10,
      effort: "Låg",
      condition: esg.electricitySpend > 0,
    },
    { id: "train",
      title: "Ersätt inrikesflyg med tåg",
      description: "95% lägre CO₂ per resa. En flygresa Stockholm-Göteborg = 53 kg CO₂, tåg = 2 kg.",
      category: "E",
      scoreImpact: 8,
      effort: "Medel",
      condition: esg.flightSpend > 0,
    },
    { id: "training",
      title: "Implementera kompetensutvecklingsbudget",
      description: "Sätt minst 1% av lönesumman till utbildning (konto 7620). Nuvarande: " +
        (esg.employeeCount > 0 ? `${Math.round(esg.trainingSpend / esg.employeeCount)} kr/anställd` : "0 kr"),
      category: "S",
      scoreImpact: 12,
      effort: "Medel",
      condition: esg.employeeCount > 0 && esg.trainingSpend / esg.employeeCount < 5000,
    },
    { id: "wellness",
      title: "Aktivera friskvårdsbidrag",
      description: "Erbjud 5 000 kr/år per anställd. Skattefritt för den anställde.",
      category: "S",
      scoreImpact: 10,
      effort: "Låg",
      condition: esg.healthcareSpend === 0 && esg.employeeCount > 0,
    },
    { id: "four_eyes",
      title: "Aktivera 4-ögonsprincip för attestering",
      description: "Kräv att en annan person än bokföraren attesterar verifikationer.",
      category: "G",
      scoreImpact: 20,
      effort: "Medel",
      condition: true,
    },
    { id: "supplier_org",
      title: "Registrera org.nummer för alla leverantörer",
      description: `${esg.suppliersWithoutOrgNr} leverantörer saknar org.nummer — krävs för anti-korruptionspolicy.`,
      category: "G",
      scoreImpact: 10,
      effort: "Låg",
      condition: esg.suppliersWithoutOrgNr > 0,
    },
    { id: "audit",
      title: "Anlita extern revisor",
      description: "Stärker trovärdighet och G-score avsevärt. Krav för bolag >3 MSEK omsättning.",
      category: "G",
      scoreImpact: 15,
      effort: "Hög",
      condition: esg.auditSpend === 0,
    },
  ] as Action[]).filter(a => a.condition).sort((a, b) => { const effortScore: Record<string, number> = { "Låg": 1, "Medel": 2, "Hög": 3 };
    const ratioA = a.scoreImpact / effortScore[a.effort];
    const ratioB = b.scoreImpact / effortScore[b.effort];
    return ratioB - ratioA;
  });

  const catColor = { E: "bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-emerald-300",
    S: "bg-[#EFF6FF] text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    G: "bg-[#F1F5F9] text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  };

  const effortColor = { "Låg": "text-[#085041] border-[#BFE6D6]",
    "Medel": "text-[#7A5417] border-[#F0DDB7]",
    "Hög": "text-[#7A1A1A] border-red-300",
  };

  const borderColor = { E: "border-l-emerald-500",
    S: "border-l-blue-500",
    G: "border-l-purple-500",
  };

  const potentialIncrease = actions.reduce((sum, a) => sum + a.scoreImpact, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Så förbättrar du ditt ESG-betyg
          </CardTitle>
          <CardDescription>
            Prioriterade åtgärder sorterade efter effekt/ansträngning. Nuvarande total: {scores.total}/100.
            {potentialIncrease > 0 && ` Potentiell förbättring: +${Math.min(potentialIncrease, 100 - scores.total)} poäng.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {actions.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <p className="font-medium">Inga åtgärder föreslagna — ditt ESG-betyg är starkt!</p>
            </div>
          ) : (
            actions.map((action, i) => (
              <Card key={action.id} className={`border-l-4 ${borderColor[action.category]}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-muted-foreground font-medium">{i + 1}.</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${catColor[action.category]}`}>{action.category}</span>
                        <span className="text-sm font-medium">{action.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-5">{action.description}</p>
                      <div className="flex items-center gap-3 mt-2 ml-5">
                        <div className="flex items-center gap-1 text-xs">
                          <ArrowUp className="h-3 w-3 text-[#085041]" />
                          <span className="text-[#085041] font-medium">+{action.scoreImpact}p</span>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${effortColor[action.effort]}`}>
                          Ansträngning: {action.effort}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={() => toast.success(`"${action.title}" tillagd som uppgift`)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Lägg till
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
