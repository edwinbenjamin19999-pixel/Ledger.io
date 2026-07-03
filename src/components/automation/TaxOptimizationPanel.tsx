import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, Loader2, Sparkles, TrendingDown, ShieldCheck,
  AlertTriangle, CheckCircle, Play, ChevronDown, BookOpen,
  ArrowRight, Info, Check
} from "lucide-react";

interface TaxOptimizationPanelProps { companyId: string;
}

interface Optimization { type: string;
  title: string;
  description: string;
  estimated_tax_savings: number;
  amount_to_allocate: number;
  risk_level: string;
  legal_reference: string;
  auto_applicable: boolean;
  debit_account?: string;
  debit_account_name?: string;
  credit_account?: string;
  credit_account_name?: string;
}

interface TaxResult { fiscal_year: number;
  financials: { total_revenue: number;
    gross_profit: number;
    operating_profit: number;
    depreciation: number;
    profit_before_tax: number;
  };
  tax_calculation: { corporate_tax_rate: number;
    standard_tax: number;
    net_profit_standard: number;
    optimized_tax: number;
    optimized_net_profit: number;
    total_potential_savings: number;
  };
  optimizations: Optimization[];
  ai_summary: string;
  ai_powered: boolean;
}

// Known booking templates för auto-applicable optimizations
const BOOKING_TEMPLATES: Record<string, { debit: string; debitName: string; credit: string; creditName: string }> = { periodiseringsfond: { debit: "8811", debitName: "Avsättning till periodiseringsfond", credit: "2128", creditName: "Periodiseringsfond" },
  overavskrivning: { debit: "8850", debitName: "Förändring överavskrivningar", credit: "2150", creditName: "Ackumulerade överavskrivningar" },
  avsattning: { debit: "6390", debitName: "Övriga kostnader", credit: "2290", creditName: "Övriga avsättningar" },
};

// Step-by-step guides för manual optimizations
const MANUAL_GUIDES: Record<string, string[]> = { koncernbidrag: [
    "Säkerställ att båda bolagen ingår i samma koncern (>90% ägande)",
    "Beräkna optimalt koncernbidragsbelopp baserat på resultatskillnaden",
    "Upprätta koncernbidragsavtal mellan bolagen",
    "Besluta om koncernbidraget på bolagsstämman i båda bolagen",
    "Bokför: Dr 8830 Lämnade koncernbidrag / Kr 1660 Koncernfordringar (givande bolag)",
    "Bokför: Dr 1660 Koncernfordringar / Kr 8820 Erhållna koncernbidrag (mottagande bolag)",
    "Inkludera i inkomstdeklaration (INK2) för båda bolagen",
  ],
  forskningsavdrag: [
    "Identifiera kvalificerande FoU-kostnader (löner, material, konsulter)",
    "Dokumentera FoU-projekt med tydlig innovationskomponent",
    "Beräkna underlag: max 450 000 kr/år i nedsättning av arbetsgivaravgifter",
    "Ansök via Skatteverkets e-tjänst vid AGI-inlämning",
    "Ange reducerade arbetsgivaravgifter i ruta 497 på individuppgiften",
  ],
  overavskrivning: [
    "Kontrollera bokfört värde på inventarier vid räkenskapsårets ingång",
    "Beräkna maximal avskrivning enligt 30-regeln (30% av ingående värde)",
    "Alternativt: Använd 20-regeln (restvärde = 80% av anskaffningsvärde år 1, osv.)",
    "Jämför med planenlig avskrivning — mellanskillnaden = överavskrivning",
    "Bokför: Dr 8850 Förändring överavskrivningar / Kr 2150 Ack. överavskrivningar",
    "Notera: Kräver att bokföringen görs med räkenskapsenlig avskrivning",
  ],
  annat: [
    "Analysera förslaget noggrant med hänsyn till er specifika situation",
    "Konsultera auktoriserad revisor innan implementering",
    "Dokumentera beslutet och den skattemässiga grunden",
    "Säkerställ att bokföringen görs korrekt enligt BAS-kontoplanen",
  ],
};

