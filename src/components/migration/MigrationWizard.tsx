import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle, Circle, Loader2,
  FileSpreadsheet, Upload, Database, ShieldCheck, Sparkles
} from "lucide-react";
import { MigrationSourceStep } from "./wizard/MigrationSourceStep";
import { MigrationUploadStep } from "./wizard/MigrationUploadStep";
import { MigrationMappingStep } from "./wizard/MigrationMappingStep";
import { MigrationValidationStep } from "./wizard/MigrationValidationStep";
import { MigrationCompleteStep } from "./wizard/MigrationCompleteStep";

export interface MigrationState { source: "fortnox" | "visma" | "bokio" | "sie" | "pdf" | "";
  method: "api" | "file" | "";
  apiKey: string;
  file: File | null;
  fileContent: string;
  importSummary: any;
  accountMappings: AccountMapping[];
  validationResults: ValidationResult[];
  migrationComplete: boolean;
  error: string | null;
}

export interface AccountMapping { sourceAccount: string;
  sourceName: string;
  targetAccount: string;
  targetName: string;
  status: "matched" | "suggested" | "missing" | "manual";
  confidence: number;
}

export interface ValidationResult { type: "success" | "warning" | "error";
  category: string;
  message: string;
  detail?: string;
}

const STEPS = [
  { id: "source", label: "Källa", icon: Database, description: "Välj system" },
  { id: "upload", label: "Data", icon: Upload, description: "Importera data" },
  { id: "mapping", label: "Mappning", icon: FileSpreadsheet, description: "Kontomappning" },
  { id: "validation", label: "Validering", icon: ShieldCheck, description: "Kontroll" },
  { id: "complete", label: "Klart", icon: Sparkles, description: "Slutfört" },
];

interface Props { companyId: string;
  onComplete: () => void;
}

export const MigrationWizard = ({ companyId, onComplete }: Props) => { const [currentStep, setCurrentStep] = useState(0);
  const [state, setState] = useState<MigrationState>({ source: "",
    method: "",
    apiKey: "",
    file: null,
    fileContent: "",
    importSummary: null,
    accountMappings: [],
    validationResults: [],
    migrationComplete: false,
    error: null,
  });

  const updateState = useCallback((updates: Partial<MigrationState>) => { setState(prev => ({ ...prev, ...updates }));
  }, []);

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!state.source;
      // Step 1 (upload): always allow advancing. The user may import registers
      // (kunder/leverantörer/öppna poster) on a later visit, or proceed without
      // any CSV at all when using Fortnox/Visma/SIE flows. Hard-gating here
      // produced too many dead-clicks (e.g. user kör reskontra-avstämning men
      // har inte tryckt på importknappen → "Nästa steg" låst utan förklaring).
      case 1: return true;
      case 2: return true;
      case 3: return !state.validationResults.some(v => v.type === "error");
      default: return true;
    }
  };

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((step, i) => { const Icon = step.icon;
              const isActive = i === currentStep;
              const isDone = i < currentStep;
              return (
                <div key={step.id} className="flex items-center gap-1.5 flex-1">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${ isActive ? "bg-primary/10 text-primary" : isDone ? "text-[#085041]" : "text-muted-foreground"
                  }`}>
                    {isDone ? <CheckCircle className="h-4 w-4" /> : isActive ? <Icon className="h-4 w-4" /> : <Circle className="h-3.5 w-3.5" />}
                    <div className="hidden md:block">
                      <p className={`text-xs font-medium ${isActive ? "text-primary" : ""}`}>{step.label}</p>
                      <p className="text-[10px] text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-1 ${isDone ? "bg-emerald-400" : "bg-border"}`} />}
                </div>
              );
            })}
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </CardContent>
      </Card>

      {/* Step Content */}
      {currentStep === 0 && (
        <MigrationSourceStep state={state} updateState={updateState} />
      )}
      {currentStep === 1 && (
        <MigrationUploadStep state={state} updateState={updateState} companyId={companyId} />
      )}
      {currentStep === 2 && (
        <MigrationMappingStep state={state} updateState={updateState} companyId={companyId} />
      )}
      {currentStep === 3 && (
        <MigrationValidationStep state={state} updateState={updateState} companyId={companyId} />
      )}
      {currentStep === 4 && (
        <MigrationCompleteStep state={state} onFinish={onComplete} />
      )}

      {/* Navigation */}
      {currentStep < 4 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(s => s - 1)} disabled={currentStep === 0}>
            <ArrowLeft className="h-4 w-4 mr-1" />Tillbaka
          </Button>
          <Button onClick={() => setCurrentStep(s => s + 1)} disabled={!canProceed()}>
            {currentStep === 3 ? "Slutför migrering" : "Nästa steg"}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};
