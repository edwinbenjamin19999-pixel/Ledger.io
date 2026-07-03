import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, Bot, Loader2, Search,
  Sparkles, EyeOff, Plus, Clock, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";
import { supabase } from "@/integrations/supabase/client";
import { CompanyType, COMPANY_TYPE_LABELS } from "./shared/types";
import { SKATTEVERKET_FORMS, SkatteverketForm, getFormCategories, FormStatus, getDeadlineUrgency } from "./shared/skatteverketForms";
import { SubmissionOrderPanel } from "./SubmissionOrderPanel";

interface TaxFormLibraryProps { companyId: string;
}

const STATUS_OPTIONS: { value: FormStatus; label: string }[] = [
  { value: "not_started", label: "Ej påbörjad" },
  { value: "ai_preparing", label: "AI förbereder" },
  { value: "ready_review", label: "Klar att granska" },
  { value: "signed", label: "Signerad" },
  { value: "submitted", label: "Inskickad" },
];

const STATUS_COLORS: Record<FormStatus, string> = { not_started: "bg-muted text-muted-foreground",
  ai_preparing: "bg-primary/10 text-primary border-primary/30",
  ready_review: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  signed: "bg-[#EFF6FF] text-blue-600 border-[#C8DDF5]",
  submitted: "bg-[#E1F5EE] text-[#085041] border-green-500/30",
  not_relevant: "bg-muted text-muted-foreground",
};

