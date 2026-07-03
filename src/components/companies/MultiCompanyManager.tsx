import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Plus, Search, Loader2, CheckCircle2, AlertCircle, FileDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface CompanyInfo { orgNumber: string;
  name: string;
  address?: string;
  city?: string;
  zipCode?: string;
  industry?: string;
  legalForm?: string;
}

interface MultiCompanyManagerProps { onCompanyAdded?: () => void;
  onCompanyLinked?: () => void;
}

export function MultiCompanyManager({ onCompanyAdded, onCompanyLinked }: MultiCompanyManagerProps) { const { user } = useAuth();
  const [orgNumberInput, setOrgNumberInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundCompany, setFoundCompany] = useState<CompanyInfo | null>(null);
  const [adding, setAdding] = useState(false);
  const [existingCompanies, setExistingCompanies] = useState<any[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [fetchingReportsFor, setFetchingReportsFor] = useState<string | null>(null);

  const fetchAnnualReportsFor = async (companyId: string, orgNumber: string, name: string) => {
    if (!orgNumber) {
      toast.error("Organisationsnummer saknas");
      return;
    }
    setFetchingReportsFor(companyId);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-bolagsverket-annual-reports', {
        body: { companyId, orgNumber },
      });
      if (error) throw error;
      const count = data?.count ?? 0;
      if (count > 0) toast.success(`${name}: hämtade ${count} årsredovisning(ar)`);
      else toast.info(`${name}: inga nya årsredovisningar att hämta`);
    } catch (e: any) {
      console.error(e);
      toast.error(`Kunde inte hämta årsredovisningar: ${e?.message ?? 'okänt fel'}`);
    } finally {
      setFetchingReportsFor(null);
    }
  };

  useEffect(() => { if (user) { loadExistingCompanies();
    }
  }, [user]);

  const loadExistingCompanies = async () => { if (!user) return;
    const { data } = await supabase
      .from('user_roles')
      .select('company_id, companies(id, name, org_number)')
      .eq('user_id', user.id);
    if (data) { setExistingCompanies(data.map(d => d.companies).filter(Boolean));
    }
  };

  const searchByOrgNumber = async () => { const cleaned = orgNumberInput.trim().replace(/\s/g, '');
    if (!cleaned || cleaned.length < 6) { toast.error("Ange ett giltigt organisationsnummer (t.ex. 559105-3235)");
      return;
    }

    // Check if already added
    const normalizedInput = cleaned.replace('-', '');
    const alreadyAdded = existingCompanies.some(c => { const existing = (c.org_number || '').replace('-', '');
      return existing === normalizedInput;
    });
    if (alreadyAdded) { toast.info("Detta företag finns redan i ditt konto");
      return;
    }

    setSearching(true);
    setFoundCompany(null);
    setSearchMessage(null);

    try { const { data, error } = await supabase.functions.invoke('bolagsverket-company', { body: { orgNumber: cleaned },
      });

      if (error) throw error;

      if (data?.found && data?.name) {
        const sniDesc = data.sniCodes?.[0]?.description;
        const sniCode = data.sniCodes?.[0]?.code;
        const legalForm = typeof data.legalForm === 'string'
          ? data.legalForm
          : data.legalForm?.description || data.legalForm?.code;
        setFoundCompany({
          orgNumber: data.orgNumber || cleaned,
          name: data.name,
          address: data.address,
          city: data.city,
          zipCode: data.postalCode || data.zipCode,
          industry: sniDesc || sniCode,
          legalForm,
        });
        if (data.isDeregistered) {
          setSearchMessage(data.message || "Obs: bolaget är avregistrerat hos Bolagsverket.");
        }
      } else {
        setSearchMessage(
          data?.message ||
          `Inget företag hittades med organisationsnummer "${cleaned}". Kontrollera att numret stämmer.`
        );
      }
    } catch (error) { console.error('Org number lookup error:', error);
      setSearchMessage("Sökningen misslyckades. Kontrollera organisationsnumret och försök igen.");
    } finally { setSearching(false);
    }
  };

  const addCompany = async () => { if (!foundCompany || !user) return;

    setAdding(true);
    try { const vatNumber = `SE${foundCompany.orgNumber.replace('-', '')}01`;

      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({ name: foundCompany.name,
          org_number: foundCompany.orgNumber,
          address: [foundCompany.address, foundCompany.zipCode, foundCompany.city].filter(Boolean).join(', ') || null,
          vat_number: vatNumber,
          business_description: foundCompany.industry || null,
          created_by: user.id,
        })
        .select()
        .maybeSingle();

      if (createError) { if (createError.message.includes('duplicate')) { // Link to existing
          const { data: existing } = await supabase
            .from('companies')
            .select('id')
            .eq('org_number', foundCompany.orgNumber)
            .maybeSingle();

          if (existing) { const { data: existingRole } = await supabase
              .from('user_roles')
              .select('id')
              .eq('user_id', user.id)
              .eq('company_id', existing.id)
              .maybeSingle();

            if (!existingRole) { await supabase.from('user_roles').insert({ user_id: user.id,
                company_id: existing.id,
                role: 'owner',
              });
              toast.success(`${foundCompany.name} har kopplats till ditt konto!`);
            } else { toast.info(`${foundCompany.name} är redan kopplat till ditt konto`);
            }
          }
        } else { throw createError;
        }
      } else { await supabase.from('user_roles').insert({ user_id: user.id,
          company_id: newCompany.id,
          role: 'owner',
        });

        await supabase.from('linked_companies').insert({ user_id: user.id,
          company_id: newCompany.id,
          is_primary: existingCompanies.length === 0,
        });

        // Fire-and-forget: hämta de 3 senaste årsredovisningarna från Bolagsverket
        supabase.functions.invoke('fetch-bolagsverket-annual-reports', {
          body: { companyId: newCompany.id, orgNumber: foundCompany.orgNumber },
        }).then(({ data, error: arError }) => {
          if (arError) console.warn('Annual reports fetch failed:', arError);
          else if (data?.count > 0) toast.success(`Hämtade ${data.count} årsredovisning(ar) från Bolagsverket`);
        }).catch((e) => console.warn('Annual reports fetch error:', e));

        toast.success(`${foundCompany.name} har lagts till!`);
      }

      setFoundCompany(null);
      setOrgNumberInput("");
      loadExistingCompanies();
      onCompanyAdded?.();
      onCompanyLinked?.();
    } catch (error) { console.error('Add company error:', error);
      toast.error("Kunde inte lägga till företaget. Försök igen.");
    } finally { setAdding(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Hitta och lägg till företag
        </CardTitle>
        <CardDescription>
          Ange ett organisationsnummer för att hämta företagsuppgifter från Bolagsverket
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing companies */}
        {existingCompanies.length > 0 && (
          <div className="space-y-2">
            <Label>Dina nuvarande företag ({existingCompanies.length})</Label>
            <div className="grid gap-2">
              {existingCompanies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-[#085041] shrink-0" />
                    <span className="font-medium truncate">{company.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({company.org_number})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    disabled={fetchingReportsFor === company.id}
                    onClick={() => fetchAnnualReportsFor(company.id, company.org_number, company.name)}
                  >
                    {fetchingReportsFor === company.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileDown className="w-3.5 h-3.5" />
                    )}
                    Hämta årsredovisningar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search by org number */}
        <div className="space-y-3">
          <Label>Sök med organisationsnummer</Label>
          <div className="flex gap-2">
            <Input
              placeholder="XXXXXX-XXXX"
              value={orgNumberInput}
              onChange={(e) => setOrgNumberInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchByOrgNumber()}
            />
            <Button onClick={searchByOrgNumber} disabled={searching}>
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Sök
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Search message */}
        {searchMessage && !foundCompany && (
          <Alert variant="default">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{searchMessage}</AlertDescription>
          </Alert>
        )}

        {/* Found company */}
        {foundCompany && (
          <div className="space-y-3">
            <Label>Hittade företag</Label>
            <div className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-lg">{foundCompany.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Org.nr: {foundCompany.orgNumber}
                  </div>
                  {foundCompany.address && (
                    <div className="text-sm text-muted-foreground">
                      {foundCompany.address}{foundCompany.zipCode ? `, ${foundCompany.zipCode}` : ''}{foundCompany.city ? ` ${foundCompany.city}` : ''}
                    </div>
                  )}
                  {foundCompany.legalForm && (
                    <div className="text-sm text-muted-foreground">
                      Bolagsform: {foundCompany.legalForm}
                    </div>
                  )}
                  {foundCompany.industry && (
                    <div className="text-sm text-muted-foreground">
                      Bransch: {foundCompany.industry}
                    </div>
                  )}
                </div>
                <Badge variant="default">Aktiv</Badge>
              </div>
              <Button onClick={addCompany} disabled={adding} className="w-full mt-4">
                {adding ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Lägger till...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Lägg till {foundCompany.name}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
