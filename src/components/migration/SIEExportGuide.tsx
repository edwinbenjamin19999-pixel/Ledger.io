import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ExternalLink, AlertTriangle, ShieldAlert, UserCog, FileSpreadsheet, Mail, CheckCircle2 } from "lucide-react";

type SourceId = "fortnox" | "visma" | "bokio" | "sie";

interface Guide {
  id: SourceId;
  name: string;
  steps: { title: string; detail: string }[];
  officialUrl?: string;
  planNote?: string;
  permissionNote?: string;
  fallback: { title: string; detail: string }[];
}

const GUIDES: Record<SourceId, Guide> = {
  fortnox: {
    id: "fortnox",
    name: "Fortnox",
    officialUrl: "https://support.fortnox.se/produkthjalp/bokforing/exportera-sie-fil",
    steps: [
      { title: "Logga in i Fortnox", detail: "Öppna fortnox.se och logga in på det företag du vill migrera." },
      { title: "Gå till Bokföring → Mer → SIE-export", detail: "I huvudmenyn väljer du Bokföring. Klicka på Mer (de tre prickarna) och välj SIE-export." },
      { title: "Välj räkenskapsår och format", detail: "Välj det räkenskapsår du vill exportera. Välj format SIE 4 (rekommenderas — innehåller hela kontoplanen, balanser och alla verifikationer)." },
      { title: "Klicka 'Exportera'", detail: "Filen laddas ned till din dator med ändelsen .se. Spara den någonstans du hittar — du laddar upp den i nästa steg här." },
    ],
    planNote: "SIE-export ingår i alla Fortnox-paket som har Bokföring (Bas, Bokföring, Faktura+Bokföring och uppåt). Om du bara har Faktura-paketet utan Bokföring saknas exporten.",
    permissionNote: "Din användare måste ha behörighet 'Bokföring – Läs' eller högre. Be administratören (oftast firmatecknaren eller huvudanvändaren) att ge dig rätt behörighet under Inställningar → Användare, eller be dem köra exporten åt dig.",
    fallback: [
      { title: "Om SIE-export saknas i ditt paket", detail: "Uppgradera tillfälligt till Bokföring under en månad — SIE-exporten ingår då, och du kan säga upp paketet efter migreringen." },
      { title: "Om du saknar behörighet", detail: "Be administratören eller er redovisningskonsult att exportera filen och mejla den till dig." },
      { title: "Om du har en byrå-licens", detail: "Be din byrå exportera SIE4 från deras byråportal — det tar dem 30 sekunder." },
    ],
  },
  visma: {
    id: "visma",
    name: "Visma eEkonomi / Administration",
    officialUrl: "https://vismaspcs.se/support/eekonomi/inkommande-utgaende-balanser-och-sie-fil",
    steps: [
      { title: "Logga in i Visma eEkonomi (eller Administration)", detail: "Öppna ditt företag i Visma." },
      { title: "Gå till Inställningar → Företagsinställningar → Importera/Exportera", detail: "I eEkonomi: kugghjulet uppe till höger → 'Importera och exportera' → 'SIE-export'. I Administration: Arkiv → Exportera → SIE." },
      { title: "Välj räkenskapsår och SIE 4", detail: "Välj det räkenskapsår du vill ta med och format SIE 4 (komplett historik). Bocka i 'Inkludera verifikationer'." },
      { title: "Spara filen", detail: "Klicka 'Exportera' / 'Spara'. Filen laddas ner med ändelsen .se eller .si." },
    ],
    planNote: "SIE-export ingår i alla Visma eEkonomi-paket (Smart, Pro, Förening). I Visma Administration ingår det i alla versioner från 500 och uppåt.",
    permissionNote: "Du behöver rollen 'Administratör' eller 'Bokförare' i Visma eEkonomi. Saknar du det — be ägaren eller er konsult att lägga till behörigheten under Inställningar → Användare.",
    fallback: [
      { title: "Om du har Visma Enskild Firma (gratisversionen)", detail: "Den gratis versionen saknar SIE-export. Uppgradera tillfälligt till Smart (cirka 99 kr/mån) i en månad för att kunna exportera." },
      { title: "Om er byrå sköter bokföringen i Visma Advisor", detail: "Be byrån exportera SIE4 åt er — det tar dem en minut från deras Advisor-portal." },
      { title: "Om du använder Visma.net Financials (större bolag)", detail: "Gå till Bokföring → Verifikationsregister → Skriv ut → Format: SIE4. Kräver behörigheten 'Bokföring – Granska'." },
    ],
  },
  bokio: {
    id: "bokio",
    name: "Bokio",
    officialUrl: "https://www.bokio.se/hjalp/bokforing/sie-fil/exportera-sie-fil/",
    steps: [
      { title: "Logga in i Bokio", detail: "Öppna bokio.se och logga in på det företag du vill flytta." },
      { title: "Gå till Inställningar → Exportera bokföring", detail: "Klicka på företagsnamnet uppe till vänster → Inställningar → 'Exportera bokföring' (under Bokföring)." },
      { title: "Välj räkenskapsår", detail: "Välj det år du vill exportera. Bokio exporterar alltid SIE 4." },
      { title: "Klicka 'Exportera SIE-fil'", detail: "Filen laddas ner direkt till din dator." },
    ],
    planNote: "SIE-export ingår i Bokios kostnadsfria och betalda paket — alla användare kan exportera.",
    permissionNote: "Du behöver vara 'Ägare' eller ha rollen 'Bokförare' i företaget. Inbjudna användare med rollen 'Anställd' ser inte exportknappen.",
    fallback: [
      { title: "Om du saknar behörighet", detail: "Be ägaren ändra din roll under Inställningar → Användare → välj dig → Roll: Bokförare." },
      { title: "Om företaget är arkiverat / avslutat i Bokio", detail: "Återaktivera företaget tillfälligt (ingen kostnad) → exportera SIE → arkivera igen." },
    ],
  },
  sie: {
    id: "sie",
    name: "Annat system",
    steps: [
      { title: "Leta efter 'SIE', 'Export' eller 'Bokföringsexport'", detail: "Nästan alla svenska bokföringsprogram (Speedledger, Wint, BL Administration, Hogia, Briox, etc.) har SIE-export. Den ligger oftast under Inställningar, Arkiv, eller Bokföring → Mer." },
      { title: "Välj SIE 4 om möjligt", detail: "SIE 4 är det mest kompletta formatet och tar med kontoplan, balanser och alla verifikationer. Om bara SIE 1–3 finns fungerar det också, men då kommer inte enskilda verifikationer med." },
      { title: "Välj rätt räkenskapsår", detail: "Vi rekommenderar att du exporterar innevarande år + minst ett historiskt år för bra jämförbarhet." },
      { title: "Spara filen lokalt", detail: "Filen heter normalt något som SIE_2024.se eller export.si. Filändelsen är .se, .si eller .sie." },
    ],
    fallback: [
      { title: "Om ditt system saknar SIE-export", detail: "Det är ovanligt — men om du använder ett internationellt system (QuickBooks, Xero, Zoho Books) finns inte SIE. Hör av dig till oss på support@northledger.se så hjälper vi dig konvertera via CSV/Excel." },
      { title: "Om du bara har papperspärmar", detail: "Inga problem — vi har en separat onboarding där vi börjar bokföra från ingående balanser. Välj 'Manuell start' istället." },
    ],
  },
};

