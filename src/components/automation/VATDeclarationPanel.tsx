import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, Loader2, CheckCircle2, Download, Send,
  FileText, AlertTriangle, Shield, ArrowRight, Info
} from "lucide-react";

interface VATDeclarationPanelProps { companyId: string;
  onTaskCreated: () => void;
  environment?: string;
}

interface VATSummary { period: string;
  declaration_id: string;
  sales_25: number;
  sales_12: number;
  sales_6: number;
  sales_0: number;
  output_vat_25: number;
  output_vat_12: number;
  output_vat_6: number;
  input_vat: number;
  vat_to_pay: number;
  eu_sales: number;
  eu_purchases: number;
}

const formatSEK = (n: number) => Math.round(n).toLocaleString('sv-SE') + ' kr';

export const VATDeclarationPanel = ({ companyId, onTaskCreated, environment }: VATDeclarationPanelProps) => { const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly'>('monthly');
  const [vatSummary, setVatSummary] = useState<VATSummary | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth > 1 ? currentMonth - 1 : 12);
  const [quarter, setQuarter] = useState(Math.ceil(currentMonth / 3));

  const handlePrepare = async () => { setLoading(true);
    setVatSummary(null);
    setSubmitted(false);
    try { const body: any = { company_id: companyId,
        period_year: year,
        period_type: periodType,
      };

      if (periodType === 'monthly') body.period_month = month;
      else body.period_quarter = quarter;

      const { data, error } = await supabase.functions.invoke('calculate-vat', { body: { ...body, environment } });
      if (error) throw error;

      const summary: VATSummary = { period: data.summary.period,
        declaration_id: data.declaration_id || data.summary.declaration_id,
        sales_25: data.summary.sales_25_percent || 0,
        sales_12: data.summary.sales_12_percent || 0,
        sales_6: data.summary.sales_6_percent || 0,
        sales_0: data.summary.sales_0_percent || 0,
        output_vat_25: data.summary.output_vat_25 || 0,
        output_vat_12: data.summary.output_vat_12 || 0,
        output_vat_6: data.summary.output_vat_6 || 0,
        input_vat: data.summary.input_vat || 0,
        vat_to_pay: data.summary.vat_to_pay || 0,
        eu_sales: data.summary.eu_sales || 0,
        eu_purchases: data.summary.eu_purchases || 0,
      };

      setVatSummary(summary);
      setLoading(false);

      // Auto-submit immediately after calculation
      if (summary.declaration_id) { setSubmitting(true);
        try { const { data: submitData, error: submitError } = await supabase.functions.invoke('submit-vat-declaration', { body: { declaration_id: summary.declaration_id, environment },
          });

          if (submitError) throw submitError;
          if (submitData.error) throw new Error(submitData.error);

          setSubmitted(true);
          toast({ title: "✅ Momsdeklaration inskickad!",
            description: `Period: ${summary.period}. Moms att ${summary.vat_to_pay >= 0 ? 'betala' : 'få tillbaka'}: ${formatSEK(Math.abs(summary.vat_to_pay))}. Ref: ${submitData.reference}`,
          });
        } catch (submitErr: any) { console.error('Auto-submit error:', submitErr);
          toast({ title: "Beräkning klar — manuell inlämning",
            description: `Momsberäkningen lyckades. Skicka in manuellt eller ladda ner SRU-fil.`,
            variant: "destructive",
          });
        } finally { setSubmitting(false);
        }
      }

      onTaskCreated();
    } catch (error) { console.error('Error preparing VAT:', error);
      toast({ title: "Fel", description: error instanceof Error ? error.message : "Kunde inte förbereda momsdeklaration", variant: "destructive" });
      setLoading(false);
    }
  };

  const generateSRU = (): string => { if (!vatSummary) return '';

    // Fetch org number from company (already in context via companyId)
    // SRU format according to Skatteverket specification
    const lines = [
      '#DATABAS',
      '#PROGRAM Bokfy 1.0',
      `#FILTYP BLANKETTER`,
      `#MEDESSION 0`,
      '#UPPGIFT 1',
      '', // org number will be populated
      '#BLANKETTNAMN SKV4700',
      `#UPPGIFT 7001 ${Math.round(vatSummary.sales_25)}`, // Ruta 05 - Försäljning 25%
      `#UPPGIFT 7002 ${Math.round(vatSummary.sales_12)}`, // Ruta 06 - Försäljning 12%
      `#UPPGIFT 7003 ${Math.round(vatSummary.sales_6)}`,  // Ruta 07 - Försäljning 6%
      `#UPPGIFT 7004 ${Math.round(vatSummary.sales_0)}`,  // Ruta 08 - Momsfri försäljning
      `#UPPGIFT 7005 ${Math.round(vatSummary.eu_sales)}`, // Ruta 35 - EU-försäljning
      `#UPPGIFT 7006 ${Math.round(vatSummary.eu_purchases)}`, // Ruta 36 - EU-inköp
      `#UPPGIFT 7010 ${Math.round(vatSummary.output_vat_25)}`, // Ruta 10 - Utg moms 25%
      `#UPPGIFT 7011 ${Math.round(vatSummary.output_vat_12)}`, // Ruta 11 - Utg moms 12%
      `#UPPGIFT 7012 ${Math.round(vatSummary.output_vat_6)}`,  // Ruta 12 - Utg moms 6%
      `#UPPGIFT 7048 ${Math.round(vatSummary.input_vat)}`,     // Ruta 48 - Ingående moms
      `#UPPGIFT 7049 ${Math.round(vatSummary.vat_to_pay)}`,    // Ruta 49 - Moms att betala
      '#UPPGIFT 7999 1', // End marker
    ];

    return lines.join('\n');
  };

  const handleExportSRU = async () => { if (!vatSummary) return;
    setExporting(true);

    try { // Get company org number för the SRU file
      const { data: company } = await supabase
        .from('companies')
        .select('org_number, name')
        .eq('id', companyId)
        .maybeSingle();

      const orgNum = company?.org_number?.replace('-', '') || '0000000000';

      const sruContent = generateSRU().replace('#UPPGIFT 1', `#UPPGIFT 1 ${orgNum}`);

      // Download as file
      const blob = new Blob([sruContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `momsdeklaration_${vatSummary.period.replace(/\s/g, '_')}.sru`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "SRU-fil nedladdad!",
        description: "Ladda upp filen på Skatteverkets e-tjänst (skatteverket.se) för att skicka in momsdeklarationen.",
      });
    } catch (error) { console.error('SRU export error:', error);
      toast({ title: "Fel", description: "Kunde inte generera SRU-fil", variant: "destructive" });
    } finally { setExporting(false);
    }
  };

  const handleSubmitAPI = async () => { if (!vatSummary?.declaration_id) return;
    setSubmitting(true);

    try { const { data, error } = await supabase.functions.invoke('submit-vat-declaration', { body: { declaration_id: vatSummary.declaration_id },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setSubmitted(true);
      toast({ title: "✅ Momsdeklaration inskickad!",
        description: `Referensnr: ${data.reference}. Skatteverket har mottagit deklarationen.`,
      });

      onTaskCreated();
    } catch (error: any) { console.error('Submit error:', error);
      const msg = error?.message || '';
      if (msg.includes('OAuth') || msg.includes('token') || msg.includes('Unauthorized')) { toast({ title: "Skatteverket-koppling saknas",
          description: "För automatisk inlämning behöver du koppla Skatteverkets e-tjänst. Använd SRU-export som alternativ.",
          variant: "destructive",
        });
      } else { toast({ title: "Kunde inte skicka in", description: msg || "Okänt fel", variant: "destructive" });
      }
    } finally { setSubmitting(false);
    }
  };

  const months = [
    { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
    { value: 3, label: 'Mars' }, { value: 4, label: 'April' },
    { value: 5, label: 'Maj' }, { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' }, { value: 8, label: 'Augusti' },
    { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  const totalOutputVat = vatSummary
    ? vatSummary.output_vat_25 + vatSummary.output_vat_12 + vatSummary.output_vat_6
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Momsdeklaration
          <Badge variant="secondary" className="ml-auto text-xs">Auto</Badge>
        </CardTitle>
        <CardDescription>
          Beräknar automatiskt moms från alla godkända verifikat och skickar in direkt till Skatteverket
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Period selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Periodtyp</label>
            <Select value={periodType} onValueChange={(v: 'monthly' | 'quarterly') => { setPeriodType(v); setVatSummary(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Månadsvis</SelectItem>
                <SelectItem value="quarterly">Kvartalsvis</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">År</label>
            <Select value={String(year)} onValueChange={(v) => { setYear(parseInt(v)); setVatSummary(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={String(currentYear)}>{currentYear}</SelectItem>
                <SelectItem value={String(currentYear - 1)}>{currentYear - 1}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {periodType === 'monthly' ? (
          <div>
            <label className="text-sm font-medium mb-2 block">Månad</label>
            <Select value={String(month)} onValueChange={(v) => { setMonth(parseInt(v)); setVatSummary(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium mb-2 block">Kvartal</label>
            <Select value={String(quarter)} onValueChange={(v) => { setQuarter(parseInt(v)); setVatSummary(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Q1 (Jan–Mar)</SelectItem>
                <SelectItem value="2">Q2 (Apr–Jun)</SelectItem>
                <SelectItem value="3">Q3 (Jul–Sep)</SelectItem>
                <SelectItem value="4">Q4 (Okt–Dec)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Single automated button */}
        <Button onClick={handlePrepare} disabled={loading || submitting} className="w-full" size="lg">
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Beräknar moms från huvudbok...</>
          ) : submitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Skickar till Skatteverket...</>
          ) : (
            <><Send className="w-4 h-4 mr-2" />Beräkna & skicka momsdeklaration</>
          )}
        </Button>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3 h-3" />
          <span>Beräknar automatiskt och skickar direkt via Skatteverkets API</span>
        </div>

        {/* VAT Summary */}
        {vatSummary && (
          <div className="space-y-4 pt-2">
            <Separator />

            <div className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Momsberäkning — {vatSummary.period}
            </div>

            {/* Skatteverket boxes */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="text-muted-foreground">Ruta 05 · Försäljning 25%</span>
                <span className="text-right font-mono">{formatSEK(vatSummary.sales_25)}</span>
                <span className="text-muted-foreground">Ruta 06 · Försäljning 12%</span>
                <span className="text-right font-mono">{formatSEK(vatSummary.sales_12)}</span>
                <span className="text-muted-foreground">Ruta 07 · Försäljning 6%</span>
                <span className="text-right font-mono">{formatSEK(vatSummary.sales_6)}</span>
                <span className="text-muted-foreground">Ruta 08 · Momsfri försäljning</span>
                <span className="text-right font-mono">{formatSEK(vatSummary.sales_0)}</span>
              </div>
              <Separator className="my-1" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="text-muted-foreground">Ruta 10 · Utg. moms 25%</span>
                <span className="text-right font-mono">{formatSEK(vatSummary.output_vat_25)}</span>
                <span className="text-muted-foreground">Ruta 11 · Utg. moms 12%</span>
                <span className="text-right font-mono">{formatSEK(vatSummary.output_vat_12)}</span>
                <span className="text-muted-foreground">Ruta 12 · Utg. moms 6%</span>
                <span className="text-right font-mono">{formatSEK(vatSummary.output_vat_6)}</span>
                <span className="font-medium">Total utgående moms</span>
                <span className="text-right font-mono font-medium">{formatSEK(totalOutputVat)}</span>
              </div>
              <Separator className="my-1" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="text-muted-foreground">Ruta 48 · Ingående moms</span>
                <span className="text-right font-mono">{formatSEK(vatSummary.input_vat)}</span>
              </div>
              <Separator className="my-1" />
              <div className="grid grid-cols-2 gap-x-4">
                <span className="font-semibold">Ruta 49 · Moms att {vatSummary.vat_to_pay >= 0 ? 'betala' : 'få tillbaka'}</span>
                <span className={`text-right font-mono font-bold text-lg ${vatSummary.vat_to_pay >= 0 ? 'text-destructive' : 'text-primary'}`}>
                  {formatSEK(Math.abs(vatSummary.vat_to_pay))}
                </span>
              </div>
            </div>

            {submitted ? (
              <Alert className="bg-accent border-primary/20">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <AlertDescription className="text-sm">
                  <span className="font-medium">Momsdeklaration inskickad!</span> Skatteverket har mottagit deklarationen.
                  Kontrollera status under Skattekonto.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {/* Fallback: manual re-submit or SRU */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSubmitAPI}
                    disabled={submitting}
                    className="text-xs"
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Skicka igen
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportSRU}
                    disabled={exporting}
                    className="text-xs h-7"
                  >
                    {exporting ? (
                      <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Exporterar...</>
                    ) : (
                      <><Download className="w-3 h-3 mr-1" />SRU-export</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Alla belopp beräknade från godkända verifikat i huvudboken. Granska noggrant före inlämning.
            </p>
          </div>
        )}

        {!vatSummary && !loading && (
          <p className="text-xs text-muted-foreground text-center">
            Systemet samlar ihop all moms från godkända verifikat och förbereder deklarationen automatiskt.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
