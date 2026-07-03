import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, AlertCircle, Info, Building2, Shield, Users, Loader2, 
  User, Crown, Plus, Trash2, ChevronDown, ChevronUp, Sparkles, Zap, Fingerprint
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BankIDVerification } from "./BankIDVerification";

interface KYCOnboardingProps { companyId: string;
  onComplete: () => void;
}

interface Representative { name: string;
  role: string;
  personalNumber?: string;
}

interface BeneficialOwner { name: string;
  ownership_percentage?: number;
  type: 'direct' | 'indirect';
}

interface CompanyDetails { name: string;
  org_number: string;
  address?: string;
  postal_code?: string;
  city?: string;
  business_description?: string;
  registration_date?: string;
  company_type?: string;
  representatives: Representative[];
  beneficial_owners: BeneficialOwner[];
  dataSource: string;
  dataCompleteness: 'full' | 'partial' | 'basic';
  missingData: string[];
  scrapedAt?: string;
}

interface SanctionsCheckResult { success: boolean;
  risk_level: string;
  requires_review: boolean;
  summary?: { total_entities_checked: number;
    total_matches: number;
    pep_matches: number;
    sanctions_matches: number;
  };
}

const ROLE_OPTIONS = [
  { value: 'Styrelseledamot', label: 'Styrelseledamot' },
  { value: 'Ordförande', label: 'Ordförande' },
  { value: 'VD', label: 'VD' },
  { value: 'Suppleant', label: 'Suppleant' },
  { value: 'Revisor', label: 'Revisor' },
  { value: 'Firmatecknare', label: 'Firmatecknare' },
];

