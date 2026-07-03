import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, ChevronDown, ChevronRight, Brain, Loader2, RefreshCw, Check, Pencil,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatSEK } from "@/lib/consolidation-engine";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { groupId: string;
  periodId: string;
}

interface StructureEntry { child_name: string;
  child_org: string;
  ownership_pct: number;
  voting_pct: number;
  consolidation_method: string;
  acquisition_date: string | null;
  acquisition_price: number | null;
  net_assets_at_acquisition: number | null;
  goodwill_amount: number | null;
}

const NOTE_CATEGORIES = [
  { key: "redovisningsprinciper", label: "Redovisningsprinciper" },
  { key: "goodwill", label: "Goodwill" },
  { key: "immateriella", label: "Immateriella tillgångar" },
  { key: "materiella", label: "Materiella tillgångar" },
  { key: "finansiella", label: "Finansiella tillgångar" },
  { key: "intaktsredovisning", label: "Intäktsredovisning" },
  { key: "leasing", label: "Leasing" },
  { key: "skatter", label: "Skatter" },
  { key: "personal", label: "Personal" },
  { key: "narstaende", label: "Närståendetransaktioner" },
  { key: "koncernstruktur", label: "Koncernstruktur" },
  { key: "risker", label: "Risker & osäkerheter" },
  { key: "event_efter_balansdag", label: "Event efter balansdagen" },
  { key: "stallda_sakerheter", label: "Ställda säkerheter" },
  { key: "ansvarsförbindelser", label: "Ansvarsförbindelser" },
] as const;

type NoteKey = typeof NOTE_CATEGORIES[number]["key"];

interface NoteData { key: NoteKey;
  label: string;
  content: string;
  isAIGenerated: boolean;
  isEditing: boolean;
}

const AI_TEMPLATES: Record<string, (structures: StructureEntry[]) => string> = { redovisningsprinciper: () =>
    `Koncernredovisningen har upprättats i enlighet med årsredovisningslagen och BFNAR 2012:1 (K3).\n\nKoncernredovisningen omfattar moderbolaget och de dotterföretag i vilka moderbolaget direkt eller indirekt innehar mer än hälften av rösterna. Dotterföretag inkluderas i koncernredovisningen från och med den dag då det bestämmande inflytandet överförs till koncernen.\n\nFörvärvsmetoden tillämpas vid redovisning av koncernens rörelseförvärv. Goodwill som uppstår vid förvärv skrivs av linjärt över 5 år.`,
  koncernstruktur: (structures) => { const subs = structures.filter(s => s.consolidation_method === "full" || s.consolidation_method === "proportional");
    if (subs.length === 0) return "Inga dotterföretag registrerade.";
    const lines = subs.map(s => `- ${s.child_name} (${s.child_org}): ${s.ownership_pct}% ägarandel`);
    return `Koncernen består av moderbolaget samt följande dotterföretag:\n\n${lines.join("\n")}\n\nSamtliga dotterföretag konsolideras enligt förvärvsmetoden.`;
  },
  goodwill: (structures) => { const acq = structures.filter(s => s.goodwill_amount && s.goodwill_amount > 0);
    if (acq.length === 0) return "Ingen goodwill har uppstått vid förvärv under perioden.";
    const lines = acq.map(s => `${s.child_name}: Goodwill ${formatSEK(s.goodwill_amount || 0)} kr (förvärvspris ${formatSEK(s.acquisition_price || 0)} kr − nettotillgångar ${formatSEK(s.net_assets_at_acquisition || 0)} kr)`);
    return `Goodwill skrivs av linjärt över en bedömd nyttjandeperiod om 5 år.\n\n${lines.join("\n")}\n\nNedskrivningsprövning görs vid indikation på värdenedgång.`;
  },
  skatter: () =>
    `Skatt på årets resultat i resultaträkningen består av aktuell skatt och uppskjuten skatt. Aktuell skatt beräknas på det skattepliktiga resultatet för perioden. Uppskjuten skatt redovisas på temporära skillnader mellan redovisade och skattemässiga värden.\n\nBolaget tillämpar en skattesats om 20,6%.`,
  personal: () =>
    `Medelantalet anställda under räkenskapsåret har uppgått till [antal]. Löner och ersättningar har uppgått till [belopp] kr varav [belopp] kr avser styrelse och VD.\n\nSociala kostnader har uppgått till [belopp] kr.`,
  narstaende: () =>
    `Koncerninterna transaktioner har eliminerats i koncernredovisningen. Eventuella transaktioner med närstående utanför koncernen har skett på marknadsmässiga villkor.`,
  intaktsredovisning: () =>
    `Intäkter redovisas i den omfattning det är sannolikt att de ekonomiska fördelarna kommer att tillgodogöras bolaget och intäkterna kan beräknas på ett tillförlitligt sätt. Intäkter värderas till verkligt värde av vad som erhållits eller kommer att erhållas.`,
  leasing: () =>
    `Samtliga leasingavtal redovisas som operationella leasingavtal. Leasingavgifterna fördelas linjärt över leasingperioden.`,
  risker: () =>
    `Koncernen är exponerad mot finansiella risker i form av valutarisk, ränterisk, kreditrisk och likviditetsrisk. Riskhanteringen styrs av koncernens finanspolicy.`,
};

