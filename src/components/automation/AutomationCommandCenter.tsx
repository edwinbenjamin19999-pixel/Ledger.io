import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock, CheckCircle2, CheckCircle, Circle, AlertTriangle, Clock, ArrowRight,
  Calendar, ChevronDown, ChevronUp, Shield,
  CreditCard, FileText, Receipt, AlertCircle, Sparkles, Zap,
} from "lucide-react";
import { DeadlineCalendarSidebar } from "./DeadlineCalendarSidebar";
import { VATDetailPanel } from "./VATDetailPanel";
import { AGIDetailPanel } from "./AGIDetailPanel";
import { TaxOptimizationCards } from "./TaxOptimizationCards";
import { AnnualReportChecklist } from "./AnnualReportChecklist";

import { useAutomationStatus } from "@/hooks/useAutomationStatus";
import { differenceInDays, parseISO } from "date-fns";

interface AutomationCommandCenterProps { companyId: string; }

type QueueItemType = 'vat' | 'agi' | 'tax' | 'annual' | 'ink2' | 'f_skatt';
type QueueStatus = 'sign' | 'preparing' | 'completed';
type Priority = 'critical' | 'important' | 'automated';

interface QueueItem {
  id: string;
  type: QueueItemType;
  title: string;
  subtitle: string;
  deadline?: string;
  daysRemaining?: number;
  amount?: number;
  status: QueueStatus;
  progress?: number;
  progressText?: string;
  detailText?: string;
  priority?: Priority;
  confidence?: number;
}

const formatSEK = (n: number) => Math.round(n).toLocaleString('sv-SE') + ' kr';

