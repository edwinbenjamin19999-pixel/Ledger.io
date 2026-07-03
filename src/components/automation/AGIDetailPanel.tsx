import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, Lock } from "lucide-react";

interface AGIDetailPanelProps { companyId: string;
  environment: string;
  onComplete: () => void;
}

const formatSEK = (n: number) => Math.round(n).toLocaleString('sv-SE') + ' kr';

export const AGIDetailPanel = ({ companyId, environment, onComplete }: AGIDetailPanelProps) => { const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => { load(); }, [companyId]);

  const load = async () => { try { const now = new Date();
      const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

      const { data: payroll } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'approved')
        .gte('period_start', `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`)
        .lte('period_start', `${prevYear}-${String(prevMonth).padStart(2, '0')}-28`)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();

      if (!payroll) { setLoading(false); return; }

      const gross = payroll.total_gross || 0;
      const tax = payroll.total_tax || 0;
      const employerFees = (payroll.total_employer_cost || 0) - gross;
      const totalToPay = tax + employerFees;

      setData({ gross, tax, employerFees, totalToPay, net: payroll.total_net || 0, prevMonth, prevYear });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSign = async () => { setSigning(true);
    try { const { error } = await supabase.functions.invoke('prepare-agi-submission', { body: { company_id: companyId, period_year: data.prevYear, period_month: data.prevMonth, environment },
      });
      if (error) throw error;
      toast({ title: "AGI inskickad!", description: "Behandlas av Skatteverket" });
      onComplete();
    } catch (e: any) { toast({ title: "Fel", description: e.message || "Kunde inte skicka AGI", variant: "destructive" });
    } finally { setSigning(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  if (!data) return <p className="text-sm text-muted-foreground py-4">Ingen godkänd lönekörning hittad</p>;

  return (
    <div className="pt-4 space-y-4">
      {/* Employee summary table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-3 py-2 font-medium text-xs">Post</th>
              <th className="text-right px-3 py-2 font-medium text-xs">Belopp</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr><td className="px-3 py-2 text-xs">Bruttolön</td><td className="px-3 py-2 text-right font-mono text-xs">{formatSEK(data.gross)}</td></tr>
            <tr><td className="px-3 py-2 text-xs">Skatteavdrag</td><td className="px-3 py-2 text-right font-mono text-xs">{formatSEK(data.tax)}</td></tr>
            <tr><td className="px-3 py-2 text-xs">Arbetsgivaravgifter</td><td className="px-3 py-2 text-right font-mono text-xs">{formatSEK(data.employerFees)}</td></tr>
          </tbody>
          <tfoot>
            <tr className="bg-muted/30 font-semibold">
              <td className="px-3 py-2 text-xs">Totalt att betala SKV</td>
              <td className="px-3 py-2 text-right font-mono text-sm">{formatSEK(data.totalToPay)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="w-3 h-3 text-[#085041]" />
        <span>Skattekonto: tillräckligt saldo</span>
      </div>

      <Button
        onClick={handleSign}
        disabled={signing}
        className="w-full h-11"
        style={{ backgroundColor: '#3b82f6', color: '#0F2137' }}
      >
        {signing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signerar...</> :
         <><Lock className="w-4 h-4 mr-2" />Signera och skicka AGI med BankID</>}
      </Button>
      <p className="text-[10px] text-center text-muted-foreground">
        Genom att signera bekräftar du att uppgifterna är korrekta
      </p>
    </div>
  );
};
