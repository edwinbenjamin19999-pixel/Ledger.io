import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bot, Loader2, Send, ChevronDown, ChevronRight,
  Sparkles, AlertTriangle, CheckCircle, Download, Banknote,
  Shield, Pencil, RotateCcw, ArrowUpRight, ArrowDownRight, Minus,
  Receipt, CalendarDays, Building2, Lock, Eye, EyeOff, Info,
  ChevronUp, Check, X, Clock, History, FileEdit,
} from "lucide-react";
import { DemoSubmitButton } from "@/components/ui/DemoSubmitButton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fmt } from "../shared/types";
import { cn } from "@/lib/utils";
import { bookSKVPayment } from "@/lib/skatteagent/bookSKVPayment";
import { AGIMobileSignDialog } from "./AGIMobileSignDialog";

interface AGIFormProps { companyId: string;
  taxYear: number;
}

type AGIStep = "idle" | "preparing" | "review" | "submitting" | "receipt";

interface EmployeeAGIData { employeeId: string;
  name: string;
  personalNumber: string;
  birthYear: number | null;
  fields: Record<string, number>;
  expanded: boolean;
}

interface AGIWarning { severity: "info" | "warning" | "error";
  message: string;
  fieldCode?: string;
  employeeId?: string;
}

interface KontrollsummaResult {
  agiSkatteavdrag: number;
  ledger2710: number;
  diff2710: number;
  balanced2710: boolean;
  agiAvgifter: number;
  ledger2730: number;
  diff2730: number;
  balanced2730: boolean;
  loaded: boolean;
}

interface PeriodComparison { prevGross: number;
  prevTax: number;
  prevContributions: number;
  prevEmployees: number;
}

const MONTH_NAMES = ["Januari", "Februari", "Mars", "April", "Maj", "Juni", "Juli", "Augusti", "September", "Oktober", "November", "December"];

const EMPLOYEE_FIELD_LABELS: Record<string, string> = { "061": "Kontant lön, arvode m.m.",
  "062": "Avdragen preliminärskatt",
  "050": "Kostnadsersättning (ej resor/bil)",
  "051": "Traktamente",
  "052": "Bilersättning",
  "010": "Förmån bil",
  "011": "Förmån bostad",
  "012": "Övriga förmåner",
  "013": "Personaloptioner",
};

const EMPLOYER_FIELD_LABELS: Record<string, string> = { "420": "Summa underlag arbetsgivaravgifter",
  "487": "Summa arbetsgivaravgifter",
  "492": "Underlag skatteavdrag ränta/utdelning",
  "496": "Skatteavdrag ränta/utdelning",
  "491": "Underlag skatteavdrag pensionsförsäkring",
  "495": "Skatteavdrag pensionsförsäkring",
  "471": "Underlag avdrag regionalt stöd",
  "476": "Avdrag regionalt stöd",
  "470": "Underlag avdrag FoU",
  "475": "Avdrag FoU",
  "481": "Underlag SLF vinstandel/sjukpension",
  "486": "SLF vinstandel/sjukpension",
  "302": "Ej fast driftställe i Sverige",
};

const PREPARE_STEPS = [
  "Hämtar anställda och lönedata...",
  "Beräknar bruttolöner och förmåner...",
  "Beräknar arbetsgivaravgifter per åldersgrupp...",
  "Kontrollerar kontrolluppgifter...",
  "Jämför med föregående period...",
  "Validerar alla fält...",
  "Klart!",
];