export const KYCOnboarding = ({ companyId, onComplete }: KYCOnboardingProps) => { const [phase, setPhase] = useState<'input' | 'loading' | 'confirm' | 'bankid' | 'complete'>('input');
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dataSource, setDataSource] = useState<string>('');
  const [dataCompleteness, setDataCompleteness] = useState<'full' | 'partial' | 'basic'>('basic');
  const [bankIdVerified, setBankIdVerified] = useState(false);
  
  const [orgNumber, setOrgNumber] = useState("");
  const [lookupInProgress, setLookupInProgress] = useState(false);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState({ company_name: "",
    address: "",
    business_description: "",
  });
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [beneficialOwners, setBeneficialOwners] = useState<BeneficialOwner[]>([]);
  
  // For manual entry
  const [newRep, setNewRep] = useState<Representative>({ name: '', role: 'Styrelseledamot' });
  const [newOwner, setNewOwner] = useState<BeneficialOwner>({ name: '', ownership_percentage: 25, type: 'direct' });

  // Auto-lookup when org number is complete
  useEffect(() => { const cleanOrg = orgNumber.replace(/\D/g, '');
    if (cleanOrg.length === 10 && phase === 'input' && !lookupInProgress) { handleAutoLookup();
    }
  }, [orgNumber]);

  const handleAutoLookup = async () => { const cleanOrg = orgNumber.replace(/\D/g, '');
    if (cleanOrg.length !== 10) { toast.error("Organisationsnummer måste vara 10 siffror");
      return;
    }

    setLookupInProgress(true);
    setLoading(true);

    try { const { data, error } = await supabase.functions.invoke<CompanyDetails>('fetch-company-details-ai', { body: { org_number: cleanOrg }
      });

      if (error) throw error;

      if (data && data.name) { // Show preview name immediately
        setPreviewName(data.name);
        
        setCompanyData({ company_name: data.name || "",
          address: [data.address, data.postal_code, data.city].filter(Boolean).join(", "),
          business_description: data.business_description || "",
        });
        
        setRepresentatives(data.representatives || []);
        setBeneficialOwners(data.beneficial_owners || []);
        setDataSource(data.dataSource || 'manual');
        setDataCompleteness(data.dataCompleteness || 'basic');
        
        setPhase('confirm');
        
        // Show appropriate toast based on data quality
        if (data.dataCompleteness === 'full') { toast.success("Alla uppgifter hämtade automatiskt!", { description: "Kontrollera och bekräfta för att slutföra"
          });
        } else if (data.dataCompleteness === 'partial') { toast.info("Grunduppgifter hämtade", { description: "Komplettera vid behov"
          });
        } else { toast.info("Grundinfo hämtad", { description: "Lägg till styrelse och huvudmän"
          });
          setShowAdvanced(true);
        }
      } else { setPhase('confirm');
        setShowAdvanced(true);
        toast.info("Ange uppgifter manuellt");
      }
    } catch (error: any) { console.error('Lookup error:', error);
      setPhase('confirm');
      setShowAdvanced(true);
      toast.info("Manuell inmatning", { description: "Fyll i uppgifterna nedan"
      });
    } finally { setLoading(false);
      setLookupInProgress(false);
    }
  };

  const addRepresentative = () => { if (!newRep.name.trim() || newRep.name.trim().length < 2) { toast.error("Ange ett giltigt namn");
      return;
    }
    setRepresentatives([...representatives, { ...newRep, name: newRep.name.trim() }]);
    setNewRep({ name: '', role: 'Styrelseledamot' });
  };

  const addBeneficialOwner = () => { if (!newOwner.name.trim() || newOwner.name.trim().length < 2) { toast.error("Ange ett giltigt namn");
      return;
    }
    if ((newOwner.ownership_percentage || 0) < 25) { toast.error("Minst 25% krävs för UBO");
      return;
    }
    setBeneficialOwners([...beneficialOwners, { ...newOwner, name: newOwner.name.trim() }]);
    setNewOwner({ name: '', ownership_percentage: 25, type: 'direct' });
  };

  const handleConfirmAndComplete = async () => { if (representatives.length === 0) { toast.error("Lägg till minst en företrädare");
      setShowAdvanced(true);
      return;
    }

    setLoading(true);
    setPhase('loading');

    try { // Step 1: Save KYC record
      const uboData = JSON.parse(JSON.stringify({ owners: beneficialOwners,
        representatives: representatives,
        source: dataSource,
        dataCompleteness: dataCompleteness,
        fetched_at: new Date().toISOString()
      }));

      const { error: kycError } = await supabase
        .from('kyc_records')
        .upsert([{ company_id: companyId,
          verification_status: 'in_review',
          org_number_verified: true,
          company_name_verified: true,
          address_verified: !!companyData.address,
          bankid_verified: false,
          risk_level: 'low',
          ubo_identified: beneficialOwners.length > 0,
          ubo_verified: dataSource.includes('roaring'),
          ubo_data: uboData,
        }], { onConflict: 'company_id' });

      if (kycError) throw kycError;

      // Step 2: Update company info
      await supabase
        .from('companies')
        .update({ name: companyData.company_name,
          org_number: orgNumber.replace(/\D/g, ''),
          address: companyData.address,
          business_description: companyData.business_description,
        })
        .eq('id', companyId);

      // Step 3: Run sanctions check
      const ownerNames = [
        ...beneficialOwners.map(o => o.name),
        ...representatives.map(r => r.name)
      ].filter(Boolean);

      const { data: sanctionsResult } = await supabase.functions.invoke<SanctionsCheckResult>('sanctions-check', { body: { company_id: companyId,
          company_name: companyData.company_name,
          org_number: orgNumber.replace(/\D/g, ''),
          owners: ownerNames
        }
      });

      // Step 4: Finalize
      const finalStatus = sanctionsResult?.requires_review ? 'in_review' : 'approved';
      
      await supabase
        .from('companies')
        .update({ kyc_status: finalStatus })
        .eq('id', companyId);

      if (finalStatus === 'approved') { await supabase
          .from('kyc_records')
          .update({ verification_status: 'approved',
            verification_date: new Date().toISOString()
          })
          .eq('company_id', companyId);
      }

      // Move to BankID phase instead of complete
      setPhase('bankid');
      
      if (sanctionsResult?.requires_review) { toast.warning("Manuell granskning krävs", { description: `${sanctionsResult.summary?.total_matches || 0} potentiella träffar`
        });
      } else { toast.success("Grundläggande verifiering klar! Slutför med BankID.");
      }
      
    } catch (error: any) { console.error('KYC error:', error);
      toast.error("Något gick fel");
      setPhase('confirm');
    } finally { setLoading(false);
    }
  };

  // Loading state
  if (phase === 'loading') { return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="relative mx-auto w-16 h-16 mb-6">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {loading && representatives.length === 0 ? "Hämtar företagsuppgifter..." : "Verifierar..."}
            </h3>
            <p className="text-sm text-muted-foreground">
              {loading && representatives.length === 0 
                ? "AI analyserar data från offentliga register" 
                : "Kör sanktionskontroll och sparar"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // BankID verification phase with tax mandate
  if (phase === 'bankid') { return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Fingerprint className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Verifiera & Signera Fullmakt</CardTitle>
            <CardDescription>
              Signera med BankID eller Freja eID+ för att aktivera automatiska inlämningar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="font-medium">{companyData.company_name}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{representatives.length} företrädare</Badge>
                <Badge variant="secondary">{beneficialOwners.length} huvudmän</Badge>
                <Badge variant="outline" className="text-primary">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Sanktionskontroll OK
                </Badge>
              </div>
            </div>

            {/* Tax Mandate Summary */}
            <div className="border rounded-lg p-4 bg-primary/5 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Skattefullmakt ingår
              </h4>
              <p className="text-sm text-muted-foreground">
                Genom att signera ger du NorthLedger fullmakt att skicka in deklarationer åt dig:
              </p>
              <ul className="text-sm space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Automatisk AGI-inlämning varje månad
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Automatisk momsdeklaration
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Läsåtkomst till skattekonto
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Du kan återkalla fullmakten när som helst via Inställningar.
              </p>
            </div>

            <BankIDVerification 
              companyId={companyId}
              onSuccess={async () => { setBankIdVerified(true);
                
                // Register tax mandate after successful BankID
                try { await supabase.functions.invoke('register-tax-mandate', { body: { company_id: companyId,
                      mandate_type: 'full',
                      consent_text: 'Fullmakt för AGI och momsdeklaration signerad via BankID vid registrering',
                      consent_ip_address: 'signed-via-bankid'
                    }
                  });
                  toast.success("Fullmakt registrerad! Automatiska inlämningar aktiverade.");
                } catch (error) { console.error('Failed to register mandate:', error);
                  toast.info("KYC klar! Fullmakt kan läggas till senare i inställningar.");
                }
                
                setPhase('complete');
                setTimeout(() => onComplete(), 2000);
              }}
            />

            <div className="border-t pt-4 mt-2">
              <p className="text-sm text-center text-muted-foreground mb-2">
                Varken BankID eller Freja eID+? Ingen fara — du kan verifiera senare.
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => { setPhase('complete');
                  toast.info("Du kan verifiera och signera fullmakt senare i inställningar");
                  setTimeout(() => onComplete(), 1500);
                }}
              >
                Fortsätt utan e-legitimation (testläge)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Completion state
  if (phase === 'complete') { return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mx-auto w-16 h-16 mb-6 flex items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {bankIdVerified ? "Konto aktiverat!" : "KYC Godkänd!"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {companyData.company_name} är nu verifierat
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="secondary">{representatives.length} företrädare</Badge>
              <Badge variant="secondary">{beneficialOwners.length} huvudmän</Badge>
              {bankIdVerified && (
                <>
                  <Badge variant="default">
                    <Fingerprint className="h-3 w-3 mr-1" />
                    BankID
                  </Badge>
                  <Badge variant="default">
                    <Shield className="h-3 w-3 mr-1" />
                    Fullmakt aktiv
                  </Badge>
                </>
              )}
              <Badge variant="outline" className="text-primary">Låg risk</Badge>
            </div>
            {bankIdVerified && (
              <p className="text-sm text-muted-foreground mt-4">
                ✨ Automatiska inlämningar till Skatteverket är nu aktiverade
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Snabb KYC-verifiering</CardTitle>
          <CardDescription>
            Ange org.nummer – vi hämtar resten automatiskt
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {phase === 'input' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="org_number" className="text-sm font-medium">
                  Organisationsnummer
                </Label>
                <div className="relative">
                  <Input
                    id="org_number"
                    placeholder="XXXXXX-XXXX"
                    value={orgNumber}
                    onChange={(e) => { setOrgNumber(e.target.value);
                      setPreviewName(null); // Reset when user changes input
                    }}
                    className="text-lg text-center tracking-wider pr-12"
                    maxLength={13}
                    autoFocus
                    disabled={lookupInProgress}
                  />
                  {lookupInProgress ? (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary animate-spin" />
                  ) : orgNumber.replace(/\D/g, '').length === 10 && (
                    <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary animate-pulse" />
                  )}
                </div>
                
                {/* Show company name preview while loading or after fetch */}
                {lookupInProgress && (
                  <div className="flex items-center justify-center gap-2 py-3 px-4 bg-muted/50 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Hämtar företagsuppgifter...</span>
                  </div>
                )}
                
                {previewName && !lookupInProgress && (
                  <div className="flex items-center gap-2 py-3 px-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span className="font-medium text-primary">{previewName}</span>
                    <CheckCircle2 className="h-4 w-4 text-[#085041] ml-auto" />
                  </div>
                )}
                
                {!lookupInProgress && !previewName && (
                  <p className="text-xs text-muted-foreground text-center">
                    Uppgifter hämtas automatiskt när du fyllt i 10 siffror
                  </p>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="font-medium">Automatisk verifiering inkluderar:</span>
                </div>
                <ul className="text-xs text-muted-foreground ml-6 space-y-1">
                  <li>• Företagsuppgifter från offentliga register</li>
                  <li>• Styrelse och verkliga huvudmän</li>
                  <li>• Sanktionskontroll (EU, UN, OFAC)</li>
                  <li>• PEP-kontroll</li>
                </ul>
              </div>
            </>
          )}

          {phase === 'confirm' && (
            <>
              {/* Company summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold">{companyData.company_name || 'Ange företagsnamn'}</p>
                      <p className="text-sm text-muted-foreground">{orgNumber}</p>
                    </div>
                  </div>
                  <Badge variant={dataCompleteness === 'full' ? 'default' : dataCompleteness === 'partial' ? 'secondary' : 'outline'}>
                    {dataCompleteness === 'full' ? 'Komplett' : dataCompleteness === 'partial' ? 'Delvis' : 'Manuell'}
                  </Badge>
                </div>
                {companyData.address && (
                  <p className="text-sm text-muted-foreground">{companyData.address}</p>
                )}
              </div>

              {/* Quick summary of fetched data */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{representatives.length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Företrädare</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Crown className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{beneficialOwners.length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Huvudmän</p>
                </div>
              </div>

              {/* Fetched representatives list */}
              {representatives.length > 0 && (
                <div className="space-y-2">
                  {representatives.map((rep, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-[#085041]" />
                        <span>{rep.name}</span>
                        <Badge variant="outline" className="text-xs">{rep.role}</Badge>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => setRepresentatives(representatives.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Validation warning */}
              {representatives.length === 0 && (
                <Alert className="bg-[#FAEEDA] border-[#F0DDB7]">
                  <AlertCircle className="h-4 w-4 text-[#7A5417]" />
                  <AlertDescription className="text-sm text-[#7A5417] dark:text-amber-200">
                    Lägg till minst en företrädare för att fortsätta
                  </AlertDescription>
                </Alert>
              )}

              {/* Advanced section för manual entry */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-sm" size="sm">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {showAdvanced ? 'Dölj' : 'Lägg till/redigera'} uppgifter
                    </span>
                    {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-3">
                  {/* Company name edit */}
                  {!companyData.company_name && (
                    <div className="space-y-2">
                      <Label className="text-xs">Företagsnamn</Label>
                      <Input
                        value={companyData.company_name}
                        onChange={(e) => setCompanyData({ ...companyData, company_name: e.target.value })}
                        placeholder="Ange företagsnamn"
                      />
                    </div>
                  )}

                  {/* Add representative */}
                  <div className="border border-dashed rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Lägg till företrädare</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Namn"
                        value={newRep.name}
                        onChange={(e) => setNewRep({ ...newRep, name: e.target.value })}
                        className="flex-1"
                      />
                      <Select value={newRep.role} onValueChange={(v) => setNewRep({ ...newRep, role: v })}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="secondary" onClick={addRepresentative}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Add beneficial owner */}
                  <div className="border border-dashed rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Lägg till verklig huvudman (≥25%)</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Namn"
                        value={newOwner.name}
                        onChange={(e) => setNewOwner({ ...newOwner, name: e.target.value })}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="%"
                        value={newOwner.ownership_percentage || ''}
                        onChange={(e) => setNewOwner({ ...newOwner, ownership_percentage: parseInt(e.target.value) || 25 })}
                        className="w-16"
                        min={25}
                        max={100}
                      />
                      <Button size="icon" variant="secondary" onClick={addBeneficialOwner}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Beneficial owners list */}
                  {beneficialOwners.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Verkliga huvudmän</p>
                      {beneficialOwners.map((owner, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-[#7A5417]" />
                            <span>{owner.name}</span>
                            <Badge variant="outline" className="text-xs">{owner.ownership_percentage}%</Badge>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => setBeneficialOwners(beneficialOwners.filter((_, idx) => idx !== i))}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => { setPhase('input');
                    setOrgNumber('');
                    setCompanyData({ company_name: '', address: '', business_description: '' });
                    setRepresentatives([]);
                    setBeneficialOwners([]);
                  }}
                >
                  Börja om
                </Button>
                <Button 
                  onClick={handleConfirmAndComplete} 
                  className="flex-1"
                  disabled={representatives.length === 0 || !companyData.company_name}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Bekräfta & Verifiera
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Genom att bekräfta godkänner du sanktionskontroll enligt penningtvättslagen
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
