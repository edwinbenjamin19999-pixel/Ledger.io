import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle, AlertTriangle, Mail, FileText, Clock,
  Shield, ChevronRight, History, User,
} from "lucide-react";
import type { Anomaly } from "./AnomalyDetection";

interface ResolveProps { anomaly: Anomaly | null;
  open: boolean;
  companyId: string;
  onClose: () => void;
  onResolve: (id: string, reason: string, actions: string[], type: string) => void;
}

interface ResolutionRecord { id: string;
  resolution_type: string;
  resolution_reason: string;
  explanation: string;
  resolved_at: string;
  anomaly_title: string;
}

const RESOLVE_REASONS: Record<string, { label: string; value: string }[]> = { duplicate: [
    { label: "Var en testbetalning (radera kopia)", value: "test_payment" },
    { label: "Var avsiktlig (dubbel prenumeration)", value: "intentional" },
    { label: "Leverantör debiterade dubbelt (begär återbetalning)", value: "vendor_error" },
  ],
  unusual_amount: [
    { label: "Engångsköp -- normalt belopp för denna typ", value: "one_time" },
    { label: "Prisjustering från leverantör", value: "price_change" },
    { label: "Felaktigt belopp -- kontakta leverantör", value: "wrong_amount" },
  ],
  personal_expense: [
    { label: "Företagsrelaterat -- representation", value: "representation" },
    { label: "Privat utlägg -- bokför som privat uttag", value: "private" },
    { label: "Blandat -- splitta beloppet", value: "split" },
  ],
  default: [
    { label: "Korrekt bokföring -- inget att åtgärda", value: "correct" },
    { label: "Tekniskt fel -- korrigera verifikation", value: "tech_error" },
    { label: "Behöver extern utredning", value: "external" },
  ],
};

const SEVERITY_COLORS: Record<string, string> = { high: "bg-[#EF4444] text-white",
  medium: "bg-[#EAB308] text-white",
  low: "bg-[#3B82F6] text-white",
};

const SEVERITY_LABELS: Record<string, string> = { high: "Kritisk",
  medium: "Medium",
  low: "Info",
};

