import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Loader2, Sparkles, Scale, Users, Landmark, AlertTriangle, Edit2, Check, X } from "lucide-react";

interface NotesDisclosuresPanelProps { companyId: string;
}

interface Note { note_number: number;
  title: string;
  category: string;
  content: string;
  legal_reference: string;
  is_mandatory: boolean;
}

const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = { accounting_principles: { label: "Redovisningsprinciper", icon: <Scale className="w-4 h-4" />, color: "bg-primary/10 text-primary" },
  balance_sheet: { label: "Balansräkning", icon: <Landmark className="w-4 h-4" />, color: "bg-[#EFF6FF] text-blue-600" },
  income_statement: { label: "Resultaträkning", icon: <BookOpen className="w-4 h-4" />, color: "bg-[#E1F5EE] text-[#085041]" },
  personnel: { label: "Personal", icon: <Users className="w-4 h-4" />, color: "bg-orange-500/10 text-orange-600" },
  tax: { label: "Skatt", icon: <Landmark className="w-4 h-4" />, color: "bg-[#FCE8E8] text-[#7A1A1A]" },
  events_after_fy: { label: "Händelser efter RÅ", icon: <AlertTriangle className="w-4 h-4" />, color: "bg-[#FAEEDA] text-[#7A5417]" },
  other: { label: "Övrigt", icon: <BookOpen className="w-4 h-4" />, color: "bg-muted text-muted-foreground" },
};

export const NotesDisclosuresPanel = ({ companyId }: NotesDisclosuresPanelProps) => { const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(currentYear - 1);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [financialContext, setFinancialContext] = useState<any>(null);

  const handleGenerate = async () => { setLoading(true);
    setNotes([]);
    setSummary(null);
    try { const { data, error } = await supabase.functions.invoke('generate-ai-notes', { body: { company_id: companyId, fiscal_year: fiscalYear },
      });
      if (error) throw error;

      setNotes(data.notes || []);
      setSummary(data.summary || null);
      setFinancialContext(data.financial_context || null);

      toast({ title: "Noter genererade!",
        description: `${data.notes?.length || 0} noter skapade med AI för räkenskapsåret ${fiscalYear}`,
      });
    } catch (error) { console.error('Error generating notes:', error);
      toast({ title: "Fel vid generering",
        description: error instanceof Error ? error.message : "Kunde inte generera noter",
        variant: "destructive",
      });
    } finally { setLoading(false);
    }
  };

  const startEditing = (note: Note) => { setEditingNote(note.note_number);
    setEditContent(note.content);
  };

  const saveEdit = (noteNumber: number) => { setNotes(prev => prev.map(n =>
      n.note_number === noteNumber ? { ...n, content: editContent } : n
    ));
    setEditingNote(null);
    toast({ title: "Not uppdaterad", description: `Not ${noteNumber} har sparats.` });
  };

  const cancelEdit = () => { setEditingNote(null);
    setEditContent("");
  };

  const mandatoryCount = notes.filter(n => n.is_mandatory).length;
  const optionalCount = notes.length - mandatoryCount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          AI-genererade noter & tilläggsupplysningar
          <Badge variant="secondary" className="ml-auto text-xs flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            K2
          </Badge>
        </CardTitle>
        <CardDescription>
          AI analyserar företagets verksamhet och genererar lagstadgade noter anpassade efter bransch och ekonomisk data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Räkenskapsår</label>
            <Select value={String(fiscalYear)} onValueChange={v => { setFiscalYear(parseInt(v)); setNotes([]); setSummary(null); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={String(currentYear - 1)}>{currentYear - 1}</SelectItem>
                <SelectItem value={String(currentYear - 2)}>{currentYear - 2}</SelectItem>
                <SelectItem value={String(currentYear - 3)}>{currentYear - 3}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Genererar...</> : <><Sparkles className="w-4 h-4 mr-2" />Generera noter</>}
          </Button>
        </div>

        {/* Summary */}
        {summary && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI-analys
            </p>
            <p className="text-sm text-muted-foreground">{summary}</p>
            {financialContext && (
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-xs">Omsättning: {financialContext.total_revenue?.toLocaleString('sv-SE')} kr</Badge>
                <Badge variant="outline" className="text-xs">Anställda: {financialContext.employee_count}</Badge>
                <Badge variant="outline" className="text-xs">Bransch: {financialContext.industry}</Badge>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        {notes.length > 0 && (
          <div className="flex gap-3 text-sm">
            <Badge variant="default">{notes.length} noter</Badge>
            <Badge variant="secondary">{mandatoryCount} obligatoriska</Badge>
            <Badge variant="outline">{optionalCount} frivilliga</Badge>
          </div>
        )}

        {/* Notes list */}
        {notes.length > 0 && (
          <Accordion type="multiple" className="space-y-2">
            {notes.map((note) => { const cat = categoryConfig[note.category] || categoryConfig.other;
              return (
                <AccordionItem key={note.note_number} value={`note-${note.note_number}`} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3 text-left w-full pr-4">
                      <span className="text-xs font-mono font-bold text-muted-foreground w-8">N{note.note_number}</span>
                      <span className={`p-1 rounded ${cat.color}`}>{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{note.title}</p>
                        <p className="text-xs text-muted-foreground">{cat.label} · {note.legal_reference}</p>
                      </div>
                      {note.is_mandatory && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Obligatorisk</Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    {editingNote === note.note_number ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          rows={6}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(note.note_number)}>
                            <Check className="w-3 h-3 mr-1" />Spara
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>
                            <X className="w-3 h-3 mr-1" />Avbryt
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Ref: {note.legal_reference}</span>
                          <Button size="sm" variant="ghost" onClick={() => startEditing(note)} className="text-xs">
                            <Edit2 className="w-3 h-3 mr-1" />Redigera
                          </Button>
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        {/* Empty state */}
        {notes.length === 0 && !loading && (
          <div className="p-6 border border-dashed rounded-lg text-center space-y-2">
            <BookOpen className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Klicka på "Generera noter" för att skapa AI-anpassade noter baserade på företagets bokföring
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          AI genererar noter enligt K2 (BFNAR 2016:10) och ÅRL. Granska och redigera innan publicering.
        </p>
      </CardContent>
    </Card>
  );
};
