// DEPRECATED: Use src/components/tax-agent/forms/AGIForm.tsx instead
// Kept for reference — do not import this component
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Receipt, Shield, MinusCircle, Percent, Building2, User,
  ChevronDown
} from "lucide-react";
import { AGIFieldInput } from "./AGIFieldInput";
import { EmployerFields } from "./types";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Step2Props {
  employer: EmployerFields;
  onUpdate: (employer: EmployerFields) => void;
  companyName: string;
  orgNumber: string;
}

interface SectionCardProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isComplete?: boolean;
}

const SectionCard = ({ icon: Icon, title, children, defaultOpen = true, isComplete }: SectionCardProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="bg-[#F8FAFC] dark:bg-slate-800/50 border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="border-l-4 border-[#0891B2]">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex items-center gap-3 w-full px-5 py-4 hover:bg-muted/20 transition-colors">
            <div className="p-2 rounded-lg bg-[#0891B2]/10 shrink-0">
              <Icon className="w-4 h-4 text-[#0891B2]" />
            </div>
            <span className="text-sm font-semibold text-foreground flex-1 text-left">{title}</span>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full transition-colors",
                isComplete ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
              )} />
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", !open && "-rotate-90")} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-5 px-5">
              <div className="bg-background rounded-xl border border-border p-4 space-y-1">
                {children}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Card>
  );
};

export const Step2Employer = ({ employer, onUpdate, companyName, orgNumber }: Step2Props) => {
  const updateField = (field: keyof EmployerFields, value: any) => {
    onUpdate({ ...employer, [field]: value });
  };

  const hasTaxValues = employer.field_492 > 0 || employer.field_496 > 0 || employer.field_491 > 0 || employer.field_495 > 0;
  const hasDeductions = employer.field_471 > 0 || employer.field_476 > 0 || employer.field_463 > 0 || employer.field_470 > 0 || employer.field_475 > 0 || employer.field_472 > 0 || employer.field_477 > 0;
  const hasSLF = employer.field_481 > 0 || employer.field_486 > 0;

  // Auto-calculated total
  const totalDeductions = employer.field_476 + employer.field_475 + employer.field_477;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Arbetsgivarnivå</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Uppgifter som redovisas på arbetsgivarnivå — inte per betalningsmottagare.
        </p>
      </div>

      <div className="space-y-4">
        {/* 1. Skatteavdrag */}
        <SectionCard icon={Receipt} title="Skatteavdrag" isComplete={hasTaxValues}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ränta och utdelning</p>
          <AGIFieldInput code="492" label="Underlag skatteavdrag ränta och utdelning" value={employer.field_492} onChange={v => updateField("field_492", v)} />
          <AGIFieldInput code="496" label="Skatteavdrag ränta och utdelning" value={employer.field_496} onChange={v => updateField("field_496", v)} />
          <div className="my-3 border-t border-border" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pensionsförsäkring</p>
          <AGIFieldInput code="491" label="Underlag skatteavdrag pensionsförsäkring" value={employer.field_491} onChange={v => updateField("field_491", v)} />
          <AGIFieldInput code="495" label="Skatteavdrag pensionsförsäkring" value={employer.field_495} onChange={v => updateField("field_495", v)} />
        </SectionCard>

        {/* 2. Arbetsgivaravgifter */}
        <SectionCard icon={Shield} title="Arbetsgivaravgifter" isComplete={false}>
          <p className="text-xs text-muted-foreground mb-3">Avgifterna beräknas automatiskt från individuppgifterna (31,42%).</p>
          <div className="p-3 bg-[#0891B2]/5 rounded-lg border border-[#0891B2]/20 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Totala avgifter beräknas i steg 3</span>
            <span className="text-sm font-bold text-[#0891B2]">Automatiskt</span>
          </div>
        </SectionCard>

        {/* 3. Avdrag */}
        <SectionCard icon={MinusCircle} title="Avdrag från arbetsgivaravgifter" defaultOpen={hasDeductions} isComplete={hasDeductions}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Regionalt stöd</p>
          <AGIFieldInput code="471" label="Underlag avdrag regionalt stöd" value={employer.field_471} onChange={v => updateField("field_471", v)} />
          <AGIFieldInput code="476" label="Avdrag regionalt stöd" value={employer.field_476} onChange={v => updateField("field_476", v)} />
          <AGIFieldInput code="463" label="Annat driftsstöd" value={employer.field_463} onChange={v => updateField("field_463", v)} />
          <div className="my-3 border-t border-border" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Forskning och utveckling</p>
          <AGIFieldInput code="470" label="Underlag avdrag forskning och utveckling" value={employer.field_470} onChange={v => updateField("field_470", v)} />
          <AGIFieldInput code="475" label="Avdrag forskning och utveckling" value={employer.field_475} onChange={v => updateField("field_475", v)} />
          <div className="my-3 border-t border-border" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Regress för rederier</p>
          <AGIFieldInput code="472" label="Underlag avdrag för rederier vid regress" value={employer.field_472} onChange={v => updateField("field_472", v)} />
          <AGIFieldInput code="477" label="Avdrag för rederier vid regress" value={employer.field_477} onChange={v => updateField("field_477", v)} />

          {totalDeductions > 0 && (
            <div className="mt-3 p-3 bg-[#0891B2]/5 rounded-lg border border-[#0891B2]/20 flex items-center justify-between">
              <span className="text-sm font-medium">Totala avdrag</span>
              <span className="text-sm font-bold font-mono text-[#0891B2]">{totalDeductions.toLocaleString("sv-SE")} kr</span>
            </div>
          )}
        </SectionCard>

        {/* 4. SLF */}
        <SectionCard icon={Percent} title="Särskild löneskatt (SLF)" defaultOpen={hasSLF} isComplete={hasSLF}>
          <AGIFieldInput code="481" label="Underlag SLF vinstandel och sjukpension" value={employer.field_481} onChange={v => updateField("field_481", v)} />
          <AGIFieldInput code="486" label="SLF vinstandel och sjukpension" value={employer.field_486} onChange={v => updateField("field_486", v)} />
        </SectionCard>

        {/* 5. Fast driftställe */}
        <SectionCard icon={Building2} title="Fast driftställe" isComplete={employer.field_302 !== undefined}>
          <div className="flex items-center gap-3">
            <Checkbox
              checked={employer.field_302}
              onCheckedChange={v => updateField("field_302", !!v)}
            />
            <div>
              <span className="text-sm text-foreground">Ej fast driftställe i Sverige</span>
              <span className="text-xs text-muted-foreground font-mono ml-2">302</span>
            </div>
          </div>
        </SectionCard>

        {/* 6. Kontaktuppgifter */}
        <SectionCard icon={User} title="Kontaktuppgifter" isComplete={true}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Företag</Label>
              <p className="text-sm font-medium text-foreground">{companyName}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Organisationsnummer</Label>
              <p className="text-sm font-medium font-mono text-foreground">{orgNumber}</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
