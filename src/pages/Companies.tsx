import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Plus, Pencil, Trash2, Settings, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { companySchema } from "@/lib/schemas/company";
import { CompanyIndustrySettings } from "@/components/settings/CompanyIndustrySettings";
import { IndustryType } from "@/lib/industry-templates";
import { MultiCompanyManager } from "@/components/companies/MultiCompanyManager";
import { HelpTooltip } from "@/components/common/HelpTooltip";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface Company { id: string;
  name: string;
  org_number: string;
  country: string;
  currency: string;
  industry?: IndustryType | string;
  vat_number?: string;
  address?: string;
  created_at: string;
}

interface LookupResult { name: string | null;
  orgNumber: string;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  vatNumber: string | null;
  requiresManualEntry: boolean;
  message?: string;
}

const Companies = () => { const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showIndustrySettings, setShowIndustrySettings] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editForm, setEditForm] = useState({ name: "", vat_number: "", address: "" });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  // Auto-lookup state
  const [orgNumber, setOrgNumber] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [formData, setFormData] = useState({ name: "",
    vatNumber: "",
    address: "",
    country: "SE",
    currency: "SEK",
    industry: "general",
    businessDescription: "",
  });

  useEffect(() => { if (!loading && !user) { navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => { if (user) { loadCompanies();
    }
  }, [user]);

  const loadCompanies = async () => { try { const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) { toast.error(error.message || "Kunde inte ladda företag");
    } finally { setIsLoading(false);
    }
  };

  // Auto-lookup company by org number
  const lookupCompany = useCallback(async (orgNr: string) => { const cleanOrgNr = orgNr.replace(/[\s-]/g, '');
    
    // Need at least 10 digits
    if (cleanOrgNr.length < 10) { setLookupResult(null);
      return;
    }

    setIsLookingUp(true);
    try { const { data, error } = await supabase.functions.invoke('company-lookup', { body: { orgNumber: cleanOrgNr }
      });

      if (error) throw error;

      setLookupResult(data);
      
      // Auto-fill form with found data
      if (data && !data.requiresManualEntry) { setFormData(prev => ({ ...prev,
          name: data.name || prev.name,
          vatNumber: data.vatNumber || prev.vatNumber,
          address: data.address ? `${data.address}, ${data.postalCode || ''} ${data.city || ''}`.trim() : prev.address,
        }));
        toast.success(`Hittade: ${data.name}`);
      } else if (data?.requiresManualEntry) { toast.info(data.message || "Fyll i företagsnamn manuellt");
      }
    } catch (error) { console.error('Lookup error:', error);
      setLookupResult(null);
    } finally { setIsLookingUp(false);
    }
  }, []);

  // Debounce org number lookup
  useEffect(() => { const timer = setTimeout(() => { if (orgNumber.replace(/[\s-]/g, '').length >= 10) { lookupCompany(orgNumber);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [orgNumber, lookupCompany]);

  const handleCreateCompany = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault();
    setIsSubmitting(true);

    try { const data = { name: formData.name,
        orgNumber: orgNumber,
        country: formData.country,
        currency: formData.currency,
        vatNumber: formData.vatNumber || undefined,
        address: formData.address || undefined,
      };

      const validated = companySchema.parse(data);
      const currentYear = new Date().getFullYear();

      const { error } = await supabase.from("companies").insert([{
        name: validated.name,
        org_number: validated.orgNumber,
        country: validated.country as any,
        currency: validated.currency,
        vat_number: validated.vatNumber,
        address: validated.address,
        industry: (formData.industry || 'general') as any,
        business_description: formData.businessDescription || null,
        fiscal_year_start: `${currentYear}-01-01`,
        fiscal_year_end: `${currentYear}-12-31`,
        created_by: user!.id,
      }]);

      if (error) throw error;

      // Create owner role för this company
      const { data: newCompany, error: newCompError } = await supabase
        .from("companies")
        .select("id")
        .eq("org_number", validated.orgNumber)
        .maybeSingle();

      if (!newCompError && newCompany) { await supabase.from("user_roles").insert({ user_id: user!.id,
          company_id: newCompany.id,
          role: "owner",
        });
      }

      toast.success("Företag skapat!");
      setIsDialogOpen(false);
      // Reset form
      setOrgNumber("");
      setFormData({ name: "",
        vatNumber: "",
        address: "",
        country: "SE",
        currency: "SEK",
        industry: "general",
        businessDescription: "",
      });
      setLookupResult(null);
      loadCompanies();
    } catch (error: any) { if (error.errors) { error.errors.forEach((err: any) => toast.error(err.message));
      } else { toast.error(error.message || "Kunde inte skapa företag");
      }
    } finally { setIsSubmitting(false);
    }
  };

  if (loading || isLoading) { return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Laddar...</div>
      </div>
    );
  }

  if (!user) { return null;
  }

  return (
    <div>
<main className="container mx-auto px-4 py-8">
        {/* Multi-Company Manager för att hitta och länka företag */}
        <MultiCompanyManager onCompanyLinked={loadCompanies} />

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Företag</h1>
            <p className="text-muted-foreground mt-2">
              Hantera dina företag och koncernstrukturer
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open);
            if (!open) { // Reset form when closing
              setOrgNumber("");
              setFormData({ name: "",
                vatNumber: "",
                address: "",
                country: "SE",
                currency: "SEK",
                industry: "general",
                businessDescription: "",
              });
              setLookupResult(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Lägg till företag
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Lägg till företag automatiskt
                </DialogTitle>
                <DialogDescription>
                  Skriv in organisationsnummer så hämtar vi uppgifterna automatiskt
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCompany} className="space-y-4 mt-4">
                {/* Org number with auto-lookup */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="orgNumber">Organisationsnummer</Label>
                    <HelpTooltip 
                      title="Automatisk hämtning"
                      description="Skriv in 10 siffror så hämtar vi företagsnamn, adress och momsnummer automatiskt från Bolagsverket."
                      variant="tip"
                    />
                  </div>
                  <div className="relative">
                    <Input
                      id="orgNumber"
                      value={orgNumber}
                      onChange={(e) => setOrgNumber(e.target.value)}
                      required
                      placeholder="556123-4567"
                      className="pr-10"
                    />
                    {isLookingUp && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {lookupResult && !lookupResult.requiresManualEntry && !isLookingUp && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <CheckCircle2 className="w-4 h-4 text-[#085041]" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Auto-lookup result */}
                {lookupResult && !lookupResult.requiresManualEntry && (
                  <Alert className="border-[#BFE6D6] bg-[#E1F5EE] dark:bg-green-950/20">
                    <CheckCircle2 className="w-4 h-4 text-[#085041]" />
                    <AlertDescription className="text-[#085041] dark:text-green-200">
                      <strong>{lookupResult.name}</strong> hittades! Uppgifterna har fyllts i automatiskt.
                    </AlertDescription>
                  </Alert>
                )}

                {lookupResult?.requiresManualEntry && (
                  <Alert>
                    <AlertDescription>
                      {lookupResult.message || "Fyll i företagsnamn manuellt"}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Företagsnamn</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="Acme AB"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Land</Label>
                    <Select 
                      value={formData.country} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, country: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SE">Sverige</SelectItem>
                        <SelectItem value="NO">Norge</SelectItem>
                        <SelectItem value="DK">Danmark</SelectItem>
                        <SelectItem value="FI">Finland</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Valuta</Label>
                    <Select 
                      value={formData.currency} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEK">SEK</SelectItem>
                        <SelectItem value="NOK">NOK</SelectItem>
                        <SelectItem value="DKK">DKK</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vatNumber">Momsnummer</Label>
                    <Input
                      id="vatNumber"
                      value={formData.vatNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, vatNumber: e.target.value }))}
                      placeholder="SE556123456701"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Bransch</Label>
                    <Select 
                      value={formData.industry} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, industry: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">Generell (standard)</SelectItem>
                        <SelectItem value="restaurant">🍽 Restaurang & Café</SelectItem>
                        <SelectItem value="hotel">🏨 Hotell & Logi</SelectItem>
                        <SelectItem value="retail">Detaljhandel</SelectItem>
                        <SelectItem value="construction">Bygg & Hantverk</SelectItem>
                        <SelectItem value="consulting">Konsult & Tjänster</SelectItem>
                        <SelectItem value="real_estate">Fastighetsförvaltning</SelectItem>
                        <SelectItem value="manufacturing">Tillverkning & Produktion</SelectItem>
                        <SelectItem value="holding">Holdingbolag</SelectItem>
                      </SelectContent>
                    </Select>
                    {(formData.industry === "restaurant" || formData.industry === "hotel") && (
                      <div className="mt-2 rounded-md border border-teal-500/30 bg-teal-50 dark:bg-teal-950/20 p-2.5 text-[11px] text-teal-900 dark:text-teal-200 flex items-start gap-2">
                        <span className="text-base leading-none">{formData.industry === "restaurant" ? "🍽" : "🏨"}</span>
                        <span>
                          <strong>Branschanpassat läge aktiveras</strong> — Bokfy anpassar
                          kontoplan, dashboard och AI-insikter till din verksamhet.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Adress</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Storgatan 1, 111 22 Stockholm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessDescription">Verksamhetsbeskrivning (valfritt)</Label>
                  <Input
                    id="businessDescription"
                    value={formData.businessDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessDescription: e.target.value }))}
                    placeholder="Beskriv företagets verksamhet..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Avbryt
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !formData.name}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Skapar...
                      </>
                    ) : (
                      "Skapa företag"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {companies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Inga företag ännu</h3>
              <p className="text-muted-foreground mb-4">
                Kom igång genom att lägga till ditt första företag
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Lägg till företag
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <Card key={company.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{company.name}</CardTitle>
                        <CardDescription>{company.org_number}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Land:</span>
                      <span className="font-medium">{company.country}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valuta:</span>
                      <span className="font-medium">{company.currency}</span>
                    </div>
                    {company.vat_number && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Moms:</span>
                        <span className="font-medium">{company.vat_number}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => { setSelectedCompany(company);
                        setShowIndustrySettings(true);
                      }}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Bransch
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingCompany(company);
                        setEditForm({
                          name: company.name,
                          vat_number: company.vat_number || "",
                          address: company.address || "",
                        });
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingCompany(company)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Industry Settings Dialog */}
      <Dialog open={showIndustrySettings} onOpenChange={setShowIndustrySettings}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Byt bransch för {selectedCompany?.name}</DialogTitle>
            <DialogDescription>
              Välj den bransch som passar bäst för företagets verksamhet
            </DialogDescription>
          </DialogHeader>
          {selectedCompany && (
            <CompanyIndustrySettings
              companyId={selectedCompany.id}
              currentIndustry={selectedCompany.industry || null}
              onUpdate={() => { loadCompanies();
                setShowIndustrySettings(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog
        open={!!editingCompany}
        onOpenChange={(open) => { if (!open) setEditingCompany(null); }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Redigera {editingCompany?.name}</DialogTitle>
            <DialogDescription>Uppdatera företagsuppgifter</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!editingCompany) return;
              setIsSavingEdit(true);
              try {
                const { error } = await supabase
                  .from("companies")
                  .update({
                    name: editForm.name,
                    vat_number: editForm.vat_number || null,
                    address: editForm.address || null,
                  })
                  .eq("id", editingCompany.id);
                if (error) throw error;
                toast.success("Företaget har uppdaterats");
                setEditingCompany(null);
                loadCompanies();
              } catch (err: any) {
                toast.error(err.message || "Kunde inte uppdatera företaget");
              } finally {
                setIsSavingEdit(false);
              }
            }}
            className="space-y-4 mt-4"
          >
            <div className="space-y-2">
              <Label htmlFor="edit-name">Företagsnamn</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-vat">Momsnummer</Label>
              <Input
                id="edit-vat"
                value={editForm.vat_number}
                onChange={(e) => setEditForm((p) => ({ ...p, vat_number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Adress</Label>
              <Input
                id="edit-address"
                value={editForm.address}
                onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditingCompany(null)}>
                Avbryt
              </Button>
              <Button type="submit" disabled={isSavingEdit || !editForm.name}>
                {isSavingEdit ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sparar...</>
                ) : (
                  "Spara ändringar"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Company Confirm */}
      <ConfirmDialog
        open={!!deletingCompany}
        onOpenChange={(open) => { if (!open) setDeletingCompany(null); }}
        title={`Ta bort ${deletingCompany?.name ?? "företag"}?`}
        description="Detta tar bort företaget och din koppling till det. Denna åtgärd går inte att ångra."
        confirmLabel="Ta bort"
        variant="destructive"
        onConfirm={async () => {
          if (!deletingCompany || !user) return;
          try {
            await supabase
              .from("user_roles")
              .delete()
              .eq("company_id", deletingCompany.id)
              .eq("user_id", user.id);
            await supabase
              .from("linked_companies")
              .delete()
              .eq("company_id", deletingCompany.id)
              .eq("user_id", user.id);
            const { error } = await supabase
              .from("companies")
              .delete()
              .eq("id", deletingCompany.id);
            if (error) throw error;
            toast.success(`${deletingCompany.name} har tagits bort`);
            setDeletingCompany(null);
            loadCompanies();
          } catch (err: any) {
            toast.error(err.message || "Kunde inte ta bort företaget");
          }
        }}
      />
    </div>
  );
};

export default Companies;
