import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, HardHat, UtensilsCrossed, ShoppingCart, 
  Briefcase, Factory, Building, CheckCircle, Info 
} from "lucide-react";
import { INDUSTRY_TEMPLATES, IndustryType } from "@/lib/industry-templates";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface IndustrySetupProps { companyId: string;
  onComplete: () => void;
}

const ICONS: Record<string, any> = { Building2,
  HardHat,
  UtensilsCrossed,
  ShoppingCart,
  Briefcase,
  Factory,
  Building,
};

export const IndustrySetup = ({ companyId, onComplete }: IndustrySetupProps) => { const [selectedIndustry, setSelectedIndustry] = useState<IndustryType | null>(null);
  const [isVatRegistered, setIsVatRegistered] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);

  const handleConfigure = async () => { if (!selectedIndustry) { toast.error("Välj en bransch");
      return;
    }

    setIsConfiguring(true);

    try { const template = INDUSTRY_TEMPLATES[selectedIndustry];

      // Update company with industry
      const { error: companyError } = await supabase
        .from("companies")
        .update({ industry: selectedIndustry,
        })
        .eq("id", companyId);

      if (companyError) throw companyError;

      // Create company settings with VAT configuration
      const { error: settingsError } = await supabase
        .from("company_settings")
        .upsert({ company_id: companyId,
          decimal_places: 2,
          fiscal_year_start: 1,
          fiscal_year_end: 12,
          accounting_method: "accrual",
        });

      if (settingsError) throw settingsError;

      // Create industry-specific accounts if they don't exist
      const { data: existingAccounts } = await supabase
        .from("chart_of_accounts")
        .select("account_number")
        .eq("company_id", companyId);

      if (!existingAccounts || existingAccounts.length === 0) { // Create key accounts för this industry
        const accountsToCreate = template.keyAccounts.map((acc) => ({ company_id: companyId,
          account_number: acc.number,
          account_name: acc.name,
          account_type: getAccountType(acc.number),
          is_active: true,
        }));

        const { error: accountsError } = await supabase
          .from("chart_of_accounts")
          .insert(accountsToCreate);

        if (accountsError) throw accountsError;
      }

      toast.success(`✓ ${template.name} konfigurerad!`);
      onComplete();
    } catch (error: any) { console.error("Configuration error:", error);
      toast.error("Kunde inte konfigurera företaget");
    } finally { setIsConfiguring(false);
    }
  };

  const getAccountType = (accountNumber: string): string => { const first = accountNumber.charAt(0);
    if (first === "1") return "asset";
    if (first === "2") return "liability";
    if (first === "3") return "income";
    if (first === "4" || first === "5" || first === "6" || first === "7" || first === "8") return "expense";
    return "asset";
  };

  const template = selectedIndustry ? INDUSTRY_TEMPLATES[selectedIndustry] : null;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Välj din bransch</h1>
        <p className="text-muted-foreground">
          Vi anpassar bokföringen efter din bransch för bästa möjliga upplevelse
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(INDUSTRY_TEMPLATES).map((ind) => { const Icon = ICONS[ind.icon];
          const isSelected = selectedIndustry === ind.key;

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
                  {isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
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

      {template && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Anpassning för {template.name}</CardTitle>
            <CardDescription>
              Vi kommer att förbereda följande för dig
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Kontoplan:</strong> Vi lägger automatiskt till {template.keyAccounts.length} relevanta konton
                som är viktiga för {template.name.toLowerCase()}
              </AlertDescription>
            </Alert>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Snabbåtgärder:</strong> Färdiga mallar för vanliga transaktioner som{" "}
                {template.quickActions.map(qa => qa.title.toLowerCase()).join(", ")}
              </AlertDescription>
            </Alert>

            {template.vatRequired ? (
              <Alert variant="default">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>OBS:</strong> {template.name} kräver normalt momsregistrering. 
                  Kontrollera att ditt företag är momsregistrerat hos Skatteverket.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vat"
                  checked={isVatRegistered}
                  onCheckedChange={(checked) => setIsVatRegistered(checked as boolean)}
                />
                <Label htmlFor="vat" className="text-sm cursor-pointer">
                  Företaget är momsregistrerat (frivilligt)
                </Label>
              </div>
            )}

            <div className="pt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelectedIndustry(null)}>
                Ändra bransch
              </Button>
              <Button onClick={handleConfigure} disabled={isConfiguring}>
                {isConfiguring ? "Konfigurerar..." : "Fortsätt med denna bransch"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
