import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock } from "lucide-react";

interface TaxOptimizationCardsProps { companyId: string;
}

const formatSEK = (n: number) => Math.round(n).toLocaleString('sv-SE') + ' kr';

interface Opt { title: string;
  desc: string;
  amount: number;
  savings: number;
  risk: string;
  action: string;
  route?: string;
}

const riskColor: Record<string, string> = { Låg: 'bg-[#E1F5EE] text-[#085041] border-green-500/30',
  Medel: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
};

export const TaxOptimizationCards = ({ companyId }: TaxOptimizationCardsProps) => { const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [opts, setOpts] = useState<Opt[]>([]);
  const [profit, setProfit] = useState(0);
  const [standardTax, setStandardTax] = useState(0);
  const [totalSavings, setTotalSavings] = useState(0);

  const fiscalYear = new Date().getFullYear() - 1;

  useEffect(() => { load(); }, [companyId]);

  const load = async () => { try { const { data: lines } = await supabase
        .from('journal_entry_lines')
        .select('debit, credit, account:chart_of_accounts!inner(account_number, account_type), journal_entry:journal_entries!inner(entry_date, status, company_id)')
        .eq('journal_entry.company_id', companyId).eq('journal_entry.status', 'approved')
        .gte('journal_entry.entry_date', `${fiscalYear}-01-01`).lte('journal_entry.entry_date', `${fiscalYear}-12-31`);

      let rev = 0, costs = 0;
      (lines || []).forEach((l: any) => { const acc = l.account?.account_number || '';
        const c = l.credit || 0, d = l.debit || 0;
        if (acc.startsWith('3')) rev += c - d;
        if (acc.startsWith('4') || acc.startsWith('5') || acc.startsWith('6') || acc.startsWith('7')) costs += d - c;
      });

      const p = rev - costs;
      const tax = Math.max(0, Math.round(p * 0.206));
      setProfit(p);
      setStandardTax(tax);

      const items: Opt[] = [];
      if (p > 0) { const pfAmt = Math.round(p * 0.25);
        items.push({ title: 'Periodiseringsfond',
          desc: `Avsätt max 25% av vinsten: ${formatSEK(pfAmt)}`,
          amount: pfAmt,
          savings: Math.round(pfAmt * 0.206),
          risk: 'Låg',
          action: 'Bokför avsättning',
          route: '/periodisering',
        });
      }

      items.push({ title: 'Räkenskapsenlig avskrivning',
        desc: 'Inventarier konto 1220 — max avskrivning 30%',
        amount: 13500,
        savings: Math.round(13500 * 0.206),
        risk: 'Låg',
        action: 'Bokför avskrivning',
        route: '/lagerredovisning',
      });

      if (p > 0) { const optimizedTax = Math.max(0, Math.round((p - Math.round(p * 0.25) - 13500) * 0.206));
        items.push({ title: 'Vinst att planera',
          desc: `Estimerad vinst ${fiscalYear}: ${formatSEK(p)}`,
          amount: p,
          savings: tax - optimizedTax,
          risk: 'Låg',
          action: 'Se full skatteplan',
          route: '/tax-calculation',
        });
      }

      const ts = items.reduce((s, o) => s + o.savings, 0);
      setTotalSavings(ts);
      setOpts(items);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="pt-4 space-y-3">
      {opts.map((opt, i) => (
        <div key={i} className="rounded-lg border bg-background p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{opt.title}</span>
            <Badge variant="outline" className={`text-[10px] ${riskColor[opt.risk] || ''}`}>
              Risk: {opt.risk}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{opt.desc}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-primary">Skattebesparing: {formatSEK(opt.savings)}</span>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => {
              if (opt.route) { navigate(opt.route); }
              else { toast({ title: opt.action, description: "Förslag förberett — granska och godkänn i målmodulen." }); }
            }}>{opt.action}</Button>
          </div>
        </div>
      ))}

      {totalSavings > 0 && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
          <p className="text-xs font-medium">TOTAL POTENTIELL BESPARING</p>
          <p className="text-xl font-bold text-primary">{formatSEK(totalSavings)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Betala {formatSEK(Math.max(0, standardTax - totalSavings))} istället för {formatSEK(standardTax)}
          </p>
        </div>
      )}
    </div>
  );
};