interface Props {
  defaultSource?: SourceId;
  trigger?: React.ReactNode;
}

export const SIEExportGuide = ({ defaultSource = "fortnox", trigger }: Props) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<SourceId>(defaultSource);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Hur exporterar jag en SIE-fil?
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Så exporterar du en SIE-fil
          </DialogTitle>
          <DialogDescription>
            Steg-för-steg-guide för de vanligaste svenska bokföringsprogrammen — inklusive vad du gör om du saknar behörighet eller rätt prenumeration.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={active} onValueChange={(v) => setActive(v as SourceId)} className="mt-2">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="fortnox">Fortnox</TabsTrigger>
            <TabsTrigger value="visma">Visma</TabsTrigger>
            <TabsTrigger value="bokio">Bokio</TabsTrigger>
            <TabsTrigger value="sie">Annat</TabsTrigger>
          </TabsList>

          {(Object.keys(GUIDES) as SourceId[]).map((id) => {
            const g = GUIDES[id];
            return (
              <TabsContent key={id} value={id} className="space-y-4 mt-4">
                {/* Steps */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#085041]" />
                    Så gör du i {g.name}
                  </h3>
                  <ol className="space-y-2.5">
                    {g.steps.map((s, i) => (
                      <li key={i} className="flex gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                        <div className="shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                          {i + 1}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">{s.title}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{s.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  {g.officialUrl && (
                    <Button variant="link" size="sm" className="px-0 h-auto" asChild>
                      <a href={g.officialUrl} target="_blank" rel="noreferrer" className="gap-1.5">
                        Officiell guide hos {g.name}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>

                {/* Plan caveat */}
                {g.planNote && (
                  <Alert className="border-[#F0DDB7] bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900">
                    <ShieldAlert className="h-4 w-4 text-[#7A5417]" />
                    <AlertTitle className="text-sm">Krävs rätt prenumeration</AlertTitle>
                    <AlertDescription className="text-xs text-muted-foreground">
                      {g.planNote}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Permission caveat */}
                {g.permissionNote && (
                  <Alert className="border-[#C8DDF5] bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900">
                    <UserCog className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-sm">Krävs rätt behörighet</AlertTitle>
                    <AlertDescription className="text-xs text-muted-foreground">
                      {g.permissionNote}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Fallback */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Vad gör jag om det inte fungerar?
                  </h3>
                  <div className="space-y-2">
                    {g.fallback.map((f, i) => (
                      <div key={i} className="p-3 rounded-lg border border-border/60 bg-card">
                        <p className="text-sm font-medium mb-0.5">{f.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{f.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Help */}
                <Alert className="border-[#BFE6D6] bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900">
                  <Mail className="h-4 w-4 text-[#085041]" />
                  <AlertTitle className="text-sm">Fastnar du? Vi hjälper till gratis</AlertTitle>
                  <AlertDescription className="text-xs text-muted-foreground">
                    Mejla <a href="mailto:support@northledger.se" className="text-primary underline">support@northledger.se</a> så hjälper vårt onboarding-team dig att exportera filen — vanligen klart inom 1 arbetsdag. Du kan även bjuda in oss som extern användare i Fortnox/Visma/Bokio så exporterar vi åt dig.
                  </AlertDescription>
                </Alert>

                <div className="flex justify-end pt-2">
                  <Badge variant="outline" className="text-[10px]">
                    Filändelser som stöds: .se · .si · .sie
                  </Badge>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
