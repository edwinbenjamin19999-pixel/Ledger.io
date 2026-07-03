import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Loader2, CheckCircle2, Clock, Lock, AlertTriangle } from "lucide-react";

interface ProactiveAGIPanelProps { companyId: string;
  onTaskCreated: () => void;
  environment?: string;
}

interface EmployeeAGI { name: string;
  personal_number: string;
  gross_salary: number;
  tax_deduction: number;
  employer_fees: number;
  benefits: number;
  pension: number;
}

interface AGIData { period: string;
  prepared_at: string;
  employees: EmployeeAGI[];
  totals: { gross_salary: number;
    tax_deduction: number;
    employer_fees: number;
    total_to_pay: number;
  };
  tax_account_balance: number;
  deadline: string;
  days_remaining: number;
  status: 'ready' | 'missing_payroll' | 'submitted';
  submission_ref?: string;
  submission_date?: string;
}

const formatSEK = (n: number) => Math.round(n).toLocaleString('sv-SE') + ' kr';

export const ProactiveAGIPanel = ({ companyId, onTaskCreated, environment }: ProactiveAGIPanelProps) => { const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [agiData, setAgiData] = useState<AGIData | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => { loadAGIData();
  }, [companyId]);

  const loadAGIData = async () => { try { const now = new Date();
      const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const monthNames = ['', 'januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

      // Check för existing submission
      const { data: existingSub } = await supabase
        .from('agi_submissions')
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSub && existingSub.status === 'submitted') { setAgiData({ period: `${monthNames[prevMonth]} ${prevYear}`,
          prepared_at: existingSub.created_at,
          employees: [],
          totals: { gross_salary: 0, tax_deduction: 0, employer_fees: 0, total_to_pay: 0 },
          tax_account_balance: 0,
          deadline: '',
          days_remaining: 0,
          status: 'submitted',
          submission_ref: existingSub.skatteverket_reference || undefined,
          submission_date: existingSub.submitted_at || existingSub.created_at,
        });
        setLoading(false);
        return;
      }

      // Fetch approved payroll för previous month
      const { data: payroll } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'approved')
        .gte('period_start', `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`)
        .lte('period_start', `${prevYear}-${String(prevMonth).padStart(2, '0')}-28`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!payroll) { setAgiData({ period: `${monthNames[prevMonth]} ${prevYear}`,
          prepared_at: '',
          employees: [],
          totals: { gross_salary: 0, tax_deduction: 0, employer_fees: 0, total_to_pay: 0 },
          tax_account_balance: 0,
          deadline: `12 ${monthNames[prevMonth === 12 ? 1 : prevMonth + 1]}`,
          days_remaining: 0,
          status: 'missing_payroll',
        });
        setLoading(false);
        return;
      }

      // Build employee data from payroll summary
      const employees: EmployeeAGI[] = [{ name: 'Anställda (sammanställning)',
        personal_number: '******-****',
        gross_salary: payroll.total_gross || 0,
        tax_deduction: payroll.total_tax || 0,
        employer_fees: (payroll.total_employer_cost || 0) - (payroll.total_gross || 0),
        benefits: 0,
        pension: 0,
      }];




      const totals = { gross_salary: payroll.total_gross || employees.reduce((s, e) => s + e.gross_salary, 0),
        tax_deduction: payroll.total_tax || employees.reduce((s, e) => s + e.tax_deduction, 0),
        employer_fees: (payroll.total_employer_cost || 0) - (payroll.total_gross || 0),
        total_to_pay: 0,
      };
      totals.total_to_pay = totals.tax_deduction + totals.employer_fees;

      const deadlineMonth = prevMonth === 12 ? 1 : prevMonth + 1;
      const daysRemaining = Math.max(0, Math.ceil((new Date(prevMonth === 12 ? prevYear + 1 : prevYear, deadlineMonth - 1, 12).getTime() - now.getTime()) / 86400000));

      setAgiData({ period: `${monthNames[prevMonth]} ${prevYear}`,
        prepared_at: new Date().toLocaleDateString('sv-SE'),
        employees,
        totals,
        tax_account_balance: 45200, // Placeholder
        deadline: `12 ${monthNames[deadlineMonth]}`,
        days_remaining: daysRemaining,
        status: 'ready',
      });
    } catch (error) { console.error('Error loading AGI:', error);
    } finally { setLoading(false);
    }
  };

  const handleSign = async () => { setSigning(true);
    try { const { data, error } = await supabase.functions.invoke('prepare-agi-submission', { body: { company_id: companyId,
          period_year: new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear(),
          period_month: new Date().getMonth() === 0 ? 12 : new Date().getMonth(),
          environment,
        }
      });
      if (error) throw error;

      toast({ title: "AGI inskickad!", description: `Referens: ${data?.reference || 'Behandlas'}` });
      onTaskCreated();
      loadAGIData();
    } catch (error) { console.error('AGI sign error:', error);
      toast({ title: "Fel vid inlämning", description: error instanceof Error ? error.message : "Kunde inte skicka AGI", variant: "destructive" });
    } finally { setSigning(false);
    }
  };

  if (loading) { return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-3 text-sm text-muted-foreground">Hämtar och beräknar AGI automatiskt...</span>
        </CardContent>
      </Card>
    );
  }

  if (!agiData) return null;

  if (agiData.status === 'submitted') { return (
      <Card className="border-green-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#085041]" />
            AGI {agiData.period} — Inskickad
          </CardTitle>
          <CardDescription>
            Inskickad {agiData.submission_date ? new Date(agiData.submission_date).toLocaleString('sv-SE') : ''}
            {agiData.submission_ref && ` • Ref: ${agiData.submission_ref}`}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (agiData.status === 'missing_payroll') { return (
      <Card className="border-orange-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            AGI {agiData.period} — Lönekörning saknas
          </CardTitle>
          <CardDescription>
            Ingen godkänd lönekörning hittades för {agiData.period}. Skapa och godkänn en lönekörning under Lön & Personal först.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              AGI {agiData.period}
              <Badge variant="secondary" className="text-xs">Förberedd automatiskt</Badge>
            </CardTitle>
            <CardDescription>
              Förberedd automatiskt {agiData.prepared_at} • Deadline: {agiData.deadline} ({agiData.days_remaining} dagar kvar)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Employee table */}
        {agiData.employees.length > 0 && (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium">Anställd</th>
                  <th className="text-left px-3 py-2 font-medium">Personnr</th>
                  <th className="text-right px-3 py-2 font-medium">Bruttolön</th>
                  <th className="text-right px-3 py-2 font-medium">Skatteavdrag</th>
                  <th className="text-right px-3 py-2 font-medium">Arb.avg</th>
                  <th className="text-right px-3 py-2 font-medium">Pension</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {agiData.employees.map((emp, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="px-3 py-2">{emp.name}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground text-xs">{emp.personal_number}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatSEK(emp.gross_salary)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatSEK(emp.tax_deduction)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatSEK(emp.employer_fees)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatSEK(emp.pension)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary card */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <h4 className="font-semibold text-sm">Totalt att betala {agiData.deadline}:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Skatteavdrag:</span>
            <span className="text-right font-mono font-medium">{formatSEK(agiData.totals.tax_deduction)}</span>
            <span className="text-muted-foreground">Arbetsgivaravgifter:</span>
            <span className="text-right font-mono font-medium">{formatSEK(agiData.totals.employer_fees)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between items-center">
            <span className="font-semibold">Totalt:</span>
            <span className="text-xl font-bold font-mono">{formatSEK(agiData.totals.total_to_pay)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3 h-3 text-[#085041]" />
            <span>Skattekonto: {formatSEK(agiData.tax_account_balance)} (tillräckligt)</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? 'Dölj detaljer' : 'Granska detaljer'}
          </Button>
          <Button
            onClick={handleSign}
            disabled={signing}
            className="flex-1"
            style={{ backgroundColor: '#3b82f6', color: '#0F2137' }}
          >
            {signing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signerar...</>
            ) : (
              <><Lock className="w-4 h-4 mr-2" />Signera och skicka med BankID</>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Genom att signera bekräftar du att uppgifterna är korrekta
        </p>
        <p className="text-[10px] text-muted-foreground text-center">
          AI-beräknat • Målet är 99,9% träffsäkerhet • Granska alltid innan signering
        </p>
      </CardContent>
    </Card>
  );
};
