import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, Download, Loader2, CheckCircle, Send, AlertTriangle,
  Calendar, FileText, Clock, Filter, Search, Users, Eye, History,
  Link2, Unlink, ArrowDownUp, Zap, Info, MinusCircle, PlusCircle, Sparkles, Wallet, Shield, ArrowLeft
} from "lucide-react";
import { format, addDays, isBefore, startOfDay, parseISO, differenceInDays } from "date-fns";
import { sv } from "date-fns/locale";
import { BankIDReviewScreen } from "@/components/governance";
import { getStoredActiveCompanyId,
  resolvePreferredCompanyId,
  setStoredActiveCompanyId,
} from "@/lib/company-selection";
import { classify } from "@/lib/supplier-ledger/classifyAP";
import { TreasuryLiquidityBar } from "@/components/payments/TreasuryLiquidityBar";
import { PaymentSuggestionCard } from "@/components/payments/PaymentSuggestionCard";
import { PaymentGroupedList, type GroupKey } from "@/components/payments/PaymentGroupedList";
import { CashSimulationStrip } from "@/components/payments/CashSimulationStrip";
import { PaymentSummaryCards } from "@/components/payments/PaymentSummaryCards";
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge";
import { OpenBankingProvidersCard } from "@/components/payments/OpenBankingProvidersCard";
import { ManualStatusUpdater } from "@/components/payments/ManualStatusUpdater";
import { ComplianceDisclaimer } from "@/components/payments/ComplianceDisclaimer";
import { PaymentReconciliationCard } from "@/components/payments/PaymentReconciliationCard";
// Link2 already imported above

interface Company { id: string; name: string; org_number: string; }
interface PayableInvoice { id: string;
  invoice_number: string;
  supplier_name: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  currency: string;
  status: string;
  journal_number: string | null;
  bankgiro: string | null;
  iban: string | null;
  bic: string | null;
  ocr_number: string | null;
  selected: boolean;
  is_credit: boolean;
  matched_credit_id: string | null;
}
interface UserProfile { id: string; first_name: string | null; last_name: string | null; email: string | null; }
interface ProposalRow { id: string;
  created_at: string;
  payment_date: string;
  total_amount: number;
  invoice_count: number;
  status: string;
  created_by: string;
  approver_1_id: string | null;
  approver_2_id: string | null;
  pain001_xml: string | null;
  pain001_filename: string | null;
  journal_entry_id: string | null;
  rejection_comment: string | null;
  approval_level: string;
}

const statusLabels: Record<string, string> = { draft: "Utkast",
  pending_approval: "Väntar på intern attest",
  approved_1: "Internt attest 1/2",
  approved: "Internt attesterad",
  rejected: "Avvisad",
  ready_for_payment: "Klar för betalning",
  exported_to_bank: "Exporterad till bank",
  awaiting_bank_approval: "Inväntar bankgodkännande",
  sent_to_bank: "Skickad till bank",
  downloaded: "Filen nedladdad",
  completed: "Slutförd",
  paid: "Betald",
  failed: "Misslyckad",
};

const statusVariant = (s: string) => { if (s === "approved" || s === "completed" || s === "sent_to_bank") return "default" as const;
  if (s === "rejected") return "destructive" as const;
  if (s === "pending_approval" || s === "approved_1") return "secondary" as const;
  return "outline" as const;
};

