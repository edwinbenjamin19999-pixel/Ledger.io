import { toast } from "sonner";
import { ActionType, ACTION_TEMPLATES } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DocumentPreviewProps { actionType: ActionType;
  formData: Record<string, string>;
}

const generateDocumentContent = (type: ActionType, docName: string, data: Record<string, string>): string => { const date = data.date || data.start_date || new Date().toISOString().split("T")[0];

  if (docName === "Styrelseprotokoll") { const template = ACTION_TEMPLATES[type];
    const subject = data.subject || template.label;
    const attendees = data.attendees || "[Ange närvarande ledamöter]";
    return `STYRELSEPROTOKOLL

Protokoll fört vid styrelsemöte den ${date}

Närvarande: ${attendees}

\u00A7 1. Mötets öppnande
Ordföranden förklarade mötet öppnat.

\u00A7 2. Val av protokollförare
${attendees.split(",")[0]?.trim() || "[Namn]"} valdes till protokollförare.

\u00A7 3. ${subject}
${data.decision || `Styrelsen beslutade att godkänna ${template.label.toLowerCase()}.`}

${data.amount ? `Belopp: ${Number(data.amount).toLocaleString("sv-SE")} kr` : ""}

\u00A7 4. Avslutning
Ordföranden avslutade mötet.

__________________________
Ordförande

__________________________
Protokollförare`;
  }

  if (docName === "Tillskottsavtal" || docName === "Villkorat tillskottsavtal") { const isConditional = type === "conditional_contribution";
    return `AVTAL OM ${isConditional ? "VILLKORAT" : "OVILLKORAT"} AKTIEÄGARTILLSKOTT

Datum: ${date}

Tillskottsgivare: ${data.contributor_name || "[Namn]"}
Mottagare: [Bolagets namn]
Org.nr: [Org.nr]

1. TILLSKOTT
Tillskottsgivaren tillskjuter härmed ${Number(data.amount || 0).toLocaleString("sv-SE")} kr till bolaget.

2. VILLKOR
${isConditional
  ? `Tillskottet är villkorat och ska återbetalas om och när bolagets fria egna kapital medger det. Tillskottet har samma prioritet som aktiekapitalet vid likvidation.

${data.repayment_conditions ? `Särskilda villkor: ${data.repayment_conditions}` : ""}`
  : "Tillskottet är ovillkorat och kan inte återkrävas."}

3. SYFTE
${data.purpose || "Stärka bolagets ekonomiska ställning."}

4. UNDERSKRIFTER

__________________________
Tillskottsgivare

__________________________
Bolagets firmatecknare`;
  }

  if (docName === "Bolagsstämmoprotokoll" || docName === "Protokoll extra bolagsstämma") { const isExtra = type === "extra_meeting";
    return `PROTOKOLL FÖRT VID ${isExtra ? "EXTRA " : "ORDINARIE "}BOLAGSSTÄMMA

Datum: ${date}
${data.fiscal_year ? `Räkenskapsår: ${data.fiscal_year}` : ""}

Stämmoordförande: ${data.chairman || "[Namn]"}
Protokollförare: ${data.secretary || "[Namn]"}

\u00A7 1. Stämmans öppnande
Stämmoordföranden förklarade stämman öppnad.

\u00A7 2. Val av ordförande och protokollförare
${data.chairman || "[Namn]"} valdes till ordförande.
${data.secretary || "[Namn]"} valdes till protokollförare.

\u00A7 3. Godkännande av dagordning
Stämman godkände den föreslagna dagordningen.

${!isExtra ? `\u00A7 4. Fastställande av resultat- och balansräkning
Stämman fastställde resultaträkningen och balansräkningen för räkenskapsåret ${data.fiscal_year || "[År]"}.

\u00A7 5. Ansvarsfrihet
Stämman ${data.board_discharge === "yes" ? "beviljade" : "beviljade ej"} styrelsen och VD ansvarsfrihet.

\u00A7 6. Vinstdisposition
${data.dividend_decision === "dividend"
  ? `Stämman beslutade om utdelning till aktieägarna.${data.total_amount ? ` Totalt: ${Number(data.total_amount).toLocaleString("sv-SE")} kr.` : ""}`
  : data.dividend_decision === "retain"
  ? "Stämman beslutade att balansera årets resultat i ny räkning."
  : "Stämman beslutade om delvis utdelning och att resterande balanseras i ny räkning."}` : `\u00A7 4. Ärende
${data.purpose || "[Ange ärende]"}

\u00A7 5. Beslut
${data.decision || "[Ange beslut]"}`}

Stämman avslutades.

__________________________
Stämmoordförande

__________________________
Protokolljusterare`;
  }

  if (docName === "Skuldebrev/Revers") { const lender = data.lender_name || "[Långivare]";
    const borrower = data.borrower_name || "[Låntagare]";
    return `SKULDEBREV

Datum: ${date}

Låntagare: ${type === "shareholder_loan_in" ? "[Bolagets namn]" : borrower}
Långivare: ${type === "shareholder_loan_in" ? lender : "[Bolagets namn]"}

1. LÅNEBELOPP
Låntagaren erkänner sig härmed skyldig långivaren ${Number(data.amount || 0).toLocaleString("sv-SE")} kr.

2. RÄNTA
Lånet löper med en årlig ränta om ${data.interest_rate || "[X]"} %.

3. FÖRFALLODATUM
Lånet förfaller till betalning den ${data.maturity_date || "[Datum]"}.

4. AMORTERING
${data.amortization === "none" ? "Lånet amorteras ej utan förfaller i sin helhet på förfallodagen." :
  data.amortization === "monthly" ? "Lånet amorteras månadsvis med lika stora belopp." :
  data.amortization === "quarterly" ? "Lånet amorteras kvartalsvis med lika stora belopp." :
  "Lånet amorteras årsvis med lika stora belopp."}

5. UNDERSKRIFTER

__________________________
Låntagare

__________________________
Långivare`;
  }

  if (docName === "Avtal") { return `AVTAL

Datum: ${data.start_date || date}

Parter: ${data.parties || "[Ange parter]"}

1. BAKGRUND OCH SYFTE
${data.description || "[Beskrivning]"}

2. AVTALSPERIOD
Från: ${data.start_date || "[Start]"}
${data.end_date ? `Till: ${data.end_date}` : "Tillsvidare"}

${data.monthly_amount ? `3. ERSÄTTNING
${Number(data.monthly_amount).toLocaleString("sv-SE")} kr per månad.` : ""}

UNDERSKRIFTER

__________________________
Part 1

__________________________
Part 2`;
  }

  // Fallback
  return `${docName.toUpperCase()}

Datum: ${date}

[Dokumentinnehåll genereras baserat på angivna uppgifter]`;
};

export const DocumentPreview = ({ actionType, formData }: DocumentPreviewProps) => { const template = ACTION_TEMPLATES[actionType];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold text-lg">Genererade dokument</h3>
          <p className="text-sm text-muted-foreground">
            {template.documents.length} dokument skapas automatiskt
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {template.documents.map(docName => { const content = generateDocumentContent(actionType, docName, formData);
          return (
            <Card key={docName}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{docName}</span>
                    <Badge variant="outline" className="text-[10px]">Utkast</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => toast.info("Redigera dokument (demo)")}>
                      <Edit2 className="h-3 w-3" /> Redigera
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => toast.success("PDF genereras (demo)")}>
                      <Download className="h-3 w-3" /> PDF
                    </Button>
                  </div>
                </div>
                <pre className="text-xs bg-muted p-4 rounded-lg whitespace-pre-wrap font-sans max-h-64 overflow-y-auto leading-relaxed">
                  {content}
                </pre>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {template.documents.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p className="text-sm">Denna händelse genererar inga dokument.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
