import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, CheckCircle2, Clock, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { generateDeadlines, parseCompanySettings, type TaxDeadline, type CompanySettings } from "@/lib/tax/generateDeadlines";
import { differenceInDays } from "date-fns";

interface ComplianceCalendarProps {
  companyId: string;
  onNavigateToTab: (tab: string) => void;
}

interface CalendarItem {
  id: string;
  date: string;
  label: string;
  type: string;
  tab: string;
  status: 'ready' | 'calculating' | 'waiting' | 'not_started' | 'overdue';
  statusText: string;
}

const statusConfig = {
  ready: { color: 'bg-[#E1F5EE] text-[#085041] border-green-500/30', icon: CheckCircle2, label: 'Klar att skicka' },
  calculating: { color: 'bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/30', icon: Loader2, label: 'AI räknar...' },
  waiting: { color: 'bg-orange-500/15 text-orange-700 border-orange-500/30', icon: Clock, label: 'Väntar på data' },
  not_started: { color: 'bg-muted text-muted-foreground border-border', icon: Clock, label: 'Ej påbörjad' },
  overdue: { color: 'bg-destructive/15 text-destructive border-destructive/30', icon: XCircle, label: 'Förfallen' },
};

export const ComplianceCalendar = ({ companyId, onNavigateToTab }: ComplianceCalendarProps) => {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeadlines();
  }, [companyId]);

  const loadDeadlines = async () => {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();

      // Fetch company settings
      const { data: company } = await supabase
        .from('companies')
        .select('fiscal_year_start, fiscal_year_end, vat_period_type, company_type, registered_for_fskatt, num_employees, eu_vat_liable')
        .eq('id', companyId)
        .maybeSingle();

      const settings = parseCompanySettings((company as Record<string, unknown>) || {});
      const deadlines = generateDeadlines(settings, currentYear);

      // Cross-reference with DB submissions
      const [{ data: payrollRuns }, { data: vatPeriods }, { data: agiSubs }] = await Promise.all([
        supabase
          .from('payroll_runs')
          .select('period_start, status')
          .eq('company_id', companyId)
          .eq('status', 'approved')
          .gte('period_start', `${currentYear}-01-01`),
        supabase
          .from('vat_periods')
          .select('period_start, period_end, status, submitted_at')
          .eq('company_id', companyId),
        supabase
          .from('payroll_agi_submissions')
          .select('period, status, submitted_at')
          .eq('company_id', companyId),
      ]);

      // Filter to upcoming + recently past deadlines (within 60 days window)
      const windowStart = new Date(now);
      windowStart.setDate(windowStart.getDate() - 30);
      const windowEnd = new Date(now);
      windowEnd.setDate(windowEnd.getDate() + 90);

      const relevant = deadlines.filter(d => d.dueDate >= windowStart && d.dueDate <= windowEnd);

      const calendarItems: CalendarItem[] = relevant.map(d => {
        let status: CalendarItem['status'] = 'not_started';
        let statusText = 'Ej påbörjad';
        const daysLeft = differenceInDays(d.dueDate, now);

        // Check if submitted
        let isSubmitted = false;

        if (d.type === 'AGI') {
          // Check payroll_agi_submissions
          const periodStr = d.dueDate.getFullYear() + '-' + String(d.dueDate.getMonth()).padStart(2, '0');
          isSubmitted = agiSubs?.some(s => s.submitted_at && (s.period || '').startsWith(periodStr.slice(0, 7))) ?? false;

          // Also check payroll runs
          if (!isSubmitted) {
            const monthIdx = d.dueDate.getMonth() - 1; // AGI due month - 1 = salary month
            const hasPayroll = payrollRuns?.some(pr => {
              const prDate = new Date(pr.period_start);
              return prDate.getMonth() === (monthIdx < 0 ? 11 : monthIdx);
            }) ?? false;

            if (hasPayroll && daysLeft > 0) {
              status = 'ready';
              statusText = 'KLAR att skicka';
            } else if (!hasPayroll && daysLeft > 0) {
              status = 'waiting';
              statusText = 'Lönekörning saknas';
            }
          }
        } else if (d.type === 'Moms') {
          isSubmitted = vatPeriods?.some(vp => vp.submitted_at != null) ?? false;
        }

        if (isSubmitted) {
          status = 'ready';
          statusText = 'Inlämnad ✓';
        } else if (daysLeft < 0) {
          status = 'overdue';
          statusText = 'Förfallen';
        }

        const dd = d.dueDate;
        const dateStr = `${String(dd.getDate()).padStart(2, '0')}/${String(dd.getMonth() + 1).padStart(2, '0')}`;

        return {
          id: d.id,
          date: dateStr,
          label: d.description || d.title,
          type: d.type.toLowerCase(),
          tab: d.tab,
          status,
          statusText,
        };
      });

      // Sort by urgency
      calendarItems.sort((a, b) => {
        const priority: Record<string, number> = { overdue: 0, ready: 1, calculating: 2, waiting: 3, not_started: 4 };
        return (priority[a.status] ?? 4) - (priority[b.status] ?? 4);
      });

      setItems(calendarItems);
    } catch (error) {
      console.error('Error generating deadlines:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="w-5 h-5 text-primary" />
          Skattekalender — Kommande deadlines
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {items.map((deadline) => {
            const config = statusConfig[deadline.status];
            const Icon = config.icon;
            return (
              <button
                key={deadline.id}
                onClick={() => onNavigateToTab(deadline.tab)}
                className="w-full flex items-center gap-4 px-6 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                <span className="text-sm font-mono text-muted-foreground w-16 shrink-0">
                  {deadline.date}
                </span>
                <span className="flex-1 text-sm font-medium truncate">
                  {deadline.label}
                </span>
                <Badge variant="outline" className={`text-xs shrink-0 ${config.color}`}>
                  <Icon className={`w-3 h-3 mr-1 ${deadline.status === 'calculating' ? 'animate-spin' : ''}`} />
                  {deadline.statusText}
                </Badge>
              </button>
            );
          })}
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Inga kommande deadlines</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
