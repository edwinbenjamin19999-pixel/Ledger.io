import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, RefreshCw, Info, Scale } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface TaxRule { id: string;
  year: number;
  rule_type: string;
  municipality: string | null;
  rate: number | null;
  threshold_min: number | null;
  threshold_max: number | null;
  formula_a: number | null;
  formula_b: number | null;
  effective_from: string;
  effective_until: string | null;
  notes: string | null;
}

export default function TaxRules() { const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => { if (!user) { navigate("/auth");
      return;
    }
    loadTaxRules();
  }, [user, navigate, currentYear]);

  const loadTaxRules = async () => { try { setLoading(true);
      const { data, error } = await supabase
        .from("tax_rules")
        .select("*")
        .eq("year", currentYear)
        .order("rule_type", { ascending: true })
        .order("municipality", { ascending: true });

      if (error) throw error;
      setTaxRules((data || []) as unknown as TaxRule[]);
    } catch (error: any) { console.error("Error loading tax rules:", error);
      toast.error("Kunde inte ladda skatteregler");
    } finally { setLoading(false);
    }
  };

  const formatRate = (rate: number | null) => { if (!rate) return "-";
    return `${(rate * 100).toFixed(2)}%`;
  };

  const formatAmount = (amount: number | null) => { if (!amount) return "-";
    return `${amount.toLocaleString("sv-SE")} kr`;
  };

  const getRuleTypeDisplay = (ruleType: string) => { if (ruleType === 'basic_allowance') return 'Grundavdrag';
    if (ruleType === 'state_tax') return 'Statlig skatt';
    if (ruleType === 'social_fees') return 'Arbetsgivaravgifter';
    if (ruleType === 'municipal_tax') return 'Kommunalskatt';
    if (ruleType.startsWith('tax_table_')) return `Skattetabell ${ruleType.replace('tax_table_', '')}`;
    return ruleType;
  };

  const basicAllowanceRules = taxRules.filter(r => r.rule_type === 'basic_allowance');
  const stateTaxRules = taxRules.filter(r => r.rule_type === 'state_tax');
  const socialFeesRules = taxRules.filter(r => r.rule_type === 'social_fees');
  const municipalTaxRules = taxRules.filter(r => r.rule_type === 'municipal_tax');
  const taxTableRules = taxRules.filter(r => r.rule_type.startsWith('tax_table_'));

  if (loading) { return (
      <div>
<div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon={Scale}
        title="Skatteregler"
        subtitle={`Automatiskt uppdaterade skatteregler för ${currentYear}`}
        actions={ <div className="flex gap-2">
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value))}
              className="px-4 py-2 border rounded-xl bg-background text-sm"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
            <Button onClick={loadTaxRules} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Uppdatera
            </Button>
          </div>
        }
      />
      <div className="px-8 space-y-6">

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Om automatiska skatteregler</AlertTitle>
          <AlertDescription>
            Skatteberäkningar hämtar automatiskt data från denna databas. När Skatteverket publicerar nya regler för nästa år,
            kan du lägga till dem här så uppdateras alla beräkningar automatiskt utan kodändringar.
            <br /><br />
            <strong>Nuvarande status:</strong> Systemet använder {currentYear} års regler för alla skatteberäkningar.
            Lön- och skatteberäkningar sker i realtid baserat på dessa regler.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="municipal" className="space-y-4">
          <TabsList>
            <TabsTrigger value="municipal">Kommunalskatt ({municipalTaxRules.length})</TabsTrigger>
            <TabsTrigger value="basic">Grundavdrag</TabsTrigger>
            <TabsTrigger value="state">Statlig skatt</TabsTrigger>
            <TabsTrigger value="social">Arbetsgivaravgifter</TabsTrigger>
            <TabsTrigger value="tables">Skattetabeller ({taxTableRules.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="municipal">
            <Card>
              <CardHeader>
                <CardTitle>Kommunalskatt {currentYear}</CardTitle>
                <CardDescription>
                  Kommunal skattesats inkl. landsting/region för olika kommuner
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kommun</TableHead>
                      <TableHead>Skattesats</TableHead>
                      <TableHead>Giltigt från</TableHead>
                      <TableHead>Anteckningar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {municipalTaxRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium capitalize">
                          {rule.municipality}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{formatRate(rule.rate)}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(rule.effective_from).toLocaleDateString("sv-SE")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {rule.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Grundavdrag {currentYear}</CardTitle>
                <CardDescription>
                  Grundavdrag beräknas som: {basicAllowanceRules.find(r => r.formula_a)?.formula_a || 15300} kr + { (basicAllowanceRules.find(r => r.formula_b)?.formula_b || 0.293) * 100
                  }% av inkomst, max {formatAmount(basicAllowanceRules.find(r => r.rate)?.rate || null)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Typ</TableHead>
                      <TableHead>Belopp/Procent</TableHead>
                      <TableHead>Tröskel min</TableHead>
                      <TableHead>Tröskel max</TableHead>
                      <TableHead>Anteckningar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {basicAllowanceRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          {rule.formula_a ? "Formel" : "Max grundavdrag"}
                        </TableCell>
                        <TableCell>
                          {rule.formula_a && rule.formula_b ? (
                            <span>
                              {formatAmount(rule.formula_a)} + {formatRate(rule.formula_b)}
                            </span>
                          ) : (
                            formatAmount(rule.rate)
                          )}
                        </TableCell>
                        <TableCell>{formatAmount(rule.threshold_min)}</TableCell>
                        <TableCell>{formatAmount(rule.threshold_max)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {rule.notes}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="state">
            <Card>
              <CardHeader>
                <CardTitle>Statlig inkomstskatt {currentYear}</CardTitle>
                <CardDescription>
                  Statlig skatt på inkomst över tröskelvärdet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Skattesats</TableHead>
                      <TableHead>Tröskel</TableHead>
                      <TableHead>Giltigt från</TableHead>
                      <TableHead>Anteckningar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stateTaxRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <Badge variant="secondary">{formatRate(rule.rate)}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatAmount(rule.threshold_min)}
                        </TableCell>
                        <TableCell>
                          {new Date(rule.effective_from).toLocaleDateString("sv-SE")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {rule.notes}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social">
            <Card>
              <CardHeader>
                <CardTitle>Arbetsgivaravgifter {currentYear}</CardTitle>
                <CardDescription>
                  Sociala avgifter för arbetsgivare
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Avgiftssats</TableHead>
                      <TableHead>Giltigt från</TableHead>
                      <TableHead>Anteckningar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {socialFeesRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <Badge variant="secondary">{formatRate(rule.rate)}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(rule.effective_from).toLocaleDateString("sv-SE")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {rule.notes}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tables">
            <Card>
              <CardHeader>
                <CardTitle>Skattetabeller {currentYear}</CardTitle>
                <CardDescription>
                  Tröskelvärden för olika skattetabeller (30-36 för under 65 år, 37-40 för pensionärer)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tabell</TableHead>
                      <TableHead>Årsinkomst från</TableHead>
                      <TableHead>Årsinkomst till</TableHead>
                      <TableHead>Anteckningar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxTableRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">
                          {getRuleTypeDisplay(rule.rule_type)}
                        </TableCell>
                        <TableCell>{formatAmount(rule.threshold_min)}</TableCell>
                        <TableCell>
                          {rule.threshold_max ? formatAmount(rule.threshold_max) : "Ingen gräns"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {rule.notes}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Så fungerar automatiska uppdateringar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Automatisk skatteberäkning</h3>
              <p className="text-sm text-muted-foreground">
                När du skapar en lönekörning hämtar systemet automatiskt:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>Grundavdrag baserat på årets regler</li>
                <li>Kommunalskatt för den anställdes kommun</li>
                <li>Statlig skatt vid inkomst över tröskeln</li>
                <li>Arbetsgivaravgifter enligt aktuell procentsats</li>
                <li>Korrekt skattetabell baserat på ålder och inkomst</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Uppdatera till nya skatteregler</h3>
              <p className="text-sm text-muted-foreground">
                När Skatteverket publicerar nya regler (t.ex. för 2026):
              </p>
              <ol className="list-decimal list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>Kontakta support eller öppna databasen</li>
                <li>Lägg till nya rader i tax_rules-tabellen med year=2026</li>
                <li>Från och med 2026-01-01 används automatiskt de nya reglerna</li>
                <li>Ingen kodändring krävs - allt uppdateras automatiskt!</li>
              </ol>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Viktigt att veta</AlertTitle>
              <AlertDescription>
                Systemet använder alltid det aktuella årets skatteregler baserat på datorns datum.
                Gamla lönekörningar påverkas inte - de behåller sina ursprungliga beräkningar.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
