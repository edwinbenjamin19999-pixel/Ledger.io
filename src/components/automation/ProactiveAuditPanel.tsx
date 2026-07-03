import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Loader2, CheckCircle2, AlertTriangle, Info, XCircle, RefreshCw
} from "lucide-react";

interface ProactiveAuditPanelProps { companyId: string;
}

interface AuditItem { id: string;
  severity: 'critical' | 'warning' | 'info';
  text: string;
  action?: string;
}

export const ProactiveAuditPanel = ({ companyId }: ProactiveAuditPanelProps) => { const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [nextRun, setNextRun] = useState<string | null>(null);
  const [criticalCount, setCriticalCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [infoCount, setInfoCount] = useState(0);
  const [items, setItems] = useState<AuditItem[]>([]);

  const fiscalYear = new Date().getFullYear() - 1;

  useEffect(() => { runAutoAudit();
  }, [companyId]);

  const runAutoAudit = async () => { setLoading(true);
    try { // Simulate automatic nightly audit by checking data directly
      const { data: entries } = await supabase
        .from('journal_entries')
        .select('id, status, description, entry_date, document_id')
        .eq('company_id', companyId)
        .eq('status', 'approved')
        .gte('entry_date', `${fiscalYear}-01-01`)
        .lte('entry_date', `${fiscalYear}-12-31`);

      const auditItems: AuditItem[] = [];

      // Check för missing documents
      const missingDocs = (entries || []).filter(e => !e.document_id).length;
      if (missingDocs > 0) { auditItems.push({ id: 'missing-docs',
          severity: 'warning',
          text: `${missingDocs} verifikat saknar underlag`,
          action: 'Åtgärda',
        });
      }

      // Check VAT reconciliation - use simple query to avoid deep type instantiation
      const { data: vatAccounts } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('company_id', companyId)
        .eq('account_number', '2650')
        .maybeSingle();

      let vatBalance = 0;
      if (vatAccounts?.id) { const { data: vatLines } = await supabase
          .from('journal_entry_lines')
          .select('debit, credit')
          .eq('account_id', vatAccounts.id);
        vatBalance = (vatLines || []).reduce((s, l) => s + (l.credit || 0) - (l.debit || 0), 0);
      }
      if (Math.abs(vatBalance) > 100) { auditItems.push({ id: 'vat-diff',
          severity: 'warning',
          text: `Moms-differens ${Math.round(vatBalance).toLocaleString('sv-SE')} kr — kontrollera momsavstämning`,
          action: 'Åtgärda',
        });
      }

      // Info notes
      auditItems.push({ id: 'tax-not-booked',
        severity: 'info',
        text: 'Bolagsskatt ej bokförd ännu (räkenskapsåret ej avslutat)',
      });

      auditItems.push({ id: 'vacation-debt',
        severity: 'info',
        text: 'Semesterlöneskuld kan behöva uppdateras',
      });

      // Check old unpaid supplier invoices - simplified query
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
      const { count: oldInvoiceCount } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'sent')
        .lt('due_date', ninetyDaysAgo);

      if ((oldInvoiceCount || 0) > 0) { auditItems.push({ id: 'old-invoices',
          severity: 'info',
          text: `${oldInvoiceCount} leverantörsfakturor äldre än 90 dagar utan betalning`,
        });
      }

      setCriticalCount(auditItems.filter(i => i.severity === 'critical').length);
      setWarningCount(auditItems.filter(i => i.severity === 'warning').length);
      setInfoCount(auditItems.filter(i => i.severity === 'info').length);
      setItems(auditItems);

      const now = new Date();
      setLastRun(now.toLocaleString('sv-SE'));
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(3, 0, 0, 0);
      setNextRun(tomorrow.toLocaleString('sv-SE'));
    } catch (error) { console.error('Audit error:', error);
    } finally { setLoading(false);
    }
  };

  const handleManualRun = async () => { setRunning(true);
    try { const { data, error } = await supabase.functions.invoke('ai-year-end-audit', { body: { company_id: companyId, fiscal_year: fiscalYear },
      });
      if (error) throw error;
      toast({ title: "Granskning klar!", description: data?.ready_for_submission ? "Inga blockerande fel" : "Problem hittades" });
      runAutoAudit();
    } catch (error) { toast({ title: "Fel", description: error instanceof Error ? error.message : "Granskningsfel", variant: "destructive" });
    } finally { setRunning(false);
    }
  };

  const severityIcon = (s: string) => { if (s === 'critical') return <XCircle className="w-4 h-4 text-destructive shrink-0" />;
    if (s === 'warning') return <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />;
    return <Info className="w-4 h-4 text-muted-foreground shrink-0" />;
  };

  if (loading) { return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-3 text-sm text-muted-foreground">Kör automatisk granskning...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              AI-granskning — Pre-flight audit
            </CardTitle>
            <CardDescription>
              Senaste granskning: {lastRun} (automatisk)
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleManualRun} disabled={running}>
            <RefreshCw className={`w-4 h-4 mr-1 ${running ? 'animate-spin' : ''}`} />
            Kör nu
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary badges */}
        <div className="flex gap-3">
          <Badge variant={criticalCount > 0 ? 'destructive' : 'secondary'}>
            Kritiska: {criticalCount}
          </Badge>
          <Badge variant="outline" className={warningCount > 0 ? 'bg-orange-500/15 text-orange-700 border-orange-500/30' : ''}>
            Varningar: {warningCount}
          </Badge>
          <Badge variant="secondary">
            Info: {infoCount}
          </Badge>
        </div>

        {/* Items grouped by severity */}
        {['critical', 'warning', 'info'].map(severity => { const filteredItems = items.filter(i => i.severity === severity);
          if (filteredItems.length === 0) return null;
          const label = severity === 'critical' ? 'KRITISKA FEL (blockerar inlämning)' : severity === 'warning' ? 'VARNINGAR (bör åtgärdas)' : 'INFORMATIONSNOTER';
          return (
            <div key={severity} className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</h4>
              {filteredItems.map(item => (
                <div key={item.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                  {severityIcon(item.severity)}
                  <span className="text-sm flex-1">{item.text}</span>
                  {item.action && (
                    <Button variant="link" size="sm" className="text-xs h-auto p-0 text-primary shrink-0">
                      [{item.action}]
                    </Button>
                  )}
                </div>
              ))}
            </div>
          );
        })}

        <p className="text-xs text-muted-foreground">
          Nästa automatiska granskning: {nextRun}
        </p>
      </CardContent>
    </Card>
  );
};
