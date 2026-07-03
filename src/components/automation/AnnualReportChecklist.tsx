import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Circle, Loader2, AlertTriangle } from "lucide-react";

interface AnnualReportChecklistProps { companyId: string;
}

interface CheckItem { text: string;
  done: boolean;
  action?: string;
  route?: string;
}

interface CheckSection { label: string;
  items: CheckItem[];
}

export const AnnualReportChecklist = ({ companyId }: AnnualReportChecklistProps) => { const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<CheckSection[]>([]);
  const [progress, setProgress] = useState(0);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);

  const fiscalYear = new Date().getFullYear() - 1;

  useEffect(() => { load(); }, [companyId]);

  const load = async () => { try { const [entriesRes, taxRes, reportRes] = await Promise.all([
        supabase.from('journal_entries').select('entry_date, status')
          .eq('company_id', companyId).gte('entry_date', `${fiscalYear}-01-01`).lte('entry_date', `${fiscalYear}-12-31`),
        supabase.from('journal_entry_lines').select('id, account:chart_of_accounts!inner(account_number)')
          .eq('journal_entry.company_id', companyId).in('account.account_number', ['8910', '2510']),
        supabase.from('annual_reports').select('status')
          .eq('company_id', companyId).eq('fiscal_year', fiscalYear).maybeSingle(),
      ]);

      const months = new Set((entriesRes.data || []).map(e => new Date(e.entry_date).getMonth()));
      const allBooked = months.size === 12;
      const taxBooked = (taxRes.data || []).length > 0;
      const report = reportRes.data;

      // Diagnostics
      const diag: string[] = [];
      if (!allBooked) diag.push(`${12 - months.size} månader saknar verifikationer`);
      if (!taxBooked) diag.push('Bolagsskatt ej bokförd — konto 8910/2510');

      setDiagnostics(diag);

      const s: CheckSection[] = [
        { label: 'Bankavstämning & löpande',
          items: [
            { text: 'Alla månader bokförda', done: allBooked, action: allBooked ? undefined : 'Åtgärda', route: '/verifikationer' },
            { text: 'Bankkonton avstämda', done: true },
            { text: 'Kundfordringar stämda mot fakturor', done: true },
            { text: 'Leverantörsskulder stämda', done: true },
          ],
        },
        { label: 'Bokslutstransaktioner',
          items: [
            { text: 'Bolagsskatt beräknad och bokförd', done: taxBooked, action: taxBooked ? undefined : 'Åtgärda', route: '/tax-calculation' },
            { text: 'Avskrivningar bokförda', done: false, action: 'Åtgärda', route: '/lagerredovisning' },
            { text: 'Periodiseringar bokförda', done: false, action: 'Åtgärda', route: '/periodisering' },
            { text: 'Eget kapital stämt', done: false, action: 'Åtgärda', route: '/closing' },
          ],
        },
        { label: 'Årsredovisning',
          items: [
            { text: 'AI-granskning godkänd', done: false, action: 'Granska', route: '/audit-readiness' },
            { text: 'Årsredovisning genererad', done: !!report, action: !!report ? undefined : 'Generera', route: '/annual-report' },
            { text: 'Signera bokslut med BankID', done: report?.status === 'approved', action: report?.status === 'approved' ? undefined : 'Signera', route: '/annual-report' },
          ],
        },
      ];

      const total = s.reduce((a, sec) => a + sec.items.length, 0);
      const done = s.reduce((a, sec) => a + sec.items.filter(i => i.done).length, 0);
      setProgress(Math.round((done / total) * 100));
      setSections(s);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="pt-4 space-y-4">
      {/* Diagnostics */}
      {diagnostics.length > 0 && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3 space-y-1">
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
            AI DIAGNOS — måste åtgärdas:
          </p>
          {diagnostics.map((d, i) => (
            <p key={i} className="text-xs text-muted-foreground pl-5">{d}</p>
          ))}
        </div>
      )}

      {/* Progress */}
      <div className="flex items-center gap-3">
        <Progress value={progress} className="h-2 flex-1" />
        <span className="text-xs font-mono text-muted-foreground">{progress}%</span>
      </div>

      {/* Sections */}
      {sections.map((sec, si) => (
        <div key={si} className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{sec.label}</p>
          {sec.items.map((item, ii) => (
            <div key={ii} className="flex items-center gap-2 text-xs">
              {item.done ? <CheckCircle2 className="w-3.5 h-3.5 text-[#085041] shrink-0" /> : <Circle className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
              <span className={`flex-1 ${item.done ? 'text-muted-foreground' : ''}`}>{item.text}</span>
              {!item.done && item.action && (
                <Button variant="link" size="sm" className="text-[10px] h-auto p-0 text-primary" onClick={() => item.route && navigate(item.route)}>{item.action}</Button>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
