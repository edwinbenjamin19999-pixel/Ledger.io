import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Download, ExternalLink, CheckCircle2, Clock, Send } from "lucide-react";
import { DocumentSigning, type Signatory } from "@/components/signing/DocumentSigning";
import { ConsolidationNotes } from "@/components/consolidation/ConsolidationNotes";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";
import { toast } from "sonner";

interface Stage6Props { groupId: string;
  periodId?: string;
  groupName: string;
  periodStart: string;
  periodEnd: string;
}

export const Stage6AnnualReport = ({ groupId, periodId, groupName, periodStart, periodEnd }: Stage6Props) => { const [activeTab, setActiveTab] = useState("edit");
  const [status, setStatus] = useState<"draft" | "review" | "signing" | "signed" | "submitted">("draft");
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [submissionRef, setSubmissionRef] = useState("");
  const [submissionDate, setSubmissionDate] = useState("");

  // Content state
  const [forvaltning, setForvaltning] = useState("Styrelsen avger härmed koncernredovisning för räkenskapsåret.");
  const [redovisningsprinciper, setRedovisningsprinciper] = useState(
    "Koncernredovisningen har upprättats enligt årsredovisningslagen och BFNAR 2012:1 (K3). " +
    "Koncernredovisningen omfattar moderbolaget och dess dotterföretag. " +
    "Dotterföretag konsolideras enligt förvärvsmetoden. " +
    "Goodwill skrivs av linjärt över 5 år."
  );
  const [notes, setNotes] = useState<{ title: string; content: string }[]>([
    { title: "Not 1 — Redovisningsprinciper", content: "Se ovan." },
    { title: "Not 2 — Koncernens sammansättning", content: "Dotterbolag redovisas i förvaltningsberättelsen." },
    { title: "Not 3 — Goodwill", content: "Avskrivning sker linjärt över bedömd nyttjandeperiod om 5 år." },
  ]);

  const handleAddNote = () => { setNotes(prev => [...prev, { title: `Not ${prev.length + 1}`, content: "" }]);
  };

  const allSigned = signatories.length > 0 && signatories.every(s => s.status === "signed");

  // Auto-calculated submission deadline (7 months after fiscal year end)
  const fyEnd = new Date(periodEnd);
  const deadline = new Date(fyEnd);
  deadline.setMonth(deadline.getMonth() + 7);

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
        <Badge className={status === "draft" ? "bg-primary" : "bg-muted"}>1. Redigera</Badge>
        <span className="text-muted-foreground">→</span>
        <Badge className={status === "review" ? "bg-primary" : "bg-muted"}>2. Granska</Badge>
        <span className="text-muted-foreground">→</span>
        <Badge className={status === "signing" ? "bg-primary" : "bg-muted"}>3. Signera</Badge>
        <span className="text-muted-foreground">→</span>
        <Badge className={allSigned ? "bg-green-600 text-white" : "bg-muted"}>4. Klar</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="edit">Redigera</TabsTrigger>
          <TabsTrigger value="notes">Noter</TabsTrigger>
          <TabsTrigger value="sign">Signera</TabsTrigger>
          <TabsTrigger value="submit">Inlämning</TabsTrigger>
        </TabsList>

        {/* EDIT TAB */}
        <TabsContent value="edit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Förvaltningsberättelse (koncernen)</CardTitle>
              <CardDescription>Beskriv koncernens verksamhet och väsentliga händelser</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={forvaltning}
                onChange={e => setForvaltning(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Redovisningsprinciper</CardTitle>
              <CardDescription>Tillämpat regelverk och konsolideringsprinciper</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={redovisningsprinciper}
                onChange={e => setRedovisningsprinciper(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => { setActiveTab("notes"); setStatus("review"); }}>
              Gå vidare till Noter →
            </Button>
          </div>
        </TabsContent>

        {/* NOTES TAB */}
        <TabsContent value="notes" className="space-y-4">
          {notes.map((note, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="text-base">
                  <Input
                    value={note.title}
                    onChange={e => { const updated = [...notes];
                      updated[i].title = e.target.value;
                      setNotes(updated);
                    }}
                    className="font-bold border-none p-0 h-auto"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={note.content}
                  onChange={e => { const updated = [...notes];
                    updated[i].content = e.target.value;
                    setNotes(updated);
                  }}
                  rows={4}
                />
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={handleAddNote}>+ Lägg till not</Button>

          <div className="flex justify-end">
            <Button onClick={() => { setActiveTab("sign"); setStatus("signing"); }}>
              Gå vidare till Signering →
            </Button>
          </div>
        </TabsContent>

        {/* SIGN TAB */}
        <TabsContent value="sign">
          <DocumentSigning
            documentType="annual_report"
            documentTitle={`${groupName} — Koncernredovisning ${periodStart.substring(0, 4)}`}
            companyId={groupId}
            signatories={signatories}
            onSignatoriesChange={setSignatories}
            onAllSigned={() => { setStatus("signed");
              toast.success("Alla signatärer har signerat!");
            }}
          />
        </TabsContent>

        {/* SUBMIT TAB */}
        <TabsContent value="submit" className="space-y-4">
          {allSigned ? (
            <>
              <Alert className="border-[#BFE6D6] bg-[#E1F5EE] dark:bg-green-950/20">
                <CheckCircle2 className="w-4 h-4 text-[#085041]" />
                <AlertDescription className="text-[#085041] dark:text-green-300">
                  Koncernredovisningen är signerad och redo att lämnas in
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle>Exportera</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-3">
                  <ComingSoonButton variant="outline">
                    <Download className="w-4 h-4 mr-2" />Ladda ner PDF
                  </ComingSoonButton>
                  <ComingSoonButton variant="outline">
                    <Download className="w-4 h-4 mr-2" />Ladda ner signerad PDF
                  </ComingSoonButton>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Inlämning till Bolagsverket</CardTitle>
                  <CardDescription>
                    Sista inlämningsdag: {deadline.toLocaleDateString("sv-SE")} (7 mån efter räkenskapsårets slut)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    variant="outline"
                    onClick={() => window.open("https://etjanster.bolagsverket.se/", "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Öppna Bolagsverkets e-tjänst
                  </Button>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>Inlämningsdatum</Label>
                      <Input type="date" value={submissionDate} onChange={e => setSubmissionDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Referensnummer (Bolagsverket)</Label>
                      <Input value={submissionRef} onChange={e => setSubmissionRef(e.target.value)} placeholder="BV-XXXXXXX" />
                    </div>
                  </div>

                  {submissionDate && (
                    <Button onClick={() => { setStatus("submitted"); toast.success("Inlämning registrerad"); }}>
                      <Send className="w-4 h-4 mr-2" />
                      Registrera inlämning
                    </Button>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert>
              <Clock className="w-4 h-4" />
              <AlertDescription>
                Alla signatärer måste signera innan koncernredovisningen kan lämnas in.
                Gå till fliken "Signera" för att hantera signaturer.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
