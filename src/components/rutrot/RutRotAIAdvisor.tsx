import { useState } from "react";
import { RutRotSettings, ROT_RATE, RUT_RATE, ROT_MAX_PER_PERSON, RUT_MAX_PER_PERSON } from "@/hooks/useRutRot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

interface QA { q: string;
  a: string;
  source?: string;
}

const rotQuestions: QA[] = [
  { q: "Vilka arbeten ger ROT-avdrag?",
    a: "ROT-avdrag gäller reparation, underhåll samt om- och tillbyggnad av småhus, bostadsrätter och ägarlägenheter. Exempel: målning, tapetsering, plåtarbete, VVS, elarbete, murning, golvläggning, fasadarbete, dränering, markarbete och installation av värmepump. Material ger aldrig avdrag — bara arbetskostnaden.",
    source: "Skatteverket.se — ROT-avdrag",
  },
  { q: "Kan jag ROT-avdra rivning av ett badrum?",
    a: "Ja, rivning i samband med renovering är en del av ROT-arbetet och ger avdrag. Rivning som enda åtgärd (utan efterföljande renovering) kan dock ifrågasättas av Skatteverket.",
    source: "Skatteverket.se — ROT-avdrag för badrum",
  },
  { q: "Gäller ROT-avdrag för fritidshus?",
    a: "Ja, ROT-avdrag gäller för fritidshus (småhus) som ägs av den som begär avdraget. Bostaden behöver inte vara permanentbostad. Dock krävs att fastigheten är taxerad som småhus.",
    source: "Skatteverket.se — ROT och bostadstyp",
  },
  { q: "Kan makar dela på ROT-avdraget?",
    a: "Ja, makar eller sambor som äger bostaden gemensamt kan dela på ROT-avdraget. Varje person har ett eget tak på 50 000 kr/år. Vid gemensamt ägande kan alltså totalt 100 000 kr i ROT-avdrag utnyttjas per år för samma bostad.",
    source: "Skatteverket.se",
  },
  { q: "Vad händer om kunden redan utnyttjat sitt ROT-avdrag?",
    a: "Om kundens avdragsutrymme är fullt betalar kunden hela arbetskostnaden utan avdrag. Du kan fortfarande fakturera, men ingen del betalas av Skatteverket. Systemet varnar automatiskt när kunden är nära taket.",
  },
];

const rutQuestions: QA[] = [
  { q: "Vilka RUT-tjänster ger avdrag?",
    a: "RUT-avdrag gäller hushållsnära tjänster: städning, fönsterputsning, barnpassning, personlig assistans, trädgårdsarbete, snöröjning, flytt, IT-tjänster i hemmet, tvätt och strykning. Tjänsten måste utföras i eller i nära anslutning till bostaden.",
    source: "Skatteverket.se — RUT-avdrag",
  },
  { q: "Kan företag få RUT-avdrag?",
    a: "Nej, RUT-avdrag gäller bara privatpersoner. Företag kan inte vara köpare av RUT-tjänster. Kunden måste vara en fysisk person med svenskt personnummer.",
  },
  { q: "Gäller RUT för kontorsstädning?",
    a: "Nej, RUT-avdrag gäller bara städning i bostäder. Städning av kontor, butiker eller andra företagslokaler ger inte RUT-avdrag.",
  },
];

const generalQuestions: QA[] = [
  { q: "Vad krävs av mitt företag?",
    a: "Företaget måste ha F-skattsedel och vara registrerat hos Skatteverket som utförare av ROT/RUT-tjänster. Enskild firma, AB och HB kan alla ansöka om ROT/RUT-utbetalning.",
  },
  { q: "Hur lång tid tar utbetalningen från Skatteverket?",
    a: "Normalt 3–5 bankdagar efter att ansökan godkänts. Vid behov av komplettering kan det ta längre. Skatteverket kan begära underlag (fakturakopia, tidrapporter) vid stickprov.",
  },
  { q: "Vad händer vid felaktig ansökan?",
    a: "Om ansökan nekas (t.ex. fel fastighetsbeteckning, ogiltigt personnummer, eller arbetet uppfyller inte kraven) betalar du tillbaka beloppet till Skatteverket alternativt fakturerar kunden för hela beloppet. Systemet kontrollerar automatiskt vanliga fel innan ansökan skickas.",
  },
];

export function RutRotAIAdvisor({ settings }: { settings: RutRotSettings }) { const [expandedQ, setExpandedQ] = useState<string | null>(null);

  const questions = [
    ...(settings.rot_enabled ? rotQuestions : []),
    ...(settings.rut_enabled ? rutQuestions : []),
    ...generalQuestions,
  ];

  const year = new Date().getFullYear();

  return (
    <div className="space-y-4 mt-4">
      {/* Current limits info */}
      <Card className="border-l-4 border-l-[#3b82f6]">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#3b82f6]" />
            <p className="text-sm font-medium">Gällande regler {year}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {settings.rot_enabled && (
              <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50 space-y-1">
                <p className="text-sm font-semibold text-[#085041] dark:text-[#1D9E75]">ROT-avdrag</p>
                <p className="text-xs text-muted-foreground">Avdragsprocent: {(ROT_RATE * 100).toFixed(0)}% av arbetskostnad</p>
                <p className="text-xs text-muted-foreground">Max per person/år: {fmt(ROT_MAX_PER_PERSON)}</p>
                <p className="text-xs text-muted-foreground">Material ger aldrig avdrag</p>
                <p className="text-xs text-muted-foreground">F-skattsedel krävs</p>
              </div>
            )}
            {settings.rut_enabled && (
              <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50 space-y-1">
                <p className="text-sm font-semibold text-blue-700 dark:text-[#1E3A5F]">RUT-avdrag</p>
                <p className="text-xs text-muted-foreground">Avdragsprocent: {(RUT_RATE * 100).toFixed(0)}% av arbetskostnad</p>
                <p className="text-xs text-muted-foreground">Max per person/år: {fmt(RUT_MAX_PER_PERSON)}</p>
                <p className="text-xs text-muted-foreground">Gäller hushållsnära tjänster i bostad</p>
                <p className="text-xs text-muted-foreground">F-skattsedel krävs</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#3b82f6]" />
            Vanliga frågor — AI-rådgivare
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {questions.map((qa) => { const isOpen = expandedQ === qa.q;
            return (
              <div key={qa.q} className="border-b last:border-0">
                <button
                  className="w-full flex items-center justify-between py-3 text-left"
                  onClick={() => setExpandedQ(isOpen ? null : qa.q)}
                >
                  <span className="text-sm font-medium pr-4">{qa.q}</span>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                </button>
                {isOpen && (
                  <div className="pb-3 space-y-2">
                    <p className="text-sm text-muted-foreground leading-relaxed">{qa.a}</p>
                    {qa.source && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        Källa: {qa.source}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground text-center px-4">
        AI-rådgivningen baseras på Skatteverkets publicerade regler. Kontakta Skatteverket eller en
        auktoriserad rådgivare vid komplexa frågor.
      </p>
    </div>
  );
}
