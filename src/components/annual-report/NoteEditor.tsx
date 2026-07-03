import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Brain, ChevronDown, ChevronRight, FileText, GripVertical, Pencil, Plus, RefreshCw, Trash2, Check } from "lucide-react";
import { NOTE_TEMPLATES, type NoteTemplate, type NoteCategory, getCategoryBadge, filterTemplatesForFramework, getFrameworkRef } from "@/lib/annual-report-notes";
import { toast } from "sonner";

interface NoteInstance { id: string;
  code: string;
  title: string;
  content: string;
  category: NoteCategory;
  isEditing: boolean;
  isAIGenerated: boolean;
}

interface Props { framework: "K2" | "K3";
  notes: NoteInstance[];
  onNotesChange: (notes: NoteInstance[]) => void;
  acctMap?: Map<string, { debit: number; credit: number }>;
}

const fillTemplate = (template: string, fw: "K2" | "K3", acctMap?: Map<string, { debit: number; credit: number }>): string => { let text = template;
  text = text.replace("{{framework_ref}}", getFrameworkRef(fw));
  text = text.replace("{{k2_max_5ar}}", fw === "K2" ? " Nyttjandeperioden uppgår till högst 5 år enligt K2." : "");

  // Placeholder replacements
  text = text.replace(/\{\{[^}]+\}\}/g, "[—]");
  return text;
};

export const NoteEditor = ({ framework, notes, onNotesChange, acctMap }: Props) => { const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set(notes.slice(0, 2).map(n => n.id)));
  const [addCategory, setAddCategory] = useState("");

  const availableTemplates = filterTemplatesForFramework(framework);
  const usedCodes = new Set(notes.map(n => n.code));
  const unusedTemplates = availableTemplates.filter(t => !usedCodes.has(t.code));

  const addNote = (code: string) => { const tmpl = NOTE_TEMPLATES.find(t => t.code === code);
    if (!tmpl) return;
    const content = fillTemplate(tmpl.template, framework, acctMap);
    const newNote: NoteInstance = { id: `note-${Date.now()}`,
      code: tmpl.code,
      title: tmpl.name,
      content,
      category: tmpl.category,
      isEditing: false,
      isAIGenerated: true,
    };
    onNotesChange([...notes, newNote]);
    setExpandedNotes(prev => new Set([...prev, newNote.id]));
    setAddCategory("");
    toast.success(`Not "${tmpl.name}" tillagd`);
  };

  const removeNote = (id: string) => { const note = notes.find(n => n.id === id);
    if (note?.category === "obligatorisk") { toast.error("Obligatoriska noter kan inte tas bort");
      return;
    }
    onNotesChange(notes.filter(n => n.id !== id));
    toast.success("Not borttagen");
  };

  const updateNote = (id: string, updates: Partial<NoteInstance>) => { onNotesChange(notes.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const regenerateNote = (id: string) => { const note = notes.find(n => n.id === id);
    if (!note) return;
    const tmpl = NOTE_TEMPLATES.find(t => t.code === note.code);
    if (!tmpl) return;
    const content = fillTemplate(tmpl.template, framework, acctMap);
    updateNote(id, { content, isAIGenerated: true, isEditing: false });
    toast.success("Not regenererad med AI");
  };

  const toggleExpand = (id: string) => { setExpandedNotes(prev => { const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Group unused templates by category for the dropdown
  const groupedUnused = { obligatorisk: unusedTemplates.filter(t => t.category === "obligatorisk"),
    rekommenderad: unusedTemplates.filter(t => t.category === "rekommenderad"),
    valfri: unusedTemplates.filter(t => t.category === "valfri"),
  };

  return (
    <div className="space-y-3">
      {/* Add note control */}
      <div className="flex items-center gap-2">
        <Select value={addCategory} onValueChange={setAddCategory}>
          <SelectTrigger className="w-[320px]">
            <SelectValue placeholder="Lägg till not..." />
          </SelectTrigger>
          <SelectContent>
            {groupedUnused.obligatorisk.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-destructive">Obligatorisk</div>
                {groupedUnused.obligatorisk.map(t => (
                  <SelectItem key={t.code} value={t.code}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
                      {t.name}
                    </span>
                  </SelectItem>
                ))}
              </>
            )}
            {groupedUnused.rekommenderad.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-[#7A5417] mt-1">Rekommenderad</div>
                {groupedUnused.rekommenderad.map(t => (
                  <SelectItem key={t.code} value={t.code}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                      {t.name}
                    </span>
                  </SelectItem>
                ))}
              </>
            )}
            {groupedUnused.valfri.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">Valfri</div>
                {groupedUnused.valfri.map(t => (
                  <SelectItem key={t.code} value={t.code}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground inline-block" />
                      {t.name}
                    </span>
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
        <Button size="sm" disabled={!addCategory} onClick={() => addNote(addCategory)}>
          <Plus className="h-4 w-4 mr-1" /> Lägg till
        </Button>
      </div>

      {/* Notes list */}
      {notes.map((note, idx) => { const isExpanded = expandedNotes.has(note.id);
        const badge = getCategoryBadge(note.category);
        return (
          <Card key={note.id}>
            <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(note.id)}>
              <CollapsibleTrigger asChild>
                <button className="w-full text-left">
                  <CardHeader className="py-2.5 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <FileText className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-semibold">Not {idx + 1} — {note.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={badge.variant} className="text-[10px] py-0">{badge.label}</Badge>
                        {note.isAIGenerated && (
                          <Badge variant="outline" className="text-[10px] py-0 gap-1">
                            <Brain className="h-3 w-3" /> AI
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 px-4 pb-3">
                  {note.isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={note.title}
                        onChange={e => updateNote(note.id, { title: e.target.value })}
                        className="text-sm font-semibold h-8"
                        placeholder="Rubrik"
                      />
                      <Textarea
                        value={note.content}
                        onChange={e => updateNote(note.id, { content: e.target.value, isAIGenerated: false })}
                        className="min-h-[120px] text-sm"
                      />
                      <Button size="sm" onClick={() => updateNote(note.id, { isEditing: false })}>
                        <Check className="h-3 w-3 mr-1" /> Spara
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm whitespace-pre-line text-foreground/90 leading-relaxed bg-muted/20 rounded-lg p-3 border border-border/40">
                        {note.content}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" className="text-xs" onClick={e => { e.stopPropagation(); updateNote(note.id, { isEditing: true }); }}>
                          <Pencil className="h-3 w-3 mr-1" /> Redigera
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs" onClick={e => { e.stopPropagation(); regenerateNote(note.id); }}>
                          <RefreshCw className="h-3 w-3 mr-1" /> AI-fyll not
                        </Button>
                        {note.category !== "obligatorisk" && (
                          <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={e => { e.stopPropagation(); removeNote(note.id); }}>
                            <Trash2 className="h-3 w-3 mr-1" /> Ta bort
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
};