export function AnomalyResolveSheet({ anomaly, open, companyId, onClose, onResolve }: ResolveProps) { const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [explanation, setExplanation] = useState("");
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [activeAction, setActiveAction] = useState<"resolve" | "false_positive" | "escalate" | null>(null);
  const [history, setHistory] = useState<ResolutionRecord[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open && companyId) loadHistory();
  }, [open, companyId]);

  useEffect(() => { if (!open) { setReason("");
      setCustomReason("");
      setExplanation("");
      setSelectedActions([]);
      setActiveAction(null);
    }
  }, [open]);

  const loadHistory = async () => { const { data } = await supabase
      .from("anomaly_resolutions")
      .select("id, resolution_type, resolution_reason, explanation, resolved_at, anomaly_title")
      .eq("company_id", companyId)
      .order("resolved_at", { ascending: false })
      .limit(10);
    setHistory((data || []));
  };

  if (!anomaly) return null;

  const reasons = RESOLVE_REASONS[anomaly.category] || RESOLVE_REASONS.default;

  const saveResolution = async (type: string) => { setSaving(true);
    const finalReason = reason === "other" ? customReason : reason;
    try { const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("anomaly_resolutions").insert({ company_id: companyId,
        anomaly_key: anomaly.id,
        anomaly_category: anomaly.category,
        anomaly_severity: anomaly.severity,
        anomaly_title: anomaly.title,
        anomaly_description: anomaly.description,
        resolution_type: type,
        resolution_reason: finalReason || null,
        explanation: explanation || null,
        resolved_by: user?.id || null,
      });

      onResolve(anomaly.id, finalReason || type, selectedActions, type);
      onClose();
    } catch { toast.error("Kunde inte spara -- försök igen");
    } finally { setSaving(false);
    }
  };

  const handleEscalateEmail = () => { const subject = `Eskalerad anomali: ${anomaly.title}`;
    const body = [
      `ANOMALIRAPPORT -- Bokfy`,
      ``,
      `Typ: ${anomaly.category}`,
      `Allvarlighetsgrad: ${SEVERITY_LABELS[anomaly.severity]}`,
      `Rubrik: ${anomaly.title}`,
      `Beskrivning: ${anomaly.description}`,
      ``,
      `DETALJER:`,
      ...anomaly.details.map(d => `- ${d}`),
      ``,
      `AI-analys: ${anomaly.description}`,
      ``,
      `Vänligen granska och återkoppla med åtgärdsrekommendation.`,
      ``,
      `-- Bokfy Anomalidetektion`,
    ].join("\n");
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
    saveResolution("escalated");
  };

  const toggleAction = (a: string) => { setSelectedActions(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col">
        {/* Header */}
        <div className="bg-[#0F2137] text-white px-6 py-4">
          <SheetHeader>
            <SheetTitle className="text-white text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Granska anomali
            </SheetTitle>
          </SheetHeader>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={`${SEVERITY_COLORS[anomaly.severity]} text-[10px]`}>
              {SEVERITY_LABELS[anomaly.severity]}
            </Badge>
            <span className="text-sm text-slate-300">{anomaly.title}</span>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-5">
            {/* Transaction details */}
            <section>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Transaktionsdetaljer
              </h4>
              <div className="bg-muted/30 rounded-lg border p-3 space-y-1.5">
                {anomaly.details.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground w-2 shrink-0">-</span>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Cross references */}
            {anomaly.crossRefs && anomaly.crossRefs.length > 0 && (
              <section>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Korsreferenser
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {anomaly.crossRefs.map((ref, i) => (
                    <Badge key={i} variant="outline" className="text-xs gap-1">
                      {ref.type === "invoice" && <FileText className="h-3 w-3" />}
                      {ref.type === "history" && <History className="h-3 w-3" />}
                      {ref.type === "tax_deadline" && <Clock className="h-3 w-3" />}
                      {ref.label}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* AI Reasoning */}
            <section>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                AI-analys
              </h4>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-sm leading-relaxed">
                  Flaggad for: <strong>{anomaly.title}</strong>. {anomaly.description}.
                  {anomaly.category === "duplicate" && " Matchning baserad på identiskt belopp och leverantörsbeskrivning inom tidsramen."}
                  {anomaly.category === "unusual_amount" && " Beloppet avviker signifikant från historiskt genomsnitt för denna leverantör."}
                  {anomaly.category === "personal_expense" && " Nyckelord i transaktionsbeskrivningen matchar vanliga privata inköpsställen."}
                  {anomaly.category === "timing" && " Transaktionen skapades utanför normal arbetstid, vilket kan indikera obehörig åtkomst."}
                  {anomaly.category === "round_number" && " Återkommande jämna belopp kan indikera fiktiva fakturor."}
                  {anomaly.category === "ghost_vendor" && " Leverantören saknar historik i systemet och kunde inte verifieras mot offentliga register."}
                  {anomaly.category === "account_misuse" && " Kontot används oproportionerligt ofta, vilket tyder på att transaktioner kategoriseras felaktigt."}
                </p>
              </div>
            </section>

            <Separator />

            {/* Action buttons */}
            <section>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Åtgärd
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={activeAction === "resolve" ? "default" : "outline"}
                  className="justify-start gap-2 h-auto py-3"
                  onClick={() => setActiveAction(activeAction === "resolve" ? null : "resolve")}
                >
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-medium">Markera som löst</p>
                  </div>
                </Button>
                <Button
                  variant={activeAction === "false_positive" ? "default" : "outline"}
                  className="justify-start gap-2 h-auto py-3"
                  onClick={() => setActiveAction(activeAction === "false_positive" ? null : "false_positive")}
                >
                  <XCircle className="h-4 w-4 shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-medium">Falsk positiv</p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2 h-auto py-3"
                  onClick={handleEscalateEmail}
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-medium">Eskalera till revisor</p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2 h-auto py-3"
                  onClick={() => { saveResolution("ignored"); }}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-medium">Skapa ärende</p>
                  </div>
                </Button>
              </div>
            </section>

            {/* Resolve form */}
            {activeAction === "resolve" && (
              <section className="border rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium">Vad hände?</h4>
                <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
                  {reasons.map(r => (
                    <div key={r.value} className="flex items-center gap-2">
                      <RadioGroupItem value={r.value} id={`r-${r.value}`} />
                      <Label htmlFor={`r-${r.value}`} className="text-sm cursor-pointer">{r.label}</Label>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="other" id="r-other" />
                    <Label htmlFor="r-other" className="text-sm cursor-pointer">Annat</Label>
                  </div>
                </RadioGroup>
                {reason === "other" && (
                  <Input placeholder="Beskriv..." value={customReason} onChange={e => setCustomReason(e.target.value)} />
                )}
                <Textarea
                  placeholder="Förklaring (obligatorisk)..."
                  value={explanation}
                  onChange={e => setExplanation(e.target.value)}
                  rows={3}
                />
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Åtgärder (valfritt)</p>
                  {[
                    { key: "task", label: "Skapa uppgift: Kontakta leverantör" },
                    { key: "note", label: "Lägg till notat i verifikationen" },
                    { key: "correct", label: "Bokför rättelse: kreditera konto" },
                  ].map(a => (
                    <Button
                      key={a.key}
                      variant={selectedActions.includes(a.key) ? "secondary" : "outline"}
                      size="sm"
                      className="w-full justify-start text-left text-xs"
                      onClick={() => toggleAction(a.key)}
                    >
                      {a.label}
                    </Button>
                  ))}
                </div>
                <Button
                  onClick={() => saveResolution("resolved")}
                  disabled={(!reason && !customReason) || !explanation || saving}
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" /> Bekräfta och lös
                </Button>
              </section>
            )}

            {/* False positive form */}
            {activeAction === "false_positive" && (
              <section className="border rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium">Varför är detta en falsk positiv?</h4>
                <p className="text-xs text-muted-foreground">
                  Din feedback hjälper AI att minska framtida falsklarm för liknande mönster.
                </p>
                <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="false_positive" id="fp-1" />
                    <Label htmlFor="fp-1" className="text-sm cursor-pointer">Falsklarm -- detta är normalt för oss</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="already_handled" id="fp-2" />
                    <Label htmlFor="fp-2" className="text-sm cursor-pointer">Redan hanterat manuellt</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="not_relevant" id="fp-3" />
                    <Label htmlFor="fp-3" className="text-sm cursor-pointer">Inte relevant för vår verksamhet</Label>
                  </div>
                </RadioGroup>
                <Textarea
                  placeholder="Ytterligare förklaring (hjälper AI att lära sig)..."
                  value={explanation}
                  onChange={e => setExplanation(e.target.value)}
                  rows={2}
                />
                <Button
                  onClick={() => saveResolution("false_positive")}
                  disabled={!reason || saving}
                  className="w-full"
                >
                  <XCircle className="h-4 w-4 mr-1.5" /> Markera som falsk positiv
                </Button>
              </section>
            )}

            <Separator />

            {/* Resolution history */}
            <section>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" /> Resolutionshistorik
              </h4>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Inga tidigare resolutioner</p>
              ) : (
                <div className="space-y-2">
                  {history.map(h => (
                    <div key={h.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/30 text-xs">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-muted">
                        {h.resolution_type === "resolved" && <CheckCircle className="h-3 w-3 text-[#22c55e]" />}
                        {h.resolution_type === "false_positive" && <XCircle className="h-3 w-3 text-[#3B82F6]" />}
                        {h.resolution_type === "escalated" && <Mail className="h-3 w-3 text-[#F97316]" />}
                        {h.resolution_type === "ignored" && <AlertTriangle className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{h.anomaly_title}</p>
                        <p className="text-muted-foreground">{h.resolution_reason || h.resolution_type}</p>
                        <p className="text-muted-foreground mt-0.5">
                          {new Date(h.resolved_at).toLocaleDateString("sv-SE")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// Keep IgnoreReasonSheet för backward compat but simplified
export function IgnoreReasonSheet({ anomaly, open, onClose, onIgnore }: { anomaly: Anomaly | null;
  open: boolean;
  onClose: () => void;
  onIgnore: (id: string, reason: string) => void;
}) { const [reason, setReason] = useState("");
  if (!anomaly) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="max-h-[60vh]">
        <SheetHeader>
          <SheetTitle className="text-left">Ignorera: {anomaly.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">Ange anledning -- detta hjälper AI att minska falsklarm.</p>
          <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
            {[
              { label: "Falsklarm -- detta är normalt för oss", value: "false_positive" },
              { label: "Redan hanterat manuellt", value: "already_handled" },
              { label: "Inte relevant", value: "not_relevant" },
            ].map(r => (
              <div key={r.value} className="flex items-center gap-2">
                <RadioGroupItem value={r.value} id={`ig-${r.value}`} />
                <Label htmlFor={`ig-${r.value}`} className="text-sm cursor-pointer">{r.label}</Label>
              </div>
            ))}
          </RadioGroup>
          <div className="flex gap-2">
            <Button onClick={() => { if (reason) { onIgnore(anomaly.id, reason); setReason(""); onClose(); } }} disabled={!reason} className="flex-1">
              Ignorera
            </Button>
            <Button variant="outline" onClick={onClose}>Avbryt</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