const formatSEK = (amount: number) =>
  amount.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' kr';

const riskBadge = (level: string) => { switch (level) { case 'low': return <Badge variant="secondary" className="text-xs">Låg risk</Badge>;
    case 'medium': return <Badge variant="outline" className="text-xs border-accent-foreground/30">Medel risk</Badge>;
    case 'high': return <Badge variant="destructive" className="text-xs">Hög risk</Badge>;
    default: return null;
  }
};

export const TaxOptimizationPanel = ({ companyId }: TaxOptimizationPanelProps) => { const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TaxResult | null>(null);
  const [implementing, setImplementing] = useState<string | null>(null);
  const [implemented, setImplemented] = useState<Set<string>>(new Set());
  const [expandedGuides, setExpandedGuides] = useState<Set<number>>(new Set());

  const currentYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(currentYear - 1);

  const handleCalculate = async () => { setLoading(true);
    setResult(null);
    setImplemented(new Set());
    try { const { data, error } = await supabase.functions.invoke('calculate-corporate-tax', { body: { company_id: companyId, fiscal_year: fiscalYear },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setResult(data);
      toast({ title: "Skatteberäkning klar!", description: data.ai_powered ? "AI-optimering inkluderad" : "Regelbaserad beräkning" });
    } catch (error) { console.error('Tax calc error:', error);
      toast({ title: "Fel", description: error instanceof Error ? error.message : "Kunde inte beräkna skatt", variant: "destructive" });
    } finally { setLoading(false);
    }
  };

  const handleImplement = async (opt: Optimization, index: number) => { const key = `${opt.type}-${index}`;
    setImplementing(key);

    try { // Resolve accounts
      const template = BOOKING_TEMPLATES[opt.type];
      const debitAccount = opt.debit_account || template?.debit;
      const debitAccountName = opt.debit_account_name || template?.debitName || opt.title;
      const creditAccount = opt.credit_account || template?.credit;
      const creditAccountName = opt.credit_account_name || template?.creditName || opt.title;

      if (!debitAccount || !creditAccount) { throw new Error("Bokföringskontonummer saknas för denna optimering");
      }

      const amount = opt.amount_to_allocate;
      if (amount <= 0) throw new Error("Belopp saknas");

      // Ensure accounts exist in chart_of_accounts
      for (const acc of [
        { number: debitAccount, name: debitAccountName, type: debitAccount.startsWith('8') ? 'expense' : 'expense' },
        { number: creditAccount, name: creditAccountName, type: creditAccount.startsWith('2') ? 'liability' : 'liability' },
      ]) { const { data: existing } = await supabase
          .from('chart_of_accounts')
          .select('id')
          .eq('company_id', companyId)
          .eq('account_number', acc.number)
          .maybeSingle();

        if (!existing) { await supabase.from('chart_of_accounts').insert({ company_id: companyId,
            account_number: acc.number,
            account_name: acc.name,
            account_type: acc.type,
            is_active: true,
          });
        }
      }

      // Get account IDs
      const { data: debitAcc } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('company_id', companyId)
        .eq('account_number', debitAccount)
        .maybeSingle();

      const { data: creditAcc } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('company_id', companyId)
        .eq('account_number', creditAccount)
        .maybeSingle();

      if (!debitAcc || !creditAcc) throw new Error("Kunde inte hitta konton");

      // Create journal entry as draft
      const entryDate = `${fiscalYear}-12-31`;
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({ company_id: companyId,
          entry_date: entryDate,
          description: `${opt.title} — AI-optimering ${fiscalYear}`,
          status: 'draft',
          created_by: (await supabase.auth.getUser()).data.user?.id || '',
        })
        .select('id')
        .maybeSingle();

      if (entryError || !entry) throw entryError || new Error("Kunde inte skapa verifikation");

      // Create lines
      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert([
          { journal_entry_id: entry.id,
            account_id: debitAcc.id,
            debit: amount,
            credit: 0,
            description: `${opt.title} (debet)`,
          },
          { journal_entry_id: entry.id,
            account_id: creditAcc.id,
            debit: 0,
            credit: amount,
            description: `${opt.title} (kredit)`,
          },
        ]);

      if (linesError) throw linesError;

      setImplemented(prev => new Set(prev).add(key));
      toast({ title: "✅ Verifikation skapad!",
        description: `${opt.title}: Dr ${debitAccount} / Kr ${creditAccount} — ${formatSEK(amount)}. Verifikationen är sparad som utkast för granskning.`,
      });
    } catch (error) { console.error('Implement error:', error);
      toast({ title: "Kunde inte implementera",
        description: error instanceof Error ? error.message : "Okänt fel",
        variant: "destructive",
      });
    } finally { setImplementing(null);
    }
  };

  const toggleGuide = (index: number) => { setExpandedGuides(prev => { const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const getGuideSteps = (opt: Optimization): string[] => { return MANUAL_GUIDES[opt.type] || MANUAL_GUIDES['annat'] || [];
  };

  const getBookingInfo = (opt: Optimization) => { const template = BOOKING_TEMPLATES[opt.type];
    return { debit: opt.debit_account || template?.debit,
      debitName: opt.debit_account_name || template?.debitName,
      credit: opt.credit_account || template?.credit,
      creditName: opt.credit_account_name || template?.creditName,
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Skatteberäkning & AI-optimering
          <Badge variant="secondary" className="ml-auto text-xs"><Sparkles className="w-3 h-3 mr-1 inline" />AI</Badge>
        </CardTitle>
        <CardDescription>
          Beräknar bolagsskatt (20.6%) och använder AI för att identifiera optimeringsmöjligheter
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Räkenskapsår</label>
            <Select value={String(fiscalYear)} onValueChange={(v) => { setFiscalYear(parseInt(v)); setResult(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={String(currentYear - 1)}>{currentYear - 1}</SelectItem>
                <SelectItem value={String(currentYear - 2)}>{currentYear - 2}</SelectItem>
                <SelectItem value={String(currentYear - 3)}>{currentYear - 3}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleCalculate} disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Beräknar...</> : <><Sparkles className="w-4 h-4 mr-2" />Beräkna & optimera</>}
            </Button>
          </div>
        </div>

        {result && (
          <div className="space-y-4 pt-2">
            {/* Financial summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Omsättning</p>
                <p className="text-lg font-semibold">{formatSEK(result.financials.total_revenue)}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Resultat före skatt</p>
                <p className="text-lg font-semibold">{formatSEK(result.financials.profit_before_tax)}</p>
              </div>
            </div>

            {/* Tax comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border rounded-lg">
                <p className="text-xs text-muted-foreground">Utan optimering</p>
                <p className="text-lg font-semibold">{formatSEK(result.tax_calculation.standard_tax)}</p>
                <p className="text-xs text-muted-foreground">Netto: {formatSEK(result.tax_calculation.net_profit_standard)}</p>
              </div>
              <div className="p-3 border border-primary/30 bg-primary/5 rounded-lg">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="w-3 h-3" />Med optimering</p>
                <p className="text-lg font-semibold text-primary">{formatSEK(result.tax_calculation.optimized_tax)}</p>
                <p className="text-xs text-muted-foreground">Netto: {formatSEK(result.tax_calculation.optimized_net_profit)}</p>
              </div>
            </div>

            {result.tax_calculation.total_potential_savings > 0 && (
              <div className="p-3 bg-accent rounded-lg text-center">
                <p className="text-sm font-medium">Potentiell skattebesparing</p>
                <p className="text-2xl font-bold text-primary">{formatSEK(result.tax_calculation.total_potential_savings)}</p>
              </div>
            )}

            {/* AI summary */}
            {result.ai_summary && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" />AI-analys</p>
                <p className="text-sm text-muted-foreground">{result.ai_summary}</p>
              </div>
            )}

            {/* Optimizations */}
            {result.optimizations.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Optimeringsförslag ({result.optimizations.length})</h4>
                {result.optimizations.map((opt, i) => { const key = `${opt.type}-${i}`;
                  const isImplemented = implemented.has(key);
                  const isImplementing = implementing === key;
                  const canAutoImplement = opt.auto_applicable && (BOOKING_TEMPLATES[opt.type] || (opt.debit_account && opt.credit_account));
                  const booking = getBookingInfo(opt);
                  const guideSteps = getGuideSteps(opt);
                  const isGuideOpen = expandedGuides.has(i);

                  return (
                    <div key={i} className="border rounded-lg overflow-hidden">
                      {/* Header */}
                      <div className="p-3 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {isImplemented ? (
                              <Check className="w-4 h-4 text-[#085041] shrink-0" />
                            ) : canAutoImplement ? (
                              <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                            ) : (
                              <Info className="w-4 h-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="text-sm font-medium">{opt.title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {riskBadge(opt.risk_level)}
                            <Badge variant="outline" className="text-xs">-{formatSEK(opt.estimated_tax_savings)}</Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground pl-6">{opt.description}</p>
                        <div className="flex items-center gap-3 pl-6 text-xs text-muted-foreground">
                          <span><ShieldCheck className="w-3 h-3 inline mr-1" />{opt.legal_reference}</span>
                          {opt.amount_to_allocate > 0 && <span>Belopp: {formatSEK(opt.amount_to_allocate)}</span>}
                        </div>

                        {/* Booking preview */}
                        {booking.debit && booking.credit && (
                          <div className="ml-6 mt-2 flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5 font-mono">
                            <BookOpen className="w-3 h-3 shrink-0 text-muted-foreground" />
                            <span>Dr {booking.debit} {booking.debitName}</span>
                            <ArrowRight className="w-3 h-3 shrink-0 text-muted-foreground" />
                            <span>Kr {booking.credit} {booking.creditName}</span>
                            <span className="ml-auto font-semibold">{formatSEK(opt.amount_to_allocate)}</span>
                          </div>
                        )}
                      </div>

                      {/* Action area */}
                      <div className="px-3 pb-3">
                        {canAutoImplement ? (
                          <div className="ml-6">
                            {isImplemented ? (
                              <Alert className="bg-accent border-primary/20">
                                <Check className="h-4 w-4 text-primary" />
                                <AlertDescription className="text-xs">
                                  Verifikation skapad som utkast — granska och godkänn under Huvudbok.
                                </AlertDescription>
                              </Alert>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleImplement(opt, i)}
                                disabled={isImplementing}
                                className="w-full"
                              >
                                {isImplementing ? (
                                  <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Skapar verifikation...</>
                                ) : (
                                  <><Play className="w-3 h-3 mr-2" />Implementera — skapa verifikation</>
                                )}
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="ml-6">
                            <Collapsible open={isGuideOpen} onOpenChange={() => toggleGuide(i)}>
                              <CollapsibleTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full justify-between">
                                  <span className="flex items-center gap-2">
                                    <BookOpen className="w-3 h-3" />
                                    Så här gör du — steg-för-steg
                                  </span>
                                  <ChevronDown className={`w-3 h-3 transition-transform ${isGuideOpen ? 'rotate-180' : ''}`} />
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="mt-2 space-y-1.5">
                                  {guideSteps.map((step, si) => (
                                    <div key={si} className="flex items-start gap-2 text-xs">
                                      <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold mt-0.5">
                                        {si + 1}
                                      </span>
                                      <span className="text-muted-foreground">{step}</span>
                                    </div>
                                  ))}
                                  <Alert className="mt-2">
                                    <Info className="h-3 w-3" />
                                    <AlertDescription className="text-xs">
                                      Behöver du hjälp? Fråga AI-assistenten för personlig vägledning baserat på ditt bolags siffror.
                                    </AlertDescription>
                                  </Alert>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {result.ai_powered && (
              <p className="text-xs text-muted-foreground text-center">
                ✨ Optimeringar föreslagna av AI – verifikationer skapas som utkast för granskning
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
