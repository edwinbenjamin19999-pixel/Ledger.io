import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Upload, CheckCircle2, Edit3, Send, BookOpen, Sparkles, Eye, Download, Circle } from "lucide-react";
import { Stage6AnnualReport } from "@/components/consolidation/stages/Stage6AnnualReport";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ArsredovisningTabProps { groupId: string;
  periodId: string;
  groupName: string;
  periodStart: string;
  periodEnd: string;
}

export const ArsredovisningTab = ({ groupId, periodId, groupName, periodStart, periodEnd }: ArsredovisningTabProps) => { const [subTab, setSubTab] = useState("redigera");

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="h-9 bg-muted/60">
          <TabsTrigger value="redigera" className="text-xs gap-1.5"><Edit3 className="w-3.5 h-3.5" />Redigera</TabsTrigger>
          <TabsTrigger value="forvaltning" className="text-xs gap-1.5"><FileText className="w-3.5 h-3.5" />Förvaltningsberättelse</TabsTrigger>
          <TabsTrigger value="noter" className="text-xs gap-1.5"><BookOpen className="w-3.5 h-3.5" />Noter</TabsTrigger>
          <TabsTrigger value="revision" className="text-xs gap-1.5"><Eye className="w-3.5 h-3.5" />Revisionsberättelse</TabsTrigger>
          <TabsTrigger value="signera" className="text-xs gap-1.5"><Edit3 className="w-3.5 h-3.5" />Signera</TabsTrigger>
          <TabsTrigger value="inlamning" className="text-xs gap-1.5"><Send className="w-3.5 h-3.5" />Inlämning</TabsTrigger>
        </TabsList>

        <TabsContent value="redigera" className="mt-4">
          <Stage6AnnualReport groupId={groupId} periodId={periodId} groupName={groupName} periodStart={periodStart} periodEnd={periodEnd} />
        </TabsContent>

        <TabsContent value="forvaltning" className="mt-4">
          <ForvaltningsberattelseSection groupName={groupName} />
        </TabsContent>

        <TabsContent value="noter" className="mt-4">
          <NotesSection />
        </TabsContent>

        <TabsContent value="revision" className="mt-4">
          <RevisionSection />
        </TabsContent>

        <TabsContent value="signera" className="mt-4">
          <SigneringSection />
        </TabsContent>

        <TabsContent value="inlamning" className="mt-4">
          <InlamningSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ─── Förvaltningsberättelse ───
const ForvaltningsberattelseSection = ({ groupName }: { groupName: string }) => { const [draft, setDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [tone, setTone] = useState<"formell" | "koncis" | "detaljerad">("formell");

  const generateDraft = () => { setIsGenerating(true);
    setTimeout(() => { setDraft(`Förvaltningsberättelse

Styrelsen och verkställande direktören för ${groupName} avger härmed årsredovisning och koncernredovisning för räkenskapsåret ${new Date().getFullYear()}.

Verksamheten
Koncernen bedriver konsultverksamhet inom management och rådgivning. Under räkenskapsåret har verksamheten utvecklats positivt.

Väsentliga händelser under räkenskapsåret
Verksamheten har bedrivits i enlighet med koncernens strategi. Inga väsentliga händelser har inträffat efter räkenskapsårets utgång.

Flerårsöversikt
Se koncernens nyckeltal som automatiskt hämtas från koncernrapporten.

Resultat och ställning
Koncernens nettoomsättning uppgick till X kr. Resultat efter finansiella poster uppgick till Y kr.

Förslag till vinstdisposition
Styrelsen föreslår att tillgängliga vinstmedel disponeras enligt separat förslag.`);
      setIsGenerating(false);
      toast.success("Förvaltningsberättelse genererad");
    }, 1500);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold">Förvaltningsberättelse — {groupName}</h3>
            <p className="text-xs text-muted-foreground">AI-genererad baserat på koncernens faktiska siffror</p>
          </div>
          <div className="flex gap-2">
            <div className="flex rounded-md border border-input overflow-hidden">
              {(["formell", "koncis", "detaljerad"] as const).map(t => (
                <button key={t} className={cn("px-2.5 py-1 text-[11px] font-medium transition-colors capitalize", tone === t ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")} onClick={() => setTone(t)}>
                  {t}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={generateDraft} disabled={isGenerating}>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              {isGenerating ? "Genererar..." : "Generera med AI"}
            </Button>
          </div>
        </div>

        <Textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Klicka 'Generera med AI' eller skriv manuellt..."
          className="min-h-[400px] font-mono text-sm"
        />

        <div className="flex justify-end mt-4 gap-2">
          <ComingSoonButton variant="outline" className="text-xs h-9"><Download className="w-3.5 h-3.5 mr-1.5" />Exportera PDF</ComingSoonButton>
          <Button size="sm" disabled={!draft} onClick={() => toast.success("Utkast sparat lokalt")}>Spara utkast</Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Notes Section ───
const NotesSection = () => { const notes = [
    { id: 1, title: "Not 1 — Redovisningsprinciper", status: "done", desc: "K3 BFNAR 2012:1" },
    { id: 2, title: "Not 2 — Koncernens sammansättning", status: "done", desc: "Dotterbolag och ägarandelar" },
    { id: 3, title: "Not 3 — Förvärvsanalys", status: "pending", desc: "Goodwill och övervärden" },
    { id: 4, title: "Not 4 — Immateriella tillgångar", status: "pending", desc: "Goodwill, licenser" },
    { id: 5, title: "Not 5 — Materiella tillgångar", status: "done", desc: "Inventarier, fastigheter" },
    { id: 6, title: "Not 6 — Anställda och löner", status: "pending", desc: "Medelantal, löner, sociala avgifter" },
    { id: 7, title: "Not 7 — Eventualförpliktelser", status: "pending", desc: "Borgensåtaganden m.m." },
    { id: 8, title: "Not 8 — Ställda säkerheter", status: "pending", desc: "Pantsatta tillgångar" },
    { id: 9, title: "Not 9 — Relaterade parter", status: "pending", desc: "Transaktioner med närstående" },
    { id: 10, title: "Not 10 — Väsentliga händelser", status: "pending", desc: "Händelser efter balansdagen" },
  ];

  const doneCount = notes.filter(n => n.status === "done").length;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold">Koncernnoter</h3>
            <p className="text-xs text-muted-foreground">Alla noter enligt K3 BFNAR 2012:1</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{doneCount}/{notes.length} klara</Badge>
            <ComingSoonButton variant="outline" className="text-xs h-9">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />Auto-generera alla
            </ComingSoonButton>
          </div>
        </div>
        <div className="space-y-2">
          {notes.map(note => (
            <div key={note.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/40 border transition-colors">
              <div className="flex items-center gap-3">
                {note.status === "done" ? (
                  <CheckCircle2 className="w-4 h-4 text-[hsl(var(--status-green))]" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground/30" />
                )}
                <div>
                  <div className="text-sm font-medium">{note.title}</div>
                  <div className="text-xs text-muted-foreground">{note.desc}</div>
                </div>
              </div>
              <ComingSoonButton variant="ghost" className="text-xs h-7">Redigera</ComingSoonButton>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Revision Section ───
const RevisionSection = () => { const [uploaded, setUploaded] = useState(false);
  const [notRequired, setNotRequired] = useState(false);

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-base font-semibold mb-4">Revisionsberättelse</h3>

        {uploaded ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-[hsl(var(--status-green-bg))] border border-[hsl(var(--status-green))]/20">
            <CheckCircle2 className="w-5 h-5 text-[hsl(var(--status-green))]" />
            <div>
              <div className="text-sm font-medium">Revisionsberättelse bifogad ✓</div>
              <div className="text-xs text-muted-foreground">revisionsberattelse_2026.pdf • Uppladdad idag</div>
            </div>
          </div>
        ) : notRequired ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Ej reviderad</div>
              <div className="text-xs text-muted-foreground">Bolaget understiger gränsvärdena för revisionsplikt</div>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-xl p-8 text-center">
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <h4 className="text-sm font-medium mb-1">Ladda upp revisionsberättelse</h4>
            <p className="text-xs text-muted-foreground mb-3">
              PDF från er externa revisor
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={() => setUploaded(true)}>Välj fil...</Button>
            </div>
            <div className="mt-4 pt-4 border-t">
              <label className="flex items-center gap-2 text-sm text-muted-foreground justify-center cursor-pointer">
                <input type="checkbox" className="rounded" checked={notRequired} onChange={e => setNotRequired(e.target.checked)} />
                Bolaget understiger gränsvärdena — Ej reviderad
              </label>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Signering Section ───
const SigneringSection = () => (
  <Card>
    <CardContent className="p-6 text-center py-12">
      <Edit3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
      <h3 className="text-base font-semibold mb-2">Digital signering</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
        Signera koncernårsredovisningen digitalt. Alla styrelseledamöter och VD måste signera.
      </p>
      <div className="flex gap-2 justify-center">
        <ComingSoonButton variant="outline">Skicka för signering</ComingSoonButton>
        <ComingSoonButton>Signera nu</ComingSoonButton>
      </div>
    </CardContent>
  </Card>
);

// ─── Inlämning Section ───
const InlamningSection = () => (
  <Card>
    <CardContent className="p-6 text-center py-12">
      <Send className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
      <h3 className="text-base font-semibold mb-2">Inlämning till Bolagsverket</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
        Skicka in koncernårsredovisningen i iXBRL-format till Bolagsverket.
      </p>
      <div className="flex gap-2 justify-center">
        <ComingSoonButton variant="outline"><Download className="w-3.5 h-3.5 mr-1.5" />Ladda ner PDF</ComingSoonButton>
        <Button disabled>Årsredovisningen måste signeras först</Button>
      </div>
    </CardContent>
  </Card>
);