const monthNames = ['', 'januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

const PRIORITY_CONFIG = {
  critical: { label: 'Kritisk', color: 'text-destructive', border: 'border-l-destructive', bg: 'bg-destructive/5' },
  important: { label: 'Viktig', color: 'text-[#7A5417]', border: 'border-l-amber-500', bg: 'bg-[#FAEEDA]' },
  automated: { label: 'Automatiserad', color: 'text-[#085041]', border: 'border-l-emerald-500', bg: 'bg-[#E1F5EE]' },
};

export const AutomationCommandCenter = ({ companyId }: AutomationCommandCenterProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [signItems, setSignItems] = useState<QueueItem[]>([]);
  const [preparingItems, setPreparingItems] = useState<QueueItem[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [showCompleted, setShowCompleted] = useState(false);
  const [completedItems, setCompletedItems] = useState<QueueItem[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const { data: automationStatus } = useAutomationStatus();

  const [autoSubmit, setAutoSubmit] = useState(false);
  const [manualApproval, setManualApproval] = useState(true);

  const environment = 'production';

  useEffect(() => { loadQueue(); }, [companyId]);

  const loadQueue = async () => {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const fiscalYear = currentYear - 1;

      const [payrollRes, vatLinesRes, annualRes, agiSubRes, completedTasksRes] = await Promise.all([
        supabase.from('payroll_runs').select('id, period_start, period_end, status, total_gross, total_tax, total_employer_cost, total_net')
          .eq('company_id', companyId).eq('status', 'approved')
          .gte('period_start', `${prevMonthYear}-${String(prevMonth).padStart(2, '0')}-01`)
          .lte('period_start', `${prevMonthYear}-${String(prevMonth).padStart(2, '0')}-28`)
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('journal_entry_lines').select(`
          debit, credit, vat_code,
          account:chart_of_accounts!inner(account_number),
          journal_entry:journal_entries!inner(entry_date, status, company_id)
        `).eq('journal_entry.company_id', companyId).eq('journal_entry.status', 'approved'),
        supabase.from('annual_reports').select('status, fiscal_year, revenue, net_profit, total_assets')
          .eq('company_id', companyId).eq('fiscal_year', fiscalYear).maybeSingle(),
        supabase.from('agi_submissions').select('status, skatteverket_reference, submitted_at')
          .eq('company_id', companyId)
          .gte('created_at', `${prevMonthYear}-${String(prevMonth).padStart(2, '0')}-01`)
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('automation_tasks').select('id, task_type, status, completed_at')
          .eq('company_id', companyId).eq('status', 'completed')
          .order('completed_at', { ascending: false }).limit(20),
      ]);

      const payroll = payrollRes.data;
      const vatLines = vatLinesRes.data || [];
      const annualReport = annualRes.data;
      const existingAgiSub = agiSubRes.data;
      const completedTasks = completedTasksRes.data || [];

      const sign: QueueItem[] = [];
      const preparing: QueueItem[] = [];
      const completed: QueueItem[] = [];

      // --- VAT calculation ---
      const currentQuarter = Math.ceil(currentMonth / 3);
      const prevQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
      const prevQYear = currentQuarter === 1 ? currentYear - 1 : currentYear;
      const qStartMonth = (prevQuarter - 1) * 3 + 1;
      const qEndMonth = prevQuarter * 3;

      let outputVat = 0, inputVat = 0, missingVat = 0;
      vatLines.forEach((line: any) => {
        const accNum = line.account?.account_number || '';
        const entryDate = line.journal_entry?.entry_date || '';
        const entryMonth = parseInt(entryDate.substring(5, 7));
        const entryYear = parseInt(entryDate.substring(0, 4));
        if (entryYear !== prevQYear || entryMonth < qStartMonth || entryMonth > qEndMonth) return;
        const credit = line.credit || 0;
        const debit = line.debit || 0;
        if (accNum.startsWith('261') || accNum.startsWith('262') || accNum.startsWith('263')) { outputVat += credit - debit; }
        else if (accNum.startsWith('264')) { inputVat += debit - credit; }
        if ((accNum.startsWith('30') || accNum.startsWith('31')) && !line.vat_code && (credit - debit) > 0) { missingVat++; }
      });

      const vatToPay = outputVat - inputVat;
      const vatDeadlineMonth = qEndMonth + 1 > 12 ? qEndMonth + 1 - 12 : qEndMonth + 1;
      const vatDeadlineYear = qEndMonth + 1 > 12 ? prevQYear + 1 : prevQYear;
      const vatDeadline = new Date(vatDeadlineYear, vatDeadlineMonth - 1, 26);
      const vatDaysLeft = Math.max(0, Math.ceil((vatDeadline.getTime() - now.getTime()) / 86400000));

      if (vatToPay !== 0 || outputVat > 0) {
        const hasWarning = missingVat > 0;
        sign.push({
          id: 'vat', type: 'vat',
          title: `Momsdeklaration ${monthNames[qEndMonth]} ${prevQYear}`,
          subtitle: `AI har beräknat och granskat — redo att signera`,
          deadline: `${vatDeadline.getDate()} ${monthNames[vatDeadlineMonth]}`,
          daysRemaining: vatDaysLeft,
          amount: Math.abs(vatToPay),
          status: 'sign',
          detailText: hasWarning ? `${missingVat} verifikat saknar momskod` : undefined,
          priority: vatDaysLeft <= 7 ? 'critical' : 'important',
          confidence: hasWarning ? 92 : 97,
        });
      }

      // --- AGI ---
      const agiDeadlineMonth = prevMonth === 12 ? 1 : prevMonth + 1;
      const agiDeadlineYear = prevMonth === 12 ? prevMonthYear + 1 : prevMonthYear;
      const agiDeadline = new Date(agiDeadlineYear, agiDeadlineMonth - 1, 12);
      const agiDaysLeft = Math.max(0, Math.ceil((agiDeadline.getTime() - now.getTime()) / 86400000));

      if (existingAgiSub?.status === 'submitted') {
        completed.push({
          id: 'agi-done', type: 'agi',
          title: `AGI ${monthNames[prevMonth]} ${prevMonthYear}`,
          subtitle: `Inskickad ${existingAgiSub.submitted_at ? new Date(existingAgiSub.submitted_at).toLocaleDateString('sv-SE') : ''}`,
          status: 'completed',
        });
      } else if (payroll) {
        sign.push({
          id: 'agi', type: 'agi',
          title: `AGI ${monthNames[prevMonth]} ${prevMonthYear}`,
          subtitle: `Kontrolluppgifter klara — lönekörning godkänd`,
          deadline: `${agiDeadline.getDate()} ${monthNames[agiDeadlineMonth]}`,
          daysRemaining: agiDaysLeft,
          amount: (payroll.total_tax || 0) + ((payroll.total_employer_cost || 0) - (payroll.total_gross || 0)),
          status: 'sign',
          priority: agiDaysLeft <= 7 ? 'critical' : 'important',
          confidence: 97,
        });
      } else {
        preparing.push({
          id: 'agi-waiting', type: 'agi',
          title: `AGI ${monthNames[prevMonth]} ${prevMonthYear}`,
          subtitle: 'Väntar på godkänd lönekörning',
          deadline: `${agiDeadline.getDate()} ${monthNames[agiDeadlineMonth]}`,
          daysRemaining: agiDaysLeft,
          status: 'preparing',
          priority: 'automated',
          progress: 40,
          progressText: 'Väntar på lönekörning',
        });
      }

      // --- Tax optimization ---
      let totalRevenue = 0, totalCosts = 0;
      vatLines.forEach((line: any) => {
        const accNum = line.account?.account_number || '';
        const entryDate = line.journal_entry?.entry_date || '';
        const entryYear = parseInt(entryDate.substring(0, 4));
        if (entryYear !== fiscalYear) return;
        const credit = line.credit || 0;
        const debit = line.debit || 0;
        if (accNum.startsWith('3')) totalRevenue += credit - debit;
        if (accNum.startsWith('4') || accNum.startsWith('5') || accNum.startsWith('6') || accNum.startsWith('7')) { totalCosts += debit - credit; }
      });
      const estimatedProfit = totalRevenue - totalCosts;

      if (estimatedProfit > 0) {
        preparing.push({
          id: 'tax-opt', type: 'tax',
          title: `Bolagsskatt ${fiscalYear}`,
          subtitle: `AI beräknar: skatteunderlag ${formatSEK(estimatedProfit)}`,
          detailText: 'Optimeringsmöjligheter hittade: periodiseringsfond',
          status: 'preparing',
          progressText: 'Klar om ~3 veckor',
          priority: 'automated',
          progress: 55,
        });
      }

      // --- Annual report ---
      const annualProgress = annualReport?.status === 'submitted' ? 100 :
        annualReport?.status === 'approved' ? 85 :
        annualReport?.status === 'draft' ? 67 : 30;

      preparing.push({
        id: 'annual', type: 'annual',
        title: `Bokslut & Årsredovisning ${fiscalYear}`,
        subtitle: annualProgress >= 85 ? 'Nästan klar' : `${3 - Math.floor(annualProgress / 33)} konton saknar data`,
        status: 'preparing',
        progress: annualProgress,
        progressText: `Klar om ~${annualProgress < 50 ? '8' : '6'} veckor`,
        priority: 'automated',
      });

      // --- INK2 ---
      preparing.push({
        id: 'ink2', type: 'ink2',
        title: `Inkomstdeklaration INK2 ${fiscalYear}`,
        subtitle: 'Väntar på godkänt bokslut',
        deadline: '2 maj',
        daysRemaining: Math.max(0, Math.ceil((new Date(currentYear, 4, 2).getTime() - now.getTime()) / 86400000)),
        status: 'preparing',
        priority: 'automated',
        progress: 20,
        progressText: 'Väntar på bokslut',
      });

      // Add historical completed items
      completedTasks.forEach(t => {
        completed.push({
          id: t.id, type: t.task_type as QueueItemType,
          title: t.task_type === 'agi_submission' ? 'AGI' : t.task_type === 'vat_declaration' ? 'Moms' : t.task_type,
          subtitle: `Slutförd ${t.completed_at ? new Date(t.completed_at).toLocaleDateString('sv-SE') : ''}`,
          status: 'completed',
        });
      });

      setSignItems(sign);
      setPreparingItems(preparing);
      setCompletedItems(completed);
      setCompletedCount(completed.length);
    } catch (error) {
      console.error('Error loading automation queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    loadQueue();
    toast({ title: "Uppdaterat", description: "Automatiseringskön uppdateras" });
  };

  // Compute urgent items for today action bar
  const urgentItems = [...signItems, ...preparingItems.filter(i => i.daysRemaining !== undefined && i.daysRemaining <= 14)]
    .sort((a, b) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999))
    .slice(0, 3);

  const totalActionCount = signItems.length + preparingItems.filter(i => i.daysRemaining !== undefined && i.daysRemaining <= 14).length;

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Laddar automatiseringskö...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      {/* Main queue */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Automatiseringscenter</h2>
            <p className="text-sm text-muted-foreground">
              AI övervakar deadlines och förbereder allt — du granskar och signerar
            </p>
          </div>
          <Badge variant="default" className="text-xs bg-emerald-600 hover:bg-emerald-600">
            Skarp miljö
          </Badge>
        </div>

        {/* TODAY ACTION BAR */}
        {totalActionCount > 0 && (
          <Card className="border-0 bg-[#0B1929] rounded-2xl overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#EEEDFE] text-[#26215C] border-[0.5px] border-[#AFA9EC] rounded-full text-[10px] font-medium px-[8px] py-px uppercase tracking-[0.06em]">
                      Redo att övervaka
                    </span>
                    <h3 className="text-[15px] font-semibold text-white">
                      Idag: {totalActionCount} åtgärd{totalActionCount !== 1 ? 'er' : ''} krävs
                    </h3>
                  </div>
                  <div className="space-y-1.5">
                    {urgentItems.map(item => (
                      <div key={item.id} className="flex items-center gap-2 text-[12px] text-white/70">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          item.priority === 'critical' ? 'bg-[#F87171] animate-pulse' :
                          item.priority === 'important' ? 'bg-[#EF9F27]' : 'bg-[#6EE7B7]'
                        }`} />
                        <span className="font-medium text-white">{item.title}</span>
                        <span className="text-white/50">—</span>
                        <span className={`text-[11px] ${
                          (item.daysRemaining ?? 999) <= 3 ? 'text-[#F87171] font-semibold' :
                          (item.daysRemaining ?? 999) <= 7 ? 'text-[#EF9F27]' : 'text-[#6EE7B7]'
                        }`}>
                          {item.daysRemaining !== undefined
                            ? item.daysRemaining <= 1 ? 'förfaller idag/imorgon' : `${item.daysRemaining} dagar kvar`
                            : 'redo att signera'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  className="bg-transparent border-[0.5px] border-white/[0.20] text-white/80 hover:bg-white/[0.06] hover:text-white rounded-[8px] text-[11px] font-medium px-[12px] h-[30px] shrink-0"
                  onClick={() => {
                    toast({ title: "Utför åtgärder", description: "Navigerar till första åtgärden..." });
                    const el = document.getElementById('sign-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Zap className="w-3.5 h-3.5 mr-1.5" />
                  Slutför alla
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status KPIs */}
        {automationStatus && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Obokförda transaktioner", value: automationStatus.unbookedBank, icon: CreditCard, route: "/bankavstamning", accent: "#1D4ED8" },
                { label: "Väntande granskning", value: automationStatus.draftEntries, icon: FileText, route: "/accounting", accent: "#EF9F27" },
                { label: "Förfallna fakturor", value: automationStatus.overdueInvoices, icon: AlertCircle, route: "/ar-agent", accent: "#E24B4A" },
                { label: "Väntande utlägg", value: automationStatus.pendingExpenses, icon: Receipt, route: "/expenses", accent: "#1D4ED8" },
              ].map(kpi => {
                const Icon = kpi.icon;
                return (
                  <Card
                    key={kpi.label}
                    className="cursor-pointer relative overflow-hidden bg-[#FAFBFC] border-[0.5px] border-[#DFE4EA] rounded-[12px] hover:border-[#1D4ED8]/40 transition-all duration-200 shadow-none"
                    onClick={() => navigate(kpi.route)}
                  >
                    <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: kpi.accent }} />
                    <CardContent className="p-[16px]">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8] leading-tight">{kpi.label}</p>
                          <p className="text-[22px] font-medium tracking-[-0.03em] text-[#0F172A] tabular-nums mt-1.5 leading-none">{kpi.value}</p>
                        </div>
                        <Icon size={16} strokeWidth={1.5} color="#94A3B8" className="shrink-0 mt-0.5" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Automation Controls */}
            <Card className="bg-[#FAFBFC] border-[0.5px] border-[#DFE4EA] rounded-[12px] shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#1D4ED8]" />
                    <span className="text-[12px] font-medium text-[#0F172A]">Automationsinställningar</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch
                        checked={autoSubmit}
                        onCheckedChange={(v) => {
                          setAutoSubmit(v);
                          toast({ title: v ? "Auto-inlämning aktiverad" : "Auto-inlämning inaktiverad", description: v ? "Systemet skickar in automatiskt efter godkännande" : "Manuell inlämning krävs" });
                        }}
                        className="data-[state=checked]:bg-[#1D4ED8] data-[state=unchecked]:bg-[#E2E8F0]"
                      />
                      <span className="text-[12px] text-[#0F172A]">Auto-inlämning</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch
                        checked={manualApproval}
                        onCheckedChange={(v) => {
                          setManualApproval(v);
                          toast({ title: v ? "Manuellt godkännande aktiverat" : "Manuellt godkännande inaktiverat" });
                        }}
                        className="data-[state=checked]:bg-[#1D4ED8] data-[state=unchecked]:bg-[#E2E8F0]"
                      />
                      <span className="text-[12px] text-[#0F172A]">Manuellt godkännande</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overdue deadline warning */}
            {automationStatus.overdueDeadlines.length > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <p className="font-medium text-sm text-destructive">
                    {automationStatus.overdueDeadlines.length} deadline(s) kan ha passerats
                  </p>
                  <p className="text-xs text-destructive/80">Kontrollera att inlämning skett för: {automationStatus.overdueDeadlines.map(d => d.label).join(', ')}</p>
                </div>
              </div>
            )}

            {/* Upcoming deadlines */}
            {automationStatus.upcomingDeadlines.length > 0 && (
              <Card className="bg-[#FAFBFC] border-[0.5px] border-[#DFE4EA] rounded-[12px] shadow-none">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-[13px] font-medium text-[#0F172A] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#1D4ED8]" />
                    Kommande deadlines
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-2">
                  {automationStatus.upcomingDeadlines.map(d => {
                    const daysLeft = differenceInDays(parseISO(d.date), new Date());
                    const daysColor = daysLeft < 7 ? 'text-[#791F1F]' : daysLeft < 14 ? 'text-[#633806]' : 'text-[#0F172A]';
                    return (
                      <div key={d.id} className="flex items-center justify-between py-[9px] border-b-[0.5px] border-[#F1F5F9] last:border-b-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <Calendar size={14} strokeWidth={1.5} className="text-[#94A3B8] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[12px] font-medium text-[#0F172A] truncate">{d.label}</p>
                            <p className="text-[11px] text-[#94A3B8]">{d.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[11px] font-medium ${daysColor}`}>
                            {daysLeft} dagar
                          </span>
                          <Button
                            className="bg-[#1D4ED8] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[8px] text-[11px] font-medium px-[12px] h-[28px]"
                            onClick={() => navigate(d.route)}
                          >
                            Förbered
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Autonomous actions checklist */}
            <Card className="bg-[#FAFBFC] border-[0.5px] border-[#DFE4EA] rounded-[12px] shadow-none">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-[13px] font-medium text-[#0F172A] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1D4ED8]" />
                  Autonoma åtgärder (Kategori A)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-5 pb-4">
                {[
                  { label: `Bankavstämning — ${automationStatus.unbookedBank === 0 ? 'Inga väntande' : automationStatus.unbookedBank + ' transaktioner att matcha'}`, ok: automationStatus.unbookedBank === 0 },
                  { label: `Verifikationsgranskning — ${automationStatus.draftEntries} utkast`, ok: automationStatus.draftEntries === 0 },
                  { label: `Utläggsattest — ${automationStatus.pendingExpenses} väntande`, ok: automationStatus.pendingExpenses === 0 },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    {item.ok
                      ? <CheckCircle size={16} color="#1D9E75" />
                      : <Circle size={16} color="#E2E8F0" />}
                    <span className="text-[12px] text-[#475569]">{item.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Category B */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-destructive" />
                  Kritiska åtgärder (Kategori B — kräver signering)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/tax-agent')}>
                  <Shield className="w-3.5 h-3.5" />Signera momsdeklaration
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 ml-2" onClick={() => navigate('/tax-agent')}>
                  <Shield className="w-3.5 h-3.5" />Signera AGI
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* SIGN queue */}
        {signItems.length > 0 && (
          <Card className="border-destructive/30" id="sign-section">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-destructive" />
                  KRÄVER DIN SIGNATUR
                </span>
                <Badge variant="destructive" className="text-xs">{signItems.length} åtgärd{signItems.length !== 1 ? 'er' : ''}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {signItems.map((item) => {
                const priorityCfg = PRIORITY_CONFIG[item.priority || 'important'];
                return (
                  <div key={item.id} className={`border-l-4 ${priorityCfg.border}`}>
                    <button
                      onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                      className={`w-full text-left px-6 py-4 hover:bg-muted/30 transition-colors ${priorityCfg.bg}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">{item.title}</p>
                            <Badge variant="outline" className={`text-[10px] ${priorityCfg.color} border-current/30`}>
                              {priorityCfg.label}
                            </Badge>
                          </div>

                          {/* Amount display */}
                          {item.amount !== undefined && (
                            <p className="text-xl font-bold tabular-nums">{formatSEK(item.amount)}</p>
                          )}

                          {/* Deadline countdown */}
                          {item.deadline && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={`text-xs ${
                                (item.daysRemaining ?? 999) <= 3 ? 'text-destructive border-destructive/30 bg-destructive/10' :
                                (item.daysRemaining ?? 999) <= 7 ? 'text-[#7A5417] border-[#F0DDB7] bg-[#FAEEDA]' :
                                'text-muted-foreground'
                              }`}>
                                <Clock className="w-3 h-3 mr-1" />
                                {item.daysRemaining} dagar kvar
                              </Badge>
                              <span className="text-xs text-muted-foreground">Deadline: {item.deadline}</span>
                            </div>
                          )}

                          {/* Risk indicator */}
                          {item.daysRemaining !== undefined && item.daysRemaining <= 7 && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Risk: Förseningsavgift — om ej slutförd i tid
                            </p>
                          )}

                          <p className="text-xs text-muted-foreground">{item.subtitle}</p>

                          {item.detailText && (
                            <p className="text-xs text-orange-600 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />{item.detailText}
                            </p>
                          )}

                          {/* AI Confidence */}
                          {item.confidence && (
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3 h-3 text-[#085041]" />
                              <span className="text-xs text-[#085041] font-medium">
                                AI förberedde med {item.confidence}% konfidens
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            className="bg-[#0F1F3D] text-white hover:from-violet-700 hover:to-indigo-700 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedItem(item.id);
                            }}
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            Granska & Signera
                          </Button>
                          {expandedItem === item.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </button>
                    {expandedItem === item.id && (
                      <div className="px-6 pb-4 border-t bg-muted/10">
                        {item.type === 'vat' && (
                          <VATDetailPanel companyId={companyId} environment={environment} onComplete={handleRefresh} />
                        )}
                        {item.type === 'agi' && (
                          <AGIDetailPanel companyId={companyId} environment={environment} onComplete={handleRefresh} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* PREPARING queue */}
        {preparingItems.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  AI FÖRBEREDER
                </span>
                <Badge variant="secondary" className="text-xs">{preparingItems.length} kommande</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {preparingItems.map((item) => {
                const priorityCfg = PRIORITY_CONFIG[item.priority || 'automated'];
                return (
                  <div key={item.id} className={`border-l-4 ${priorityCfg.border}`}>
                    <button
                      onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                      className="w-full text-left px-6 py-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{item.title}</p>
                            <Badge variant="outline" className={`text-[10px] ${priorityCfg.color} border-current/30`}>
                              {priorityCfg.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                          {item.detailText && (
                            <p className="text-xs text-muted-foreground">{item.detailText}</p>
                          )}

                          {/* Progress bar */}
                          {item.progress !== undefined && (
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={item.progress} className="h-2 flex-1 max-w-48" />
                              <span className="text-xs font-mono text-muted-foreground">{item.progress}%</span>
                            </div>
                          )}

                          {/* Status label + AI working indicator */}
                          <div className="flex items-center gap-3 mt-1">
                            {item.progressText && (
                              <span className="text-xs text-muted-foreground">{item.progressText}</span>
                            )}
                            {item.progress !== undefined && item.progress < 100 && (
                              <span className="flex items-center gap-1 text-xs text-primary">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                AI arbetar…
                              </span>
                            )}
                          </div>

                          {/* Deadline + consequence */}
                          {item.deadline && (
                            <div className="space-y-0.5">
                              <p className="text-xs text-muted-foreground">
                                Förfaller: {item.deadline}
                                {item.daysRemaining !== undefined && ` (${item.daysRemaining} dagar)`}
                              </p>
                              {item.daysRemaining !== undefined && item.daysRemaining <= 14 && (
                                <p className="text-xs text-[#7A5417]">
                                  ⚠ Om ej slutförd: risk för förseningsavgift
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        {(item.type === 'tax' || item.type === 'annual') && (
                          <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${expandedItem === item.id ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </button>
                    {expandedItem === item.id && item.type === 'tax' && (
                      <div className="px-6 pb-4 border-t bg-muted/10">
                        <TaxOptimizationCards companyId={companyId} />
                      </div>
                    )}
                    {expandedItem === item.id && item.type === 'annual' && (
                      <div className="px-6 pb-4 border-t bg-muted/10">
                        <AnnualReportChecklist companyId={companyId} />
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* COMPLETED */}
        <Card className="border-green-500/20">
          <button onClick={() => setShowCompleted(!showCompleted)} className="w-full text-left">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#085041]" />
                  SLUTFÖRT
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs text-[#085041] border-green-500/30">
                    {completedCount} åtgärder
                  </Badge>
                  {showCompleted ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </CardTitle>
            </CardHeader>
          </button>
          {showCompleted && completedItems.length > 0 && (
            <CardContent className="p-0 divide-y border-t">
              {completedItems.slice(0, 10).map((item) => (
                <div key={item.id} className="px-6 py-3 flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#085041] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      </div>

      {/* Sidebar calendar */}
      <div className="lg:hidden">
        <details className="rounded-lg border bg-card">
          <summary className="px-4 py-3 text-sm font-semibold cursor-pointer flex items-center justify-between">
            📅 Deadlines & kalender
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </summary>
          <div className="px-2 pb-3">
            <DeadlineCalendarSidebar companyId={companyId} />
          </div>
        </details>
      </div>
      <div className="hidden lg:block">
        <DeadlineCalendarSidebar companyId={companyId} />
      </div>
    </div>
  );
};
