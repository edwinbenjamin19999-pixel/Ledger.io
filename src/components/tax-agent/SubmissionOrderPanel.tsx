import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, Circle, AlertTriangle, ArrowRight, ClipboardList, Clock } from "lucide-react";
import { CompanyType, COMPANY_TYPE_LABELS } from "./shared/types";
import { SubmissionStep, getSubmissionPlan, SKATTEVERKET_FORMS, getDeadlineUrgency } from "./shared/skatteverketForms";

interface SubmissionOrderPanelProps { companyType: CompanyType;
  relevantCodes: Set<string>;
  formStatuses: Record<string, string>;
}

const getStatusIcon = (status: string) => { switch (status) { case "submitted":
    case "signed":
      return <CheckCircle className="h-4 w-4 text-[#085041]" />;
    case "ready_review":
    case "ai_preparing":
      return <Circle className="h-4 w-4 text-orange-500 fill-orange-500" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
};

const getDeadlineBadge = (deadline?: string) => { if (!deadline) return null;
  const form = SKATTEVERKET_FORMS.find(f => f.deadline === deadline);
  const urgency = getDeadlineUrgency(form?.deadlineDate);
  const colorMap = { red: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]",
    orange: "bg-orange-500/10 text-orange-600 border-orange-500/30",
    green: "bg-[#E1F5EE] text-[#085041] border-green-500/30",
    none: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={`text-[10px] h-5 ${colorMap[urgency]}`}>
      <Clock className="h-2.5 w-2.5 mr-0.5" />
      {deadline}
    </Badge>
  );
};

export const SubmissionOrderPanel = ({ companyType, relevantCodes, formStatuses }: SubmissionOrderPanelProps) => { const [open, setOpen] = useState(false);
  const steps = getSubmissionPlan(companyType, relevantCodes);

  const depsCompleted = (requiresForms?: string[]) => { if (!requiresForms?.length) return true;
    return requiresForms.every(code => ["submitted", "signed", "ready_review"].includes(formStatuses[code] || ""));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ClipboardList className="h-4 w-4 mr-1.5" />
          Visa inlämningsordning
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            AI-genererad inlämningsplan — {COMPANY_TYPE_LABELS[companyType]}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Sekventiell beroendekedjja med deadlines och status för varje blankett
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Dependency visualization */}
          {companyType === "ab" && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">BEROENDEKEDJJA</p>
                <div className="flex flex-wrap items-center gap-1 text-xs font-mono">
                  <span className="px-2 py-1 rounded bg-background border">INK2R</span>
                  <span className="text-muted-foreground">──┐</span>
                </div>
                <div className="flex flex-wrap items-center gap-1 text-xs font-mono">
                  <span className="px-2 py-1 rounded bg-background border">INK2S</span>
                  <span className="text-muted-foreground">──┼──→</span>
                  <span className="px-2 py-1 rounded bg-primary/10 border-primary/30 border font-semibold">INK2</span>
                  <span className="text-muted-foreground">──→</span>
                  <span className="text-xs text-muted-foreground">[Lämna in till SKV]</span>
                </div>
                <div className="flex flex-wrap items-center gap-1 text-xs font-mono">
                  <span className="px-2 py-1 rounded bg-background border">N9</span>
                  <span className="text-muted-foreground">──┘</span>
                </div>
                <div className="flex flex-wrap items-center gap-1 text-xs font-mono mt-2">
                  <span className="px-2 py-1 rounded bg-background border">K10</span>
                  <span className="text-muted-foreground">──→</span>
                  <span className="text-xs text-muted-foreground">[Ägarens INK1 — lämnas privat]</span>
                </div>
                <div className="flex flex-wrap items-center gap-1 text-xs font-mono mt-1">
                  <span className="px-2 py-1 rounded bg-background border">KU10</span>
                  <span className="text-muted-foreground">──→</span>
                  <span className="px-2 py-1 rounded bg-background border">AGI</span>
                  <span className="text-muted-foreground">──→</span>
                  <span className="text-xs text-muted-foreground">[Löpande inlämning]</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Steps */}
          {steps.map((step, idx) => (
            <Card key={step.stepNumber}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] h-5 w-5 rounded-full flex items-center justify-center p-0">
                    {step.stepNumber}
                  </Badge>
                  <CardTitle className="text-sm">{step.title}</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-2">
                  {step.forms.map(form => { const status = formStatuses[form.code] || "not_started";
                    const deps = form.requiresForms || [];
                    const depsOk = depsCompleted(form.requiresForms);
                    return (
                      <div key={form.code} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
                        {getStatusIcon(status)}
                        <span className="text-sm font-medium min-w-[60px]">{form.code}</span>
                        <span className="text-xs text-muted-foreground flex-1 truncate">{form.name}</span>
                        {deps.length > 0 && !depsOk && (
                          <Badge variant="outline" className="text-[9px] h-4 text-orange-600 border-orange-500/30">
                            Kräver: {deps.join(", ")}
                          </Badge>
                        )}
                        {form.deadline && getDeadlineBadge(form.deadline)}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {steps.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Kör AI-identifiering först för att se inlämningsplanen.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
