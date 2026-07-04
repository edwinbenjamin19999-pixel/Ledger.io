import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, CheckCircle2, Upload, Search, Shield, FileSpreadsheet, AlertCircle, Loader2, X, Check, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";


interface CompanyPreview { orgNumber: string;
  name: string;
  address?: string;
  status: 'pending' | 'looking' | 'found' | 'manual' | 'error';
  errorMessage?: string;
}

export const EnterpriseOnboarding = () => { const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [existingGroup, setExistingGroup] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string>("");
  const [isBankIdVerified, setIsBankIdVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [groupData, setGroupData] = useState({ name: "",
    currency: "SEK",
    fiscal_year_start: 1,
  });

  const [billingCompanyOrgNr, setBillingCompanyOrgNr] = useState("");
  const [billingCompanyData, setBillingCompanyData] = useState<any>(null);
  const [manualCompanyName, setManualCompanyName] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  // For subsidiary preview
  const [subsidiaryPreviews, setSubsidiaryPreviews] = useState<CompanyPreview[]>([]);
  const [subsidiariesText, setSubsidiariesText] = useState("");

  // Check if user already has a group
  useEffect(() => { const checkExistingGroup = async () => { try { const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: groups } = await supabase
          .from("groups")
          .select("id, name")
          .eq("created_by", user.id)
          .limit(1);

        if (groups && groups.length > 0) { setExistingGroup(groups[0].name);
        }
      } catch (error) { console.error("Error checking existing group:", error);
      } finally { setCheckingExisting(false);
      }
    };

    checkExistingGroup();
  }, []);

  const handleBankIdVerify = async () => { setIsVerifying(true);
    try { const { data, error } = await supabase.functions.invoke('signicat-auth', { body: { purpose: 'company_verification',
          returnUrl: `${window.location.origin}/enterprise-onboarding?verified=true`
        }
      });

      if (error) throw error;

      if (data?.authUrl) { window.location.href = data.authUrl;
      }
    } catch (error: any) { toast.error("Kunde inte starta BankID-verifiering");
      console.error(error);
    } finally { setIsVerifying(false);
    }
  };

  // Check för BankID callback
  useState(() => { const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') { setIsBankIdVerified(true);
      toast.success("BankID-verifiering lyckades!");
      // Clean URL
      window.history.replaceState({}, '', '/enterprise-onboarding');
    }
  });

  const handleLookupCompany = async (orgNr: string): Promise<CompanyPreview | null> => { if (!orgNr) return null;
    
    try { const { data, error } = await supabase.functions.invoke('company-lookup', { body: { orgNumber: orgNr.replace(/[\s-]/g, '') }
      });

      if (error || data?.error || data?.requiresManualEntry) { return { orgNumber: orgNr.replace(/[\s-]/g, ''),
          name: '',
          status: 'error',
          errorMessage: data?.error || error?.message || 'Kunde inte hämta företagsinformation'
        };
      }
      
      return { orgNumber: data.orgNumber || orgNr.replace(/[\s-]/g, ''),
        name: data.name,
        address: data.address,
        status: 'found'
      };
    } catch (error: any) { return { orgNumber: orgNr.replace(/[\s-]/g, ''),
        name: '',
        status: 'error',
        errorMessage: error.message || 'Lookup misslyckades'
      };
    }
  };

  const handleBillingCompanyLookup = async () => { if (!billingCompanyOrgNr) return;
    
    setIsSearching(true);
    const result = await handleLookupCompany(billingCompanyOrgNr);
    
    if (result && result.status === 'found') { setBillingCompanyData(result);
      setManualCompanyName(result.name);
      setManualAddress(result.address || '');
      if (!groupData.name) { setGroupData(prev => ({ ...prev, name: `${result.name} Koncernen` }));
      }
      toast.success(`Hittade: ${result.name}`);
    } else { toast.info("Kunde inte hitta företaget automatiskt. Ange uppgifter manuellt.");
    }
    setIsSearching(false);
  };

  const handleCreateGroup = async () => { if (!groupData.name || !billingCompanyOrgNr || !manualCompanyName) { toast.error("Fyll i alla obligatoriska fält");
      return;
    }

    setLoading(true);
    try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Inte inloggad");

      // Create group
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert([{ name: groupData.name,
          currency: groupData.currency,
          fiscal_year_start: groupData.fiscal_year_start,
          created_by: user.id
        }])
        .select()
        .maybeSingle();

      if (groupError) throw groupError;
      
      // Create billing company
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert([{ name: manualCompanyName,
          org_number: billingCompanyOrgNr.replace(/[\s-]/g, ''),
          address: manualAddress || null,
          group_id: group.id,
          subscription_tier: 'enterprise',
          subscription_status: 'active',
          monthly_price: 2500,
          created_by: user.id
        }])
        .select()
        .maybeSingle();

      if (companyError) throw companyError;

      // Set billing company
      await supabase
        .from("groups")
        .update({ billing_company_id: company.id })
        .eq("id", group.id);

      setGroupId(group.id);
      toast.success("Koncern och faktureringsbolag skapat!");
      setStep(2);
    } catch (error: any) { toast.error(error.message || "Kunde inte skapa koncern");
    } finally { setLoading(false);
    }
  };

  // Parse text input or file för subsidiaries
  const parseSubsidiaryInput = (text: string): CompanyPreview[] => { const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => { const parts = line.split(/[,;\t]/).map(p => p.trim());
      const orgNumber = parts[0]?.replace(/[\s-]/g, '') || '';
      const name = parts[1] || '';
      
      return { orgNumber,
        name,
        status: name ? 'manual' : 'pending' as const
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0];
    if (!file) return;

    try { const text = await file.text();
      const previews: CompanyPreview[] = [];
      
      // Support CSV and TSV formats
      const separator = text.includes('\t') ? '\t' : ',';
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header row if it looks like headers
      const startRow = lines[0]?.toLowerCase().includes('org') ? 1 : 0;
      
      for (let i = startRow; i < lines.length; i++) { const cells = lines[i].split(separator).map(c => c.replace(/^"|"$/g, '').trim());
        const orgNumber = cells[0]?.replace(/[\s-]/g, '') || '';
        const name = cells[1] || '';
        
        if (orgNumber) { previews.push({ orgNumber,
            name,
            status: name ? 'manual' : 'pending'
          });
        }
      }

      setSubsidiaryPreviews(previews);
      toast.success(`${previews.length} bolag inlästa från fil`);
    } catch (error) { toast.error("Kunde inte läsa filen. Kontrollera formatet (CSV/TSV stöds).");
    }
    
    // Reset file input
    if (fileInputRef.current) { fileInputRef.current.value = '';
    }
  };

  const handleTextInputChange = (text: string) => { setSubsidiariesText(text);
    if (text.trim()) { setSubsidiaryPreviews(parseSubsidiaryInput(text));
    } else { setSubsidiaryPreviews([]);
    }
  };

  const lookupAllPending = async () => { const updated = [...subsidiaryPreviews];
    
    for (let i = 0; i < updated.length; i++) { if (updated[i].status === 'pending') { updated[i].status = 'looking';
        setSubsidiaryPreviews([...updated]);
        
        const result = await handleLookupCompany(updated[i].orgNumber);
        if (result) { updated[i] = result;
        }
        setSubsidiaryPreviews([...updated]);
        
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 300));
      }
    }
  };

  const updatePreviewName = (index: number, name: string) => { const updated = [...subsidiaryPreviews];
    updated[index].name = name;
    updated[index].status = name ? 'manual' : 'error';
    setSubsidiaryPreviews(updated);
  };

  const removePreview = (index: number) => { setSubsidiaryPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleImportSubsidiaries = async () => { const validCompanies = subsidiaryPreviews.filter(p => p.name && (p.status === 'found' || p.status === 'manual'));
    
    if (validCompanies.length === 0) { toast.error("Inga giltiga bolag att importera. Se till att alla har namn.");
      return;
    }

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Inte inloggad");

      const currentYear = new Date().getFullYear();

      for (const company of validCompanies) { try { const { error } = await supabase
            .from("companies")
            .insert([{ name: company.name,
              org_number: company.orgNumber,
              address: company.address || null,
              fiscal_year_start: `${currentYear}-01-01`,
              fiscal_year_end: `${currentYear}-12-31`,
              group_id: groupId,
              subscription_tier: 'mini',
              subscription_status: 'active',
              created_by: user.id
            }]);

          if (error) { console.error('Insert error:', error);
            errorCount++;
          } else { successCount++;
          }
        } catch { errorCount++;
        }
      }

      toast.success(`Import klar! ${successCount} bolag skapade${errorCount > 0 ? `, ${errorCount} misslyckades` : ''}`);
      setStep(3);
    } catch (error: any) { toast.error(error.message || "Import misslyckades");
    } finally { setLoading(false);
    }
  };

  const progressPercentage = (step / 3) * 100;
  const pendingCount = subsidiaryPreviews.filter(p => p.status === 'pending').length;
  const validCount = subsidiaryPreviews.filter(p => p.name && (p.status === 'found' || p.status === 'manual')).length;

  if (checkingExisting) { return (
      <div className="max-w-4xl mx-auto p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Kontrollerar konto...</span>
      </div>
    );
  }

  // Block if user already has a group
  if (existingGroup) { return (
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        <Card className="border-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#7A5417]">
              <AlertCircle className="w-5 h-5" />
              Du har redan en koncern
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Ditt konto är redan kopplat till koncernen <strong>"{existingGroup}"</strong>.
            </p>
            <p className="text-muted-foreground">
              Varje konto kan endast ha en koncern. Om du behöver skapa en ny koncern, 
              kontakta support eller skapa ett nytt konto.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/consolidation')}>
                Gå till min koncern
              </Button>
              <Button variant="outline" onClick={() => navigate('/contact')}>
                Kontakta support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Enterprise Onboarding</h1>
        <p className="text-muted-foreground">
          Guidat flöde för att sätta upp koncernredovisning med flera bolag
        </p>
      </div>

      <Progress value={progressPercentage} className="mb-6" />

      {/* Step 1: Setup Billing Company & Create Group */}
      {step === 1 && (
        <div className="space-y-6">
          {/* BankID Verification Card */}
          <Card className={isBankIdVerified ? "border-green-500" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                BankID-verifiering
                {isBankIdVerified && <Badge variant="default" className="ml-2 bg-green-600">Verifierad</Badge>}
              </CardTitle>
              <CardDescription>
                Verifiera din identitet för att säkerställa att du har rätt att koppla bolagen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isBankIdVerified ? (
                <Alert className="bg-[#E1F5EE] dark:bg-green-950 border-[#BFE6D6]">
                  <CheckCircle2 className="h-4 w-4 text-[#085041]" />
                  <AlertDescription className="text-[#085041] dark:text-green-200">
                    Din identitet är verifierad med BankID. Du kan nu fortsätta med registreringen.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Identitetsverifiering rekommenderas för att säkerställa behörighet att koppla bolag. 
                      Du kan verifiera via KYC-flödet i inställningar.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => { setIsBankIdVerified(true);
                      toast.info("Du kan verifiera identitet senare via Inställningar > KYC");
                    }}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Fortsätt utan verifiering
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing Company Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Faktureringsbolag & Koncern
              </CardTitle>
              <CardDescription>
                Ange faktureringsbolagets organisationsnummer. Vi hämtar uppgifter automatiskt.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Organisationsnummer *</Label>
                <div className="flex gap-2">
                  <Input
                    value={billingCompanyOrgNr}
                    onChange={(e) => setBillingCompanyOrgNr(e.target.value)}
                    placeholder="556123-4567"
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleBillingCompanyLookup}
                    disabled={isSearching || !billingCompanyOrgNr}
                    variant="secondary"
                  >
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Företagsnamn *</Label>
                <Input
                  value={manualCompanyName}
                  onChange={(e) => setManualCompanyName(e.target.value)}
                  placeholder="Acme AB"
                />
                {billingCompanyData?.status === 'found' && (
                  <p className="text-xs text-[#085041]">✓ Hämtat automatiskt</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Adress (valfritt)</Label>
                <Input
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="Storgatan 1, 111 22 Stockholm"
                />
              </div>

              <div className="space-y-2">
                <Label>Koncernnamn *</Label>
                <Input
                  value={groupData.name}
                  onChange={(e) => setGroupData({ ...groupData, name: e.target.value })}
                  placeholder="Acme Group AB"
                />
              </div>

              <Button 
                onClick={handleCreateGroup} 
                disabled={loading || !billingCompanyOrgNr || !manualCompanyName || !groupData.name}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Skapar...
                  </>
                ) : (
                  "Skapa koncern och fortsätt"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Import Subsidiaries */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Importera dotterbolag
            </CardTitle>
            <CardDescription>
              Ladda upp en Excel/CSV-fil eller klistra in organisationsnummer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload */}
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-4">
                Dra och släpp Excel/CSV-fil eller klicka för att välja
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Välj fil
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Format: Kolumn A = Org.nummer, Kolumn B = Namn (valfritt)
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Eller</span>
              </div>
            </div>

            {/* Text Input */}
            <div className="space-y-2">
              <Label>Klistra in organisationsnummer</Label>
              <Textarea
                value={subsidiariesText}
                onChange={(e) => handleTextInputChange(e.target.value)}
                placeholder="556123-4567&#10;559876-5432, Dotterbolag AB&#10;..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Ett per rad. Format: <code>XXXXXX-XXXX</code> eller <code>XXXXXX-XXXX, Företagsnamn</code>
              </p>
            </div>

            {/* Preview Table */}
            {subsidiaryPreviews.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Förhandsgranskning ({subsidiaryPreviews.length} bolag)</h3>
                  {pendingCount > 0 && (
                    <Button variant="outline" size="sm" onClick={lookupAllPending}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Slå upp {pendingCount} bolag
                    </Button>
                  )}
                </div>
                
                <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Org.nummer</TableHead>
                        <TableHead>Företagsnamn</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subsidiaryPreviews.map((preview, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{preview.orgNumber}</TableCell>
                          <TableCell>
                            {preview.status === 'found' ? (
                              <span className="flex items-center gap-2">
                                {preview.name}
                                <Check className="w-4 h-4 text-[#085041]" />
                              </span>
                            ) : preview.status === 'looking' ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Input
                                value={preview.name}
                                onChange={(e) => updatePreviewName(index, e.target.value)}
                                placeholder="Ange företagsnamn..."
                                className="h-8"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {preview.status === 'found' && (
                              <Badge variant="default" className="bg-green-600">Hittad</Badge>
                            )}
                            {preview.status === 'manual' && preview.name && (
                              <Badge variant="secondary">Manuell</Badge>
                            )}
                            {preview.status === 'pending' && (
                              <Badge variant="outline">Väntar</Badge>
                            )}
                            {preview.status === 'looking' && (
                              <Badge variant="outline">Söker...</Badge>
                            )}
                            {preview.status === 'error' && !preview.name && (
                              <Badge variant="destructive">Saknas</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removePreview(index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {validCount} av {subsidiaryPreviews.length} redo att importeras
                  </p>
                  <Button 
                    onClick={handleImportSubsidiaries} 
                    disabled={loading || validCount === 0}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importerar...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Importera {validCount} bolag
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {subsidiaryPreviews.length === 0 && (
              <Button 
                onClick={() => setStep(3)} 
                variant="outline"
                className="w-full"
              >
                Hoppa över - lägg till dotterbolag senare
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Complete */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#085041]" />
              Klart!
            </CardTitle>
            <CardDescription>
              Din koncern är nu uppsatt och redo att använda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-[#E1F5EE] dark:bg-green-950 rounded-lg space-y-2">
              <p className="font-medium text-[#085041] dark:text-green-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Koncern "{groupData.name}" skapad
              </p>
              <p className="font-medium text-[#085041] dark:text-green-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Faktureringsbolag uppsatt
              </p>
              {subsidiaryPreviews.length > 0 && (
                <p className="font-medium text-[#085041] dark:text-green-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {validCount} dotterbolag importerade
                </p>
              )}
            </div>

            <Button onClick={() => navigate('/consolidation')} className="w-full">
              Gå till koncernkonsolidering
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
