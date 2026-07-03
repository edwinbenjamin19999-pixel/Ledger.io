import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Loader2, CheckCircle, Code, Send, Clock, AlertCircle,
  BarChart3, Building2, ArrowRight, RefreshCw, Download, Eye, Landmark,
  Radio, History, ExternalLink, TrendingUp, TrendingDown, Target,
  ShieldCheck, Percent, Coins
} from "lucide-react";

interface AnnualReportPanelProps { companyId: string;
  onTaskCreated: () => void;
  environment?: string;
}

type StepStatus = 'idle' | 'running' | 'done' | 'error';

interface StepState { status: StepStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  details?: Record<string, any>;
}

interface StatusEvent { timestamp: Date;
  step: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'pending';
}

export const AnnualReportPanel = ({ companyId, onTaskCreated, environment }: AnnualReportPanelProps) => { const { toast } = useToast();
  const [generatedReportId, setGeneratedReportId] = useState<string | null>(null);
  const [ixbrlUrl, setIxbrlUrl] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(currentYear - 1);

  const [steps, setSteps] = useState<{ generate: StepState;
    ixbrl: StepState;
    submit: StepState;
  }>({ generate: { status: 'idle' },
    ixbrl: { status: 'idle' },
    submit: { status: 'idle' },
  });

  const [reportSummary, setReportSummary] = useState<{ total_revenue: number;
    net_profit: number;
    total_assets: number;
    total_equity: number;
  } | null>(null);

  const [submissionResult, setSubmissionResult] = useState<{ bolagsverket?: { reference?: string; status?: string; message?: string; ixbrl_url?: string; taxonomy?: string; api_status?: number };
    skatteverket?: { reference?: string; status?: string; message?: string };
  } | null>(null);

  const [statusEvents, setStatusEvents] = useState<StatusEvent[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [ixbrlTagCount, setIxbrlTagCount] = useState<number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addStatusEvent = useCallback((step: string, message: string, type: StatusEvent['type'] = 'info') => { setStatusEvents(prev => [...prev, { timestamp: new Date(), step, message, type }]);
  }, []);

  // Load existing report on mount
  useEffect(() => { loadExistingReport();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [companyId, fiscalYear]);

  const loadExistingReport = async () => { const { data } = await supabase
      .from('annual_reports')
      .select('*')
      .eq('company_id', companyId)
      .eq('fiscal_year', fiscalYear)
      .maybeSingle();

    if (data) { setGeneratedReportId(data.id);
      setReportSummary({ total_revenue: data.revenue || 0,
        net_profit: data.net_profit || 0,
        total_assets: data.total_assets || 0,
        total_equity: data.total_equity || 0,
      });

      const newSteps: { generate: StepState; ixbrl: StepState; submit: StepState } = { generate: { status: 'idle' },
        ixbrl: { status: 'idle' },
        submit: { status: 'idle' },
      };
      newSteps.generate = { status: 'done', completedAt: data.prepared_at ? new Date(data.prepared_at) : undefined };

      const notes = data.notes as Record<string, any> | null;
      if (notes?.ixbrl_tag_count) setIxbrlTagCount(notes.ixbrl_tag_count);

      if (data.pdf_url || data.bolagsverket_reference) { newSteps.ixbrl = { status: 'done' as StepStatus };
        setIxbrlUrl(data.pdf_url);
      }

      const bvStatus = data.bolagsverket_status;
      if (bvStatus === 'submitted' || bvStatus === 'ixbrl_ready' || data.bolagsverket_reference) { newSteps.submit = { status: 'done' as StepStatus };
        setSubmissionResult({ bolagsverket: { reference: data.bolagsverket_reference || undefined, status: bvStatus || undefined },
          skatteverket: { reference: data.skatteverket_reference || undefined, status: data.skatteverket_status || undefined },
        });

        // Start polling if status is not final
        if (bvStatus && !['accepted', 'rejected', 'error'].includes(bvStatus)) { startStatusPolling(data.id);
        }
      }
      setSteps(newSteps);
    } else { resetAll();
    }
  };

  const resetAll = () => { setGeneratedReportId(null);
    setIxbrlUrl(null);
    setReportSummary(null);
    setSubmissionResult(null);
    setStatusEvents([]);
    setIxbrlTagCount(null);
    if (pollingRef.current) clearInterval(pollingRef.current);
    setIsPolling(false);
    setSteps({ generate: { status: 'idle' }, ixbrl: { status: 'idle' }, submit: { status: 'idle' } });
  };

  const updateStep = (step: keyof typeof steps, update: Partial<StepState>) => { setSteps(prev => ({ ...prev, [step]: { ...prev[step], ...update } }));
  };

  const startStatusPolling = (reportId: string) => { if (pollingRef.current) clearInterval(pollingRef.current);
    setIsPolling(true);

    pollingRef.current = setInterval(async () => { const { data } = await supabase
        .from('annual_reports')
        .select('bolagsverket_status, bolagsverket_reference, skatteverket_status, skatteverket_reference')
        .eq('id', reportId)
        .maybeSingle();

      if (!data) return;

      setSubmissionResult(prev => ({ ...prev,
        bolagsverket: { ...prev?.bolagsverket,
          reference: data.bolagsverket_reference || prev?.bolagsverket?.reference,
          status: data.bolagsverket_status || prev?.bolagsverket?.status,
        },
        skatteverket: { ...prev?.skatteverket,
          reference: data.skatteverket_reference || prev?.skatteverket?.reference,
          status: data.skatteverket_status || prev?.skatteverket?.status,
        },
      }));

      const bvStatus = data.bolagsverket_status;
      if (bvStatus && ['accepted', 'rejected', 'error'].includes(bvStatus)) { if (pollingRef.current) clearInterval(pollingRef.current);
        setIsPolling(false);
        addStatusEvent('submit', `Bolagsverket: status uppdaterad till "${bvStatus}"`, bvStatus === 'accepted' ? 'success' : 'error');
      }
    }, 5000);
  };

  const handleGenerate = async () => { updateStep('generate', { status: 'running', startedAt: new Date(), error: undefined });
    addStatusEvent('generate', 'Startar generering av årsredovisning...');
    try { const { data, error } = await supabase.functions.invoke('generate-annual-report', { body: { company_id: companyId, fiscal_year: fiscalYear },
      });
      if (error) throw error;

      setGeneratedReportId(data.report?.id || null);
      setReportSummary(data.summary);
      updateStep('generate', { status: 'done', completedAt: new Date(), details: data.summary });
      addStatusEvent('generate', `Årsredovisning klar. Omsättning: ${data.summary.total_revenue.toLocaleString('sv-SE')} kr`, 'success');

      toast({ title: "Årsredovisning genererad!", description: `Omsättning: ${data.summary.total_revenue.toLocaleString('sv-SE')} kr` });
      onTaskCreated();
    } catch (error) { const msg = error instanceof Error ? error.message : "Kunde inte generera årsredovisning";
      updateStep('generate', { status: 'error', error: msg });
      addStatusEvent('generate', msg, 'error');
      toast({ title: "Fel", description: msg, variant: "destructive" });
    }
  };

  const handleGenerateIxbrl = async () => { if (!generatedReportId) return;
    updateStep('ixbrl', { status: 'running', startedAt: new Date(), error: undefined });
    addStatusEvent('ixbrl', 'Konverterar årsredovisning till iXBRL-format...');
    try { const { data, error } = await supabase.functions.invoke('generate-ixbrl', { body: { report_id: generatedReportId },
      });
      if (error) throw error;

      setIxbrlUrl(data.ixbrl_url);
      setIxbrlTagCount(data.tag_count || null);
      updateStep('ixbrl', { status: 'done', completedAt: new Date(), details: { format: data.format, taxonomy: data.taxonomy, tag_count: data.tag_count } });
      addStatusEvent('ixbrl', `iXBRL genererat. ${data.tag_count} XBRL-taggar, taxonomi: ${data.taxonomy}`, 'success');

      toast({ title: "iXBRL genererat!", description: `${data.tag_count} taggar, taxonomi: ${data.taxonomy}` });
    } catch (error) { const msg = error instanceof Error ? error.message : "Kunde inte generera iXBRL";
      updateStep('ixbrl', { status: 'error', error: msg });
      addStatusEvent('ixbrl', msg, 'error');
      toast({ title: "Fel vid iXBRL-generering", description: msg, variant: "destructive" });
    }
  };

  const handleSubmitBolagsverket = async () => { if (!generatedReportId) return;
    updateStep('submit', { status: 'running', startedAt: new Date(), error: undefined });
    addStatusEvent('submit', 'Skickar iXBRL till Bolagsverket och INK2 till Skatteverket...');
    try { const { data, error } = await supabase.functions.invoke('submit-annual-report', { body: { report_id: generatedReportId, submit_to: 'both', environment },
      });
      if (error) throw error;

      setSubmissionResult(data.results);
      updateStep('submit', { status: 'done', completedAt: new Date(), details: data.results });

      if (data.results?.bolagsverket?.success) { const ref = data.results.bolagsverket.reference;
        addStatusEvent('submit', ref
          ? `Bolagsverket: inlämnad (ref: ${ref})`
          : `Bolagsverket: iXBRL redo – ${data.results.bolagsverket.message || 'väntar på bekräftelse'}`,
          'success');
      } else if (data.results?.bolagsverket) { addStatusEvent('submit', `Bolagsverket: ${data.results.bolagsverket.error || 'fel vid inlämning'}`, 'error');
      }

      if (data.results?.skatteverket?.success) { addStatusEvent('submit', `Skatteverket: inlämnad (ref: ${data.results.skatteverket.reference})`, 'success');
      }

      // Start polling för status updates
      startStatusPolling(generatedReportId);

      const bvRef = data.results?.bolagsverket?.reference;
      toast({ title: "Inlämning slutförd!", description: bvRef ? `Referens: ${bvRef}` : 'Årsredovisning skickad' });
      onTaskCreated();
    } catch (error) { const msg = error instanceof Error ? error.message : "Kunde inte skicka årsredovisning";
      updateStep('submit', { status: 'error', error: msg });
      addStatusEvent('submit', msg, 'error');
      toast({ title: "Fel vid inlämning", description: msg, variant: "destructive" });
    }
  };

  const getOverallProgress = () => { let done = 0;
    if (steps.generate.status === 'done') done++;
    if (steps.ixbrl.status === 'done') done++;
    if (steps.submit.status === 'done') done++;
    return Math.round((done / 3) * 100);
  };

  const currentStep = steps.generate.status !== 'done' ? 'generate'
    : steps.ixbrl.status !== 'done' ? 'ixbrl'
    : steps.submit.status !== 'done' ? 'submit'
    : 'done';

  const formatDuration = (start?: Date, end?: Date) => { if (!start) return null;
    const endTime = end || new Date();
    const secs = Math.round((endTime.getTime() - start.getTime()) / 1000);
    return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
  };

  const getStatusBadgeVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => { if (!status) return 'outline';
    if (['submitted', 'ixbrl_ready', 'accepted'].includes(status)) return 'default';
    if (['rejected', 'error'].includes(status)) return 'destructive';
    return 'secondary';
  };

  const StepIndicator = ({ step, label, icon: Icon }: { step: StepState; label: string; icon: any }) => (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${ step.status === 'done' ? 'bg-primary/10 text-primary' :
      step.status === 'running' ? 'bg-[#FAEEDA] text-[#7A5417] dark:text-[#C28A2B]' :
      step.status === 'error' ? 'bg-destructive/10 text-destructive' :
      'bg-muted text-muted-foreground'
    }`}>
      {step.status === 'done' ? <CheckCircle className="w-4 h-4 shrink-0" /> :
       step.status === 'running' ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> :
       step.status === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> :
       <Icon className="w-4 h-4 shrink-0" />}
      <span className="font-medium truncate">{label}</span>
      {step.status === 'done' && step.completedAt && step.startedAt && (
        <span className="text-xs ml-auto opacity-70">{formatDuration(step.startedAt, step.completedAt)}</span>
      )}
      {step.status === 'running' && step.startedAt && (
        <span className="text-xs ml-auto opacity-70">{formatDuration(step.startedAt)}...</span>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Bokslut & Årsredovisning
          <Badge variant="secondary" className="ml-auto text-xs">iXBRL</Badge>
        </CardTitle>
        <CardDescription>
          AI genererar årsredovisning i iXBRL-format och skickar automatiskt till Bolagsverket och Skatteverket
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Year selector */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Räkenskapsår</label>
            <Select value={String(fiscalYear)} onValueChange={v => { setFiscalYear(parseInt(v)); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={String(currentYear - 1)}>{currentYear - 1}</SelectItem>
                <SelectItem value={String(currentYear - 2)}>{currentYear - 2}</SelectItem>
                <SelectItem value={String(currentYear - 3)}>{currentYear - 3}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {currentStep === 'done' && (
            <Button variant="outline" size="sm" onClick={resetAll}>
              <RefreshCw className="w-4 h-4 mr-1" />Ny
            </Button>
          )}
        </div>

        {/* Overall progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Total progress</span>
            <span className="text-muted-foreground">{getOverallProgress()}%</span>
          </div>
          <Progress value={getOverallProgress()} className="h-2" />
        </div>

        {/* Step indicators */}
        <div className="grid gap-2">
          <StepIndicator step={steps.generate} label="Generera årsredovisning" icon={BarChart3} />
          <div className="flex justify-center"><ArrowRight className="w-4 h-4 text-muted-foreground" /></div>
          <StepIndicator step={steps.ixbrl} label="Konvertera till iXBRL" icon={Code} />
          <div className="flex justify-center"><ArrowRight className="w-4 h-4 text-muted-foreground" /></div>
          <StepIndicator step={steps.submit} label="Skicka till Bolagsverket" icon={Building2} />
        </div>

        {/* iXBRL tag info */}
        {ixbrlTagCount && steps.ixbrl.status === 'done' && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <Code className="w-3.5 h-3.5" />
            <span>{ixbrlTagCount} XBRL-taggar auto-mappade</span>
            {ixbrlUrl && (
              <a href={ixbrlUrl} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-primary hover:underline">
                <Download className="w-3 h-3" /> Ladda ner iXBRL
              </a>
            )}
          </div>
        )}

        {/* Financial summary & milestones */}
        {reportSummary && (() => { const profitMargin = reportSummary.total_revenue !== 0
            ? (reportSummary.net_profit / reportSummary.total_revenue) * 100
            : 0;
          const equityRatio = reportSummary.total_assets !== 0
            ? (reportSummary.total_equity / reportSummary.total_assets) * 100
            : 0;
          const debtToEquity = reportSummary.total_equity !== 0
            ? ((reportSummary.total_assets - reportSummary.total_equity) / reportSummary.total_equity)
            : 0;

          const milestones = [
            { label: 'Lönsamt resultat',
              reached: reportSummary.net_profit > 0,
              icon: TrendingUp,
              description: reportSummary.net_profit > 0 ? 'Positivt resultat' : 'Negativt resultat',
            },
            { label: 'Soliditet > 30%',
              reached: equityRatio > 30,
              icon: ShieldCheck,
              description: `${equityRatio.toFixed(1)}% soliditet`,
            },
            { label: 'Vinstmarginal > 5%',
              reached: profitMargin > 5,
              icon: Target,
              description: `${profitMargin.toFixed(1)}% marginal`,
            },
          ];

          return (
            <div className="space-y-3">
              {/* KPI cards */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Omsättning", value: reportSummary.total_revenue, icon: Coins },
                  { label: "Resultat", value: reportSummary.net_profit, icon: reportSummary.net_profit >= 0 ? TrendingUp : TrendingDown },
                  { label: "Tillgångar", value: reportSummary.total_assets, icon: BarChart3 },
                  { label: "Eget kapital", value: reportSummary.total_equity, icon: ShieldCheck },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <Icon className={`w-3.5 h-3.5 ${value < 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                    </div>
                    <p className={`text-sm font-semibold ${value < 0 ? 'text-destructive' : ''}`}>
                      {value.toLocaleString('sv-SE')} kr
                    </p>
                  </div>
                ))}
              </div>

              {/* Key ratios */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Vinstmarginal', value: `${profitMargin.toFixed(1)}%`, ok: profitMargin > 5 },
                  { label: 'Soliditet', value: `${equityRatio.toFixed(1)}%`, ok: equityRatio > 30 },
                  { label: 'Skuldsättning', value: `${debtToEquity.toFixed(2)}x`, ok: debtToEquity < 2 },
                ].map(({ label, value, ok }) => (
                  <div key={label} className="p-2 bg-muted/30 rounded-md text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className={`text-sm font-bold ${ok ? 'text-primary' : 'text-destructive'}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Milestones */}
              <div className="p-3 border rounded-lg space-y-2">
                <p className="text-xs font-medium flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Finansiella milstolpar
                </p>
                <div className="grid gap-1.5">
                  {milestones.map(({ label, reached, icon: MIcon, description }) => (
                    <div key={label} className="flex items-center gap-2 text-xs">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${ reached ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        {reached ? <CheckCircle className="w-3 h-3" /> : <MIcon className="w-3 h-3" />}
                      </div>
                      <span className={reached ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
                      <span className="ml-auto text-muted-foreground">{description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Real-time submission status */}
        {submissionResult && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              {isPolling ? <Radio className="w-4 h-4 text-primary animate-pulse" /> : <CheckCircle className="w-4 h-4 text-primary" />}
              Inlämningsstatus
              {isPolling && <span className="text-xs text-muted-foreground ml-auto">Bevakar...</span>}
            </p>
            {submissionResult.bolagsverket && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />Bolagsverket
                  </span>
                  <div className="flex items-center gap-2">
                    {submissionResult.bolagsverket.reference && (
                      <span className="text-xs font-mono text-muted-foreground">{submissionResult.bolagsverket.reference}</span>
                    )}
                    <Badge variant={getStatusBadgeVariant(submissionResult.bolagsverket.status)} className="text-xs">
                      {submissionResult.bolagsverket.status || 'skickad'}
                    </Badge>
                  </div>
                </div>
                {submissionResult.bolagsverket.message && (
                  <p className="text-xs text-muted-foreground pl-5">{submissionResult.bolagsverket.message}</p>
                )}
                {submissionResult.bolagsverket.ixbrl_url && (
                  <a href={submissionResult.bolagsverket.ixbrl_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 pl-5">
                    <ExternalLink className="w-3 h-3" /> Visa iXBRL-dokument
                  </a>
                )}
              </div>
            )}
            {submissionResult.skatteverket && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5" />Skatteverket
                </span>
                <div className="flex items-center gap-2">
                  {submissionResult.skatteverket.reference && (
                    <span className="text-xs font-mono text-muted-foreground">{submissionResult.skatteverket.reference}</span>
                  )}
                  <Badge variant={getStatusBadgeVariant(submissionResult.skatteverket.status)} className="text-xs">
                    {submissionResult.skatteverket.status || 'skickad'}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status timeline */}
        {statusEvents.length > 0 && (
          <details className="group">
            <summary className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              <History className="w-3.5 h-3.5" />
              Händelselogg ({statusEvents.length})
            </summary>
            <div className="mt-2 max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2">
              {statusEvents.slice().reverse().map((evt, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-muted-foreground shrink-0 font-mono">
                    {evt.timestamp.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${ evt.type === 'success' ? 'bg-primary' :
                    evt.type === 'error' ? 'bg-destructive' :
                    evt.type === 'pending' ? 'bg-yellow-500' :
                    'bg-muted-foreground'
                  }`} />
                  <span className={evt.type === 'error' ? 'text-destructive' : ''}>{evt.message}</span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Error display */}
        {Object.entries(steps).map(([key, step]) =>
          step.status === 'error' && step.error ? (
            <div key={key} className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {step.error}
              </p>
            </div>
          ) : null
        )}

        {/* Action buttons */}
        {currentStep === 'generate' && (
          <Button onClick={handleGenerate} disabled={steps.generate.status === 'running'} className="w-full">
            {steps.generate.status === 'running'
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Genererar...</>
              : <><BarChart3 className="w-4 h-4 mr-2" />Steg 1: Generera årsredovisning</>}
          </Button>
        )}

        {currentStep === 'ixbrl' && (
          <Button onClick={handleGenerateIxbrl} disabled={steps.ixbrl.status === 'running'} className="w-full">
            {steps.ixbrl.status === 'running'
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Konverterar...</>
              : <><Code className="w-4 h-4 mr-2" />Steg 2: Generera iXBRL-dokument</>}
          </Button>
        )}

        {currentStep === 'submit' && (
          <div className="space-y-2">
            {ixbrlUrl && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> iXBRL-dokument genererat och sparat
              </p>
            )}
            <Button onClick={handleSubmitBolagsverket} disabled={steps.submit.status === 'running'} className="w-full">
              {steps.submit.status === 'running'
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Skickar...</>
                : <><Send className="w-4 h-4 mr-2" />Steg 3: Skicka till Bolagsverket & Skatteverket</>}
            </Button>
          </div>
        )}

        {currentStep === 'done' && (
          <div className="p-4 bg-accent rounded-lg text-center space-y-1">
            <CheckCircle className="w-8 h-8 text-primary mx-auto" />
            <p className="font-medium text-sm">Årsredovisning inlämnad!</p>
            <p className="text-xs text-muted-foreground">Alla steg slutförda för räkenskapsåret {fiscalYear}.</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          AI förbereder hela årsredovisningen. Du bekräftar varje steg innan inlämning.
        </p>
      </CardContent>
    </Card>
  );
};