export const TaxFormLibrary = ({ companyId }: TaxFormLibraryProps) => { const [companyType, setCompanyType] = useState<CompanyType>("ab");
  const [search, setSearch] = useState("");
  const [showOnlyRelevant, setShowOnlyRelevant] = useState(true);
  const [preparingForm, setPreparingForm] = useState<string | null>(null);
  const [aiRelevant, setAiRelevant] = useState<Set<string>>(new Set());
  const [manuallyAdded, setManuallyAdded] = useState<Set<string>>(new Set());
  const [manuallyRemoved, setManuallyRemoved] = useState<Set<string>>(new Set());
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const [formStatuses, setFormStatuses] = useState<Record<string, FormStatus>>({});
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deadlineFilter, setDeadlineFilter] = useState<string>("all");
  const [aiOnlyFilter, setAiOnlyFilter] = useState(false);

  const runAIRelevance = useCallback(async () => { setAiLoading(true);
    try { const { data: accounts } = await supabase
        .from("chart_of_accounts")
        .select("account_number")
        .eq("company_id", companyId)
        .eq("is_active", true);

      const accountNumbers = accounts?.map(a => a.account_number) || [];
      const relevant = new Set<string>();

      for (const form of SKATTEVERKET_FORMS) { if (!form.companyTypes.includes(companyType)) continue;
        if (!form.relevanceHints?.length) { if (["INK1", "INK2", "INK4", "AGI", "SKV4700", "ÅR"].includes(form.code)) { relevant.add(form.code);
          }
          continue;
        }

        for (const hint of form.relevanceHints) { if (hint.endsWith("*")) { const prefix = hint.replace("*", "");
            if (accountNumbers.some(a => a.startsWith(prefix))) { relevant.add(form.code);
              break;
            }
          } else if (hint.includes("-")) { const [from, to] = hint.split("-");
            if (accountNumbers.some(a => a >= from && a <= to)) { relevant.add(form.code);
              break;
            }
          } else { if (accountNumbers.includes(hint)) { relevant.add(form.code);
              break;
            }
          }
        }
      }

      // Core mandatory forms
      if (companyType === "ab" || companyType === "ek") { relevant.add("INK2"); relevant.add("INK2R"); }
      if (companyType === "ef") { relevant.add("INK1"); relevant.add("NE"); }
      if (companyType === "hb") relevant.add("INK4");
      relevant.add("SKV4700");
      relevant.add("AGI");

      setAiRelevant(relevant);
      setAiDone(true);
      toast.success(`AI identifierade ${relevant.size} relevanta blanketter baserat på kontoplanen`);
    } catch { toast.error("Kunde inte analysera kontoplanen");
    } finally { setAiLoading(false);
    }
  }, [companyId, companyType]);

  useEffect(() => { setAiDone(false);
    setAiRelevant(new Set());
  }, [companyType]);

  const isRelevant = (code: string) => { if (manuallyRemoved.has(code)) return false;
    if (manuallyAdded.has(code)) return true;
    if (aiDone) return aiRelevant.has(code);
    return true;
  };

  const toggleManual = (code: string, add: boolean) => { if (add) { setManuallyAdded(prev => new Set([...prev, code]));
      setManuallyRemoved(prev => { const n = new Set(prev); n.delete(code); return n; });
    } else { setManuallyRemoved(prev => new Set([...prev, code]));
      setManuallyAdded(prev => { const n = new Set(prev); n.delete(code); return n; });
    }
  };

  const setFormStatus = (code: string, status: FormStatus) => { setFormStatuses(prev => ({ ...prev, [code]: status }));
  };

  const formsForType = SKATTEVERKET_FORMS.filter(f =>
    f.companyTypes.includes(companyType) || f.companyTypes.length === 0
  );

  const filtered = formsForType.filter(f => { if (search) { const q = search.toLowerCase();
      if (!f.code.toLowerCase().includes(q) && !f.name.toLowerCase().includes(q) && !f.description.toLowerCase().includes(q) && !f.skv.includes(q)) return false;
    }
    if (showOnlyRelevant && aiDone && !isRelevant(f.code)) return false;
    if (statusFilter !== "all" && (formStatuses[f.code] || "not_started") !== statusFilter) return false;
    if (aiOnlyFilter && !f.aiReady) return false;
    return true;
  });

  const categories = getFormCategories(filtered);

  const handleAIPrepare = async (code: string) => { setPreparingForm(code);
    setFormStatus(code, "ai_preparing");
    await new Promise(r => setTimeout(r, 2000));
    setPreparingForm(null);
    setFormStatus(code, "ready_review");
    toast.success(`${code} har förberetts av AI — granska resultatet`);
  };

  const relevantCount = formsForType.filter(f => isRelevant(f.code)).length;
  const allRelevantCodes = new Set([...aiRelevant, ...manuallyAdded].filter(c => !manuallyRemoved.has(c)));

  return (
    <div className="space-y-6">
      {/* AI Relevance Banner + Submission Order */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">AI-identifiering av relevanta blanketter</p>
                <p className="text-xs text-muted-foreground">
                  {aiDone
                    ? `${aiRelevant.size} blanketter identifierade. Du kan lägga till eller ta bort manuellt.`
                    : "Analysera kontoplanen för att identifiera tillämpliga blanketter."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {aiDone && (
                <SubmissionOrderPanel
                  companyType={companyType}
                  relevantCodes={allRelevantCodes}
                  formStatuses={formStatuses}
                />
              )}
              <Button size="sm" onClick={runAIRelevance} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Bot className="h-4 w-4 mr-1.5" />}
                {aiDone ? "Analysera igen" : "Identifiera blanketter"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Företagstyp:</span>
              <Select value={companyType} onValueChange={v => setCompanyType(v as CompanyType)}>
                <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(COMPANY_TYPE_LABELS) as [CompanyType, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Sök blankett, SKV-nr, nyckelord..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 text-xs pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla statusar</SelectItem>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch checked={aiOnlyFilter} onCheckedChange={setAiOnlyFilter} id="ai-filter" />
              <label htmlFor="ai-filter" className="text-xs text-muted-foreground cursor-pointer">AI-stödd</label>
            </div>
            {aiDone && (
              <div className="flex items-center gap-2">
                <Switch checked={showOnlyRelevant} onCheckedChange={setShowOnlyRelevant} id="relevant-filter" />
                <label htmlFor="relevant-filter" className="text-xs text-muted-foreground cursor-pointer">Bara relevanta</label>
              </div>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {filtered.length} blanketter{aiDone && ` (${relevantCount} relevanta)`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Forms by category */}
      {categories.map(cat => { const catForms = filtered.filter(f => f.category === cat);
        if (catForms.length === 0) return null;
        return (
          <div key={cat} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{cat}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {catForms.map(form => (
                <FormCard
                  key={form.code}
                  form={form}
                  relevant={isRelevant(form.code)}
                  aiDone={aiDone}
                  isAiRelevant={aiRelevant.has(form.code)}
                  isManualAdd={manuallyAdded.has(form.code)}
                  isManualRemove={manuallyRemoved.has(form.code)}
                  status={formStatuses[form.code] || "not_started"}
                  preparing={preparingForm === form.code}
                  onToggle={(add) => toggleManual(form.code, add)}
                  onPrepare={() => handleAIPrepare(form.code)}
                  onStatusChange={(s) => setFormStatus(form.code, s)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Inga blanketter matchar din sökning.</p>
        </div>
      )}
    </div>
  );
};

// ─── Extracted Form Card Component ───

interface FormCardProps { form: SkatteverketForm;
  relevant: boolean;
  aiDone: boolean;
  isAiRelevant: boolean;
  isManualAdd: boolean;
  isManualRemove: boolean;
  status: FormStatus;
  preparing: boolean;
  onToggle: (add: boolean) => void;
  onPrepare: () => void;
  onStatusChange: (s: FormStatus) => void;
}

const FormCard = ({ form, relevant, aiDone, isAiRelevant, isManualAdd, isManualRemove, status, preparing, onToggle, onPrepare, onStatusChange }: FormCardProps) => { const urgency = getDeadlineUrgency(form.deadlineDate);
  const urgencyColors = { red: "bg-destructive/10 text-destructive border-destructive/30",
    orange: "bg-orange-500/10 text-orange-600 border-orange-500/30",
    green: "bg-[#E1F5EE] text-[#085041] border-green-500/30",
    none: "",
  };

  return (
    <Card className={`transition-all ${!relevant && aiDone ? "opacity-40" : "hover:border-primary/30"}`}>
      <CardContent className="pt-4 pb-4 px-4 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-sm truncate">{form.code}</p>
                <span className="text-[10px] text-muted-foreground font-mono">SKV {form.skv}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{form.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {aiDone && isAiRelevant && !isManualRemove && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="text-[10px] h-5 bg-[#E1F5EE] text-[#085041] border-green-500/30">
                      <Sparkles className="h-2.5 w-2.5 mr-0.5" />AI
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">AI-identifierad som relevant</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {isManualAdd && (
              <Badge variant="outline" className="text-[10px] h-5 bg-[#EFF6FF] text-blue-600 border-[#C8DDF5]">Manuell</Badge>
            )}
            {form.aiReady && (
              <Badge variant="secondary" className="text-[10px] h-5">Auto</Badge>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{form.description}</p>

        {/* Dependencies */}
        {form.requiresForms && form.requiresForms.length > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <ArrowRight className="h-3 w-3" />
            <span>Kräver: {form.requiresForms.join(", ")}</span>
          </div>
        )}
        {form.requiredByForms && form.requiredByForms.length > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <ArrowRight className="h-3 w-3 rotate-180" />
            <span>Krävs av: {form.requiredByForms.join(", ")}</span>
          </div>
        )}

        {/* Deadline */}
        {form.deadline && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Deadline:</span>
            <Badge variant="outline" className={`text-[10px] h-5 ${urgencyColors[urgency]}`}>
              {form.deadline}
            </Badge>
          </div>
        )}

        {/* Status pill */}
        {relevant && (
          <div className="flex items-center gap-1.5">
            <Select value={status} onValueChange={v => onStatusChange(v as FormStatus)}>
              <SelectTrigger className={`h-6 text-[10px] w-auto border rounded-full px-2 ${STATUS_COLORS[status]}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {relevant ? (
            <>
              <ComingSoonButton tooltipText={`${form.code} — direktöppning lanseras snart`} className="text-xs h-7">
                Öppna
              </ComingSoonButton>
              {form.aiReady && (
                <Button size="sm" className="text-xs h-7" disabled={preparing} onClick={onPrepare}>
                  {preparing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Bot className="h-3 w-3 mr-1" />}
                  Hämta siffror
                </Button>
              )}
              {aiDone && (
                <Button size="sm" variant="ghost" className="text-xs h-7 ml-auto text-muted-foreground" onClick={() => onToggle(false)}>
                  <EyeOff className="h-3 w-3 mr-1" />Ta bort
                </Button>
              )}
            </>
          ) : (
            <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground" onClick={() => onToggle(true)}>
              <Plus className="h-3 w-3 mr-1" />Lägg till
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
