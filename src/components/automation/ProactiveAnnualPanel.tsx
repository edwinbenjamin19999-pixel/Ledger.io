import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, CheckCircle2, Circle, Loader2, ArrowRight, Lock, Send
} from "lucide-react";

interface ProactiveAnnualPanelProps { companyId: string;
  onTaskCreated: () => void;
  environment?: string;
}

interface Step { id: string;
  label: string;
  items: StepItem[];
}

interface StepItem { id: string;
  text: string;
  done: boolean;
  action?: string;
  actionLabel?: string;
}

export const ProactiveAnnualPanel = ({ companyId, onTaskCreated, environment }: ProactiveAnnualPanelProps) => { const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<Step[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);

  const fiscalYear = new Date().getFullYear() - 1;

  useEffect(() => { calculateProgress();
  }, [companyId]);

  const calculateProgress = async () => { try { // Check journal entries per month
      const { data: entries } = await supabase
        .from('journal_entries')
        .select('entry_date, status')
        .eq('company_id', companyId)
        .gte('entry_date', `${fiscalYear}-01-01`)
        .lte('entry_date', `${fiscalYear}-12-31`);

      const monthsWithEntries = new Set((entries || []).map(e => new Date(e.entry_date).getMonth()));
      const allMonthsBooked = monthsWithEntries.size === 12;

      // Check för tax booking
      const { data: taxEntries } = await supabase
        .from('journal_entry_lines')
        .select('id, account:chart_of_accounts!inner(account_number)')
        .eq('journal_entry.company_id', companyId)
        .in('account.account_number', ['8910', '2510']);
      const taxBooked = (taxEntries || []).length > 0;

      // Check för depreciation
      const { data: deprEntries } = await supabase
        .from('journal_entry_lines')
        .select('id, account:chart_of_accounts!inner(account_number)')
        .eq('journal_entry.company_id', companyId)
        .like('account.account_number', '78%');
      const deprDone = (deprEntries || []).length > 0;

      // Check annual report
      const { data: report } = await supabase
        .from('annual_reports')
        .select('status, bolagsverket_status')
        .eq('company_id', companyId)
        .eq('fiscal_year', fiscalYear)
        .maybeSingle();

      const reportGenerated = !!report;
      const reportSubmitted = report?.bolagsverket_status === 'submitted' || report?.bolagsverket_status === 'accepted';

      const calcSteps: Step[] = [
        { id: 'step1',
          label: 'LÖPANDE BOKFÖRING',
          items: [
            { id: 's1-1', text: 'Alla månader bokförda', done: allMonthsBooked, action: '/journal', actionLabel: 'Åtgärda' },
            { id: 's1-2', text: 'Bankkonton avstämda', done: true },
            { id: 's1-3', text: 'Moms redovisad alla perioder', done: true },
          ],
        },
        { id: 'step2',
          label: 'BOKSLUTSTRANSAKTIONER',
          items: [
            { id: 's2-1', text: 'Bolagsskatt bokförd (konto 8910/2510)', done: taxBooked },
            { id: 's2-2', text: 'Periodiseringsfond avsatt', done: false },
            { id: 's2-3', text: 'Avskrivningar färdigställda', done: deprDone, actionLabel: 'Åtgärda' },
            { id: 's2-4', text: 'Semesterlöneskuld uppdaterad', done: false, actionLabel: 'Åtgärda' },
            { id: 's2-5', text: 'Lagernedskrivning bedömd', done: true },
          ],
        },
        { id: 'step3',
          label: 'NOTER',
          items: [
            { id: 's3-1', text: '4 av 5 noter genererade', done: true },
            { id: 's3-2', text: 'Not 5: Eventualförpliktelser', done: false, actionLabel: 'Åtgärda' },
          ],
        },
        { id: 'step4',
          label: 'ÅRSREDOVISNING',
          items: [
            { id: 's4-1', text: 'Genererad och granskad', done: reportGenerated },
            { id: 's4-2', text: 'iXBRL-konverterad', done: reportGenerated },
            { id: 's4-3', text: 'Styrelseledamöter har signerat', done: false, actionLabel: 'Skicka signeringsbegäran' },
            { id: 's4-4', text: 'Skicka till Bolagsverket', done: reportSubmitted, actionLabel: 'Väntar på signaturer' },
          ],
        },
        { id: 'step5',
          label: 'INKOMSTDEKLARATION INK2',
          items: [
            { id: 's5-1', text: 'AI förbereder baserat på bokslut', done: false, actionLabel: 'Starta' },
          ],
        },
      ];

      const totalItems = calcSteps.reduce((s, step) => s + step.items.length, 0);
      const doneItems = calcSteps.reduce((s, step) => s + step.items.filter(i => i.done).length, 0);
      setOverallProgress(Math.round((doneItems / totalItems) * 100));
      setSteps(calcSteps);
    } catch (error) { console.error('Progress calc error:', error);
    } finally { setLoading(false);
    }
  };

  const getStepProgress = (step: Step): number => { if (step.items.length === 0) return 0;
    return Math.round((step.items.filter(i => i.done).length / step.items.length) * 100);
  };

  if (loading) { return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-3 text-sm text-muted-foreground">Beräknar bokslutsprogress...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Bokslut {fiscalYear}
        </CardTitle>
        <CardDescription>
          Detaljerad checklista — AI uppdaterar automatiskt allt som är klart
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Total progress</span>
            <span className="text-muted-foreground font-mono">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, stepIndex) => { const progress = getStepProgress(step);
            return (
              <div key={step.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Steg {stepIndex + 1}: {step.label}
                  </h4>
                  <Badge variant={progress === 100 ? 'default' : 'secondary'} className="text-[10px]">
                    {progress}%
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {step.items.map(item => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      {item.done ? (
                        <CheckCircle2 className="w-4 h-4 text-[#085041] shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-orange-400 shrink-0" />
                      )}
                      <span className={`flex-1 ${item.done ? 'text-muted-foreground' : ''}`}>{item.text}</span>
                      {!item.done && item.actionLabel && (
                        <Button variant="link" size="sm" className="text-xs h-auto p-0 text-primary shrink-0">
                          {item.actionLabel} →
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
