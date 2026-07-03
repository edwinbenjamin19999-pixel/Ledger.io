import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, HardHat, UtensilsCrossed, ShoppingCart, 
  Briefcase, Factory, Building, CheckCircle, Info, Save 
} from "lucide-react";
import { INDUSTRY_TEMPLATES, IndustryType } from "@/lib/industry-templates";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CompanyIndustrySettingsProps { companyId: string;
  currentIndustry: IndustryType | string | null;
  onUpdate: () => void;
}

const ICONS: Record<string, any> = { Building2,
  HardHat,
  UtensilsCrossed,
  ShoppingCart,
  Briefcase,
  Factory,
  Building,
};

export const CompanyIndustrySettings = ({ companyId, 
  currentIndustry,
  onUpdate 
}: CompanyIndustrySettingsProps) => { // Ensure we use a valid IndustryType, default to general if unknown
  const validIndustry = currentIndustry && currentIndustry in INDUSTRY_TEMPLATES 
    ? (currentIndustry as IndustryType) 
    : 'general';
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>(validIndustry);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => { if (!selectedIndustry) { toast.error("Välj en bransch");
      return;
    }

    setIsSaving(true);

    try { const { error } = await supabase
        .from("companies")
        .update({ industry: selectedIndustry })
        .eq("id", companyId);

      if (error) throw error;

      const template = INDUSTRY_TEMPLATES[selectedIndustry];
      toast.success(`✓ Bransch uppdaterad till ${template.name}`);
      onUpdate();
    } catch (error: any) { console.error("Update error:", error);
      toast.error("Kunde inte uppdatera bransch");
    } finally { setIsSaving(false);
    }
  };

  const hasChanged = selectedIndustry !== currentIndustry;
  const template = INDUSTRY_TEMPLATES[selectedIndustry];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Företagets bransch</h2>
        <p className="text-muted-foreground mt-1">
          Välj bransch för att anpassa bokföringen och få relevanta funktioner
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(INDUSTRY_TEMPLATES).map((ind) => { const Icon = ICONS[ind.icon];
          const isSelected = selectedIndustry === ind.key;
          const isCurrent = currentIndustry === ind.key;

          return (
            <Card
              key={ind.key}
              className={`cursor-pointer transition-all hover:shadow-lg ${ isSelected ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedIndustry(ind.key)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Icon className={`h-8 w-8 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="flex flex-col gap-1">
                    {isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
                    {isCurrent && !isSelected && (
                      <Badge variant="outline" className="text-xs">Nuvarande</Badge>
                    )}
                  </div>
                </div>
                <CardTitle className="text-lg">{ind.name}</CardTitle>
                <CardDescription className="text-sm">{ind.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ind.vatRequired ? (
                    <Badge variant="outline" className="text-xs">Moms krävs</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Moms ej krav</Badge>
                  )}
                  <div className="text-xs text-muted-foreground">
                    <p className="font-semibold mb-1">Fokusområden:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {ind.focusAreas.slice(0, 3).map((area) => (
                        <li key={area}>{area}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {template && hasChanged && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Ändra till {template.name}</CardTitle>
            <CardDescription>
              Vad händer när du byter bransch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Befintliga konton påverkas inte.</strong> Dina nuvarande konton och transaktioner
                behålls som de är.
              </AlertDescription>
            </Alert>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Nya snabbåtgärder:</strong> Du får tillgång till mallar för{" "}
                {template.quickActions.map(qa => qa.title.toLowerCase()).join(", ")}
              </AlertDescription>
            </Alert>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Dashboard anpassas:</strong> Widgets och insights kommer att fokusera på{" "}
                {template.focusAreas.slice(0, 2).map(f => f.toLowerCase()).join(" och ")}
              </AlertDescription>
            </Alert>

            {template.vatRequired && (
              <Alert variant="default">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>OBS:</strong> {template.name} kräver normalt momsregistrering. 
                  Kontrollera att ditt företag är momsregistrerat hos Skatteverket.
                </AlertDescription>
              </Alert>
            )}

            <div className="pt-4 flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setSelectedIndustry(validIndustry)}
              >
                Avbryt
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Sparar..." : "Spara ändring"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasChanged && (
        <Card>
          <CardHeader>
            <CardTitle>Nuvarande bransch: {template.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Välj en annan bransch ovan för att ändra företagets inställningar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