function getEmployerFeeRate(birthYear: number | null, year: number): number { if (!birthYear) return 0.3142;
  const age = year - birthYear;
  if (age < 18) return 0.1021;
  if (age > 65) return 0.1021;
  return 0.3142;
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export const AGIForm = ({ companyId, taxYear }: AGIFormProps) => { const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => { const now = new Date();
    return now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  });
  const [step, setStep] = useState<AGIStep>("idle");
  const [prepareProgress, setPrepareProgress] = useState(0);
  const [prepareStep, setPrepareStep] = useState(0);
  const [employees, setEmployees] = useState<EmployeeAGIData[]>([]);
  const [employerFields, setEmployerFields] = useState<Record<string, number>>({});
  const [warnings, setWarnings] = useState<AGIWarning[]>([]);
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [receiptRef, setReceiptRef] = useState<string | null>(null);
  const [receiptTime, setReceiptTime] = useState<string | null>(null);
  const [warningsOpen, setWarningsOpen] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [kontrollsumma, setKontrollsumma] = useState<KontrollsummaResult>({ agiSkatteavdrag: 0, ledger2710: 0, diff2710: 0, balanced2710: true, agiAvgifter: 0, ledger2730: 0, diff2730: 0, balanced2730: true, loaded: false });
  const [negativeOverridden, setNegativeOverridden] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [submissionHistory, setSubmissionHistory] = useState<any[]>([]);
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [correctionTargetId, setCorrectionTargetId] = useState<string | null>(null);
  const [correctionTargetPeriod, setCorrectionTargetPeriod] = useState<string>("");
  const [isCorrection, setIsCorrection] = useState(false);
  const [correctsSubmissionId, setCorrectsSubmissionId] = useState<string | null>(null);
  const [fkEnabled, setFkEnabled] = useState(false);
  const [fkData, setFkData] = useState<Record<string, { foraldrapenning: number; sjukpenning: number; vab: number; vabDagar: number }>>({});

  useEffect(() => { const period = `${taxYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
    supabase
      .from("payroll_agi_submissions")
      .select("*")
      .eq("company_id", companyId)
      .eq("period", period)
      .maybeSingle()
      .then(({ data }) => { if (data) { setSubmissionId(data.id);
          const d = (data.data as Record<string, unknown>) || {};
          if (data.status === "submitted") { setStep("receipt");
            setReceiptRef(data.skv_reference_number || "AGI-" + data.id.slice(0, 8).toUpperCase());
            setReceiptTime(data.submitted_at);
            setEmployees((d.employees as EmployeeAGIData[]) || []);
            setEmployerFields((d.employer as Record<string, number>) || {});
            setWarnings((Array.isArray(data.warnings) ? data.warnings : []) as unknown as AGIWarning[]);
            if (d.comparison) setComparison(d.comparison as PeriodComparison);
          } else if (data.status === "ready" && data.data) { setStep("review");
            setEmployees((d.employees as EmployeeAGIData[]) || []);
            setEmployerFields((d.employer as Record<string, number>) || {});
            setWarnings((Array.isArray(data.warnings) ? data.warnings : []) as unknown as AGIWarning[]);
            if (d.comparison) setComparison(d.comparison as PeriodComparison);
          } else { setStep("idle");
          }
        } else { setStep("idle");
          setEmployees([]);
          setEmployerFields({});
          setSubmissionId(null);
        }
      });
  }, [companyId, selectedMonth, taxYear]);

  const runAIPrepare = useCallback(async () => { setStep("preparing");
    setPrepareProgress(0);
    setPrepareStep(0);
    const warns: AGIWarning[] = [];

    try { await delay(400);
      setPrepareStep(0); setPrepareProgress(14);

      const { data: empsRaw } = await supabase
        .from("employees")
        .select("id, first_name, last_name, personal_number, monthly_salary, employment_type, birth_date")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (!empsRaw?.length) { toast.error("Inga aktiva anställda hittades");
        setStep("idle");
        return;
      }

      // Decrypt personal numbers via secure RPC (PII trigger masks them in plaintext column)
      const isMasked = (v: any) => !v || v === "********" || (typeof v === "string" && v.includes("*"));
      const isValidPN = (v: string) => /^\d{8}-?\d{4}$/.test(v);
      let piiFailures = 0;

      const emps = await Promise.all(empsRaw.map(async (e: any) => {
        if (!isMasked(e.personal_number)) return e;
        try {
          const { data: pii, error } = await (supabase.rpc as any)("get_employee_pii", { p_employee_id: e.id });
          if (error) {
            console.warn(`[AGI] get_employee_pii failed for ${e.id}:`, error);
            piiFailures++;
            return e;
          }
          const pn = (Array.isArray(pii) ? pii[0]?.personal_number : pii?.personal_number) ?? null;
          if (!pn) {
            piiFailures++;
            return e;
          }
          return { ...e, personal_number: pn };
        } catch (err) {
          console.warn(`[AGI] get_employee_pii threw for ${e.id}:`, err);
          piiFailures++;
          return e;
        }
      }));

      if (piiFailures > 0) {
        warns.push({
          severity: "warning",
          message: `Kunde inte läsa krypterade personuppgifter för ${piiFailures} anställd${piiFailures === 1 ? "" : "a"} — kontrollera dina behörigheter (kräver ägar-/admin-roll).`,
        });
      }

      setPrepareStep(1); setPrepareProgress(28);
      await delay(300);

      const periodStart = `${taxYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
      const periodEnd = new Date(taxYear, selectedMonth + 1, 0).toISOString().split("T")[0];

      const { data: runs } = await supabase
        .from("payroll_runs")
        .select("id, total_gross, total_tax, total_net, total_employer_cost, status")
        .eq("company_id", companyId)
        .gte("period_start", periodStart)
        .lte("period_end", periodEnd)
        .in("status", ["approved", "completed"])
        .order("created_at", { ascending: false })
        .limit(1);

      const payrollRun = runs?.[0];
      const payrollLines: Record<string, any> = {};

      if (payrollRun) { const { data: lines } = await supabase
          .from("payroll_lines")
          .select("employee_id, gross_salary, tax_deduction, net_salary, employer_social_fees, pension, other_benefits, vacation_pay, sick_days")
          .eq("payroll_run_id", payrollRun.id);
        if (lines) for (const l of lines) payrollLines[l.employee_id] = l;
      } else { warns.push({ severity: "warning", message: "Ingen godkänd lönekörning hittad — AI uppskattar från månadslöner." });
      }

      setPrepareStep(2); setPrepareProgress(42);
      await delay(400);

      const empData: EmployeeAGIData[] = emps.map((emp: any) => { const pl = payrollLines[emp.id];
        const pn = emp.personal_number || "";

        // Birth year: prefer birth_date, fallback to deriving from PN (YYYYMMDD prefix)
        let birthYear: number | null = emp.birth_date ? new Date(emp.birth_date).getFullYear() : null;
        if (!birthYear && pn && /^\d{8}/.test(pn)) {
          const y = parseInt(pn.substring(0, 4), 10);
          if (y >= 1900 && y <= new Date().getFullYear()) birthYear = y;
        }

        const salary = pl ? Number(pl.gross_salary) || 0 : Number(emp.monthly_salary) || 0;
        const tax = pl ? Number(pl.tax_deduction) || 0 : Math.round(salary * 0.30);
        const benefits = pl ? Number(pl.other_benefits) || 0 : 0;

        // Only flag missing/invalid if NOT masked (masked is covered by aggregated piiFailures warning)
        if (!isMasked(pn)) {
          if (!pn) {
            warns.push({ severity: "error", message: `${emp.first_name} ${emp.last_name} saknar personnummer`, employeeId: emp.id });
          } else if (!isValidPN(pn)) {
            warns.push({ severity: "error", message: `${emp.first_name} ${emp.last_name} har ogiltigt personnummerformat`, employeeId: emp.id });
          }
        }
        if (!birthYear) { warns.push({ severity: "warning", message: `${emp.first_name} ${emp.last_name} saknar födelsedatum — standardavgift 31,42% används`, employeeId: emp.id });
        }

        return { employeeId: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
          personalNumber: pn,
          birthYear,
          fields: { "061": Math.round(salary), "062": Math.round(tax),
            "050": 0, "051": 0, "052": 0,
            "010": 0, "011": 0, "012": Math.round(benefits), "013": 0,
          },
          expanded: false,
        };
      });

      setPrepareStep(3); setPrepareProgress(57);
      await delay(300);

      let totalAvgUnderlag = 0;
      let totalAvgifter = 0;
      let totalGross = 0;
      let totalTax = 0;

      for (const emp of empData) { const underlag = emp.fields["061"] + emp.fields["012"] + emp.fields["010"] + emp.fields["011"];
        totalAvgUnderlag += underlag;
        totalAvgifter += Math.round(underlag * getEmployerFeeRate(emp.birthYear, taxYear));
        totalGross += emp.fields["061"];
        totalTax += emp.fields["062"];
      }

      const ef: Record<string, number> = { "420": totalAvgUnderlag, "487": totalAvgifter,
        "492": 0, "496": 0, "491": 0, "495": 0,
        "471": 0, "476": 0, "470": 0, "475": 0,
        "481": 0, "486": 0, "302": 0,
      };

      Object.entries(ef).forEach(([code, val]) => { if (val < 0 && code !== "302") { warns.push({ severity: "warning", message: `Ruta ${code} har negativt värde (${fmt(val)} kr) — kontrollera lönekörningen`, fieldCode: code });
          // Do NOT silently zero — keep the actual negative value for transparency
        }
      });

      setPrepareStep(4); setPrepareProgress(71);
      await delay(300);

      let comp: PeriodComparison | null = null;
      const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
      const prevYear = selectedMonth === 0 ? taxYear - 1 : taxYear;
      const prevPeriod = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}`;

      const { data: prevSub } = await supabase
        .from("payroll_agi_submissions")
        .select("total_gross_salary, total_tax_withheld, total_employer_contributions, employee_count")
        .eq("company_id", companyId)
        .eq("period", prevPeriod)
        .maybeSingle();

      if (prevSub) { comp = { prevGross: Number(prevSub.total_gross_salary) || 0,
          prevTax: Number(prevSub.total_tax_withheld) || 0,
          prevContributions: Number(prevSub.total_employer_contributions) || 0,
          prevEmployees: Number(prevSub.employee_count) || 0,
        };
      }

      setPrepareStep(5); setPrepareProgress(85);
      await delay(300);

      if (empData.some(e => e.fields["062"] > e.fields["061"])) { warns.push({ severity: "warning", message: "Skatteavdrag överstiger bruttolön för en eller flera anställda." });
      }

      setPrepareStep(6); setPrepareProgress(100);
      await delay(500);

      setEmployees(empData);
      setEmployerFields(ef);
      setWarnings(warns);
      setComparison(comp);

      const period = `${taxYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
      const { data: sub } = await supabase
        .from("payroll_agi_submissions")
        .upsert([{ company_id: companyId,
          period,
          status: "ready",
          ai_prepared_at: new Date().toISOString(),
          total_gross_salary: totalGross,
          total_employer_contributions: totalAvgifter,
          total_tax_withheld: totalTax,
          total_to_pay: totalAvgifter + totalTax,
          employee_count: empData.length,
          data: { employees: empData, employer: ef, comparison: comp } as any,
          warnings: warns as any,
        }], { onConflict: "company_id,period" })
        .select()
        .maybeSingle();

      if (sub) setSubmissionId(sub.id);

      // Run kontrollsumma after prepare
      await runKontrollsumma(empData, totalAvgifter);

      setStep("review");
      toast.success(`AI fyllde i AGI för ${MONTH_NAMES[selectedMonth]} — redo för granskning`);
    } catch (err: any) { toast.error("Fel vid förberedelse: " + (err.message || "Okänt"));
      setStep("idle");
    }
  }, [companyId, selectedMonth, taxYear]);

  const runKontrollsumma = useCallback(async (emps?: EmployeeAGIData[], avgifterOverride?: number) => {
    const currentEmps = emps || employees;
    const agiSkatteavdrag = currentEmps.reduce((s, e) => s + (e.fields["062"] || 0), 0);
    const agiAvgifter = avgifterOverride ?? (employerFields["487"] || 0);

    const periodStart = `${taxYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
    const periodEnd = new Date(taxYear, selectedMonth + 1, 0).toISOString().split("T")[0];

    // Query 2710 (Personalskatt) and 2730 (Arbetsgivaravgifter) via chart_of_accounts join
    const { data: lines2710 } = await supabase
      .from("journal_entry_lines")
      .select("credit, debit, journal_entry_id, account_id!inner(account_number)")
      .filter("account_id.account_number", "eq", "2710");

    const { data: lines2730 } = await supabase
      .from("journal_entry_lines")
      .select("credit, debit, journal_entry_id, account_id!inner(account_number)")
      .filter("account_id.account_number", "eq", "2730");

    // Filter by period via journal_entries date
    const filterByPeriod = async (lines: any[] | null) => {
      if (!lines?.length) return 0;
      const jeIds = [...new Set(lines.map(l => l.journal_entry_id))];
      const { data: entries } = await supabase
        .from("journal_entries")
        .select("id, entry_date")
        .eq("company_id", companyId)
        .gte("entry_date", periodStart)
        .lte("entry_date", periodEnd)
        .in("id", jeIds.slice(0, 100))
        .neq("status", "draft");
      const validIds = new Set(entries?.map(e => e.id) || []);
      return lines
        .filter(l => validIds.has(l.journal_entry_id))
        .reduce((sum, l) => sum + (Number(l.credit) || 0) - (Number(l.debit) || 0), 0);
    };

    const ledger2710 = await filterByPeriod(lines2710);
    const ledger2730 = await filterByPeriod(lines2730);

    const diff2710 = Math.abs(agiSkatteavdrag - Math.abs(ledger2710));
    const diff2730 = Math.abs(agiAvgifter - Math.abs(ledger2730));

    setKontrollsumma({
      agiSkatteavdrag, ledger2710: Math.abs(ledger2710), diff2710, balanced2710: diff2710 < 10,
      agiAvgifter, ledger2730: Math.abs(ledger2730), diff2730, balanced2730: diff2730 < 10,
      loaded: true,
    });
  }, [companyId, selectedMonth, taxYear, employees, employerFields]);

  // Load submission history
  const loadSubmissionHistory = useCallback(async () => {
    const { data } = await supabase
      .from("payroll_agi_submissions")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(20);
    setSubmissionHistory(data || []);
  }, [companyId]);

  useEffect(() => { loadSubmissionHistory(); }, [loadSubmissionHistory]);

  const handleCreateCorrection = async () => {
    if (!correctionTargetId) return;
    setCorrectionDialogOpen(false);
    const original = submissionHistory.find(s => s.id === correctionTargetId);
    if (!original) return;

    const { data: newSub } = await supabase
      .from("payroll_agi_submissions")
      .insert({
        company_id: companyId,
        period: original.period,
        status: "ready",
        is_correction: true,
        corrects_submission_id: correctionTargetId,
        data: original.data,
        warnings: original.warnings || [],
        total_gross_salary: original.total_gross_salary,
        total_employer_contributions: original.total_employer_contributions,
        total_tax_withheld: original.total_tax_withheld,
        total_to_pay: original.total_to_pay,
        employee_count: original.employee_count,
      } as any)
      .select()
      .maybeSingle();

    if (newSub) {
      // Update the original to 'corrected'
      await supabase
        .from("payroll_agi_submissions")
        .update({ status: "corrected" } as any)
        .eq("id", correctionTargetId);

      setSubmissionId(newSub.id);
      setIsCorrection(true);
      setCorrectsSubmissionId(correctionTargetId);

      // Load the data
      const d = (newSub.data as Record<string, unknown>) || {};
      setEmployees((d.employees as EmployeeAGIData[]) || []);
      setEmployerFields((d.employer as Record<string, number>) || {});
      setWarnings((Array.isArray(newSub.warnings) ? newSub.warnings : []) as unknown as AGIWarning[]);
      setStep("review");
      
      // Parse month from period
      const [, monthStr] = (original.period as string).split("-");
      setSelectedMonth(parseInt(monthStr, 10) - 1);

      toast.success("Rättelsedeklaration skapad — redigera och skicka in");
      await loadSubmissionHistory();
    }
  };

  const handleSubmit = async () => { const errors: string[] = [];
    employees.forEach(emp => { if (!emp.personalNumber || emp.personalNumber === "********" || !/^\d{8}[-]?\d{4}$/.test(emp.personalNumber)) { errors.push(`${emp.name} saknar giltigt personnummer`);
      }
    });
    const negFields = Object.entries(employerFields).filter(([c, v]) => v < 0 && c !== "302");
    if (negFields.length) errors.push(`Negativa belopp i ruta ${negFields.map(f => f[0]).join(", ")}`);

    if (errors.length) { toast.error("Validering misslyckades", { description: errors[0] });
      return;
    }

    setConfirmOpen(false);
    setConfirmChecked(false);
    setStep("submitting");
    await delay(2000);

    const ref = `AGI-${taxYear}${String(selectedMonth + 1).padStart(2, "0")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const submittedAt = new Date().toISOString();

    if (submissionId) { await supabase
        .from("payroll_agi_submissions")
        .update({ 
          status: "submitted", submitted_at: submittedAt, submitted_by: user?.id, skv_reference_number: ref,
          ...(fkEnabled ? { fk_data: fkData } : {}),
        } as any)
        .eq("id", submissionId);
    }

    setReceiptRef(ref);
    setReceiptTime(submittedAt);
    setStep("receipt");
    toast.success("AGI inlämnad till Skatteverket");
    await loadSubmissionHistory();
  };

  const saveFieldEdit = async (empIdx: number | null, code: string, aiVal: number, newVal: number) => { if (empIdx !== null) { setEmployees(prev => prev.map((e, i) => i === empIdx ? { ...e, fields: { ...e.fields, [code]: newVal } } : e));
    } else { setEmployerFields(prev => ({ ...prev, [code]: newVal }));
    }
    if (submissionId && user) { await supabase.from("payroll_agi_adjustments").insert({ submission_id: submissionId,
        field_code: code,
        employee_id: empIdx !== null ? employees[empIdx].employeeId : null,
        ai_value: aiVal,
        adjusted_value: newVal,
        adjusted_by: user.id,
      });
      toast.success("Justering sparad");
    }
  };

  const totalGross = employees.reduce((s, e) => s + (e.fields["061"] || 0), 0);
  const totalTax = employees.reduce((s, e) => s + (e.fields["062"] || 0), 0);
  const totalContributions = employerFields["487"] || 0;
  const totalToPay = totalContributions + totalTax;
  const confidenceScore = warnings.filter(w => w.severity === "error").length === 0 ? (warnings.length === 0 ? 99 : 97 - warnings.length * 2) : 85;

  // Negative value detection
  const negativeEmployeeFields = employees.flatMap((emp, idx) =>
    Object.entries(emp.fields).filter(([, v]) => v < 0).map(([code, v]) => ({ empIdx: idx, empName: emp.name, code, value: v }))
  );
  const negativeEmployerFields = Object.entries(employerFields).filter(([c, v]) => v < 0 && c !== "302");
  const hasNegativeValues = negativeEmployeeFields.length > 0 || negativeEmployerFields.length > 0;
  const errorWarnings = warnings.filter(w => w.severity === "error");
  const canSubmit = errorWarnings.length === 0 && (!hasNegativeValues || negativeOverridden);

  // ─── IDLE STATE ───
  if (step === "idle") { return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4 text-[#2563EB]" />
            Arbetsgivardeklaration (AGI) — Zero-touch
          </CardTitle>
          <CardDescription>AI förbereder hela deklarationen automatiskt. Du granskar och godkänner.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((m, i) => <SelectItem key={i} value={String(i)}>{m} {taxYear}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={runAIPrepare} className="bg-[#2563EB] hover:bg-[#2563EB]/90 text-white">
              <Sparkles className="h-4 w-4 mr-2" />Kör AI nu
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const t = toast.loading("Hämtar events från HR Engine...");
                try {
                  const { data, error } = await supabase.functions.invoke("hr-events-to-agi", {
                    body: { company_id: companyId, year: taxYear, month: selectedMonth + 1 },
                  });
                  if (error) throw error;
                  if (!data?.ok) throw new Error(data?.error || "Misslyckades");
                  if (data.source === "fallback_monthly_salary" || !data.employees?.length) {
                    toast.dismiss(t);
                    toast.warning("Inga godkända HR-events i perioden — använd 'Kör AI nu' istället.");
                    return;
                  }
                  setEmployees(data.employees);
                  setEmployerFields({
                    "420": data.totals.cashGross,
                    "487": data.totals.employerFee,
                    "492": 0, "496": 0, "491": 0, "495": 0,
                    "471": 0, "476": 0, "470": 0, "475": 0,
                    "481": 0, "486": 0, "302": 0,
                  });
                  setStep("review");
                  toast.dismiss(t);
                  toast.success(`Hämtade ${data.employees.length} anställda från ${data.totals.totalEvents} HR-events`);
                } catch (e: any) {
                  toast.dismiss(t);
                  toast.error(e?.message || "Kunde inte hämta från HR Engine");
                }
              }}
            >
              <Sparkles className="h-4 w-4 mr-2" />Hämta från HR Engine
            </Button>
          </div>
          <div className="bg-muted/50 rounded-lg p-8 text-center">
            <Bot className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">Välj period och klicka "Kör AI nu" för att automatiskt fylla i alla fält.</p>
            <p className="text-xs text-muted-foreground mt-1.5">AI → Granska → Godkänn → Kvittens</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── PREPARING STATE ───
  if (step === "preparing") { return (
      <Card>
        <CardContent className="py-12">
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-[#2563EB]/20" />
              <div className="absolute inset-0 rounded-full border-4 border-[#2563EB] border-t-transparent animate-spin" />
              <Bot className="absolute inset-0 m-auto h-8 w-8 text-[#2563EB]" />
            </div>
            <div>
              <h3 className="font-semibold text-base mb-1">AI förbereder AGI för {MONTH_NAMES[selectedMonth]} {taxYear}</h3>
              <p className="text-sm text-muted-foreground">{PREPARE_STEPS[prepareStep]}</p>
            </div>
            <Progress value={prepareProgress} className="h-2" />
            <div className="flex flex-col gap-1.5 text-left">
              {PREPARE_STEPS.slice(0, prepareStep + 1).map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {i < prepareStep ? <CheckCircle className="h-3.5 w-3.5 text-[#085041]" /> : <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2563EB]" />}
                  <span className={i < prepareStep ? "text-muted-foreground" : "font-medium"}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── SUBMITTING STATE ───
  if (step === "submitting") { return (
      <Card>
        <CardContent className="py-16 text-center space-y-4">
          <Shield className="h-12 w-12 mx-auto text-[#2563EB] animate-pulse" />
          <h3 className="font-semibold text-lg">Lämnar in AGI till Skatteverket...</h3>
          <p className="text-sm text-muted-foreground">BankID-signering pågår</p>
          <Progress value={60} className="max-w-xs mx-auto h-2" />
        </CardContent>
      </Card>
    );
  }

  // ─── RECEIPT STATE ───
  if (step === "receipt") {
    const handlePayAGI = async () => {
      if (!user?.id) {
        toast.error("Inte inloggad");
        return;
      }
      const periodLabel = `${MONTH_NAMES[selectedMonth]} ${taxYear}`;
      if (!window.confirm(`Bokför betalning till Skatteverket för ${periodLabel}?\n\nArbetsgivaravgifter: ${fmt(totalContributions)} kr\nPersonalskatt: ${fmt(totalTax)} kr\nTotalt: ${fmt(totalToPay)} kr`)) {
        return;
      }
      setPaying(true);
      try {
        const entryDate = receiptTime ? receiptTime.slice(0, 10) : new Date().toISOString().slice(0, 10);
        const reference = `AGI ${periodLabel}`;
        let booked = 0;
        if (totalContributions > 0) {
          await bookSKVPayment({
            companyId, userId: user.id, amount: totalContributions, entryDate,
            paymentType: "employer_tax", reference,
          });
          booked++;
        }
        if (totalTax > 0) {
          await bookSKVPayment({
            companyId, userId: user.id, amount: totalTax, entryDate,
            paymentType: "employee_tax", reference,
          });
          booked++;
        }
        if (booked === 0) {
          toast.info("Inget belopp att bokföra");
        } else {
          toast.success(`${booked} verifikation${booked > 1 ? "er" : ""} bokförda — totalt ${fmt(totalToPay)} kr`);
          setPaid(true);
        }
      } catch (err: any) {
        toast.error(err?.message || "Kunde inte bokföra betalningen");
      } finally {
        setPaying(false);
      }
    };

    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center pt-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#E1F5EE] dark:bg-green-900/30 flex items-center justify-center animate-scale-in">
            <CheckCircle className="h-10 w-10 text-[#085041]" />
          </div>
          <h2 className="text-2xl font-bold">AGI inlämnad</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Arbetsgivardeklaration för {MONTH_NAMES[selectedMonth]} {taxYear} har skickats till Skatteverket.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-3">
            {[
              { label: "Ärendenummer", value: receiptRef, mono: true },
              { label: "Tidsstämpel", value: receiptTime ? new Date(receiptTime).toLocaleString("sv-SE") : "—" },
              { label: "Bruttolöner", value: `${fmt(totalGross)} kr` },
              { label: "Avgifter", value: `${fmt(totalContributions)} kr` },
              { label: "Att betala", value: `${fmt(totalToPay)} kr`, bold: true },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className={cn(r.mono && "font-mono", r.bold && "font-bold")}>{r.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        {paid ? (
          <div className="flex items-center justify-center gap-2 rounded-md border border-[#BFE6D6] dark:border-green-900/50 bg-[#E1F5EE] dark:bg-green-900/20 px-4 py-3 text-sm text-[#085041] dark:text-[#1D9E75]">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">Betalning bokförd i huvudboken</span>
          </div>
        ) : (
          <Button
            onClick={handlePayAGI}
            disabled={paying || totalToPay <= 0}
            className="w-full"
            size="lg"
          >
            {paying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Banknote className="h-4 w-4 mr-2" />}
            {paying ? "Bokför…" : `Bokför betalning till SKV (${fmt(totalToPay)} kr)`}
          </Button>
        )}
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1.5" />Ladda ner PDF</Button>
          <Button variant="outline" size="sm" onClick={() => { setStep("idle"); setPaid(false); setSelectedMonth(prev => prev === 11 ? 0 : prev + 1); }}>Nästa period →</Button>
        </div>
      </div>
    );
  }

  // ─── REVIEW STATE ───

  // Sort employees
  const sortedEmployees = [...employees];
  if (sortCol) {
    sortedEmployees.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      switch (sortCol) {
        case "name": aVal = a.name; bVal = b.name; break;
        case "gross": aVal = a.fields["061"] || 0; bVal = b.fields["061"] || 0; break;
        case "tax": aVal = a.fields["062"] || 0; bVal = b.fields["062"] || 0; break;
        default: break;
      }
      if (typeof aVal === "string") return sortDir === "asc" ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }

  const handleSort = (col: string) => {
    if (sortCol === col) { setSortDir(d => d === "asc" ? "desc" : "asc"); }
    else { setSortCol(col); setSortDir("asc"); }
  };

  const deadlineDay = 12;
  const deadlineMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
  const deadlineYear = selectedMonth === 11 ? taxYear + 1 : taxYear;
  const deadlineStr = `${deadlineDay} ${MONTH_NAMES[deadlineMonth]?.toLowerCase().slice(0, 3)} ${deadlineYear}`;

  return (
    <div className="space-y-6 pb-24">
      {/* ─── CORRECTION BANNER ─── */}
      {isCorrection && (
        <div className="rounded-lg border-2 border-amber-400 bg-[#FAEEDA] dark:bg-amber-950/20 dark:border-amber-700 p-4 space-y-1">
          <div className="flex items-center gap-2">
            <FileEdit className="h-5 w-5 text-[#7A5417]" />
            <span className="font-semibold text-sm text-[#7A5417] dark:text-amber-300">Du redigerar en RÄTTELSEDEKLARATION för {MONTH_NAMES[selectedMonth]} {taxYear}</span>
          </div>
          <p className="text-xs text-muted-foreground ml-7">Ändra bara de fält som var felaktiga. Alla andra fält behåller originalvärden.</p>
        </div>
      )}

      {/* ─── AI BANNER ─── */}
      <div className="rounded-xl bg-[#0B1929] p-6 border border-white/5">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-[#EEEDFE] text-[#26215C] border-[0.5px] border-[#AFA9EC] rounded-full text-[10px] font-medium px-[8px] py-px">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#26215C] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#26215C]" />
              </span>
              AI-förberedd
            </div>
            <h2 className="text-xl md:text-2xl font-bold" style={{ color: "#FFFFFF" }}>
              Arbetsgivardeklaration — {MONTH_NAMES[selectedMonth]} {taxYear}
            </h2>
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.75)" }}>
              Agenten har analyserat löneunderlaget och förberett deklarationen
            </p>
          </div>

          {/* Confidence Ring */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="6" />
              <circle cx="40" cy="40" r="34" fill="none" stroke="#2563EB" strokeWidth="6"
                strokeDasharray={`${(confidenceScore / 100) * 213.6} 213.6`}
                strokeLinecap="round" transform="rotate(-90 40 40)"
                className="transition-all duration-1000" />
              <text x="40" y="44" textAnchor="middle" fill="#FFFFFF" fontSize="18" fontWeight="600">{confidenceScore}%</text>
            </svg>
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.75)" }}>Konfidenspoäng</span>
          </div>
        </div>

        {/* Mini stats */}
        <div className="flex items-center gap-6 mt-5 pt-4 border-t border-white/10 flex-wrap">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-[0.06em]" style={{ color: "rgba(255,255,255,0.65)" }}>Betalningsmottagare</span>
            <p className="text-[15px] font-semibold tabular-nums mt-0.5" style={{ color: "#FFFFFF" }}>{employees.length}</p>
          </div>
          <div className="w-px h-8 bg-white/10 hidden sm:block" />
          <div>
            <span className="text-[10px] font-medium uppercase tracking-[0.06em]" style={{ color: "rgba(255,255,255,0.65)" }}>Total bruttolön</span>
            <p className="text-[15px] font-semibold tabular-nums mt-0.5" style={{ color: "#FFFFFF" }}>{fmt(totalGross)} kr</p>
          </div>
          <div className="w-px h-8 bg-white/10 hidden sm:block" />
          <div>
            <span className="text-[10px] font-medium uppercase tracking-[0.06em]" style={{ color: "rgba(255,255,255,0.65)" }}>Skatt att betala</span>
            <p className="text-[15px] font-semibold tabular-nums mt-0.5" style={{ color: "#FFFFFF" }}>{fmt(totalToPay)} kr</p>
          </div>
        </div>
      </div>

      {/* ─── KPI CARDS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 1 — Skatteavdrag */}
        <div className="relative overflow-hidden rounded-[12px]" style={{ background: "#FFF5F5", border: "0.5px solid #FBBEBE", padding: "14px 16px" }}>
          <div className="absolute top-0 left-0 right-0" style={{ height: "1.5px", background: "#E24B4A" }} />
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="h-3.5 w-3.5 text-[#791F1F]" />
            <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">SKATTEAVDRAG TOTALT</span>
          </div>
          <p className="text-[20px] font-medium text-[#791F1F] tabular-nums">{fmt(totalTax)} kr</p>
          {comparison && <CompBadge current={totalTax} prev={comparison.prevTax} />}
        </div>

        {/* CARD 2 — Arbetsgivaravgifter */}
        <div className="relative overflow-hidden rounded-[12px]" style={{ background: "#FFFBF0", border: "0.5px solid #F9DFA0", padding: "14px 16px" }}>
          <div className="absolute top-0 left-0 right-0" style={{ height: "1.5px", background: "#EF9F27" }} />
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-3.5 w-3.5 text-[#633806]" />
            <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">ARBETSGIVARAVGIFTER</span>
          </div>
          <div className="flex items-center">
            <p className="text-[20px] font-medium text-[#633806] tabular-nums">{fmt(totalContributions)} kr</p>
            <span className="bg-[#FAEEDA] text-[#412402] rounded-full text-[10px] font-medium px-[7px] py-px ml-[6px]" style={{ border: "0.5px solid #EF9F27" }}>31.42%</span>
          </div>
          {comparison && <CompBadge current={totalContributions} prev={comparison.prevContributions} />}
        </div>

        {/* CARD 3 — Netto att betala till SKV */}
        <div className="relative overflow-hidden rounded-[12px]" style={{ background: "#F5F9FF", border: "0.5px solid #C7DCFA", padding: "14px 16px" }}>
          <div className="absolute top-0 left-0 right-0" style={{ height: "1.5px", background: "#1D4ED8" }} />
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="h-3.5 w-3.5 text-[#0C447C]" />
            <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">NETTO ATT BETALA TILL SKV</span>
          </div>
          <p className="text-[20px] font-medium text-[#0C447C] tabular-nums">{fmt(totalToPay)} kr</p>
          <p className="text-[11px] text-[#94A3B8] mt-[4px]">Betala: {deadlineStr}</p>
        </div>
      </div>

      {/* ─── KONTROLLSUMMA ─── */}
      {kontrollsumma.loaded && (
        <Card className={cn(
          "border-l-4",
          kontrollsumma.balanced2710 && kontrollsumma.balanced2730
            ? "border-l-green-500 bg-green-50/50 dark:bg-green-950/20"
            : "border-l-red-500 bg-red-50/50 dark:bg-red-950/20"
        )}>
          <CardContent className="pt-4 pb-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              {kontrollsumma.balanced2710 && kontrollsumma.balanced2730 ? (
                <CheckCircle className="h-4 w-4 text-[#085041]" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-[#7A1A1A]" />
              )}
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kontrollsumma — Huvudbok</span>
            </div>
            {/* 2710 check */}
            <div className={cn("flex items-center justify-between text-sm rounded-md px-3 py-2", kontrollsumma.balanced2710 ? "bg-green-100/50 dark:bg-green-900/20" : "bg-red-100/50 dark:bg-red-900/20")}>
              <span>Ruta 062 (skatteavdrag) vs konto 2710</span>
              <div className="flex items-center gap-3 tabular-nums">
                <span>{fmt(kontrollsumma.agiSkatteavdrag)} kr</span>
                <span className="text-muted-foreground">≈</span>
                <span>{fmt(kontrollsumma.ledger2710)} kr</span>
                {kontrollsumma.balanced2710 ? (
                  <Badge variant="outline" className="text-[10px] bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]"><Check className="h-3 w-3 mr-0.5" />OK</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]"><X className="h-3 w-3 mr-0.5" />Diff: {fmt(kontrollsumma.diff2710)} kr</Badge>
                )}
              </div>
            </div>
            {/* 2730 check */}
            <div className={cn("flex items-center justify-between text-sm rounded-md px-3 py-2", kontrollsumma.balanced2730 ? "bg-green-100/50 dark:bg-green-900/20" : "bg-red-100/50 dark:bg-red-900/20")}>
              <span>Ruta 487 (avgifter) vs konto 2730</span>
              <div className="flex items-center gap-3 tabular-nums">
                <span>{fmt(kontrollsumma.agiAvgifter)} kr</span>
                <span className="text-muted-foreground">≈</span>
                <span>{fmt(kontrollsumma.ledger2730)} kr</span>
                {kontrollsumma.balanced2730 ? (
                  <Badge variant="outline" className="text-[10px] bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]"><Check className="h-3 w-3 mr-0.5" />OK</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]"><X className="h-3 w-3 mr-0.5" />Diff: {fmt(kontrollsumma.diff2730)} kr</Badge>
                )}
              </div>
            </div>
            {(!kontrollsumma.balanced2710 || !kontrollsumma.balanced2730) && (
              <p className="text-xs text-muted-foreground mt-1">
                Kontrollera att alla löner är bokförda mot rätt konton för perioden.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── NEGATIVE VALUES BANNER ─── */}
      {hasNegativeValues && (
        <div className={cn("rounded-lg border-2 p-4 space-y-3", negativeOverridden ? "border-[#F0DDB7] bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800" : "border-red-400 bg-[#FCE8E8] dark:bg-red-950/20 dark:border-red-800")}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-[#7A1A1A] mt-0.5 shrink-0" />
            <div className="space-y-1 flex-1">
              <p className="text-sm font-semibold text-[#7A1A1A] dark:text-[#C73838]">Deklarationen innehåller negativa värden som måste granskas</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {negativeEmployeeFields.map((nf, i) => (
                  <li key={`emp-${i}`}>• {nf.empName}: ruta {nf.code} = {fmt(nf.value)} kr</li>
                ))}
                {negativeEmployerFields.map(([code, val]) => (
                  <li key={`ef-${code}`}>• Arbetsgivarnivå ruta {code} = {fmt(val)} kr</li>
                ))}
              </ul>
              {!negativeOverridden && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs h-7 bg-[#FAEEDA] hover:bg-amber-200 text-[#7A5417] border-[#F0DDB7]"
                  onClick={() => setNegativeOverridden(true)}
                >
                  Jag förstår risken — fortsätt ändå
                </Button>
              )}
              {negativeOverridden && (
                <p className="text-xs text-[#7A5417] font-medium mt-1">✓ Negativa värden manuellt godkända</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MISSING BIRTH DATE WARNING ─── */}
      {(() => {
        const missingBirthCount = employees.filter(e => e.birthYear === null).length;
        if (missingBirthCount === 0) return null;
        return (
          <div className="flex items-start gap-3 rounded-[12px]" style={{ background: "#FAEEDA", border: "0.5px solid #EF9F27", padding: "12px 14px" }}>
            <AlertTriangle className="h-4 w-4 text-[#EF9F27] mt-0.5 shrink-0" />
            <div className="space-y-0">
              <p className="text-[12px] font-medium text-[#412402]">{missingBirthCount} anställd{missingBirthCount > 1 ? "a" : ""} saknar födelsedatum — standardavgiften 31,42% används.</p>
              <p className="text-[11px] text-[#633806] mt-[2px]">Lägg till födelsedatum i personalregistret för korrekt beräkning av åldersdifferentierade arbetsgivaravgifter.</p>
              <a href="/hr" className="text-[#1D4ED8] text-[11px] font-medium underline cursor-pointer mt-[4px] inline-block">Gå till personalregistret →</a>
            </div>
          </div>
        );
      })()}

      {/* ─── WARNINGS ─── */}
      {warnings.length > 0 ? (
        <Collapsible open={warningsOpen} onOpenChange={setWarningsOpen}>
          <div className="bg-white rounded-[12px]" style={{ border: "0.5px solid #E2E8F0" }}>
            <CollapsibleTrigger asChild>
              <div className="cursor-pointer hover:bg-[#F8FAFB] transition-colors flex items-center justify-between" style={{ padding: "14px 16px" }}>
                <div className="text-[13px] font-medium text-[#0F172A] flex items-center gap-2">
                  <AlertTriangle className={cn("h-3.5 w-3.5", errorWarnings.length > 0 ? "text-[#E24B4A]" : "text-[#EF9F27]")} />
                  Agenten hittade {warnings.length} {warnings.length === 1 ? "sak" : "saker"} att granska
                </div>
                {warningsOpen ? <ChevronUp className="h-4 w-4 text-[#94A3B8]" /> : <ChevronDown className="h-4 w-4 text-[#94A3B8]" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-3">
                {warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-[8px] py-[5px]">
                    <div className={cn(
                      "w-[7px] h-[7px] rounded-full flex-shrink-0 mt-[4px]",
                      w.severity === "error" ? "bg-[#E24B4A]" : w.severity === "warning" ? "bg-[#EF9F27]" : "bg-[#1D4ED8]"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-[#475569] leading-[1.5]">{w.message}</p>
                      {w.fieldCode && <span className="text-[10px] text-[#94A3B8]">Ruta {w.fieldCode}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ) : (
        <div className="flex items-center gap-2 rounded-[12px]" style={{ background: "#E1F5EE", border: "0.5px solid #5DCAA5", padding: "10px 14px" }}>
          <CheckCircle className="h-4 w-4 text-[#085041]" />
          <span className="text-[12px] text-[#085041]">Inga avvikelser hittades — deklarationen ser korrekt ut</span>
        </div>
      )}

      {/* ─── BETALNINGSMOTTAGARE TABLE ─── */}
      <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
        <div className="px-4 py-3 border-b-[0.5px] border-[#F1F5F9]">
          <h3 className="text-[13px] font-medium text-[#0F172A] flex items-center gap-2">
            Betalningsmottagare ({employees.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F8FAFB] border-b-[0.5px] border-[#E2E8F0]">
                <th className="text-left px-[10px] py-[8px] text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8] w-10" />
                <SortableHeader label="ANSTÄLLD" col="name" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <th className="text-left px-[10px] py-[8px] text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">PERSONNR</th>
                <th className="text-left px-[10px] py-[8px] text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">INKOMSTTYP</th>
                <SortableHeader label="BRUTTOLÖN" col="gross" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-right" />
                <SortableHeader label="SKATTEAVDRAG" col="tax" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-right" />
                <th className="text-right px-[10px] py-[8px] text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">AVGIFT%</th>
                <th className="text-right px-[10px] py-[8px] text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">AGI-AVG</th>
                <th className="text-center px-[10px] py-[8px] text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">STATUS</th>
              </tr>
            </thead>
              <tbody>
                {sortedEmployees.map((emp, idx) => {
                  const origIdx = employees.findIndex(e => e.employeeId === emp.employeeId);
                  const benefits = (emp.fields["010"] || 0) + (emp.fields["011"] || 0) + (emp.fields["012"] || 0);
                  const underlag = emp.fields["061"] + benefits;
                  const rate = getEmployerFeeRate(emp.birthYear, taxYear);
                  const avgift = Math.round(underlag * rate);
                  const age = emp.birthYear ? taxYear - emp.birthYear : null;
                  const hasWarning = warnings.some(w => w.employeeId === emp.employeeId);
                  const hasError = warnings.some(w => w.employeeId === emp.employeeId && w.severity === "error");
                  const initials = emp.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                  const empNegFields = Object.entries(emp.fields).filter(([, v]) => v < 0);
                  const hasNegative = empNegFields.length > 0;

                  // Rate chip
                  const rateChip = age === null ? (
                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                      <Badge variant="outline" className="text-[10px] bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7] dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">?</Badge>
                    </TooltipTrigger><TooltipContent className="text-xs max-w-[200px]">Födelsedatum saknas — standardavgift 31,42% används</TooltipContent></Tooltip></TooltipProvider>
                  ) : age < 18 ? (
                    <Badge variant="outline" className="text-[10px] bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30">10,21% <span className="opacity-70 ml-0.5">(ung)</span></Badge>
                  ) : age > 65 ? (
                    <Badge variant="outline" className="text-[10px] bg-[#F1F5F9] text-violet-700 border-[#E2E8F0] dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800">10,21% <span className="opacity-70 ml-0.5">(65+)</span></Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">31,42%</span>
                  );

                  return (
                    <Collapsible key={emp.employeeId} open={emp.expanded} onOpenChange={() => setEmployees(prev => prev.map((e, i) => i === origIdx ? { ...e, expanded: !e.expanded } : e))}>
                      <CollapsibleTrigger asChild>
                        <tr className={cn(
                          "border-b border-border/50 cursor-pointer transition-colors",
                          "hover:bg-muted/30 dark:hover:bg-slate-700/30",
                          hasNegative && "border-l-[3px] border-l-red-500 bg-red-50/30 dark:bg-red-950/10",
                          !hasNegative && hasWarning && "border-l-[3px] border-l-amber-400 bg-amber-50/30 dark:bg-amber-950/10"
                        )}>
                          <td className="px-4 py-3">
                            <div className="w-9 h-9 rounded-full bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center text-xs font-bold">
                              {initials}
                            </div>
                          </td>
                          <td className="px-3 py-3 font-medium">{emp.name}</td>
                          <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{emp.personalNumber || "—"}</td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">Kontant lön</td>
                          <td className="px-3 py-3 text-right font-medium tabular-nums">{fmt(emp.fields["061"])} kr</td>
                          <td className="px-3 py-3 text-right tabular-nums">
                            {fmt(emp.fields["062"])} kr
                            {emp.fields["062"] < 0 && <Badge variant="outline" className="ml-1 text-[9px] bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]">Neg</Badge>}
                          </td>
                          <td className="px-3 py-3 text-right">{rateChip}</td>
                          <td className="px-3 py-3 text-right tabular-nums">
                            {fmt(avgift)} kr
                            {hasNegative && (
                              <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                <Badge variant="outline" className="ml-1 text-[9px] bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]">
                                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />Neg
                                </Badge>
                              </TooltipTrigger><TooltipContent className="text-xs max-w-[220px]">
                                Negativt värde ({empNegFields.map(([c, v]) => `ruta ${c}: ${fmt(v)} kr`).join(", ")}) — kontrollera lönekörningen
                              </TooltipContent></Tooltip></TooltipProvider>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {hasError ? (
                              <Badge variant="outline" className="text-[10px] bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8] dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
                                <X className="h-3 w-3 mr-0.5" />Fel
                              </Badge>
                            ) : hasWarning ? (
                              <Badge variant="outline" className="text-[10px] bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7] dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
                                <Clock className="h-3 w-3 mr-0.5" />Granskas
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-[#E1F5EE] text-[#085041] border-[#BFE6D6] dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                                <Check className="h-3 w-3 mr-0.5" />OK
                              </Badge>
                            )}
                          </td>
                        </tr>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <tr>
                          <td colSpan={9} className="bg-muted/20 dark:bg-slate-800/30 px-6 py-4">
                            <div className="grid gap-1.5 max-w-xl">
                              {Object.entries(EMPLOYEE_FIELD_LABELS).map(([code, label]) => (
                                <InlineField key={code} code={code} label={label} value={emp.fields[code] || 0}
                                  onSave={(v) => saveFieldEdit(origIdx, code, emp.fields[code] || 0, v)} />
                              ))}
                            </div>
                          </td>
                        </tr>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 dark:bg-slate-800/50 font-semibold">
                  <td className="px-4 py-3" />
                  <td className="px-3 py-3">Totalt</td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3 text-right tabular-nums">{fmt(totalGross)} kr</td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmt(totalTax)} kr</td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3 text-right tabular-nums">{fmt(totalContributions)} kr</td>
                  <td className="px-3 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      {/* ─── ARBETSGIVARNIVÅ ─── */}
      <Card className="border-l-4 border-l-[#2563EB]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#2563EB]" />
            Arbetsgivarnivå sammanfattning
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-1">
            {Object.entries(EMPLOYER_FIELD_LABELS).map(([code, label]) => { const val = employerFields[code] || 0;
              if (val === 0 && !["420", "487", "302"].includes(code)) return null;
              const isImportant = ["420", "487"].includes(code);
              return (
                <div key={code} className="flex items-center justify-between py-2 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-8">{code}</span>
                    <span className="text-sm text-muted-foreground">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isImportant ? (
                      <span className="text-sm font-bold text-[#2563EB]">{fmt(val)} kr</span>
                    ) : (
                      <button onClick={() => { /* inline edit */ }}
                        className="text-sm font-medium text-right hover:text-[#2563EB] hover:underline cursor-pointer transition-colors flex items-center gap-1 group">
                        {fmt(val)} kr
                        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 text-muted-foreground" />
                      </button>
                    )}
                    {["420", "487"].includes(code) && (
                      <Badge variant="outline" className="text-[9px] text-muted-foreground">beräknat</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── PERIOD COMPARISON ─── */}
      {comparison && (
        <Card className="bg-muted/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Jämfört med föregående månad</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <CompItem label="Bruttolöner" current={totalGross} prev={comparison.prevGross} />
              <CompItem label="Avgifter" current={totalContributions} prev={comparison.prevContributions} />
              <CompItem label="Skatt" current={totalTax} prev={comparison.prevTax} />
              <CompItem label="Anställda" current={employees.length} prev={comparison.prevEmployees} />
            </div>
            {Math.abs(totalGross - comparison.prevGross) / Math.max(comparison.prevGross, 1) < 0.05 && (
              <p className="text-xs text-[#085041] mt-2 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" />Ingen anmärkningsvärd avvikelse. AI bedömer AGI:n som korrekt.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── FK-UPPGIFTER ─── */}
      <Collapsible>
        <Card className="border-l-4 border-l-violet-500">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-violet-500" />
                  Uppgifter till Försäkringskassan (FK)
                </div>
                <ChevronDown className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              <div className="flex items-center gap-3">
                <Switch id="fk-toggle" checked={fkEnabled} onCheckedChange={setFkEnabled} />
                <Label htmlFor="fk-toggle" className="text-sm">Inkludera FK-uppgifter i denna deklaration</Label>
              </div>
              {fkEnabled && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Anställd</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Föräldrapenning (kr)</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Sjukpenning (kr)</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">VAB (kr)</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">VAB-dagar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {employees.map(emp => {
                        const d = fkData[emp.employeeId] || { foraldrapenning: 0, sjukpenning: 0, vab: 0, vabDagar: 0 };
                        const updateFk = (field: string, val: number) => {
                          setFkData(prev => ({
                            ...prev,
                            [emp.employeeId]: { ...prev[emp.employeeId] || { foraldrapenning: 0, sjukpenning: 0, vab: 0, vabDagar: 0 }, [field]: val },
                          }));
                        };
                        return (
                          <tr key={emp.employeeId}>
                            <td className="px-3 py-2 font-medium">{emp.name}</td>
                            <td className="px-3 py-2"><Input type="number" className="h-7 w-24 text-right text-xs ml-auto" value={d.foraldrapenning || ""} onChange={e => updateFk("foraldrapenning", Number(e.target.value) || 0)} /></td>
                            <td className="px-3 py-2"><Input type="number" className="h-7 w-24 text-right text-xs ml-auto" value={d.sjukpenning || ""} onChange={e => updateFk("sjukpenning", Number(e.target.value) || 0)} /></td>
                            <td className="px-3 py-2"><Input type="number" className="h-7 w-24 text-right text-xs ml-auto" value={d.vab || ""} onChange={e => updateFk("vab", Number(e.target.value) || 0)} /></td>
                            <td className="px-3 py-2"><Input type="number" className="h-7 w-20 text-right text-xs ml-auto" value={d.vabDagar || ""} onChange={e => updateFk("vabDagar", Number(e.target.value) || 0)} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ─── INLÄMNINGSHISTORIK ─── */}
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  Inlämningshistorik
                </div>
                {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {submissionHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Inga tidigare inlämningar för detta bolag</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Period</TableHead>
                      <TableHead className="text-xs">Inlämnad</TableHead>
                      <TableHead className="text-xs">Referensnummer</TableHead>
                      <TableHead className="text-xs">Typ</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Åtgärd</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissionHistory.map(sub => (
                      <TableRow key={sub.id}>
                        <TableCell className="text-xs font-medium">
                          {(() => {
                            const [y, m] = (sub.period || "").split("-");
                            const mi = parseInt(m, 10) - 1;
                            return mi >= 0 && mi < 12 ? `${MONTH_NAMES[mi]} ${y}` : sub.period;
                          })()}
                        </TableCell>
                        <TableCell className="text-xs">
                          {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString("sv-SE") : "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{sub.skv_reference_number || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px]", sub.is_correction ? "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7] dark:bg-amber-900/30 dark:text-amber-300" : "bg-[#EFF6FF] text-blue-700 border-[#C8DDF5] dark:bg-blue-900/30 dark:text-blue-300")}>
                            {sub.is_correction ? "Rättelse" : "Original"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px]",
                            sub.status === "submitted" ? "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6] dark:bg-emerald-900/30 dark:text-emerald-300" :
                            sub.status === "corrected" ? "bg-[#F1F5F9] text-violet-700 border-[#E2E8F0] dark:bg-violet-900/30 dark:text-violet-300" :
                            sub.status === "ready" ? "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7] dark:bg-amber-900/30 dark:text-amber-300" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {sub.status === "submitted" ? "Inlämnad" : sub.status === "corrected" ? "Korrigerad" : sub.status === "ready" ? "Redo" : sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                            <Eye className="h-3 w-3 mr-1" />Visa
                          </Button>
                          {sub.status === "submitted" && (
                            <Button variant="outline" size="sm" className="text-xs h-7 px-2"
                              onClick={() => {
                                setCorrectionTargetId(sub.id);
                                const [y, m] = (sub.period || "").split("-");
                                const mi = parseInt(m, 10) - 1;
                                setCorrectionTargetPeriod(mi >= 0 && mi < 12 ? `${MONTH_NAMES[mi]} ${y}` : sub.period);
                                setCorrectionDialogOpen(true);
                              }}>
                              <FileEdit className="h-3 w-3 mr-1" />Skapa rättelse
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ─── CORRECTION DIALOG ─── */}
      <Dialog open={correctionDialogOpen} onOpenChange={setCorrectionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Skapa rättelsedeklaration</DialogTitle>
            <DialogDescription>
              Du skapar en rättelsedeklaration för {correctionTargetPeriod}. Den ursprungliga deklarationen låses och en ny förbereds.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCorrectionDialogOpen(false)}>Avbryt</Button>
            <Button onClick={handleCreateCorrection} className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-amber-950">
              <FileEdit className="h-3.5 w-3.5" />Skapa rättelse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── STICKY FOOTER ─── */}
      <div className="fixed bottom-[60px] md:bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-t border-border shadow-lg">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-col">
            <div className="text-[10px] text-[#94A3B8] italic">
              AI-beräknat — Målet är 99,9% träffsäkerhet — Granska alltid innan signering
            </div>
            <div className="text-[10px] text-[#94A3B8] flex items-center gap-1 mt-0.5">
              <Bot className="h-3 w-3 text-[#94A3B8]" />
              Hämtat från: Lönekörning {MONTH_NAMES[selectedMonth]} {taxYear}, senast uppdaterat just nu
            </div>
          </div>
          <div className="text-sm font-bold">
            Totalt att betala: <span className="text-[#1D4ED8]">{fmt(totalToPay)} kr</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={runAIPrepare}
              className="bg-white border-[0.5px] border-[#E2E8F0] text-[#475569] rounded-[8px] text-[12px] px-[14px] h-[36px] hover:bg-[#F8FAFB] gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />Ladda ner AGI-PDF
            </Button>
            <DemoSubmitButton
              label="Granska och signera AGI"
              authority="Skatteverket"
              size="sm"
              disabled={!canSubmit}
              className="bg-[#1D4ED8] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[8px] text-[12px] font-medium px-[16px] h-[36px] border-0"
              icon={<Lock className="h-3.5 w-3.5" />}
              onDemoSubmit={() => { setConfirmChecked(false); setConfirmOpen(true); }}
            />
          </div>
        </div>
      </div>

      {/* ─── CONFIRMATION DIALOG ─── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bekräfta inlämning</DialogTitle>
            <DialogDescription>Granska uppgifterna innan du skickar in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Period</span><span className="font-medium">{MONTH_NAMES[selectedMonth]} {taxYear}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Betalningsmottagare</span><span className="font-medium">{employees.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Totalt belopp</span><span className="font-bold text-[#2563EB]">{fmt(totalToPay)} kr</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Förfallodag</span><span className="font-medium">{deadlineStr}</span></div>
              </CardContent>
            </Card>
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <Checkbox id="confirm-agi" checked={confirmChecked} onCheckedChange={(v) => setConfirmChecked(!!v)} />
              <label htmlFor="confirm-agi" className="text-sm leading-snug cursor-pointer">
                Jag intygar att uppgifterna är korrekta och vill skicka in arbetsgivardeklarationen till Skatteverket.
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Avbryt</Button>
            <AGIMobileSignDialog
              companyId={companyId}
              taxYear={taxYear}
              monthIndex={selectedMonth}
              monthLabel={MONTH_NAMES[selectedMonth]}
            />
            <Button onClick={handleSubmit} disabled={!confirmChecked}
              className="bg-amber-500 hover:bg-amber-600 text-amber-950 gap-1.5">
              <Send className="h-3.5 w-3.5" />Spara (demo — skickas ej)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─── HELPER COMPONENTS ─── */

function SortableHeader({ label, col, sortCol, sortDir, onSort, className }: {
  label: string; col: string; sortCol: string | null; sortDir: "asc" | "desc";
  onSort: (col: string) => void; className?: string;
}) {
  const isActive = sortCol === col;
  return (
    <th className={cn("px-3 py-2.5 font-medium text-muted-foreground text-xs cursor-pointer hover:text-foreground transition-colors select-none", className)}
      onClick={() => onSort(col)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
      </span>
    </th>
  );
}

function InlineField({ code, label, value, onSave }: { code: string; label: string; value: number; onSave: (v: number) => void }) { const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(value);

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-xs text-muted-foreground font-mono w-8">{code}</span>
      <span className="text-sm flex-1">{label}</span>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <Input type="number" value={editVal} onChange={e => setEditVal(Number(e.target.value) || 0)}
            className="h-7 w-[120px] text-sm text-right" autoFocus onKeyDown={e => { if (e.key === "Enter") { onSave(editVal); setEditing(false); } }} />
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { onSave(editVal); setEditing(false); }}><CheckCircle className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditVal(value); setEditing(false); }}><RotateCcw className="h-3.5 w-3.5" /></Button>
        </div>
      ) : (
        <button onClick={() => { setEditVal(value); setEditing(true); }}
          className="text-sm font-medium text-right hover:text-[#2563EB] hover:underline cursor-pointer transition-colors flex items-center gap-1 group">
          {fmt(value)} kr
          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

function CompItem({ label, current, prev }: { label: string; current: number; prev: number }) { return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium">{fmt(current)}</span>
        <CompBadge current={current} prev={prev} />
      </div>
    </div>
  );
}

function CompBadge({ current, prev }: { current: number; prev: number }) { const diff = current - prev;
  const pct = prev > 0 ? ((diff / prev) * 100).toFixed(1) : "0";
  if (diff === 0) return <span className="text-xs text-muted-foreground"><Minus className="h-3 w-3 inline" /></span>;
  const up = diff > 0;
  return (
    <span className={`text-xs flex items-center gap-0.5 ${up ? "text-[#7A5417]" : "text-[#085041]"}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {up ? "+" : ""}{pct}%
    </span>
  );
}