export const ConsolidationNotes = ({ groupId, periodId }: Props) => { const [structures, setStructures] = useState<StructureEntry[]>([]);
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [addCategory, setAddCategory] = useState<string>("");
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);

  useEffect(() => { const load = async () => { const { data } = await supabase
        .from("group_structure")
        .select(`
          ownership_pct, voting_pct, consolidation_method,
          acquisition_date, acquisition_price, net_assets_at_acquisition, goodwill_amount,
          child_entity:companies!group_structure_child_entity_id_fkey(name, org_number)
        `)
        .eq("group_id", groupId)
        .eq("status", "active")
        .order("created_at");

      if (data) { const mapped = data.map((d: any) => ({ child_name: d.child_entity?.name || "—",
          child_org: d.child_entity?.org_number || "—",
          ownership_pct: d.ownership_pct,
          voting_pct: d.voting_pct,
          consolidation_method: d.consolidation_method,
          acquisition_date: d.acquisition_date,
          acquisition_price: d.acquisition_price,
          net_assets_at_acquisition: d.net_assets_at_acquisition,
          goodwill_amount: d.goodwill_amount,
        }));
        setStructures(mapped);

        // Auto-generate default notes
        const autoNotes: NoteData[] = [
          { key: "redovisningsprinciper", label: "Redovisningsprinciper", content: AI_TEMPLATES.redovisningsprinciper(mapped), isAIGenerated: true, isEditing: false },
          { key: "koncernstruktur", label: "Koncernstruktur", content: AI_TEMPLATES.koncernstruktur(mapped), isAIGenerated: true, isEditing: false },
        ];
        if (mapped.some(s => s.goodwill_amount && s.goodwill_amount > 0)) { autoNotes.push({ key: "goodwill", label: "Goodwill", content: AI_TEMPLATES.goodwill(mapped), isAIGenerated: true, isEditing: false });
        }
        setNotes(autoNotes);
        setExpandedNotes(new Set(["redovisningsprinciper"]));
      }
    };
    load();
  }, [groupId]);

  const methodLabel = (m: string) => { const map: Record<string, string> = { full: "Förvärvsmetoden", equity: "Kapitalandelsmetoden", proportional: "Klyvningsmetoden", excluded: "Exkluderas" };
    return map[m] || m;
  };

  const addNote = (categoryKey: string) => { const cat = NOTE_CATEGORIES.find(c => c.key === categoryKey);
    if (!cat || notes.some(n => n.key === categoryKey)) return;

    const template = AI_TEMPLATES[categoryKey];
    const content = template ? template(structures) : `[AI-genererad not för ${cat.label} kommer här]`;

    setNotes(prev => [...prev, { key: categoryKey as NoteKey, label: cat.label, content, isAIGenerated: true, isEditing: false }]);
    setExpandedNotes(prev => new Set([...prev, categoryKey]));
    setAddCategory("");
  };

  const regenerateNote = async (key: string) => { setGeneratingKey(key);
    // Simulate AI generation delay
    await new Promise(r => setTimeout(r, 800));
    const template = AI_TEMPLATES[key];
    if (template) { setNotes(prev => prev.map(n => n.key === key ? { ...n, content: template(structures), isAIGenerated: true, isEditing: false } : n));
    }
    setGeneratingKey(null);
    toast.success("Not regenererad med AI");
  };

  const toggleExpand = (key: string) => { setExpandedNotes(prev => { const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const removeNote = (key: string) => { setNotes(prev => prev.filter(n => n.key !== key));
    toast.success("Not borttagen");
  };

  const availableCategories = NOTE_CATEGORIES.filter(c => !notes.some(n => n.key === c.key));

  const subsidiaries = structures.filter(s => s.consolidation_method === "full" || s.consolidation_method === "proportional");
  const associates = structures.filter(s => s.consolidation_method === "equity");
  const acquisitions = structures.filter(s => s.acquisition_date && s.acquisition_price);
  const minorities = structures.filter(s => s.ownership_pct < 100);

  return (
    <div className="space-y-4">
      {/* Add note control */}
      <div className="flex items-center gap-2">
        <Select value={addCategory} onValueChange={setAddCategory}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Lägg till not..." />
          </SelectTrigger>
          <SelectContent>
            {availableCategories.map(c => (
              <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" disabled={!addCategory} onClick={() => addNote(addCategory)}>
          <Plus className="h-4 w-4 mr-1" /> Lägg till
        </Button>
      </div>

      {/* Dynamic notes */}
      {notes.map((note, idx) => { const isExpanded = expandedNotes.has(note.key);
        const isGenerating = generatingKey === note.key;
        return (
          <Card key={note.key}>
            <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(note.key)}>
              <CollapsibleTrigger asChild>
                <button className="w-full text-left">
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <FileText className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-semibold">Not {idx + 1} — {note.label}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {note.isAIGenerated && (
                          <Badge variant="outline" className="text-[10px] py-0 gap-1">
                            <Brain className="h-3 w-3" /> AI-genererad
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 px-4 pb-4">
                  {note.isEditing ? (
                    <div className="space-y-3">
                      <Textarea
                        value={note.content}
                        onChange={(e) => setNotes(prev => prev.map(n => n.key === note.key ? { ...n, content: e.target.value, isAIGenerated: false } : n))}
                        className="min-h-[150px] text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setNotes(prev => prev.map(n => n.key === note.key ? { ...n, isEditing: false } : n))}>
                          <Check className="h-3 w-3 mr-1" /> Spara
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm whitespace-pre-line text-foreground/90 leading-relaxed bg-muted/20 rounded-lg p-4 border border-border/40">
                        {note.content}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline" size="sm" className="text-xs"
                          onClick={(e) => { e.stopPropagation(); setNotes(prev => prev.map(n => n.key === note.key ? { ...n, isEditing: true } : n)); }}
                        >
                          <Pencil className="h-3 w-3 mr-1" /> Redigera
                        </Button>
                        <Button
                          variant="outline" size="sm" className="text-xs"
                          disabled={isGenerating}
                          onClick={(e) => { e.stopPropagation(); regenerateNote(note.key); }}
                        >
                          {isGenerating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                          Regenerera med AI
                        </Button>
                        <Button
                          variant="ghost" size="sm" className="text-xs text-destructive"
                          onClick={(e) => { e.stopPropagation(); removeNote(note.key); }}
                        >
                          Ta bort
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      {/* Structured data notes (auto from structure) */}
      {subsidiaries.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Koncernens sammansättning — Dotterföretag
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Dotterbolag</TableHead>
                  <TableHead className="text-xs">Org.nr</TableHead>
                  <TableHead className="text-right text-xs">Ägarandel</TableHead>
                  <TableHead className="text-right text-xs">Röstetal</TableHead>
                  <TableHead className="text-xs">Metod</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subsidiaries.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{s.child_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{s.child_org}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{s.ownership_pct}%</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{s.voting_pct}%</TableCell>
                    <TableCell className="text-sm">{methodLabel(s.consolidation_method)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {associates.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Intresseföretag
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Intresseföretag</TableHead>
                  <TableHead className="text-xs">Org.nr</TableHead>
                  <TableHead className="text-right text-xs">Ägarandel</TableHead>
                  <TableHead className="text-right text-xs">Röstetal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {associates.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{s.child_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{s.child_org}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{s.ownership_pct}%</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{s.voting_pct}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {acquisitions.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Förvärvsanalys
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Bolag</TableHead>
                  <TableHead className="text-xs">Förvärvsdatum</TableHead>
                  <TableHead className="text-right text-xs">Förvärvspris</TableHead>
                  <TableHead className="text-right text-xs">Nettotillgångar</TableHead>
                  <TableHead className="text-right text-xs">Goodwill</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acquisitions.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{s.child_name}</TableCell>
                    <TableCell className="text-sm">{s.acquisition_date || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{s.acquisition_price ? `${formatSEK(s.acquisition_price)} kr` : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{s.net_assets_at_acquisition ? `${formatSEK(s.net_assets_at_acquisition)} kr` : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-sm">{s.goodwill_amount ? `${formatSEK(s.goodwill_amount)} kr` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {minorities.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Minoritetsintresse
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Bolag</TableHead>
                  <TableHead className="text-right text-xs">Koncernens andel</TableHead>
                  <TableHead className="text-right text-xs">Minoritetsandel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {minorities.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{s.child_name}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{s.ownership_pct}%</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{(100 - s.ownership_pct).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
