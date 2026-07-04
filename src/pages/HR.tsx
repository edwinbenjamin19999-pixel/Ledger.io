import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, Plus, Users, DollarSign, FileText, Download, CheckCircle, Search, Briefcase,
  UserCheck, Calendar, Banknote, TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PayrollAdjustments } from "@/components/hr/PayrollAdjustments";
import { SendPayrollSlips } from "@/components/hr/SendPayrollSlips";
import { EmployeeImport } from "@/components/hr/EmployeeImport";
import { PayrollAgentDashboard } from "@/components/payroll-agent/PayrollAgentDashboard";
import { EmployeeDrawer } from "@/components/hr/EmployeeDrawer";
import { PayrollReports } from "@/components/hr/PayrollReports";
import { SalaryRevision } from "@/components/hr/SalaryRevision";
import { pickDefaultCompanyId } from "@/lib/company-selection";
import { OnboardingChecklist } from "@/components/hr/OnboardingChecklist";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend } from "recharts";
import { differenceInDays } from "date-fns";
import { useChartTheme } from "@/hooks/useChartTheme";
import { KOMMUN_SKATT_2026 } from "@/lib/kommunSkatt";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

interface Company { id: string; name: string; }
interface Employee {
  id: string; first_name: string; last_name: string; personal_number: string;
  email: string | null; employment_type: string; monthly_salary: number | null;
  is_active: boolean; vacation_days_per_year: number; vacation_days_used: number | null;
  vacation_pay_percentage: number;
}
interface PayrollRun {
  id: string; period_start: string; period_end: string; payment_date: string;
  status: string; total_gross: number; total_net: number; total_tax: number;
  total_employer_cost: number;
}

/* ── Animated counter ── */
const AnimatedNumber = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const dur = 1200; const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      setDisplay(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{fmt(display)}{suffix}</>;
};