const fmt = (n: number) => n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DirectPayment = () => { const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedCompanyId = searchParams.get("companyId");
  const requestedInvoiceId = searchParams.get("invoiceId");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [invoices, setInvoices] = useState<PayableInvoice[]>([]);
  const [creditInvoices, setCreditInvoices] = useState<PayableInvoice[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Filters
  const [duePeriod, setDuePeriod] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [accountBalance, setAccountBalance] = useState(0);
  const [bankBalance, setBankBalance] = useState<{ total: number; accounts: { name: string; bank: string; balance: number; last_synced: string | null }[] }>({ total: 0, accounts: [] });
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [payImmediately, setPayImmediately] = useState(false);
  const [referenceType, setReferenceType] = useState<"ocr" | "invoice_number">("ocr");
  const [approvalLevel, setApprovalLevel] = useState<"2-eye" | "4-eye">("2-eye");

  const [showAttestDialog, setShowAttestDialog] = useState(false);
  const [approver1, setApprover1] = useState("");
  const [approver2, setApprover2] = useState("");
  const [companyUsers, setCompanyUsers] = useState<UserProfile[]>([]);

  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewProposal, setReviewProposal] = useState<ProposalRow | null>(null);
  const [reviewInvoices, setReviewInvoices] = useState<any[]>([]);
  const [rejectionComment, setRejectionComment] = useState("");
  const [showBankIDSigning, setShowBankIDSigning] = useState(false);
  const [bankIDSigning, setBankIDSigning] = useState(false);

  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);
  const [expandedInvoices, setExpandedInvoices] = useState<any[]>([]);

  // Expense reimbursement state
  const [approvedExpenses, setApprovedExpenses] = useState<any[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());

  const [submitting, setSubmitting] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupKey>("due");
  const [aiMode, setAiMode] = useState<"off" | "suggest" | "auto">("off");

  // Credit matching state
  const [showCreditMatchDialog, setShowCreditMatchDialog] = useState(false);
  const [creditMatchInvoice, setCreditMatchInvoice] = useState<PayableInvoice | null>(null);
  const [creditMatches, setCreditMatches] = useState<Map<string, string>>(new Map()); // invoiceId -> creditId

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);
  useEffect(() => { if (user) loadCompanies(); }, [user]);
  useEffect(() => { if (selectedCompany) { setStoredActiveCompanyId(selectedCompany);
      loadPayableInvoices();
      loadAccountBalance();
      loadBankBalance();
      loadCompanyUsers();
      loadHistory();
      loadApprovedExpenses();
    }
  }, [selectedCompany]);

  const loadCompanies = async () => { const { data } = await supabase.from("companies").select("id, name, org_number").order("name");
    if (data?.length) { setCompanies(data);
      setSelectedCompany((cur) =>
        resolvePreferredCompanyId(data, requestedCompanyId, cur, getStoredActiveCompanyId())
      );
    }
  };

  const loadAccountBalance = async () => { const { data } = await supabase
      .from("journal_entry_lines")
      .select("debit, credit, account_id")
      .eq("account_id", await getAccountId("1930"));
    if (data) { setAccountBalance(data.reduce((sum, line) => sum + (line.debit || 0) - (line.credit || 0), 0));
    }
  };

  const loadBankBalance = async () => { const { data } = await supabase
      .from("bank_accounts")
      .select("account_name, bank_name, balance, last_synced_at")
      .eq("company_id", selectedCompany)
      .eq("is_active", true);
    if (data) { const total = data.reduce((sum, a) => sum + (a.balance || 0), 0);
      setBankBalance({ total,
        accounts: data.map(a => ({ name: a.account_name,
          bank: a.bank_name,
          balance: a.balance || 0,
          last_synced: a.last_synced_at,
        })),
      });
    }
  };

  const getAccountId = async (accountNumber: string): Promise<string> => { const { data } = await supabase
      .from("chart_of_accounts").select("id")
      .eq("company_id", selectedCompany).eq("account_number", accountNumber)
      .limit(1).maybeSingle();
    return data?.id || "";
  };

  const PAYABLE_STATUSES = ["attested", "sent"] as const;

  const loadPayableInvoices = async () => {
    if (!selectedCompany) {
      setInvoices([]);
      setCreditInvoices([]);
      return;
    }
    setLoadingData(true);
    try {
      // Load invoice IDs already in active (non-rejected) payment proposals
      const { data: activeProposalInvoices, error: proposalsErr } = await (supabase
        .from("payment_proposals")
        .select("id, status")
        .eq("company_id", selectedCompany))
        .not("status", "in", "(rejected)");
      if (proposalsErr) throw proposalsErr;

      const activeProposalIds = (activeProposalInvoices || []).map((p: any) => p.id);
      let alreadyProposedInvoiceIds = new Set<string>();

      if (activeProposalIds.length > 0) {
        const { data: proposedInvs, error: proposedErr } = await supabase
          .from("payment_proposal_invoices")
          .select("invoice_id, invoices!inner(company_id)")
          .in("proposal_id", activeProposalIds)
          .eq("invoices.company_id", selectedCompany);
        if (proposedErr) throw proposedErr;
        alreadyProposedInvoiceIds = new Set((proposedInvs || []).map((r: any) => r.invoice_id));
      }

      // Load regular invoices (payable, unpaid)
      const { data: regularData, error: regularErr } = await (supabase
        .from("invoices")
        .select("id, invoice_number, counterparty_name, invoice_date, due_date, total_amount, currency, status, ocr_number")
        .eq("company_id", selectedCompany))
        .eq("invoice_type", "incoming")
        .in("status", PAYABLE_STATUSES)
        .is("paid_at", null)
        .gt("total_amount", 0)
        .order("due_date", { ascending: true });
      if (regularErr) throw regularErr;

      // Load credit invoices (negative amount, payable)
      const { data: creditData, error: creditErr } = await (supabase
        .from("invoices")
        .select("id, invoice_number, counterparty_name, invoice_date, due_date, total_amount, currency, status, ocr_number")
        .eq("company_id", selectedCompany))
        .eq("invoice_type", "incoming")
        .in("status", PAYABLE_STATUSES)
        .is("paid_at", null)
        .lt("total_amount", 0)
        .order("due_date", { ascending: true });
      if (creditErr) throw creditErr;

      const today = startOfDay(new Date());

      // Filter out invoices already in active payment proposals
      const availableRegular = (regularData || []).filter((inv: any) => !alreadyProposedInvoiceIds.has(inv.id));

      // Auto-select invoices due within 7 days (smart proposal)
      const mapped: PayableInvoice[] = availableRegular.map((inv: any) => {
        const daysUntilDue = inv.due_date ? differenceInDays(parseISO(inv.due_date), today) : 999;
        const autoSelect = inv.id === requestedInvoiceId || daysUntilDue <= 7;
        return {
          ...inv,
          supplier_name: inv.counterparty_name || "",
          journal_number: null,
          bankgiro: null, iban: null, bic: null,
          ocr_number: inv.ocr_number || null,
          currency: inv.currency || "SEK",
          selected: autoSelect,
          is_credit: false,
          matched_credit_id: null,
        };
      });

      // Fallback: if URL contains requestedInvoiceId but it's not in main result, fetch it explicitly
      if (requestedInvoiceId && !mapped.some(i => i.id === requestedInvoiceId)) {
        const { data: requested, error: requestedErr } = await supabase
          .from("invoices")
          .select("id, invoice_number, counterparty_name, invoice_date, due_date, total_amount, currency, status, ocr_number, paid_at, company_id, invoice_type")
          .eq("id", requestedInvoiceId)
          .eq("company_id", selectedCompany)
          .maybeSingle();
        if (!requestedErr && requested && !(requested as any).paid_at && (requested as any).total_amount > 0 && (requested as any).invoice_type === "incoming") {
          mapped.unshift({
            ...(requested as any),
            supplier_name: (requested as any).counterparty_name || "",
            journal_number: null,
            bankgiro: null, iban: null, bic: null,
            ocr_number: (requested as any).ocr_number || null,
            currency: (requested as any).currency || "SEK",
            selected: true,
            is_credit: false,
            matched_credit_id: null,
          });
          if (!(PAYABLE_STATUSES as readonly string[]).includes(String((requested as any).status))) {
            toast.warning("Fakturan är inte attesterad ännu — attestera först eller välj manuellt");
          }
        }
      }

      const availableCredits = (creditData || []).filter((inv: any) => !alreadyProposedInvoiceIds.has(inv.id));
      const credits: PayableInvoice[] = availableCredits.map((inv: any) => ({
        ...inv,
        supplier_name: inv.counterparty_name || "",
        journal_number: null,
        bankgiro: null, iban: null, bic: null,
        ocr_number: inv.ocr_number || null,
        currency: inv.currency || "SEK",
        selected: false,
        is_credit: true,
        matched_credit_id: null,
      }));

      setInvoices(mapped);
      setCreditInvoices(credits);
    } catch (err: any) {
      console.error("loadPayableInvoices failed", err);
      toast.error(err?.message || "Kunde inte ladda fakturor");
    } finally {
      setLoadingData(false);
    }
  };

  const loadCompanyUsers = async () => { const dbUsers: UserProfile[] = [];
    const { data } = await supabase.from("user_roles").select("user_id").eq("company_id", selectedCompany);
    if (data) { const userIds = data.map(r => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, first_name, last_name, email").in("id", userIds);
      if (profiles) dbUsers.push(...profiles);
    }
    try { const saved = localStorage.getItem(`supplier-invoice-attestants-${selectedCompany}`);
      if (saved) { const attestants = JSON.parse(saved) as { id: string; firstName: string; lastName: string; email: string }[];
        const existingIds = new Set(dbUsers.map(u => u.id));
        for (const a of attestants) { if (!existingIds.has(a.id)) { dbUsers.push({ id: a.id, first_name: a.firstName, last_name: a.lastName, email: a.email });
          }
        }
      }
    } catch { /* ignore */ }
    setCompanyUsers(dbUsers);
  };

  const loadHistory = async () => { setLoadingHistory(true);
    const { data } = await (supabase
      .from("payment_proposals").select("*").eq("company_id", selectedCompany))
      .order("created_at", { ascending: false });
    setProposals(data || []);
    setLoadingHistory(false);
  };

  const loadApprovedExpenses = async () => { setLoadingExpenses(true);
    try {
      const { data, error } = await supabase
        .from("expense_claims")
        .select("id, description, amount, vat_amount, expense_date, payment_date, user_id, status, payment_method, category, currency")
        .eq("company_id", selectedCompany)
        .eq("status", "approved")
        .eq("payment_method", "employee")
        .order("expense_date", { ascending: false });
      if (error) throw error;

      // Get user names
      const userIds = [...new Set((data || []).map(c => c.user_id).filter(Boolean))];
      let userMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", userIds);
        for (const p of profiles || []) {
          userMap.set(p.id, [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Okänd");
        }
      }

      setApprovedExpenses((data || []).map(c => ({ ...c, user_name: userMap.get(c.user_id) || "Okänd" })));
      setSelectedExpenseIds(new Set());
    } catch (err) { console.error(err); }
    finally { setLoadingExpenses(false); }
  };

  const handleMarkExpensesPaid = async () => {
    if (selectedExpenseIds.size === 0) return;
    setSubmitting(true);
    try {
      for (const id of selectedExpenseIds) {
        await supabase
          .from("expense_claims")
          .update({ status: "paid", payment_date: format(new Date(), "yyyy-MM-dd") })
          .eq("id", id);
      }
      toast.success(`${selectedExpenseIds.size} utlägg markerade som betalda`);
      setSelectedExpenseIds(new Set());
      loadApprovedExpenses();
    } catch (err: any) { toast.error(err.message || "Kunde inte uppdatera"); }
    finally { setSubmitting(false); }
  };

  const toggleExpenseSelection = (id: string) => {
    setSelectedExpenseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllExpenses = () => {
    if (selectedExpenseIds.size === approvedExpenses.length) {
      setSelectedExpenseIds(new Set());
    } else {
      setSelectedExpenseIds(new Set(approvedExpenses.map(e => e.id)));
    }
  };

  const totalExpenseSelected = approvedExpenses
    .filter(e => selectedExpenseIds.has(e.id))
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // Filtering
  const filteredInvoices = useMemo(() => { return invoices.filter(inv => { if (duePeriod !== "all" && inv.due_date) { const days = parseInt(duePeriod);
        const cutoff = addDays(new Date(), days);
        if (isBefore(cutoff, parseISO(inv.due_date))) return false;
      }
      if (supplierFilter !== "all" && inv.supplier_name !== supplierFilter) return false;
      if (currencyFilter !== "all" && inv.currency !== currencyFilter) return false;
      if (searchTerm) { const term = searchTerm.toLowerCase();
        if (!inv.supplier_name?.toLowerCase().includes(term) && !inv.invoice_number?.toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [invoices, duePeriod, supplierFilter, currencyFilter, searchTerm]);

  const suppliers = useMemo(() => [...new Set(invoices.map(i => i.supplier_name).filter(Boolean))], [invoices]);
  const currencies = useMemo(() => [...new Set(invoices.map(i => i.currency || "SEK"))], [invoices]);

  const toggleSelect = (id: string) => { setInvoices(invoices.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  };
  const toggleAll = () => { const filteredIds = new Set(filteredInvoices.map(i => i.id));
    const allFilteredSelected = filteredInvoices.every(i => i.selected);
    setInvoices(invoices.map(i => filteredIds.has(i.id) ? { ...i, selected: !allFilteredSelected } : i));
  };

  // Select only AI-suggested (due within 7 days)
  const selectSuggested = () => { const today = startOfDay(new Date());
    setInvoices(invoices.map(inv => { const daysUntilDue = inv.due_date ? differenceInDays(parseISO(inv.due_date), today) : 999;
      return { ...inv, selected: daysUntilDue <= 7 };
    }));
  };

  const selectOverdue = () => { const today = startOfDay(new Date());
    setInvoices(invoices.map(inv => ({ ...inv,
      selected: inv.due_date ? isBefore(parseISO(inv.due_date), today) : false,
    })));
  };

  const clearSelection = () => { setInvoices(invoices.map(i => ({ ...i, selected: false })));
  };

  // Smart bulk toggle (replaces toggleAll for grouped UI)
  const toggleMany = (ids: string[], select: boolean) => {
    const idSet = new Set(ids);
    setInvoices(invoices.map(i => idSet.has(i.id) ? { ...i, selected: select } : i));
  };

  // Treasury suggestion: select critical (overdue + due ≤ 3d)
  const selectCritical = () => {
    const today = startOfDay(new Date());
    setInvoices(invoices.map(inv => {
      if (!inv.due_date) return { ...inv, selected: false };
      const d = differenceInDays(parseISO(inv.due_date), today);
      return { ...inv, selected: d <= 3 };
    }));
  };

  // Treasury suggestion: optimize liquidity — select pay_now only
  const selectOptimized = () => {
    setInvoices(invoices.map(inv => {
      const c = classify({
        id: inv.id, due_date: inv.due_date, status: inv.status,
        counterparty_name: inv.supplier_name, total_amount: inv.total_amount,
      });
      return { ...inv, selected: c === "pay_now" };
    }));
  };

  // Treasury suggestion: auto-match available credits
  const autoMatchCredits = () => {
    const next = new Map(creditMatches);
    const used = new Set(creditMatches.values());
    for (const inv of invoices) {
      if (next.has(inv.id)) continue;
      const credit = creditInvoices.find(c => c.supplier_name === inv.supplier_name && !used.has(c.id));
      if (credit) { next.set(inv.id, credit.id); used.add(credit.id); }
    }
    setCreditMatches(next);
    toast.success("Tillgängliga kreditfakturor matchade");
  };

  const selectedInvoices = invoices.filter(i => i.selected);

  // Credit matching logic
  const matchedCredits = useMemo(() => { const map = new Map<string, PayableInvoice>();
    for (const [invId, creditId] of creditMatches) { const credit = creditInvoices.find(c => c.id === creditId);
      if (credit) map.set(invId, credit);
    }
    return map;
  }, [creditMatches, creditInvoices]);

  const totalSelected = useMemo(() => { let sum = selectedInvoices.reduce((s, i) => s + i.total_amount, 0);
    // Subtract matched credits
    for (const inv of selectedInvoices) { const credit = matchedCredits.get(inv.id);
      if (credit) sum += credit.total_amount; // credit.total_amount is negative
    }
    return sum;
  }, [selectedInvoices, matchedCredits]);

  const remaining = accountBalance - totalSelected;

  const isOverdue = (date: string) => isBefore(parseISO(date), startOfDay(new Date()));

  // Credit matching helpers
  const getAvailableCreditsForSupplier = (supplierName: string) => { const usedCreditIds = new Set(creditMatches.values());
    return creditInvoices.filter(c => c.supplier_name === supplierName && !usedCreditIds.has(c.id));
  };

  const openCreditMatch = (invoice: PayableInvoice) => { setCreditMatchInvoice(invoice);
    setShowCreditMatchDialog(true);
  };

  const matchCredit = (invoiceId: string, creditId: string) => { const next = new Map(creditMatches);
    next.set(invoiceId, creditId);
    setCreditMatches(next);
    setShowCreditMatchDialog(false);
    toast.success("Kreditfaktura matchad");
  };

  const unmatchCredit = (invoiceId: string) => { const next = new Map(creditMatches);
    next.delete(invoiceId);
    setCreditMatches(next);
    toast.success("Kreditfaktura frikopplad");
  };

  // Count stats
  const overdueCount = invoices.filter(i => i.due_date && isOverdue(i.due_date)).length;
  const dueSoonCount = invoices.filter(i => { if (!i.due_date) return false;
    const d = differenceInDays(parseISO(i.due_date), startOfDay(new Date()));
    return d >= 0 && d <= 7;
  }).length;

  // ═══════════════ pain.001 generation ═══════════════
  const generatePain001 = (company: Company, invoicesToPay: PayableInvoice[], execDate: string): string => { const msgId = `Cogniq-${Date.now()}`;
    // Calculate net amounts per invoice (after credit matching)
    const netInvoices = invoicesToPay.map(inv => { const credit = matchedCredits.get(inv.id);
      const netAmount = credit ? inv.total_amount + credit.total_amount : inv.total_amount;
      return { ...inv, total_amount: Math.max(netAmount, 0) };
    }).filter(inv => inv.total_amount > 0);

    const total = netInvoices.reduce((s, i) => s + i.total_amount, 0);

    return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>${netInvoices.length}</NbOfTxs>
      <CtrlSum>${total.toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>${company.name}</Nm>
        <Id><OrgId><Othr><Id>${company.org_number}</Id></Othr></OrgId></Id>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>BATCH-${Date.now()}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${netInvoices.length}</NbOfTxs>
      <CtrlSum>${total.toFixed(2)}</CtrlSum>
      <ReqdExctnDt>${execDate}</ReqdExctnDt>
      <Dbtr><Nm>${company.name}</Nm></Dbtr>
      ${netInvoices.map(inv => { const ref = inv.invoice_number || "";
        const acct = inv.bankgiro
          ? `<CdtrAcct><Id><Othr><Id>${inv.bankgiro}</Id><SchmeNm><Cd>BGNR</Cd></SchmeNm></Othr></Id></CdtrAcct>`
          : inv.iban
          ? `<CdtrAcct><Id><IBAN>${inv.iban}</IBAN></Id></CdtrAcct>` : "";
        const bic = inv.bic ? `<CdtrAgt><FinInstnId><BIC>${inv.bic}</BIC></FinInstnId></CdtrAgt>` : "";
        return `<CdtTrfTxInf>
        <PmtId><EndToEndId>${ref}</EndToEndId></PmtId>
        <Amt><InstdAmt Ccy="${inv.currency || "SEK"}">${inv.total_amount.toFixed(2)}</InstdAmt></Amt>
        ${bic}
        <Cdtr><Nm>${inv.supplier_name}</Nm></Cdtr>
        ${acct}
        <RmtInf><Ustrd>${ref}</Ustrd></RmtInf>
      </CdtTrfTxInf>`;
      }).join("\n      ")}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
  };

  const handleSendForApproval = async () => { if (!user || !selectedCompany || selectedInvoices.length === 0) return;
    if (!approver1) { toast.error("Välj minst en attestant"); return; }
    if (approvalLevel === "4-eye" && !approver2) { toast.error("Välj en andra attestant för 4-ögon"); return; }

    setSubmitting(true);
    try { const company = companies.find(c => c.id === selectedCompany)!;
      const execDate = payImmediately ? format(new Date(), "yyyy-MM-dd") : paymentDate;
      const xml = generatePain001(company, selectedInvoices, execDate);
      const filename = `pain001-${execDate}-${fmt(totalSelected).replace(/\s/g, "")}.xml`;

      const { data: proposal, error } = await (supabase.from("payment_proposals").insert({ company_id: selectedCompany,
        created_by: user.id,
        payment_date: execDate,
        pay_immediately: payImmediately,
        reference_type: referenceType,
        approval_level: approvalLevel,
        status: "pending_approval",
        total_amount: totalSelected,
        invoice_count: selectedInvoices.length,
        pain001_xml: xml,
        pain001_filename: filename,
        approver_1_id: approver1,
        approver_2_id: approvalLevel === "4-eye" ? approver2 : null,
      }).select().maybeSingle());

      if (error) throw error;

      const invoiceRows = selectedInvoices.map(inv => { const credit = matchedCredits.get(inv.id);
        const netAmount = credit ? inv.total_amount + credit.total_amount : inv.total_amount;
        return { proposal_id: proposal.id,
          invoice_id: inv.id,
          amount: Math.max(netAmount, 0),
          currency: inv.currency || "SEK",
          bankgiro: inv.bankgiro,
          iban: inv.iban,
          bic: inv.bic,
          reference: inv.invoice_number,
        };
      });

      await supabase.from("payment_proposal_invoices").insert(invoiceRows);

      toast.success("Betalningsförslag skickat för godkännande!");
      setShowAttestDialog(false);
      setCreditMatches(new Map());
      loadPayableInvoices();
      loadHistory();
    } catch (err: any) { toast.error(err.message || "Kunde inte skapa betalningsförslag");
    } finally { setSubmitting(false);
    }
  };

  const handleApprove = async (proposal: ProposalRow) => { if (!user) return;
    setSubmitting(true);
    try { let newStatus = "approved";
      const updates: any = { updated_at: new Date().toISOString() };

      if (proposal.approval_level === "4-eye" && proposal.status === "pending_approval") { newStatus = "approved_1";
        updates.approver_1_at = new Date().toISOString();
      } else if (proposal.status === "approved_1") { newStatus = "approved";
        updates.approver_2_at = new Date().toISOString();
      } else { updates.approver_1_at = new Date().toISOString();
      }
      updates.status = newStatus;

      await (supabase.from("payment_proposals").update(updates).eq("id", proposal.id));

      if (newStatus === "approved") { await createPaymentJournalEntry(proposal);
      }

      toast.success(newStatus === "approved" ? "Betalningsförslag godkänt!" : "Steg 1 godkänt – väntar på attestant 2");
      setShowReviewDialog(false);
      loadHistory();
    } catch (err: any) { toast.error(err.message || "Kunde inte godkänna");
    } finally { setSubmitting(false);
    }
  };

  const handleReject = async (proposal: ProposalRow) => { if (!rejectionComment.trim()) { toast.error("Ange en kommentar"); return; }
    setSubmitting(true);
    try { await (supabase.from("payment_proposals").update({ status: "rejected", rejection_comment: rejectionComment, updated_at: new Date().toISOString(),
      }).eq("id", proposal.id));
      toast.success("Betalningsförslag avvisat");
      setShowReviewDialog(false);
      setRejectionComment("");
      loadHistory();
    } catch (err: any) { toast.error(err.message || "Kunde inte avvisa");
    } finally { setSubmitting(false);
    }
  };

  const createPaymentJournalEntry = async (proposal: ProposalRow) => { try { const acc2440 = await ensureAccount("2440", "Leverantörsskulder", "liability");
      const acc1930 = await ensureAccount("1930", "Företagskonto/checkkonto", "asset");

      const { data: je, error: jeErr } = await (supabase.from("journal_entries").insert({ company_id: selectedCompany,
        entry_date: proposal.payment_date,
        description: `Betalningsfil ${proposal.pain001_filename || ""}`,
        status: "approved",
        created_by: user!.id,
        approved_by: user!.id,
        series_code: "LB",
      }).select().maybeSingle());

      if (jeErr) throw jeErr;

      const { data: pInvoices } = await (supabase
        .from("payment_proposal_invoices").select("*").eq("proposal_id", proposal.id));

      if (pInvoices && je) { const lines = [];
        for (const pi of pInvoices) { lines.push({ journal_entry_id: je.id, account_id: acc2440, debit: pi.amount, credit: 0 });
          lines.push({ journal_entry_id: je.id, account_id: acc1930, debit: 0, credit: pi.amount });
        }
        await supabase.from("journal_entry_lines").insert(lines);
        await (supabase.from("payment_proposals").update({ journal_entry_id: je.id }).eq("id", proposal.id));
        for (const pi of pInvoices) { await (supabase.from("invoices").update({ status: "paid", paid_date: proposal.payment_date }).eq("id", pi.invoice_id));
        }
      }
    } catch (err: any) { console.error("Failed to create payment JE:", err);
    }
  };

  const ensureAccount = async (num: string, name: string, type: string): Promise<string> => { const { data } = await supabase.from("chart_of_accounts").select("id")
      .eq("company_id", selectedCompany).eq("account_number", num).limit(1).maybeSingle();
    if (data) return data.id;
    const { data: created } = await supabase.from("chart_of_accounts")
      .insert({ company_id: selectedCompany, account_number: num, account_name: name, account_type: type }).select().maybeSingle();
    return created!.id;
  };

  const downloadXml = async (proposal: ProposalRow) => {
    if (!proposal.pain001_xml) return;
    const blob = new Blob([proposal.pain001_xml], { type: "application/xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = proposal.pain001_filename || `pain001-${proposal.payment_date}.xml`;
    a.click();
    URL.revokeObjectURL(a.href);

    // Transition approved → exported_to_bank on first download, with audit log
    if (proposal.status === "approved" && user) {
      const now = new Date().toISOString();
      const { error: upErr } = await supabase
        .from("payment_proposals")
        .update({ status: "exported_to_bank", exported_at: now, updated_at: now })
        .eq("id", proposal.id);
      if (!upErr) {
        await supabase.from("payment_status_log" as never).insert({
          proposal_id: proposal.id,
          company_id: selectedCompany,
          from_status: "approved",
          to_status: "exported_to_bank",
          changed_by: user.id,
          note: "Betalningsfil nedladdad",
        } as never);
        loadHistory();
      }
    }
    toast.success("Betalningsfil nedladdad — ladda upp den i din bank för godkännande");
  };

  const openReview = async (proposal: ProposalRow) => { setReviewProposal(proposal);
    const { data } = await (supabase
      .from("payment_proposal_invoices")
      .select("*, invoices:invoice_id(invoice_number, counterparty_name, due_date, currency, ocr_number, total_amount)")
      .eq("proposal_id", proposal.id));
    setReviewInvoices(data || []);
    setShowReviewDialog(true);
  };

  const toggleExpandProposal = async (id: string) => { if (expandedProposal === id) { setExpandedProposal(null); return; }
    const { data } = await (supabase
      .from("payment_proposal_invoices")
      .select("*, invoices:invoice_id(invoice_number, counterparty_name, due_date, ocr_number, currency)")
      .eq("proposal_id", id));
    setExpandedInvoices(data || []);
    setExpandedProposal(id);
  };

  const canApprove = (p: ProposalRow) => { if (!user) return false;
    if (p.status === "pending_approval" && p.approver_1_id === user.id) return true;
    if (p.status === "approved_1" && p.approver_2_id === user.id) return true;
    return false;
  };

  const canReview = (p: ProposalRow) => { return p.status === "pending_approval" || p.status === "approved_1";
  };

  const getUserName = (id: string | null) => { if (!id) return "–";
    const u = companyUsers.find(u => u.id === id);
    const name = [u?.first_name, u?.last_name].filter(Boolean).join(" ");
    return name || u?.email || id.slice(0, 8);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><CreditCard className="h-5 w-5 text-primary" /></div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Leverantörsbetalningar</h1>
            <p className="text-sm text-muted-foreground">
              Förbered betalningsfiler — godkänn betalningen i din egen bank.
            </p>
          </div>
        </div>
        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Välj företag" /></SelectTrigger>
          <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Top KPI summary */}
      <PaymentSummaryCards
        invoices={invoices.map(i => ({ due_date: i.due_date, total_amount: i.total_amount, status: i.status }))}
        proposals={proposals.map(p => ({ status: p.status, total_amount: p.total_amount, paid_at: (p as unknown as { paid_at?: string | null }).paid_at ?? null, created_at: p.created_at }))}
      />

      <Tabs defaultValue="proposal">
        <TabsList>
          <TabsTrigger value="proposal"><FileText className="w-4 h-4 mr-1" />Betalningsförslag</TabsTrigger>
          <TabsTrigger value="expenses"><Wallet className="w-4 h-4 mr-1" />Utläggsbetalningar</TabsTrigger>
          <TabsTrigger value="reconcile"><ArrowDownUp className="w-4 h-4 mr-1" />Avstämning</TabsTrigger>
          <TabsTrigger value="history"><History className="w-4 h-4 mr-1" />Historik</TabsTrigger>
          <TabsTrigger value="connections"><Link2 className="w-4 h-4 mr-1" />Anslutningar</TabsTrigger>
        </TabsList>

        {/* ══════ TAB: BETALNINGSFÖRSLAG ══════ */}
        <TabsContent value="proposal" className="space-y-4 mt-4">
          {/* Treasury liquidity bar */}
          <TreasuryLiquidityBar
            bankBalance={bankBalance}
            ledgerBalance={accountBalance}
            selectedCount={selectedInvoices.length}
            totalSelected={totalSelected}
            invoices={invoices.map(i => ({ due_date: i.due_date, total_amount: i.total_amount }))}
            onOpenSync={() => navigate("/bankintegration")}
          />

          {/* AI suggestion engine */}
          {invoices.length > 0 && (
            <PaymentSuggestionCard
              mode={aiMode}
              onModeChange={setAiMode}
              overdueCount={overdueCount}
              overdueAmount={invoices
                .filter(i => i.due_date && differenceInDays(parseISO(i.due_date), startOfDay(new Date())) <= 3)
                .reduce((s, i) => s + i.total_amount, 0)}
              canDeferAmount={invoices
                .filter(i => {
                  const c = classify({
                    id: i.id, due_date: i.due_date, status: i.status,
                    counterparty_name: i.supplier_name, total_amount: i.total_amount,
                  });
                  return c === "can_wait" || c === "strategic_delay";
                })
                .reduce((s, i) => s + i.total_amount, 0)}
              canDeferCount={invoices.filter(i => {
                const c = classify({
                  id: i.id, due_date: i.due_date, status: i.status,
                  counterparty_name: i.supplier_name, total_amount: i.total_amount,
                });
                return c === "can_wait" || c === "strategic_delay";
              }).length}
              creditCount={creditInvoices.length}
              creditAmount={Math.abs(creditInvoices.reduce((s, c) => s + c.total_amount, 0))}
              onApplyCritical={selectCritical}
              onApplyOptimize={selectOptimized}
              onApplyCredits={autoMatchCredits}
            />
          )}

          {/* Sticky cash simulation strip */}
          {selectedInvoices.length > 0 && (
            <CashSimulationStrip
              bankBalance={bankBalance.total}
              totalSelected={totalSelected}
              selectedCount={selectedInvoices.length}
              paymentDate={paymentDate}
              upcomingInvoices={invoices.map(i => ({ due_date: i.due_date, total_amount: i.total_amount }))}
            />
          )}

          {/* Filters (collapsible) */}
          <details className="rounded-2xl border border-slate-100 bg-white shadow-sm group">
            <summary className="cursor-pointer px-5 py-3 text-sm text-slate-600 hover:text-slate-900 flex items-center gap-2 list-none [&::-webkit-details-marker]:hidden">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filtrera</span>
              <span className="text-[11px] text-slate-400 ml-auto">
                {[duePeriod !== "all" && `${duePeriod}d`, supplierFilter !== "all" && supplierFilter, currencyFilter !== "all" && currencyFilter, searchTerm].filter(Boolean).join(" · ") || "Inga aktiva filter"}
              </span>
            </summary>
            <div className="flex flex-wrap gap-3 items-end px-5 pb-4 pt-1 border-t border-slate-100">
              <div className="space-y-1">
                <Label className="text-xs">Förfaller inom</Label>
                <Select value={duePeriod} onValueChange={setDuePeriod}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dagar</SelectItem>
                    <SelectItem value="14">14 dagar</SelectItem>
                    <SelectItem value="30">30 dagar</SelectItem>
                    <SelectItem value="all">Alla</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Leverantör</Label>
                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla</SelectItem>
                    {suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valuta</Label>
                <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla</SelectItem>
                    {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 flex-1 min-w-[200px]">
                <Label className="text-xs">Sök</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Leverantör eller fakturanr..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5 ml-auto">
                <Label className="text-xs">Snabbval</Label>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="h-9 text-xs" onClick={selectOverdue}>
                    Markera förfallna ({overdueCount})
                  </Button>
                  <Button size="sm" variant="outline" className="h-9 text-xs" onClick={selectSuggested}>
                    Förfaller ≤7d ({dueSoonCount})
                  </Button>
                  <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={clearSelection}>
                    Rensa
                  </Button>
                </div>
              </div>
            </div>
          </details>

          {/* Grouped invoice list */}
          {loadingData ? (
            <Card><CardContent className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></CardContent></Card>
          ) : invoices.length === 0 && creditInvoices.length === 0 ? (
            <Card>
              <CardContent className="py-12 flex flex-col items-center text-center gap-3">
                <div className="rounded-2xl bg-muted p-3">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-base font-semibold">Inga fakturor att betala för {companies.find(c => c.id === selectedCompany)?.name || "detta bolag"}</h3>
                  <p className="text-sm text-muted-foreground">
                    Ladda upp en faktura eller attestera befintliga fakturor i reskontran.
                  </p>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button onClick={() => navigate("/dokument")}>
                    <PlusCircle className="w-4 h-4 mr-1.5" />
                    Ladda upp leverantörsfaktura
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/supplier-ledger")}>
                    Öppna leverantörsreskontra
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <PaymentGroupedList
              invoices={filteredInvoices}
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
              matchedCredits={matchedCredits}
              availableCreditsBySupplier={getAvailableCreditsForSupplier}
              onToggleOne={toggleSelect}
              onToggleMany={toggleMany}
              onOpenCreditMatch={openCreditMatch}
              onUnmatchCredit={unmatchCredit}
            />
          )}

          {/* Payment settings */}
          {selectedInvoices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Betalningsdatum & inställningar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="font-medium">Betalningsdatum</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="radio" checked={!payImmediately} onChange={() => setPayImmediately(false)} className="accent-primary" />
                        <span className="text-sm">Betala på specifikt datum</span>
                      </div>
                      {!payImmediately && (
                        <Input type="date" value={paymentDate} min={format(new Date(), "yyyy-MM-dd")}
                          onChange={e => setPaymentDate(e.target.value)} className="w-48" />
                      )}
                      <div className="flex items-center gap-2">
                        <input type="radio" checked={payImmediately} onChange={() => setPayImmediately(true)} className="accent-primary" />
                        <span className="text-sm">Betala omgående</span>
                      </div>
                      {payImmediately && (
                        <p className="text-xs text-[#7A5417] flex items-center gap-1 ml-5">
                          <AlertTriangle className="w-3 h-3" />
                          Betalningen skickas direkt efter godkännande.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-medium">Betalningsreferens</Label>
                      <div className="flex items-center gap-3">
                        <Switch checked={referenceType === "ocr"} onCheckedChange={v => setReferenceType(v ? "ocr" : "invoice_number")} />
                        <span className="text-sm">{referenceType === "ocr" ? "OCR-nummer" : "Fakturanummer"} som referens</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-medium">Attestnivå</Label>
                      <Select value={approvalLevel} onValueChange={v => setApprovalLevel(v as "2-eye" | "4-eye")}>
                        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2-eye">2-ögon (standard)</SelectItem>
                          <SelectItem value="4-eye">4-ögon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={() => setShowAttestDialog(true)} className="gap-1">
                    <Send className="w-4 h-4" />Skicka för godkännande ({selectedInvoices.length} st · {fmt(totalSelected)} kr)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ══════ TAB: UTLÄGGSBETALNINGAR ══════ */}
        <TabsContent value="expenses" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Attesterade utlägg att betala
                  </CardTitle>
                  <CardDescription>
                    Utlägg som attesterade anställda har lagt ut privat. Dessa ska aldrig blandas med leverantörsbetalningar.
                  </CardDescription>
                </div>
                {selectedExpenseIds.size > 0 && (
                  <Button onClick={handleMarkExpensesPaid} disabled={submitting} className="gap-1.5">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Markera {selectedExpenseIds.size} st som betalda ({fmt(totalExpenseSelected)} kr)
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingExpenses ? (
                <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
              ) : approvedExpenses.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-[#085041]" />
                  <p>Inga attesterade utlägg att betala</p>
                  <p className="text-xs mt-1">Attestera utlägg via Utläggssidan — de visas här automatiskt</p>
                </div>
              ) : (
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={selectedExpenseIds.size === approvedExpenses.length && approvedExpenses.length > 0}
                              onCheckedChange={toggleAllExpenses}
                            />
                          </TableHead>
                          <TableHead className="text-xs">Anställd</TableHead>
                          <TableHead className="text-xs">Beskrivning</TableHead>
                          <TableHead className="text-xs">Kategori</TableHead>
                          <TableHead className="text-xs">Datum</TableHead>
                          <TableHead className="text-xs text-right">Belopp</TableHead>
                          <TableHead className="text-xs text-right">Moms</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvedExpenses.map(exp => (
                          <TableRow key={exp.id} className={selectedExpenseIds.has(exp.id) ? "bg-primary/5" : ""}>
                            <TableCell>
                              <Checkbox
                                checked={selectedExpenseIds.has(exp.id)}
                                onCheckedChange={() => toggleExpenseSelection(exp.id)}
                              />
                            </TableCell>
                            <TableCell className="text-sm font-medium">{exp.user_name}</TableCell>
                            <TableCell className="text-sm">{exp.description}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{exp.category || "—"}</TableCell>
                            <TableCell className="text-xs">{exp.expense_date}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmt(exp.amount)} kr</TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground">{fmt(exp.vat_amount || 0)} kr</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px]">Attesterad</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {selectedExpenseIds.size > 0 && (
                    <div className="border-t px-4 py-3 flex items-center justify-between bg-muted/30 rounded-b-lg">
                      <span className="text-sm font-medium">
                        Valda: <span className="text-primary">{selectedExpenseIds.size} st</span> &nbsp;·&nbsp;
                        Totalt: <span className="font-mono font-semibold">{fmt(totalExpenseSelected)} kr</span>
                      </span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-[#F0DDB7] bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-800">
            <CardContent className="py-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-[#7A5417] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#7A5417] dark:text-amber-300">Separat betalfil</p>
                <p className="text-xs text-[#7A5417] dark:text-[#C28A2B]">
                  Utläggsbetalningar hanteras alltid i en separat betalfil från leverantörsbetalningar. Bokföring sker mot konto 2893 (Löneskulder/utlägg).
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════ TAB: HISTORIK ══════ */}
        <TabsContent value="history" className="space-y-4 mt-4">
          {loadingHistory ? (
            <Card><CardContent className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></CardContent></Card>
          ) : proposals.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <History className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              Ingen betalningshistorik ännu
            </CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Datum</TableHead>
                      <TableHead>Fil-ID</TableHead>
                      <TableHead className="text-center">Antal</TableHead>
                      <TableHead className="text-right">Belopp</TableHead>
                      <TableHead>Betaldatum</TableHead>
                      <TableHead>Skapad av</TableHead>
                      <TableHead>Godkänd av</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Ver.nr</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proposals.map(p => (
                      <React.Fragment key={p.id}>
                        <TableRow className={`cursor-pointer hover:bg-accent/30 ${canReview(p) ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}`} onClick={() => canReview(p) ? openReview(p) : toggleExpandProposal(p.id)}>
                          <TableCell className="text-xs">{format(new Date(p.created_at), "yyyy-MM-dd HH:mm")}</TableCell>
                          <TableCell className="font-mono text-xs">{p.pain001_filename || "–"}</TableCell>
                          <TableCell className="text-center">{p.invoice_count}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(p.total_amount)} kr</TableCell>
                          <TableCell className="text-xs">{p.payment_date}</TableCell>
                          <TableCell className="text-xs">{getUserName(p.created_by)}</TableCell>
                          <TableCell className="text-xs">{getUserName(p.approver_1_id)}</TableCell>
                          <TableCell className="text-center">
                            <PaymentStatusBadge status={p.status} />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{p.journal_entry_id ? "LB" : "–"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {canApprove(p) && (
                                <Button size="sm" className="gap-1" onClick={e => { e.stopPropagation(); openReview(p); }}>
                                  <CheckCircle className="w-3 h-3" />Attestera
                                </Button>
                              )}
                              {canReview(p) && !canApprove(p) && (
                                <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); openReview(p); }}>
                                  <Eye className="w-3 h-3 mr-1" />Granska
                                </Button>
                              )}
                              {p.pain001_xml && p.status !== "pending_approval" && p.status !== "approved_1" && p.status !== "rejected" && (
                                <Button
                                  size="sm"
                                  variant={p.status === "approved" ? "default" : "ghost"}
                                  onClick={e => { e.stopPropagation(); downloadXml(p); }}
                                  title={p.status === "approved" ? "Generera & ladda ner betalningsfil" : "Ladda ner betalningsfil igen"}
                                >
                                  <Download className="w-3 h-3" />
                                  {p.status === "approved" && <span className="ml-1">Bankfil</span>}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedProposal === p.id && (
                          <TableRow>
                            <TableCell colSpan={10} className="bg-muted/20 p-4">
                              <p className="text-xs font-semibold mb-2 uppercase tracking-wider text-muted-foreground">Ingående fakturor</p>
                              <Table>
                                <TableHeader>
                                  <TableRow className="text-[10px]">
                                    <TableHead className="text-xs py-1">Leverantör</TableHead>
                                    <TableHead className="text-xs py-1">Fakturanr</TableHead>
                                    <TableHead className="text-xs py-1">OCR</TableHead>
                                    <TableHead className="text-xs py-1">Valuta</TableHead>
                                    <TableHead className="text-xs py-1">Förfallodatum</TableHead>
                                    <TableHead className="text-xs py-1 text-right">Belopp</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {expandedInvoices.map((ei: any) => (
                                    <TableRow key={ei.id}>
                                      <TableCell className="text-xs py-1">{ei.invoices?.counterparty_name || "–"}</TableCell>
                                      <TableCell className="font-mono text-xs py-1">{ei.invoices?.invoice_number || ei.reference}</TableCell>
                                      <TableCell className="font-mono text-xs py-1 text-muted-foreground">{ei.invoices?.ocr_number || "–"}</TableCell>
                                      <TableCell className="text-xs py-1">{ei.invoices?.currency || ei.currency || "SEK"}</TableCell>
                                      <TableCell className="text-xs py-1">{ei.invoices?.due_date || "–"}</TableCell>
                                      <TableCell className="text-right font-mono text-xs py-1 font-medium">{fmt(ei.amount)} kr</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              {p.rejection_comment && (
                                <p className="text-xs text-destructive mt-2">Avvisad: {p.rejection_comment}</p>
                              )}
                              {selectedCompany && (
                                <div className="mt-3 pt-3 border-t flex flex-col gap-2">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Manuell statusuppdatering
                                  </p>
                                  <ManualStatusUpdater
                                    proposalId={p.id}
                                    companyId={selectedCompany}
                                    currentStatus={p.status}
                                  />
                                  <ComplianceDisclaimer />
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ══════ TAB: AVSTÄMNING ══════ */}
        <TabsContent value="reconcile" className="space-y-4 mt-4">
          <PaymentReconciliationCard companyId={selectedCompany || null} />
        </TabsContent>

        {/* ══════ TAB: ANSLUTNINGAR (Open Banking placeholders) ══════ */}
        <TabsContent value="connections" className="space-y-4 mt-4">
          <OpenBankingProvidersCard companyId={selectedCompany || null} />
          <ComplianceDisclaimer variant="banner" />
        </TabsContent>
      </Tabs>

      {/* ══════ DIALOG: SKICKA FÖR ATTEST ══════ */}
      <Dialog open={showAttestDialog} onOpenChange={setShowAttestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Förbered betalning</DialogTitle>
            <DialogDescription>
              {selectedInvoices.length} fakturor · {fmt(totalSelected)} kr
              {creditMatches.size > 0 && ` (inkl. ${creditMatches.size} kreditavräkning)`}
            </DialogDescription>
          </DialogHeader>
          <ComplianceDisclaimer variant="banner" />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Attestant {approvalLevel === "4-eye" ? "1" : ""}</Label>
              <Select value={approver1} onValueChange={setApprover1}>
                <SelectTrigger><SelectValue placeholder="Välj attestant" /></SelectTrigger>
                <SelectContent>
                  {companyUsers.filter(u => u.id !== user?.id).map(u => (
                    <SelectItem key={u.id} value={u.id}>{[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {approvalLevel === "4-eye" && (
              <div className="space-y-2">
                <Label>Attestant 2</Label>
                <Select value={approver2} onValueChange={setApprover2}>
                  <SelectTrigger><SelectValue placeholder="Välj attestant 2" /></SelectTrigger>
                  <SelectContent>
                    {companyUsers.filter(u => u.id !== user?.id && u.id !== approver1).map(u => (
                      <SelectItem key={u.id} value={u.id}>{[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAttestDialog(false)}>Avbryt</Button>
            <Button onClick={handleSendForApproval} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
              Skicka
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════ DIALOG: GRANSKA & GODKÄNN ══════ */}
      <Dialog open={showReviewDialog} onOpenChange={(open) => { setShowReviewDialog(open); if (!open) setShowBankIDSigning(false); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {showBankIDSigning && reviewProposal ? (
            /* ─── BankID Signing Step ─── */
            <BankIDReviewScreen
              actionType="supplier_payment"
              summaryItems={[
                { label: "Antal fakturor", value: `${reviewProposal.invoice_count} st` },
                { label: "Totalbelopp", value: `${fmt(reviewProposal.total_amount)} kr` },
                { label: "Betaldatum", value: reviewProposal.payment_date },
                { label: "Attestnivå", value: reviewProposal.approval_level === "4-eye" ? "4-ögon" : "2-ögon" },
              ]}
              amount={reviewProposal.total_amount}
              period={reviewProposal.payment_date}
              dataSource="Leverantörsreskontra och bankintegration"
              extraChecklist={[
                "Jag har kontrollerat att alla fakturanummer och belopp stämmer",
                "Jag har verifierat att mottagarkonton (bankgiro/IBAN) är korrekta",
                "Jag godkänner att betalningsfilen får genereras och förberedas för uppladdning till bank",
              ]}
              onSign={async () => { setBankIDSigning(true);
                try { await handleApprove(reviewProposal);
                  setShowBankIDSigning(false);
                } finally { setBankIDSigning(false);
                }
              }}
              onBack={() => setShowBankIDSigning(false)}
              signing={bankIDSigning}
            >
              {/* Invoice summary within BankID screen */}
              <Separator className="my-2" />
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {reviewInvoices.map((ri: any) => (
                  <div key={ri.id} className="flex justify-between text-xs">
                    <span className="font-mono">{ri.invoices?.invoice_number || ri.reference}</span>
                    <span className="truncate mx-2 text-muted-foreground">{ri.invoices?.counterparty_name || "–"}</span>
                    <span className="font-mono font-medium">{fmt(ri.amount)} {ri.currency}</span>
                  </div>
                ))}
              </div>
            </BankIDReviewScreen>
          ) : (
            /* ─── Normal Review Step ─── */
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Intern attest av betalningsförslag
                </DialogTitle>
                <DialogDescription>
                  Granska alla fakturor innan intern attest. Betalningen godkänns och utförs i din egen bank.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30 border">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Totalbelopp</p>
                    <p className="text-lg font-bold font-mono">{fmt(reviewProposal?.total_amount || 0)} kr</p>
                    <p className="text-[10px] text-muted-foreground">{reviewProposal?.invoice_count} fakturor</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Betaldatum</p>
                    <p className="text-lg font-bold">{reviewProposal?.payment_date || "–"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {reviewProposal?.approval_level === "4-eye" ? "4-ögon attest" : "2-ögon attest"}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg border ${(accountBalance - (reviewProposal?.total_amount || 0)) < 0 ? "bg-destructive/5 border-destructive/20" : "bg-muted/30"}`}>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Återstår efter betalning</p>
                    <p className={`text-lg font-bold font-mono ${(accountBalance - (reviewProposal?.total_amount || 0)) < 0 ? "text-destructive" : ""}`}>
                      {fmt(accountBalance - (reviewProposal?.total_amount || 0))} kr
                    </p>
                    <p className="text-[10px] text-muted-foreground">Banksaldo: {fmt(accountBalance)} kr</p>
                  </div>
                </div>

                {/* Attestation info */}
                <div className="p-3 rounded-lg border bg-muted/20 space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Skapad av</span>
                    <span className="font-medium">{getUserName(reviewProposal?.created_by || null)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Attestant</span>
                    <span className="font-medium">{getUserName(reviewProposal?.approver_1_id || null)}</span>
                  </div>
                  {reviewProposal?.approval_level === "4-eye" && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Attestant 2</span>
                      <span className="font-medium">{getUserName(reviewProposal?.approver_2_id || null)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={statusVariant(reviewProposal?.status || "")}>{statusLabels[reviewProposal?.status || ""] || reviewProposal?.status}</Badge>
                  </div>
                  {reviewProposal && canApprove(reviewProposal) && (
                    <div className="flex items-center gap-2 text-sm text-[#085041] dark:text-[#1D9E75] bg-[#E1F5EE] dark:bg-green-950/30 rounded px-2 py-1.5 mt-1">
                      <CheckCircle className="w-4 h-4" />
                      <span>Du är utsedd attestant — godkänn eller avvisa nedan</span>
                    </div>
                  )}
                </div>

                {/* Full invoice table */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Fakturor i betalningsförslaget</p>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs">Leverantör</TableHead>
                          <TableHead className="text-xs">Fakturanr</TableHead>
                          <TableHead className="text-xs">OCR</TableHead>
                          <TableHead className="text-xs">Valuta</TableHead>
                          <TableHead className="text-xs">Förfallodatum</TableHead>
                          <TableHead className="text-xs text-right">Belopp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reviewInvoices.map((ri: any) => (
                          <TableRow key={ri.id}>
                            <TableCell className="text-sm font-medium">{ri.invoices?.counterparty_name || "–"}</TableCell>
                            <TableCell className="font-mono text-xs">{ri.invoices?.invoice_number || ri.reference}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{ri.invoices?.ocr_number || "–"}</TableCell>
                            <TableCell className="text-xs">{ri.currency || "SEK"}</TableCell>
                            <TableCell className="text-xs">{ri.invoices?.due_date || "–"}</TableCell>
                            <TableCell className="text-right font-mono font-semibold">{fmt(ri.amount)} kr</TableCell>
                          </TableRow>
                        ))}
                        {/* Total row */}
                        <TableRow className="bg-muted/30 border-t-2">
                          <TableCell colSpan={5} className="font-semibold text-sm">Totalt</TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm">
                            {fmt(reviewProposal?.total_amount || 0)} kr
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {reviewProposal && canApprove(reviewProposal) && (
                  <div className="space-y-2">
                    <Label>Kommentar vid avvisning</Label>
                    <Textarea value={rejectionComment} onChange={e => setRejectionComment(e.target.value)} placeholder="Ange anledning vid eventuell avvisning..." />
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                {reviewProposal && canApprove(reviewProposal) ? (
                  <>
                    <Button variant="destructive" onClick={() => handleReject(reviewProposal)} disabled={submitting}>
                      Avvisa
                    </Button>
                    <Button onClick={() => setShowBankIDSigning(true)} className="gap-1.5">
                      <Shield className="w-4 h-4" />
                      Attestera internt med BankID
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setShowReviewDialog(false)}>Stäng</Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════ DIALOG: KREDITFAKTURA MATCHNING ══════ */}
      <Dialog open={showCreditMatchDialog} onOpenChange={setShowCreditMatchDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-blue-500" />
              Matcha kreditfaktura
            </DialogTitle>
            <DialogDescription>
              {creditMatchInvoice && (
                <>Faktura {creditMatchInvoice.invoice_number} · {creditMatchInvoice.supplier_name} · {fmt(creditMatchInvoice.total_amount)} kr</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Tillgängliga kreditfakturor från samma leverantör:</p>
            {creditMatchInvoice && getAvailableCreditsForSupplier(creditMatchInvoice.supplier_name).map(credit => { const netAfter = creditMatchInvoice.total_amount + credit.total_amount;
              return (
                <div key={credit.id} className="flex items-center justify-between p-3 rounded-lg border hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors">
                  <div>
                    <p className="text-sm font-medium font-mono">{credit.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">{credit.invoice_date} · {credit.supplier_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-blue-600 font-semibold">{fmt(Math.abs(credit.total_amount))} kr</p>
                    <p className="text-[10px] text-muted-foreground">Netto: {fmt(netAfter)} kr</p>
                  </div>
                  <Button size="sm" variant="outline" className="ml-3 gap-1" onClick={() => matchCredit(creditMatchInvoice.id, credit.id)}>
                    <Link2 className="h-3 w-3" /> Matcha
                  </Button>
                </div>
              );
            })}
            {creditMatchInvoice && getAvailableCreditsForSupplier(creditMatchInvoice.supplier_name).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Inga kreditfakturor tillgängliga</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DirectPayment;
