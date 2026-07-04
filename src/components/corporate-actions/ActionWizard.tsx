import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ActionType, ACTION_TEMPLATES, ActionField } from "./types";
import { DocumentPreview } from "./DocumentPreview";
import { AccountingPreview } from "./AccountingPreview";
import { AIAnalysis } from "./AIAnalysis";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";
import { ArrowLeft, ArrowRight, Check, FileText, Calculator,
  Brain, Shield, AlertTriangle, Sparkles, PenTool, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCreateCorporateEvent } from "@/hooks/useCorporateActions";

interface ActionWizardProps { actionType: ActionType;
  onCancel: () => void;
  onComplete: () => void;
}

const STEPS = [
  { id: "input", title: "Uppgifter", icon: FileText },
  { id: "analysis", title: "AI-analys", icon: Brain },
  { id: "documents", title: "Dokument", icon: FileText },
  { id: "accounting", title: "Bokföring", icon: Calculator },
  { id: "signers", title: "Signering", icon: PenTool },
  { id: "confirm", title: "Godkänn", icon: Shield },
];

export const ActionWizard = ({ actionType, onCancel, onComplete }: ActionWizardProps) => {
  const template = ACTION_TEMPLATES[actionType];
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createEvent = useCreateCorporateEvent();

  const updateField = (key: string, value: string) => { setFormData(prev => ({ ...prev, [key]: value }));
  };

  const isStepValid = useMemo(() => { if (currentStep === 0) { return template.fields
        .filter(f => f.required)
        .every(f => formData[f.key]?.trim());
    }
    return true;
  }, [currentStep, formData, template.fields]);

  const handleNext = () => { if (currentStep < STEPS.length - 1) { setCurrentStep(s => s + 1);
    }
  };

  const handleBack = () => { if (currentStep > 0) { setCurrentStep(s => s - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await createEvent.mutateAsync({
        event_type: actionType,
        title: template.label + (formData.amount ? ` — ${Number(formData.amount).toLocaleString('sv-SE')} kr` : ''),
        description: formData.purpose || formData.decision || formData.subject || undefined,
        amount: formData.amount ? Number(formData.amount) : (formData.total_amount ? Number(formData.total_amount) : undefined),
        event_date: formData.date || new Date().toISOString().split('T')[0],
      });
      toast.success("Bolagshändelse registrerad", {
        description: `${template.label} har skapats och sparats i databasen.`,
      });
      onComplete();
    } catch (err) {
      toast.error("Kunde inte spara händelsen");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: ActionField) => { const value = formData[field.key] || "";

    switch (field.type) { case "select":
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-sm font-medium">
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Select value={value} onValueChange={v => updateField(field.key, v)}>
              <SelectTrigger>
                <SelectValue placeholder="Välj..." />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.helpText && (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            )}
          </div>
        );
      case "textarea":
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-sm font-medium">
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              value={value}
              onChange={e => updateField(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={3}
            />
          </div>
        );
      default:
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-sm font-medium">
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
              value={value}
              onChange={e => updateField(field.key, e.target.value)}
              placeholder={field.placeholder}
            />
            {field.helpText && (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h2 className="text-xl font-semibold">{template.label}</h2>
          <Badge variant="outline" className="gap-1 text-xs">
            <Sparkles className="h-3 w-3" />
            AI-assisterad
          </Badge>
          {template.riskLevel === "high" && (
            <Badge variant="destructive" className="text-xs">Hög risk</Badge>
          )}
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => { const StepIcon = step.icon;
          const isActive = i === currentStep;
          const isCompleted = i < currentStep;
          return (
            <div key={step.id} className="flex items-center gap-1 flex-1">
              <button
                onClick={() => i < currentStep && setCurrentStep(i)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all w-full",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <StepIcon className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn("h-px w-4 flex-shrink-0", isCompleted ? "bg-primary" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="pt-6">
          {currentStep === 0 && (
            <div className="space-y-4 max-w-2xl">
              <h3 className="font-semibold text-lg mb-4">Fyll i uppgifter</h3>
              <p className="text-sm text-muted-foreground mb-6">{template.description}</p>
              {template.fields.map(renderField)}
            </div>
          )}

          {currentStep === 1 && (
            <AIAnalysis actionType={actionType} formData={formData} />
          )}

          {currentStep === 2 && (
            <DocumentPreview actionType={actionType} formData={formData} />
          )}

          {currentStep === 3 && (
            <AccountingPreview actionType={actionType} formData={formData} />
          )}

          {currentStep === 4 && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center gap-3">
                <PenTool className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-lg">Signering</h3>
                  <p className="text-sm text-muted-foreground">
                    {template.requiresSigning
                      ? "Följande personer behöver signera med BankID"
                      : "Denna händelse kräver ingen BankID-signering"}
                  </p>
                </div>
              </div>

              {template.requiresSigning ? (
                <div className="space-y-3">
                  {template.signerRoles.map((role, i) => (
                    <Card key={i}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium text-sm">{role}</span>
                            <p className="text-xs text-muted-foreground">Väntar på signering</p>
                          </div>
                        </div>
                        <ComingSoonButton tooltipText="BankID-signering aktiveras inför produktionslansering">BankID</ComingSoonButton>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <p className="text-sm">Ingen signering krävs. Händelsen kan godkännas direkt.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-[#FAEEDA] dark:bg-amber-950/30 border border-[#F0DDB7] dark:border-amber-800">
                <AlertTriangle className="h-5 w-5 text-[#7A5417] flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm text-[#7A5417] dark:text-amber-300">
                    Granska noggrant innan godkännande
                  </p>
                  <p className="text-xs text-[#7A5417] dark:text-[#C28A2B] mt-0.5">
                    Denna åtgärd skapar juridiska dokument och bokföringstransaktioner.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Sammanfattning</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-muted-foreground">Typ:</div>
                  <div className="font-medium">{template.label}</div>
                  {template.fields.filter(f => formData[f.key]).map(f => (
                    <div key={f.key} className="contents">
                      <div className="text-muted-foreground">{f.label}:</div>
                      <div className="font-medium">
                        {f.type === "select"
                          ? f.options?.find(o => o.value === formData[f.key])?.label || formData[f.key]
                          : f.type === "number"
                          ? Number(formData[f.key]).toLocaleString("sv-SE") + " kr"
                          : formData[f.key]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Dokument som skapas:</p>
                <div className="flex flex-wrap gap-2">
                  {template.documents.map(doc => (
                    <Badge key={doc} variant="secondary">{doc}</Badge>
                  ))}
                  {template.documents.length === 0 && (
                    <span className="text-sm text-muted-foreground">Inga dokument</span>
                  )}
                </div>
              </div>

              {template.accounts.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Bokföring som skapas:</p>
                    {template.accounts.map((acc, i) => (
                      <div key={i} className="text-sm bg-muted p-3 rounded-lg">
                        <span className="text-muted-foreground">{acc.description}:</span>{" "}
                        <span className="font-mono">
                          Debet {acc.debit} / Kredit {acc.credit}
                        </span>{" "}
                        <span className="font-medium">
                          {Number(formData[acc.amountField] || 0).toLocaleString("sv-SE")} kr
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {template.requiresSigning && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Shield className="h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">
                    Kräver BankID-signering: {template.signerRoles.join(", ")}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={currentStep === 0 ? onCancel : handleBack}>
          {currentStep === 0 ? "Avbryt" : (
            <>
              <ArrowLeft className="h-4 w-4 mr-1" /> Föregående
            </>
          )}
        </Button>
        <div className="flex gap-2">
          {currentStep === 5 && (
            <Button variant="outline" onClick={async () => {
              try {
                await createEvent.mutateAsync({
                  event_type: actionType,
                  title: template.label,
                  event_date: formData.date || new Date().toISOString().split('T')[0],
                  amount: formData.amount ? Number(formData.amount) : undefined,
                });
                toast.success("Utkast sparat");
              } catch { toast.error("Kunde inte spara utkast"); }
            }}>
              Spara utkast
            </Button>
          )}
          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={!isStepValid}>
              Nästa <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
              <Shield className="h-4 w-4" />
              {isSubmitting ? "Bearbetar..." : template.requiresSigning ? "Godkänn & Signera" : "Godkänn & Verkställ"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