/* ── KPI Card ── */
const KPICard = ({ icon: Icon, gradient, title, subtitle, value, extra, delay = 0 }: {
  icon: React.ElementType; gradient: string; title: string; subtitle: string;
  value: React.ReactNode; extra?: React.ReactNode; delay?: number;
}) => (
  <div
    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-[0_8px_32px_rgba(0,0,0,0.18)] hover:scale-[1.02] transition-transform duration-200 animate-fade-in`}
    style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
  >
    <div className="flex items-start justify-between">
      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-2 text-white/70 text-xs font-medium uppercase tracking-wider">
          <Icon className="h-4 w-4" />{subtitle}
        </div>
        <div className="text-2xl font-bold tracking-tight tabular-nums">{value}</div>
        <div className="text-sm text-white/80">{title}</div>
        {extra}
      </div>
    </div>
    <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/5" />
  </div>
);

/* ── Employee Avatar ── */
const EmpAvatar = ({ name }: { name: string }) => {
  const initials = name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
  const colors = [
    "from-violet-500 to-indigo-500", "from-emerald-500 to-blue-500",
    "from-rose-500 to-pink-500", "from-amber-500 to-orange-500",
    "from-blue-500 to-[#3b82f6]", "from-fuchsia-500 to-purple-500",
  ];
  return (
    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${colors[name.charCodeAt(0) % colors.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
      {initials}
    </div>
  );
};

/* ── Mini salary bar ── */
const SalaryMiniBar = ({ gross, tax, net }: { gross: number; tax: number; net: number }) => {
  if (!gross) return null;
  const taxPct = (tax / gross) * 100;
  const netPct = (net / gross) * 100;
  return (
    <div className="flex h-2 rounded-full overflow-hidden w-full max-w-[160px]">
      <div className="bg-blue-500" style={{ width: `${100 - taxPct}%` }} />
      <div className="bg-rose-400" style={{ width: `${taxPct}%` }} />
    </div>
  );
};

/* ── Chart custom tooltip ── */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/97 backdrop-blur-md border border-border rounded-xl p-3 shadow-lg text-sm">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </span>
          <span className="font-mono font-semibold tabular-nums">{fmt(p.value)} kr</span>
        </div>
      ))}
    </div>
  );
};

const HR = () => {
  const chartTheme = useChartTheme();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [drawerEmployee, setDrawerEmployee] = useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    first_name: "", last_name: "", personal_number: "", email: "",
    monthly_salary: "", employment_start: new Date().toISOString().split('T')[0],
    tax_table: "", tax_column: "", municipality: "",
    employment_type: "permanent" as "permanent" | "temporary" | "hourly",
    vacation_days_per_year: "25", vacation_pay_percentage: "12",
  });
  const [manualInput, setManualInput] = useState(false);
  const [lookingUpPerson, setLookingUpPerson] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);
  useEffect(() => { if (user) loadCompanies(); }, [user]);
  useEffect(() => { if (selectedCompany) { loadEmployees(); loadPayrollRuns(); } }, [selectedCompany]);

  const loadCompanies = async () => {
    const { data, error } = await supabase.from("companies").select("id, name").order("name");
    if (error) { toast.error("Kunde inte ladda företag"); return; }
    setCompanies(data || []);
    if (data?.length) setSelectedCompany(pickDefaultCompanyId(data));
  };

  const loadEmployees = async () => {
    if (!selectedCompany) return;
    setLoadingData(true);
    try {
      const { data, error } = await supabase.from("employees").select("*").eq("company_id", selectedCompany).order("last_name");
      if (error) throw error;
      setEmployees(data || []);
    } catch { toast.error("Kunde inte ladda anställda"); }
    finally { setLoadingData(false); }
  };

  const loadPayrollRuns = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from("payroll_runs").select("*").eq("company_id", selectedCompany).order("period_start", { ascending: false }).limit(12);
    setPayrollRuns(data || []);
  };

  const lookupPersonalNumber = async (personalNumber: string, monthlySalary?: string, municipalityOverride?: string) => {
    if (!personalNumber || personalNumber.length < 10) return;
    const municipality = municipalityOverride || newEmployee.municipality;
    setLookingUpPerson(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lookup-person`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ personal_number: personalNumber, monthly_salary: monthlySalary ? parseFloat(monthlySalary) : null, municipality: municipality || null }),
      });
      if (!response.ok) throw new Error("Kunde inte slå upp personnummer");
      const result = await response.json();
      if (result.success && result.data) {
        const updates: any = { vacation_days_per_year: result.data.vacation_days_per_year.toString() };
        // Skattetabell bestäms ALLTID av kommun (KOMMUN_SKATT_2026), inte av lön/ålder.
        // Edge-funktionens tax_table ignoreras avsiktligt här. Endast kolumn (ålder) används.
        if (!manualInput && result.data.tax_column) {
          updates.tax_column = result.data.tax_column.toString();
        }
        setNewEmployee(prev => ({ ...prev, ...updates }));
        const kommunInfo = municipality ? KOMMUN_SKATT_2026[municipality] : null;
        if (kommunInfo) {
          toast.success(`${municipality}: tabell ${kommunInfo.skattetabell}, kolumn ${result.data.tax_column ?? 1}`, { duration: 5000 });
        } else {
          toast.info("Personnummer verifierat! Välj kommun för korrekt skattetabell.");
        }
      }
    } catch (e: any) { toast.error(e.message || "Kunde inte slå upp personnummer"); }
    finally { setLookingUpPerson(false); }
  };

  const addEmployee = async () => {
    if (!selectedCompany || !user) return;
    if (!newEmployee.first_name || !newEmployee.last_name || !newEmployee.personal_number) { toast.error("Fyll i alla obligatoriska fält"); return; }
    try {
      const { error } = await supabase.from("employees").insert({
        company_id: selectedCompany, first_name: newEmployee.first_name, last_name: newEmployee.last_name,
        personal_number: newEmployee.personal_number, email: newEmployee.email || null,
        monthly_salary: newEmployee.monthly_salary ? parseFloat(newEmployee.monthly_salary) : null,
        employment_start: newEmployee.employment_start, tax_table: newEmployee.tax_table || null,
        tax_column: newEmployee.tax_column ? parseInt(newEmployee.tax_column) : null,
        municipality: newEmployee.municipality || null, employment_type: newEmployee.employment_type,
        vacation_days_per_year: parseInt(newEmployee.vacation_days_per_year),
        vacation_pay_percentage: parseFloat(newEmployee.vacation_pay_percentage), created_by: user.id,
      });
      if (error) throw error;
      toast.success("Anställd tillagd!");
      setShowAddEmployee(false);
      setNewEmployee({ first_name: "", last_name: "", personal_number: "", email: "", monthly_salary: "",
        employment_start: new Date().toISOString().split('T')[0], tax_table: "", tax_column: "", municipality: "",
        employment_type: "permanent", vacation_days_per_year: "25", vacation_pay_percentage: "12" });
      setManualInput(false);
      loadEmployees();
    } catch (e: any) {
      if (e?.code === "23505" || /duplicate key/i.test(e?.message || "")) {
        toast.error(`En anställd med personnummer ${newEmployee.personal_number} finns redan i bolaget.`);
      } else {
        toast.error(e.message || "Kunde inte lägga till anställd");
      }
    }
  };

  const createPayrollRun = async () => {
    if (!selectedCompany || !user) return;
    const today = new Date();
    const period_start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const period_end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    const payment_date = new Date(today.getFullYear(), today.getMonth() + 1, 25).toISOString().split('T')[0];
    try {
      const { data: payrollRun, error } = await supabase.from("payroll_runs").insert({
        company_id: selectedCompany, period_start, period_end, payment_date, created_by: user.id,
      }).select().maybeSingle();
      if (error) throw error;
      if (!payrollRun) throw new Error('Failed to create payroll run');
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-payroll-lines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ payroll_run_id: payrollRun.id }),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || "Kunde inte generera lönerader"); }
      toast.success("Lönekörning skapad med automatiska skatteberäkningar!");
      loadPayrollRuns();
    } catch (e: any) { toast.error(e.message || "Kunde inte skapa lönekörning"); }
  };

  const approvePayrollRun = async (runId: string) => {
    if (!user) return;
    const { error } = await supabase.from("payroll_runs").update({ status: "approved", approved_by: user.id }).eq("id", runId);
    if (error) { toast.error("Kunde inte godkänna lönekörning"); return; }
    toast.success("Lönekörning godkänd!");
    loadPayrollRuns();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  const activeEmployees = employees.filter(e => e.is_active);
  const totalSalary = activeEmployees.reduce((s, e) => s + (e.monthly_salary || 0), 0);
  const totalEmployerFee = totalSalary * 0.3142;
  const totalEmployerCost = totalSalary + totalEmployerFee;
  const latestRun = payrollRuns[0];
  const totalNet = latestRun?.total_net || Math.round(totalSalary * 0.7);
  const draftRuns = payrollRuns.filter(r => r.status === 'draft');
  const currentMonth = new Date().toLocaleDateString("sv-SE", { month: "long", year: "numeric" });

  // AGI deadline: 12th of the month after payroll month
  const now = new Date();
  const agiDeadline = new Date(now.getFullYear(), now.getMonth() + 1, 12);
  if (now.getDate() > 12) agiDeadline.setMonth(agiDeadline.getMonth() + 1);
  const daysToAGI = differenceInDays(agiDeadline, now);

  const filteredEmployees = employees.filter(e => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) || e.personal_number.includes(q);
  });

  // Chart data
  const chartData = useMemo(() => {
    return activeEmployees.filter(e => e.monthly_salary).map(e => {
      const gross = e.monthly_salary || 0;
      const avgTaxRate = 0.30;
      const tax = Math.round(gross * avgTaxRate);
      const employerFee = Math.round(gross * 0.3142);
      const net = gross - tax;
      return {
        name: `${e.first_name} ${e.last_name.charAt(0)}.`,
        Bruttolön: gross, Arbetsgivaravgift: employerFee,
        Preliminärskatt: tax, Nettolön: net,
      };
    }).sort((a, b) => b.Bruttolön - a.Bruttolön).slice(0, 12);
  }, [activeEmployees]);

  return (
    <div>
      <PageHeader
        icon={Briefcase}
        title="Lön & Personal"
        subtitle="Hantera anställda, löner och arbetsgivaravgifter"
        actions={companies.length > 1 ? (
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        ) : undefined}
      />
      <div className="px-8 space-y-6 pb-12">

        {/* ── HERO KPI ROW ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CARD 1 — Total lönekostnad */}
          <div className="relative overflow-hidden rounded-[12px] p-4" style={{ background: "#FAFBFC", border: "0.5px solid #DFE4EA" }}>
            <div className="absolute top-0 left-0 right-0" style={{ height: "1.5px", background: "#0040CC" }} />
            <div className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">TOTAL LÖNEKOSTNAD</div>
            <div className="mt-1 text-[20px] font-medium tracking-[-0.02em] tabular-nums text-[#0F172A]">
              <AnimatedNumber value={totalEmployerCost} /> kr
            </div>
            <div className="mt-[2px] text-[11px] text-[#94A3B8]">Inkl. arbetsgivaravgifter 31,42%</div>
            <span className="mt-2 inline-block rounded-full bg-[#EFF6FF] px-[8px] py-px text-[10px] font-medium text-[#0C447C]" style={{ border: "0.5px solid #85B7EB" }}>
              Brutto {fmt(totalSalary)} kr
            </span>
          </div>

          {/* CARD 2 — Antal anställda */}
          <div className="relative overflow-hidden rounded-[12px] p-4" style={{ background: "#FAFBFC", border: "0.5px solid #DFE4EA" }}>
            <div className="absolute top-0 left-0 right-0" style={{ height: "1.5px", background: "#1D9E75" }} />
            <div className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">ANTAL ANSTÄLLDA</div>
            <div className="mt-1 text-[20px] font-medium tracking-[-0.02em] tabular-nums text-[#0F172A]">
              {activeEmployees.length} st
            </div>
            <div className="mt-[2px] text-[11px] text-[#94A3B8]">Aktiva anställda</div>
          </div>

          {/* CARD 3 — AGI förfaller */}
          <div className="relative overflow-hidden rounded-[12px] p-4" style={{ background: "#FAFBFC", border: "0.5px solid #DFE4EA" }}>
            <div className="absolute top-0 left-0 right-0" style={{ height: "1.5px", background: "#EF9F27" }} />
            <div className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">AGI FÖRFALLER</div>
            <div className="mt-1 text-[18px] font-medium tracking-[-0.02em] text-[#0F172A]">
              {daysToAGI === 0 ? "IDAG" : `Om ${daysToAGI} dagar`}
            </div>
            <div className="mt-[2px] text-[11px] text-[#94A3B8]">Arbetsgivardeklaration</div>
          </div>

          {/* CARD 4 — Nettöverföringar */}
          <div className="relative overflow-hidden rounded-[12px] p-4" style={{ background: "#FAFBFC", border: "0.5px solid #DFE4EA" }}>
            <div className="absolute top-0 left-0 right-0" style={{ height: "1.5px", background: "#0040CC" }} />
            <div className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">NETTÖVERFÖRINGAR</div>
            <div className="mt-1 text-[20px] font-medium tracking-[-0.02em] tabular-nums text-[#0F172A]">
              <AnimatedNumber value={totalNet} /> kr
            </div>
            <div className="mt-[2px] text-[11px] text-[#94A3B8]">Utbetalt till anställda</div>
            <span className="mt-2 inline-block rounded-full bg-[#E1F5EE] px-[8px] py-px text-[10px] font-medium text-[#085041]" style={{ border: "0.5px solid #5DCAA5" }}>
              {activeEmployees.length} löner
            </span>
          </div>
        </div>

        {/* ── PAYROLL RUN BANNER ── */}
        {draftRuns.length > 0 && (
          <div className="relative overflow-hidden rounded-[12px]" style={{ background: "#FAFBFC", border: "0.5px solid #DFE4EA", padding: "12px 16px" }}>
            <div className="absolute top-0 left-0 right-0" style={{ height: "1.5px", background: "#0040CC" }} />
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-[12px]">
                {/* Step 1 — Löner inmatade (completed) */}
                <div className="flex items-center gap-[8px]">
                  <div className="w-[22px] h-[22px] rounded-full bg-[#E1F5EE] flex items-center justify-center" style={{ border: "0.5px solid #5DCAA5" }}>
                    <span className="text-[#085041] text-[11px] font-medium leading-none">✓</span>
                  </div>
                  <span className="text-[11px] font-medium text-[#0F6E56]">Löner inmatade</span>
                </div>
                <div className="w-[24px] h-px bg-[#E2E8F0]" />
                {/* Step 2 — Semesterdagar (completed) */}
                <div className="flex items-center gap-[8px]">
                  <div className="w-[22px] h-[22px] rounded-full bg-[#E1F5EE] flex items-center justify-center" style={{ border: "0.5px solid #5DCAA5" }}>
                    <span className="text-[#085041] text-[11px] font-medium leading-none">✓</span>
                  </div>
                  <span className="text-[11px] font-medium text-[#0F6E56]">Semesterdagar</span>
                </div>
                <div className="w-[24px] h-px bg-[#E2E8F0]" />
                {/* Step 3 — AGI skickad (pending) */}
                <div className="flex items-center gap-[8px]">
                  <div className="w-[22px] h-[22px] rounded-full bg-[#F1F5F9] flex items-center justify-center" style={{ border: "0.5px solid #E2E8F0" }}>
                    <span className="text-[#94A3B8] text-[11px] leading-none">○</span>
                  </div>
                  <span className="text-[11px] text-[#94A3B8]">AGI skickad</span>
                </div>
              </div>
              <Button
                onClick={() => approvePayrollRun(draftRuns[0].id)}
                className="bg-[#0040CC] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[8px] text-[12px] font-medium px-[14px] h-[34px] border-0"
              >
                Godkänn lönekörning
              </Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="employees" className="space-y-4">
          <div className="overflow-x-auto -mx-4 px-4">
            <TabsList>
              <TabsTrigger value="employees">Anställda</TabsTrigger>
              <TabsTrigger value="payroll">Lönekörningar</TabsTrigger>
              <TabsTrigger value="chart">Löneanalys</TabsTrigger>
              <TabsTrigger value="payroll-agent">Löneagent</TabsTrigger>
              <TabsTrigger value="reports">Rapporter</TabsTrigger>
              <TabsTrigger value="revision">Lönerevision</TabsTrigger>
              <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
            </TabsList>
          </div>

          {/* ── EMPLOYEES ── */}
          <TabsContent value="employees">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Sök anställd..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <div className="flex gap-2">
                <EmployeeImport companyId={selectedCompany} onImportComplete={loadEmployees} />
                <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
                  <DialogTrigger asChild>
                    <Button><Plus className="w-4 h-4 mr-2" />Ny anställd</Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Lägg till anställd</DialogTitle>
                      <DialogDescription>Fyll i information om den nya anställda</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4 pb-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <Label>Personnummer *</Label>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="manual-input" checked={manualInput} onChange={e => setManualInput(e.target.checked)} className="h-4 w-4" />
                            <label htmlFor="manual-input" className="text-sm text-muted-foreground cursor-pointer">Fyll i manuellt</label>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Input value={newEmployee.personal_number}
                            onChange={e => { let v = e.target.value.replace(/\D/g, ''); if (v.length > 8) v = v.slice(0, 8) + '-' + v.slice(8, 12); setNewEmployee({ ...newEmployee, personal_number: v }); }}
                            onBlur={e => { const cleaned = e.target.value.replace(/\D/g, ''); if (!manualInput && cleaned.length >= 10) lookupPersonalNumber(e.target.value, newEmployee.monthly_salary); }}
                            placeholder="YYYYMMDD-XXXX" maxLength={13} />
                          {!manualInput && (
                            <Button type="button" variant="outline" onClick={() => lookupPersonalNumber(newEmployee.personal_number, newEmployee.monthly_salary)} disabled={lookingUpPerson || newEmployee.personal_number.length < 10}>
                              {lookingUpPerson ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verifiera"}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Förnamn *</Label><Input value={newEmployee.first_name} onChange={e => setNewEmployee({ ...newEmployee, first_name: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Efternamn *</Label><Input value={newEmployee.last_name} onChange={e => setNewEmployee({ ...newEmployee, last_name: e.target.value })} /></div>
                      </div>
                      <div className="space-y-2"><Label>E-post</Label><Input type="email" value={newEmployee.email} onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })} /></div>
                      <div className="space-y-2">
                        <Label>Månadslön (kr)</Label>
                        <Select value={newEmployee.monthly_salary} onValueChange={v => { setNewEmployee({ ...newEmployee, monthly_salary: v }); if (!manualInput && newEmployee.personal_number.replace(/\D/g, '').length >= 10 && v) setTimeout(() => lookupPersonalNumber(newEmployee.personal_number, v), 100); }}>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="Välj lön" /></SelectTrigger>
                          <SelectContent className="bg-background">
                            {[25000,30000,35000,40000,45000,50000,55000,60000,65000,70000,80000,90000,100000].map(v => <SelectItem key={v} value={String(v)}>{fmt(v)} kr</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input type="number" value={newEmployee.monthly_salary} onChange={e => setNewEmployee({ ...newEmployee, monthly_salary: e.target.value })}
                          onBlur={e => { if (!manualInput && newEmployee.personal_number.replace(/\D/g, '').length >= 10 && e.target.value) lookupPersonalNumber(newEmployee.personal_number, e.target.value); }}
                          placeholder="Eller ange annat belopp" className="mt-2" />
                      </div>
                      <div className="space-y-2">
                        <Label>Anställningsform *</Label>
                        <Select value={newEmployee.employment_type} onValueChange={(v: "permanent" | "temporary" | "hourly") => setNewEmployee({ ...newEmployee, employment_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="permanent">Tillsvidare</SelectItem>
                            <SelectItem value="temporary">Visstid</SelectItem>
                            <SelectItem value="hourly">Timanställd</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Semesterdagar/år</Label><Input type="number" value={newEmployee.vacation_days_per_year} onChange={e => setNewEmployee({ ...newEmployee, vacation_days_per_year: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Semesterersättning %</Label><Input type="number" step="0.1" value={newEmployee.vacation_pay_percentage} onChange={e => setNewEmployee({ ...newEmployee, vacation_pay_percentage: e.target.value })} /></div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>Skattetabell</Label><Input value={newEmployee.tax_table} onChange={e => setNewEmployee({ ...newEmployee, tax_table: e.target.value })} placeholder="T.ex. 30" disabled={!manualInput && lookingUpPerson} /></div>
                        <div className="space-y-2"><Label>Skattekolumn</Label><Input type="number" value={newEmployee.tax_column} onChange={e => setNewEmployee({ ...newEmployee, tax_column: e.target.value })} placeholder="T.ex. 1" disabled={!manualInput && lookingUpPerson} /></div>
                        <div className="space-y-2">
                          <Label>Kommun *</Label>
                          <Select value={newEmployee.municipality} onValueChange={v => {
                            const info = KOMMUN_SKATT_2026[v];
                            setNewEmployee(prev => ({
                              ...prev,
                              municipality: v,
                              tax_table: info ? String(info.skattetabell) : prev.tax_table,
                              tax_column: info ? String(info.defaultKolumn) : prev.tax_column,
                            }));
                            if (!manualInput && newEmployee.personal_number.length >= 10 && newEmployee.monthly_salary) {
                              lookupPersonalNumber(newEmployee.personal_number, newEmployee.monthly_salary, v);
                            }
                          }}>
                            <SelectTrigger className="bg-background"><SelectValue placeholder="Välj kommun" /></SelectTrigger>
                            <SelectContent className="max-h-[300px] bg-background z-50">
                              {Object.keys(KOMMUN_SKATT_2026).sort((a,b) => a.localeCompare(b, "sv")).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2"><Label>Anställningsdatum</Label><Input type="date" value={newEmployee.employment_start} onChange={e => setNewEmployee({ ...newEmployee, employment_start: e.target.value })} /></div>
                      <Button onClick={addEmployee} className="w-full">Lägg till anställd</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Employee Grid */}
            {loadingData ? (
              <div className="py-12 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : filteredEmployees.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredEmployees.map(emp => {
                  const gross = emp.monthly_salary || 0;
                  const tax = Math.round(gross * 0.30);
                  const net = gross - tax;
                  const lastRun = payrollRuns.find(r => r.status === 'approved');
                  return (
                    <Card key={emp.id} className="border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => setDrawerEmployee(emp)}>
                      <div className="h-[3px] bg-emerald-500" />
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-start gap-3 mb-3">
                          <EmpAvatar name={`${emp.first_name} ${emp.last_name}`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">{emp.first_name} {emp.last_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {emp.employment_type === 'permanent' ? 'Tillsvidare' : emp.employment_type === 'temporary' ? 'Visstid' : 'Timanställd'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            
                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${emp.is_active ? "bg-[#E1F5EE] text-[#085041]" : "bg-muted text-muted-foreground"}`}>
                              {emp.is_active ? "Aktiv" : "Inaktiv"}
                            </span>
                          </div>
                        </div>

                        {gross > 0 && (
                          <>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge className="bg-[#F1F5F9] text-violet-500 border-[#E2E8F0] text-[10px]">Brutto {fmt(gross)} kr</Badge>
                              <Badge className="bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8] text-[10px]">Skatt {fmt(tax)} kr</Badge>
                              <Badge className="bg-[#E1F5EE] text-[#085041] border-[#BFE6D6] text-[10px]">Netto {fmt(net)} kr</Badge>
                            </div>
                            <SalaryMiniBar gross={gross} tax={tax} net={net} />
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] text-muted-foreground">{emp.vacation_days_per_year} semesterdagar</span>
                              {lastRun ? (
                                <span className="text-[10px] text-[#1D9E75] flex items-center gap-1"><CheckCircle className="h-3 w-3" />Lönekörning klar</span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border border-muted-foreground" />Ej körd</span>
                              )}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="overflow-hidden">
                <div className="h-[3px] bg-emerald-500" />
                <CardContent className="py-16 text-center">
                  <div className="rounded-2xl bg-[#E1F5EE] dark:bg-emerald-900/30 p-3 inline-block mb-4">
                    <Users className="w-12 h-12 text-emerald-300 dark:text-[#085041]" />
                  </div>
                  <p className="text-slate-500 font-medium mt-4">Inga anställda ännu</p>
              </CardContent></Card>
            )}
          </TabsContent>

          {/* ── PAYROLL RUNS ── */}
          <TabsContent value="payroll">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Lönekörningar</h2>
              <Button onClick={createPayrollRun}><Plus className="w-4 h-4 mr-2" />Ny lönekörning</Button>
            </div>
            {payrollRuns.length > 0 ? (
              <div className="space-y-3">
                {payrollRuns.map(run => {
                  const accent = run.status === 'approved' ? '#1D9E75' : run.status === 'draft' ? '#EF9F27' : '#94A3B8';
                  return (
                    <div key={run.id} className="relative overflow-hidden rounded-[12px] bg-white border-[0.5px] border-[#E2E8F0] px-[16px] py-[12px]">
                      <div className="absolute top-0 left-0 right-0" style={{ height: "1.5px", background: accent }} />
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <p className="text-[13px] font-medium text-[#0F172A]">
                            {new Date(run.period_start).toLocaleDateString('sv-SE')} – {new Date(run.period_end).toLocaleDateString('sv-SE')}
                          </p>
                          <p className="text-[11px] text-[#94A3B8] mt-[2px]">Utbetalning: {new Date(run.payment_date).toLocaleDateString('sv-SE')}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="rounded-full bg-[#EFF6FF] text-[#0C447C] text-[10px] font-medium px-[8px] py-px tabular-nums" style={{ border: "0.5px solid #85B7EB" }}>
                              Brutto {fmt(run.total_gross)} kr
                            </span>
                            <span className="rounded-full bg-[#FCEBEB] text-[#791F1F] text-[10px] font-medium px-[8px] py-px tabular-nums" style={{ border: "0.5px solid #F09595" }}>
                              Skatt {fmt(run.total_tax)} kr
                            </span>
                            <span className="rounded-full bg-[#E1F5EE] text-[#085041] text-[10px] font-medium px-[8px] py-px tabular-nums" style={{ border: "0.5px solid #5DCAA5" }}>
                              Netto {fmt(run.total_net)} kr
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {run.status === 'draft' && (
                            <>
                              <Button
                                onClick={() => approvePayrollRun(run.id)}
                                className="bg-[#0040CC] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[8px] text-[11px] font-medium px-[12px] h-[30px] border-0"
                              >
                                Godkänn
                              </Button>
                              <span className="text-[11px] text-[#94A3B8] cursor-pointer hover:text-[#475569]">Utkast</span>
                            </>
                          )}
                          {run.status === 'approved' && (
                            <>
                              <SendPayrollSlips payrollRunId={run.id} onComplete={() => loadPayrollRuns()} />
                              <span className="rounded-full bg-[#E1F5EE] text-[#085041] text-[10px] font-medium px-[8px] py-px" style={{ border: "0.5px solid #5DCAA5" }}>
                                Godkänd
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Card className="overflow-hidden">
                <div className="h-[3px] bg-emerald-500" />
                <CardContent className="py-16 text-center">
                  <div className="rounded-2xl bg-[#E1F5EE] dark:bg-emerald-900/30 p-3 inline-block mb-4">
                    <DollarSign className="w-12 h-12 text-emerald-300 dark:text-[#085041]" />
                  </div>
                  <p className="text-slate-500 font-medium mt-4">Inga lönekörningar ännu</p>
              </CardContent></Card>
            )}
          </TabsContent>

          {/* ── TAX BREAKDOWN CHART ── */}
          <TabsContent value="chart">
            <Card className="border-slate-100 dark:border-slate-700 overflow-hidden">
              <div className="h-[3px] bg-emerald-500" />
              <CardHeader className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <CardTitle className="flex items-center gap-3">
                  <div className="rounded-xl p-2 bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-[#1D9E75]">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  Löneanalys per anställd
                </CardTitle>
                <CardDescription>Bruttolön, arbetsgivaravgift, preliminärskatt och netto</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" strokeWidth={0.5} vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                      <RTooltip content={<ChartTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "#94A3B8" }} />
                      <Bar dataKey="Bruttolön" stackId="a" fill="#0040CC" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Arbetsgivaravgift" stackId="b" fill="#EF9F27" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Preliminärskatt" stackId="c" fill="#E24B4A" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Nettolön" stackId="d" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">Lägg till anställda med lön för att se analysen</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PAYROLL AGENT ── */}
          <TabsContent value="payroll-agent">
            {selectedCompany ? (
              <PayrollAgentDashboard companyId={selectedCompany} />
            ) : (
              <Card><CardContent className="py-12 text-center text-muted-foreground"><p>Välj ett bolag</p></CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="reports">
            {selectedCompany ? <PayrollReports companyId={selectedCompany} employees={employees} payrollRuns={payrollRuns} /> : <Card><CardContent className="py-12 text-center text-muted-foreground"><p>Välj ett bolag</p></CardContent></Card>}
          </TabsContent>
          <TabsContent value="revision">
            {selectedCompany ? <SalaryRevision companyId={selectedCompany} employees={employees} /> : <Card><CardContent className="py-12 text-center text-muted-foreground"><p>Välj ett bolag</p></CardContent></Card>}
          </TabsContent>
          <TabsContent value="onboarding">
            {selectedCompany ? <OnboardingChecklist companyId={selectedCompany} employees={employees} /> : <Card><CardContent className="py-12 text-center text-muted-foreground"><p>Välj ett bolag</p></CardContent></Card>}
          </TabsContent>
        </Tabs>

        <EmployeeDrawer employee={drawerEmployee} open={!!drawerEmployee} onClose={() => setDrawerEmployee(null)} companyId={selectedCompany} onUpdate={loadEmployees} />
      </div>
    </div>
  );
};

export default HR;
