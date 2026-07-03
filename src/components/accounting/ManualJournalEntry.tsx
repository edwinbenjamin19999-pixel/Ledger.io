import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { getVatRateForAccount } from "@/lib/validators/vat-rates";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Plus, AlertTriangle, CheckCircle, Trash2, Loader2, Info, Sparkles, Upload, X, FileText, Bot, Paperclip, CalendarIcon, RotateCcw, Save, ArrowRight, HelpCircle } from "lucide-react";
import { AccrualReversal } from "./AccrualReversal";
import { AISuggestionCard, type AISuggestion } from "./AISuggestionCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DSJournalInput, DSAddLineButton, DSBalance } from "@/components/ds";

// ── Series definitions ──
const JOURNAL_SERIES = [
  { code: "M", name: "Manuell bokföring", description: "Manuella verifikationer, periodiseringar, avsättningar och rättelseposter", system: false },
  { code: "B", name: "Bankverifikation", description: "Manuella bankposter och enstaka betalningar", system: false },
  { code: "LB", name: "Likvidbokföring", description: "Betalningsfiler i bunt, CAMT.054-import, autogiro och batchbetalningar", system: false },
  { code: "F", name: "Kundfaktura", description: "Kundfakturor", system: false },
  { code: "L", name: "Leverantörsfaktura", description: "Leverantörsfakturor", system: false },
  { code: "LN", name: "Lönebokföring", description: "Lönekörning", system: false },
  { code: "IB", name: "Ingående balansposter", description: "Skapas automatiskt vid start av nytt räkenskapsår", system: true },
  { code: "HB", name: "Huvudboksposter", description: "Periodöverföring och interna systemgenererade balansposter", system: true },
];

export interface JournalLine { id: string;
  account_id: string;
  account_number?: string;
  account_name?: string;
  debit: number;
  credit: number;
  vat_code?: string;
  vat_amount?: number;
  vat_basis?: "gross" | "net";
  cost_center_id?: string;
  project?: string;
}

export interface Account { id: string;
  account_number: string;
  account_name: string;
  account_type: string;
  vat_code?: string | null;
}

interface CostCenter { id: string;
  code: string;
  name: string;
}

interface Attachment { id: string;
  file: File;
  description: string;
  type: string;
}

export type JournalRowError = { account?: string; duplicate?: string; empty?: string };

export const computeJournalEntryValidation = (lines: JournalLine[], accounts: Account[], isBalanced: boolean) => {
  const rowErrors: Record<string, JournalRowError> = {};
  const filled = lines.filter(l => (parseFloat(String(l.debit)) || 0) > 0 || (parseFloat(String(l.credit)) || 0) > 0);

  for (const l of lines) {
    const debit = parseFloat(String(l.debit)) || 0;
    const credit = parseFloat(String(l.credit)) || 0;
    const amt = debit + credit;
    const e: JournalRowError = {};
    if (amt > 0) {
      const acc = accounts.find(a => a.id === l.account_id);
      if (!l.account_id) e.account = "Konto saknas";
      else if (!acc) e.account = `Okänt konto (${l.account_number || "—"})`;
      if (debit > 0 && credit > 0) e.empty = "En rad får inte ha både debet och kredit";
    }
    if (Object.keys(e).length) rowErrors[l.id] = e;
  }

  const seen = new Map<string, string>();
  for (const l of filled) {
    const dir = (parseFloat(String(l.debit)) || 0) > 0 ? "D" : "K";
    const amt = dir === "D" ? parseFloat(String(l.debit)) || 0 : parseFloat(String(l.credit)) || 0;
    if (!l.account_id) continue;
    const key = `${l.account_id}|${amt.toFixed(2)}|${dir}`;
    if (seen.has(key)) {
      rowErrors[l.id] = { ...(rowErrors[l.id] || {}), duplicate: "Dubblett av annan rad" };
      const firstId = seen.get(key)!;
      rowErrors[firstId] = { ...(rowErrors[firstId] || {}), duplicate: "Dubblett av annan rad" };
    } else {
      seen.set(key, l.id);
    }
  }

  const baseAccountPresent = filled.some(l => {
    const num = l.account_number || accounts.find(a => a.id === l.account_id)?.account_number || "";
    return num && !/^26[1-5]\d$/.test(num);
  });
  const vatAccountNumbers = new Set<string>();
  for (const l of filled) {
    const num = l.account_number || accounts.find(a => a.id === l.account_id)?.account_number || "";
    if (/^26[1-5]\d$/.test(num)) vatAccountNumbers.add(num);
  }
  const vatWarning = vatAccountNumbers.size > 0 && !baseAccountPresent
    ? `Momskonto används (${[...vatAccountNumbers].join(", ")}) men ingen underlagsrad finns`
    : null;

  const validFilled = filled.filter(l => l.account_id && accounts.find(a => a.id === l.account_id));
  const tooFew = validFilled.length < 2 ? "Minst 2 konteringsrader med konto och belopp krävs" : null;
  const hasRowErrors = Object.keys(rowErrors).length > 0;

  return { rowErrors, vatWarning, tooFew, blocking: !isBalanced || hasRowErrors || !!tooFew || !!vatWarning };
};

// ── Searchable Account Selector ──
const AccountSelector = ({ accounts, value, onChange }: { accounts: Account[]; value: string; onChange: (id: string) => void }) => { const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = accounts.find(a => a.id === value);

  const filtered = useMemo(() => { if (!search) return accounts.slice(0, 50);
    const q = search.toLowerCase();
    return accounts.filter(a =>
      a.account_number.includes(q) || a.account_name.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [accounts, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="h-8 text-xs justify-start font-normal w-full truncate px-2">
          {selected ? `${selected.account_number} – ${selected.account_name}` : "Välj konto..."}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Sök kontonummer eller namn..." value={search} onValueChange={setSearch} className="h-9" />
          <CommandList>
            <CommandEmpty>Inget konto hittat</CommandEmpty>
            <CommandGroup>
              {filtered.map(a => (
                <CommandItem key={a.id} value={a.id} onSelect={() => { onChange(a.id); setOpen(false); setSearch(""); }} className="text-xs">
                  <span className="font-mono mr-2">{a.account_number}</span>
                  <span className="truncate">{a.account_name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const ManualJournalEntry = ({ companyId }: { companyId: string }) => { const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("manual");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [lines, setLines] = useState<JournalLine[]>([]);
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [description, setDescription] = useState("");
  const [seriesCode, setSeriesCode] = useState("M");
  const [nextSeriesNumber, setNextSeriesNumber] = useState<string | null>(null);
  const [autoNumber, setAutoNumber] = useState(true);
  const [manualNumber, setManualNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [aiValidation, setAiValidation] = useState<{ status: "ok" | "warn" | "error" | null; message: string }>({ status: null, message: "" });
  const [aiLoading, setAiLoading] = useState(false);

  // AI suggestion state
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [userOverrodeSeries, setUserOverrodeSeries] = useState(false);
  const aiSuggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const roundCurrency = (value: number) => Math.round(value * 100) / 100;

  // Accrual-specific
  const [accrualType, setAccrualType] = useState("periodisering");
  const [reversalDate, setReversalDate] = useState<Date | undefined>(undefined);

  // Lookup of existing entry by series + number
  const [lookupSeries, setLookupSeries] = useState("M");
  const [lookupNumber, setLookupNumber] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    id: string;
    journal_number: string;
    entry_date: string;
    description: string;
    status: string;
  } | null>(null);

  const lookupExistingEntry = useCallback(async () => {
    if (!lookupNumber.trim()) {
      toast.error("Ange ett verifikationsnummer");
      return;
    }
    setLookupLoading(true);
    setLookupResult(null);
    try {
      // Build candidate journal_number patterns: e.g. "M2026-0003", "M-3", "3"
      const raw = lookupNumber.trim();
      const numericPart = raw.replace(/\D/g, "");
      const padded = numericPart ? String(parseInt(numericPart, 10)).padStart(4, "0") : "";
      const candidates = [
        raw,
        `${lookupSeries}${entryDate.getFullYear()}-${padded}`,
        `${lookupSeries}-${numericPart}`,
        numericPart,
      ].filter(Boolean);

      const { data, error } = await supabase
        .from("journal_entries")
        .select("id, journal_number, entry_date, description, status, series_code")
        .eq("company_id", companyId)
        .in("journal_number", candidates)
        .limit(5);

      if (error) throw error;
      const match = (data || []).find(
        (d: any) => !d.series_code || d.series_code === lookupSeries
      ) || (data || [])[0];

      if (!match) {
        toast.error(`Ingen verifikation hittad för ${lookupSeries} ${raw}`);
        return;
      }

      // Load lines for the matched entry
      const { data: lineData, error: lineError } = await supabase
        .from("journal_entry_lines")
        .select("id, account_id, debit, credit, vat_code, cost_center_id, project, chart_of_accounts(account_number, account_name)")
        .eq("journal_entry_id", match.id)
        .order("debit", { ascending: false });

      if (lineError) throw lineError;

      const loadedLines: JournalLine[] = (lineData || []).map((l: any) => ({
        id: l.id,
        account_id: l.account_id || "",
        account_number: l.chart_of_accounts?.account_number,
        account_name: l.chart_of_accounts?.account_name,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        vat_code: l.vat_code || "none",
        vat_basis: "gross",
        cost_center_id: l.cost_center_id || undefined,
        project: l.project || undefined,
      }));

      setLines(loadedLines);
      setDescription(match.description || "");
      if (match.entry_date) setEntryDate(new Date(match.entry_date));
      setLookupResult({
        id: match.id,
        journal_number: match.journal_number,
        entry_date: match.entry_date,
        description: match.description || "",
        status: match.status,
      });
      toast.success(`Verifikation ${match.journal_number} laddad`);
    } catch (err: any) {
      console.error("[ManualJournalEntry] lookup failed", err);
      toast.error(`Kunde inte hämta verifikation: ${err.message || err}`);
    } finally {
      setLookupLoading(false);
    }
  }, [companyId, lookupSeries, lookupNumber, entryDate]);

  useEffect(() => { if (companyId && isOpen) { loadAccounts();
      loadCostCenters();
      loadNextSeriesNumber(seriesCode);
      if (lines.length === 0) { addNewLine();
        addNewLine();
      }
    }
  }, [companyId, isOpen]);

  useEffect(() => { if (companyId && isOpen) loadNextSeriesNumber(seriesCode);
  }, [seriesCode]);

  const loadAccounts = async () => { const { data } = await supabase.from("chart_of_accounts").select("*").eq("company_id", companyId).eq("is_active", true).order("account_number");
    setAccounts(data || []);
  };

  const loadCostCenters = async () => { const { data } = await supabase.from("cost_centers").select("id, code, name").eq("company_id", companyId).eq("is_active", true).order("code");
    setCostCenters(data || []);
  };

  const loadNextSeriesNumber = async (code: string) => { const year = entryDate.getFullYear();
    const { data } = await supabase
      .from("journal_series_counters")
      .select("next_number")
      .eq("company_id", companyId)
      .eq("series_code", code)
      .eq("fiscal_year", year)
      .maybeSingle();
    const num = data?.next_number || 1;
    setNextSeriesNumber(`${code}${year}-${String(num).padStart(4, "0")}`);
  };

  const addNewLine = () => { setLines(prev => [...prev, { id: `temp-${Date.now()}-${Math.random()}`, account_id: "", debit: 0, credit: 0, vat_basis: "gross", vat_code: "none" }]);
  };

  const removeLine = (id: string) => setLines(prev => prev.filter(l => l.id !== id));

  const isExpenseAccount = (accNum: string) => { return accNum.startsWith("1") || accNum.startsWith("4") || accNum.startsWith("5") || accNum.startsWith("6") || accNum.startsWith("7");
  };

  const recalcVat = (line: JournalLine): JournalLine => { const vc = line.vat_code;
    if (vc && vc !== "none" && vc !== "0") { const baseAmount = Math.max(parseFloat(String(line.debit)) || 0, parseFloat(String(line.credit)) || 0);
      const vatRate = parseFloat(vc);
      const vatBasis = line.vat_basis || "gross";
      if (baseAmount > 0 && vatRate > 0) { line.vat_amount = roundCurrency(vatBasis === "net" ? baseAmount * vatRate / 100 : baseAmount * vatRate / (100 + vatRate));
      } else { line.vat_amount = 0;
      }
    } else { line.vat_amount = 0;
    }
    return line;
  };

  const updateLine = (id: string, field: keyof JournalLine, value: any) => { setLines(prev => prev.map(line => { if (line.id !== id) return line;
      const updated = { ...line, [field]: value };
      if (field === "account_id") { const account = accounts.find(a => a.id === value);
        if (account) { updated.account_number = account.account_number;
          updated.account_name = account.account_name;
          if (!line.vat_code || line.vat_code === "none") { const chartVat = account.vat_code;
            if (chartVat) { updated.vat_code = chartVat;
            } else { const suggestedRate = getVatRateForAccount(account.account_number);
              if (suggestedRate !== null && suggestedRate > 0) updated.vat_code = String(suggestedRate);
            }
          }
        }
      }
      if (["debit", "credit", "vat_code", "vat_basis", "account_id"].includes(field)) recalcVat(updated);
      return updated;
    }));
    setAiValidation({ status: null, message: "" });
  };

  // AI validation
  const runAiValidation = useCallback(async () => { const filledLines = lines.filter(l => l.account_id && (l.debit > 0 || l.credit > 0));
    if (filledLines.length < 2) return;
    setAiLoading(true);
    try { const linesSummary = filledLines.map(l => `${l.account_number} ${l.account_name}: D${l.debit} K${l.credit}`).join(", ");
      const { data } = await supabase.functions.invoke("ai-assistant", { body: { prompt: `Analysera denna kontering kort (max 1 mening): "${description || "ingen beskrivning"}" med rader: ${linesSummary}. Är kontovalet rimligt? Svara antingen "OK: [kort bekräftelse]" eller "VARNING: [kort problem]". Svara på svenska.`,
          company_id: companyId
        }
      });
      const response = data?.response || data?.message || "";
      if (response.toUpperCase().startsWith("OK")) { setAiValidation({ status: "ok", message: response.replace(/^OK:\s*/i, "") });
      } else { setAiValidation({ status: "warn", message: response.replace(/^VARNING:\s*/i, "") });
      }
    } catch { setAiValidation({ status: null, message: "" });
    } finally { setAiLoading(false);
    }
  }, [lines, description, companyId]);

  useEffect(() => { const filledLines = lines.filter(l => l.account_id && (l.debit > 0 || l.credit > 0));
    if (filledLines.length >= 2) { const timer = setTimeout(runAiValidation, 1500);
      return () => clearTimeout(timer);
    }
  }, [lines, runAiValidation]);

  // Auto-save draft to localStorage every 30s
  useEffect(() => { if (!isOpen || lines.length < 2) return;
    const interval = setInterval(() => {
      try {
        localStorage.setItem('journal_draft', JSON.stringify({ lines, description: '', date: '' }));
      } catch { /* silently fail */ }
    }, 30000);
    return () => clearInterval(interval);
  }, [isOpen, lines]);

  const handleSave = async (asDraft: boolean) => { if (!asDraft && !isBalanced) { toast.error(`Verifikationen är inte i balans (differens ${difference.toFixed(2)} kr)`); return; }
    if (!asDraft && validation.blocking) { toast.error(validation.tooFew || validation.vatWarning || "Åtgärda valideringsfel innan bokföring"); return; }
    
    setIsSaving(true);
    setIsDraft(asDraft);
    try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Inte inloggad");

      const insertData: any = { company_id: companyId,
        entry_date: format(entryDate, "yyyy-MM-dd"),
        description,
        status: asDraft ? "draft" : "approved",
        created_by: user.id,
        series_code: seriesCode,
      };
      if (!autoNumber && manualNumber.trim()) {
        insertData.journal_number = manualNumber.trim();
      }
      if (!asDraft) insertData.approved_by = user.id;

      const { data: entry, error: entryError } = await supabase
        .from("journal_entries")
        .insert(insertData)
        .select()
        .maybeSingle();
      if (entryError) throw entryError;
      if (!entry) throw new Error("Misslyckades skapa verifikation");

      const validLines = lines.filter(l => l.account_id);
      const { error: linesError } = await supabase.from("journal_entry_lines").insert(
        validLines.map(l => ({ journal_entry_id: entry.id,
          account_id: l.account_id,
          debit: parseFloat(String(l.debit)) || 0,
          credit: parseFloat(String(l.credit)) || 0,
          vat_code: l.vat_code && l.vat_code !== "none" ? l.vat_code : null,
          vat_amount: parseFloat(String(l.vat_amount)) || 0,
          cost_center_id: l.cost_center_id || null,
        }))
      );
      if (linesError) throw linesError;

      // Upload attachments
      for (const att of attachments) { const filePath = `${companyId}/${entry.id}/${att.id}-${att.file.name}`;
        await supabase.storage.from("documents").upload(filePath, att.file);
        await supabase.from("documents").insert({ company_id: companyId, uploaded_by: user.id, document_type: "receipt",
          file_name: att.file.name, file_url: filePath, file_size: att.file.size,
          mime_type: att.file.type, document_category: att.type.toLowerCase(),
          metadata: { journal_entry_id: entry.id, description: att.description },
        });
      }

      // If accrual with reversal date, create reversal entry
      if (activeTab === "accrual" && reversalDate) { const { data: revEntry, error: revError } = await supabase
          .from("journal_entries")
          .insert({ company_id: companyId,
            entry_date: format(reversalDate, "yyyy-MM-dd"),
            description: `Återföring: ${description}`,
            status: "draft",
            created_by: user.id,
            series_code: seriesCode,
          })
          .select().maybeSingle();
        if (!revError && revEntry) { await supabase.from("journal_entry_lines").insert(
            validLines.map(l => ({ journal_entry_id: revEntry.id,
              account_id: l.account_id,
              debit: parseFloat(String(l.credit)) || 0,
              credit: parseFloat(String(l.debit)) || 0,
              vat_code: l.vat_code && l.vat_code !== "none" ? l.vat_code : null,
              vat_amount: parseFloat(String(l.vat_amount)) || 0,
              cost_center_id: l.cost_center_id || null,
            }))
          );
        }
      }

      const jn = (entry as unknown as { journal_number?: string }).journal_number || "";
      toast.success(asDraft ? `Utkast sparat (${jn})` : `Verifikation bokförd (${jn})`);
      setIsOpen(false);
      resetForm();
    } catch (error: any) { toast.error(error.message || "Kunde inte spara");
    } finally { setIsSaving(false);
    }
  };

  const resetForm = () => { setLines([]);
    setEntryDate(new Date());
    setDescription("");
    setSeriesCode("M");
    setAttachments([]);
    setAiValidation({ status: null, message: "" });
    setActiveTab("manual");
    setReversalDate(undefined);
    setAiSuggestion(null);
    setUserOverrodeSeries(false);
    setAutoNumber(true);
    setManualNumber("");
  };

  // AI suggestion from description
  const fetchAiSuggestion = useCallback(async (desc: string) => {
    if (desc.trim().length < 3) { setAiSuggestion(null); return; }
    setAiSuggestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-suggest-journal-entry", {
        body: { company_id: companyId, description: desc, entry_date: format(entryDate, "yyyy-MM-dd") }
      });
      if (error) throw error;
      if (data?.suggestion) {
        setAiSuggestion(data.suggestion);
        // Auto-select series on high confidence (unless user overrode)
        if (data.suggestion.confidence === "high" && !userOverrodeSeries) {
          setSeriesCode(data.suggestion.series);
        }
      }
    } catch (e) {
      console.error("AI suggest error:", e);
      setAiSuggestion(null);
    } finally {
      setAiSuggestLoading(false);
    }
  }, [companyId, entryDate, userOverrodeSeries]);

  // Debounced description change triggers AI
  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value);
    setAiSuggestion(null);
    if (aiSuggestTimer.current) clearTimeout(aiSuggestTimer.current);
    aiSuggestTimer.current = setTimeout(() => fetchAiSuggestion(value), 800);
  }, [fetchAiSuggestion]);

  // Accept AI suggestion
  const acceptAiSuggestion = useCallback(() => {
    if (!aiSuggestion) return;
    // Apply series
    setSeriesCode(aiSuggestion.series);
    // Build lines from suggestion
    const newLines: JournalLine[] = aiSuggestion.lines.map((sl) => {
      const matchedAccount = accounts.find(a => a.account_number === sl.account_number);
      return {
        id: `temp-${Date.now()}-${Math.random()}`,
        account_id: matchedAccount?.id || sl.account_id || "",
        account_number: sl.account_number,
        account_name: matchedAccount?.account_name || sl.account_name,
        debit: sl.debit || 0,
        credit: sl.credit || 0,
        vat_code: "none",
        vat_basis: "gross" as const,
      };
    });
    setLines(newLines);
    setAiSuggestion(null);
    toast.success("AI-förslag applicerat");
  }, [aiSuggestion, accounts]);

  // Handle manual series override
  const handleSeriesChange = useCallback((code: string) => {
    setSeriesCode(code);
    setUserOverrodeSeries(true);
  }, []);

  const addAttachment = (files: FileList | null) => { if (!files) return;
    const newAttachments: Attachment[] = Array.from(files).map(file => ({ id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      file, description: "",
      type: file.type.includes("pdf") ? "Faktura" : file.type.includes("image") ? "Kvitto" : "Övrigt",
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(String(l.debit)) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(String(l.credit)) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01;
  const signedDiff = totalDebit - totalCredit; // >0 = saknas kredit, <0 = saknas debet

  const validation = useMemo(() => {
    return computeJournalEntryValidation(lines, accounts, isBalanced);
  }, [lines, accounts, isBalanced]);

  return (
    <div className="flex gap-2 flex-wrap">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="h-[34px] rounded-[8px] text-[12px] border-[#E2E8F0] text-[#0F172A]"><Plus className="w-4 h-4 mr-2" />Manuell verifikation</Button>
        </DialogTrigger>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-[12px] border-[0.5px] border-[#E2E8F0] shadow-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px] font-medium text-[#0F172A]">
              <FileText className="h-5 w-5 text-[#1E3A5F]" />
              Ny verifikation
            </DialogTitle>
            <DialogDescription className="text-[12px] text-[#64748B]">Registrera manuell bokföringspost</DialogDescription>
          </DialogHeader>

          {/* ── Sök tidigare verifikation ── */}
          <div className="mt-3 rounded-[8px] border-[0.5px] border-[#E2E8F0] bg-[#F8FAFC] p-3">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-[11px] font-medium text-[#475569] flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Sök tidigare verifikation
              </Label>
              {lookupResult && (
                <span className="inline-flex items-center gap-1 rounded-full text-[10px] font-medium uppercase tracking-[0.07em] px-[6px] py-px border-[0.5px] bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]">
                  <CheckCircle className="w-2.5 h-2.5" /> {lookupResult.journal_number} laddad
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={lookupSeries} onValueChange={setLookupSeries}>
                <SelectTrigger className="h-8 w-[150px] text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOURNAL_SERIES.map(s => (
                    <SelectItem key={s.code} value={s.code} className="text-xs">
                      <span className="font-mono font-semibold mr-2">{s.code}</span> – {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={lookupNumber}
                onChange={e => setLookupNumber(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); lookupExistingEntry(); } }}
                placeholder={`t.ex. ${lookupSeries}${entryDate.getFullYear()}-0001 eller bara 1`}
                className="h-8 text-[12px] font-mono flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={lookupLoading || !lookupNumber.trim()}
                onClick={lookupExistingEntry}
                className="h-8 text-[12px]"
              >
                {lookupLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Hämta"}
              </Button>
            </div>
            {lookupResult && (
              <p className="mt-2 text-[11px] text-[#64748B]">
                {lookupResult.entry_date && format(new Date(lookupResult.entry_date), "d MMM yyyy", { locale: sv })}
                {" · "}{lookupResult.description || "(ingen beskrivning)"}
                {" · "}<span className="font-medium">{lookupResult.status}</span>
              </p>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="grid w-full grid-cols-2 bg-[#F1F5F9] rounded-[8px] p-[3px]">
              <TabsTrigger value="manual" className="rounded-[6px] text-[12px] data-[state=active]:bg-white data-[state=active]:text-[#0F172A] data-[state=active]:shadow-none">Manuell verifikation</TabsTrigger>
              <TabsTrigger value="accrual" className="rounded-[6px] text-[12px] data-[state=active]:bg-white data-[state=active]:text-[#0F172A] data-[state=active]:shadow-none">Periodisering / Återför</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-5 mt-4">
              {renderForm()}
            </TabsContent>

            <TabsContent value="accrual" className="space-y-5 mt-4">
              {/* Extra accrual fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-[#475569]">Typ</Label>
                  <Select value={accrualType} onValueChange={setAccrualType}>
                    <SelectTrigger className="h-[34px] text-[12px] rounded-[8px] border-[#E2E8F0]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="periodisering">Periodisering</SelectItem>
                      <SelectItem value="avsattning">Avsättning</SelectItem>
                      <SelectItem value="manuell">Manuell</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-[#475569] flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Återföringsdatum
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full h-[34px] rounded-[8px] border-[#E2E8F0] justify-start text-left font-normal text-[12px]", !reversalDate && "text-[#94A3B8]")}>
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {reversalDate ? format(reversalDate, "d MMMM yyyy", { locale: sv }) : "Välj datum"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={reversalDate} onSelect={setReversalDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-end">
                  {reversalDate && (
                    <div className="rounded-[8px] border-[0.5px] border-[#C8DDF5] bg-[#EFF6FF] py-[8px] px-[10px] w-full">
                      <p className="text-[11px] text-[#1E3A5F]">
                        Motverifikation skapas per {format(reversalDate, "d MMMM yyyy", { locale: sv })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {renderForm()}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <AccrualReversal companyId={companyId} />
    </div>
  );

  function renderForm() { return (
      <>
        {/* ── Metadata row: Serie | Datum | Beskrivning ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Serie */}
          <div className="md:col-span-3 space-y-1.5">
            <Label className="text-xs font-medium">Serie</Label>
            <Select value={seriesCode} onValueChange={handleSeriesChange}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOURNAL_SERIES.filter(s => !s.system).map(s => (
                  <SelectItem key={s.code} value={s.code} className="text-xs">
                    <span className="font-mono font-semibold mr-2">{s.code}</span> – {s.name}
                  </SelectItem>
                ))}
                {JOURNAL_SERIES.filter(s => s.system).map(s => (
                  <SelectItem key={s.code} value={s.code} disabled className="text-xs text-muted-foreground">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span><span className="font-mono font-semibold mr-2">{s.code}</span> – {s.name} (system)</span>
                        </TooltipTrigger>
                        <TooltipContent side="right"><p className="text-xs">Skapas automatiskt av systemet</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              {nextSeriesNumber && autoNumber && (
                <p className="text-[11px] text-[#64748B]">Nästa: <span className="font-mono font-medium text-[#0F172A]">{nextSeriesNumber}</span></p>
              )}
              {aiSuggestion && seriesCode === aiSuggestion.series && !userOverrodeSeries && (
                <span className="inline-flex items-center gap-0.5 rounded-full text-[10px] font-medium uppercase tracking-[0.07em] px-[6px] py-px border-[0.5px] bg-[#EFF6FF] text-[#1E3A5F] border-[#C8DDF5]">
                  <Sparkles className="h-2.5 w-2.5" />AI
                </span>
              )}
            </div>
          </div>

          {/* Verifikationsnummer */}
          <div className="md:col-span-3 space-y-1.5">
            <Label className="text-[11px] font-medium text-[#475569] flex items-center justify-between">
              <span>Verifikationsnummer</span>
              <button
                type="button"
                onClick={() => setAutoNumber(v => !v)}
                className={cn(
                  "text-[10px] px-[6px] py-px rounded-full border-[0.5px] font-medium uppercase tracking-[0.07em] transition-colors",
                  autoNumber
                    ? "bg-[#EFF6FF] text-[#1E3A5F] border-[#C8DDF5]"
                    : "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]"
                )}
                title="Växla mellan automatisk och manuell numrering"
              >
                {autoNumber ? "Auto" : "Manuell"}
              </button>
            </Label>
            <Input
              value={autoNumber ? "" : manualNumber}
              onChange={e => setManualNumber(e.target.value)}
              placeholder={autoNumber ? (nextSeriesNumber || "Tilldelas automatiskt") : "Ange ver.nr"}
              disabled={autoNumber}
              className="h-[34px] rounded-[8px] border-[#E2E8F0] text-[12px] font-mono"
            />
            {!autoNumber && manualNumber && (
              <span className="inline-flex items-center gap-1 rounded-full text-[10px] font-medium uppercase tracking-[0.07em] px-[6px] py-px border-[0.5px] bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]">
                <AlertTriangle className="w-2.5 h-2.5" /> Manuellt satt
              </span>
            )}
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-xs font-medium">Datum</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full h-9 justify-start text-left font-normal text-xs")}>
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {format(entryDate, "d MMM yyyy", { locale: sv })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={entryDate} onSelect={(d) => d && setEntryDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>

          {/* Beskrivning */}
          <div className="md:col-span-4 space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              Beskrivning
              <Sparkles className="h-3 w-3 text-primary opacity-50" />
            </Label>
            <Input value={description} onChange={e => handleDescriptionChange(e.target.value)} placeholder="Beskriv verifikationen…" className="h-9 text-xs" />
          </div>
        </div>

        {/* ── AI Suggestion Card ── */}
        <AISuggestionCard
          suggestion={aiSuggestion}
          onAccept={acceptAiSuggestion}
          onDismiss={() => setAiSuggestion(null)}
          isLoading={aiSuggestLoading}
        />

        {/* ── Konteringsrader ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Konteringsrader</Label>
            <DSAddLineButton onClick={addNewLine}>
              + Lägg till rad
            </DSAddLineButton>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full min-w-[750px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left text-xs font-medium w-[280px]">Konto</th>
                  <th className="p-2 text-left text-xs font-medium">Kontonamn</th>
                  <th className="p-2 text-right text-xs font-medium w-[110px]">Debet</th>
                  <th className="p-2 text-right text-xs font-medium w-[110px]">Kredit</th>
                  {costCenters.length > 0 && <th className="p-2 text-left text-xs font-medium w-[100px]">KS</th>}
                  <th className="p-2 text-left text-xs font-medium w-[100px]">Projekt</th>
                  <th className="p-2 w-9"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map(line => { const selectedAccount = accounts.find(a => a.id === line.account_id);
                  const hasMissingAccount = !line.account_id && !!line.account_number;
                  const rowErr = validation.rowErrors[line.id];
                  const hasErr = !!rowErr;
                  return (
                    <Fragment key={line.id}>
                    <tr className={cn(
                      "border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors",
                      hasErr && "bg-[#FCE8E8]/40"
                    )}>
                      <td className="p-1.5">
                        {hasMissingAccount ? (
                          <div className="flex items-center gap-1.5 h-8 px-2 rounded-[6px] border-[0.5px] border-[#F0DDB7] bg-[#FAEEDA] text-[12px]">
                            <AlertTriangle className="h-3.5 w-3.5 text-[#C28A2B] shrink-0" />
                            <span className="font-mono font-medium text-[#7A5417]">{line.account_number}</span>
                            <span className="text-[#7A5417]/80 truncate">— Saknas</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1.5 text-[10px] text-[#1E3A5F] hover:text-[#0F1F3D] ml-auto shrink-0"
                              onClick={async () => {
                                const accNum = line.account_number!;
                                const accName = line.account_name || `Konto ${accNum}`;
                                const first = accNum.charAt(0);
                                const accountType = first === "1" ? "asset" : first === "2" ? "liability" : first === "3" ? "income" : "expense";
                                const { data, error } = await supabase.from("chart_of_accounts").insert({
                                  company_id: companyId,
                                  account_number: accNum,
                                  account_name: accName,
                                  account_type: accountType,
                                  is_active: true,
                                }).select("id").single();
                                if (error) {
                                  toast.error(`Kunde inte lägga till konto: ${error.message}`);
                                  return;
                                }
                                const newAccount: Account = { id: data.id, account_number: accNum, account_name: accName, account_type: accountType };
                                setAccounts(prev => [...prev, newAccount].sort((a, b) => a.account_number.localeCompare(b.account_number)));
                                setLines(prev => prev.map(l => l.id === line.id ? { ...l, account_id: data.id } : l));
                                toast.success(`Konto ${accNum} tillagt i kontoplanen ✓`);
                              }}
                            >
                              + Lägg till
                            </Button>
                          </div>
                        ) : (
                          <div className={cn(rowErr?.account && "ring-1 ring-[#B43A3A] rounded-[6px]")}>
                            <AccountSelector accounts={accounts} value={line.account_id} onChange={v => updateLine(line.id, "account_id", v)} />
                          </div>
                        )}
                      </td>
                      <td className="p-1.5 text-xs text-muted-foreground truncate max-w-[150px]">
                        {selectedAccount?.account_name || line.account_name || "—"}
                      </td>
                      <td className="p-1.5">
                        <DSJournalInput amount type="number" step="0.01" min="0" value={line.debit || ""} onChange={e => updateLine(line.id, "debit", parseFloat(e.target.value) || 0)} placeholder="0,00" />
                      </td>
                      <td className="p-1.5">
                        <DSJournalInput amount type="number" step="0.01" min="0" value={line.credit || ""} onChange={e => updateLine(line.id, "credit", parseFloat(e.target.value) || 0)} placeholder="0,00" />
                      </td>
                      {costCenters.length > 0 && (
                        <td className="p-1.5">
                          <Select value={line.cost_center_id || "none"} onValueChange={v => updateLine(line.id, "cost_center_id", v === "none" ? undefined : v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              {costCenters.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.code}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                      )}
                      <td className="p-1.5">
                        <DSJournalInput value={line.project || ""} onChange={e => updateLine(line.id, "project", e.target.value)} placeholder="—" />
                      </td>
                      <td className="p-1.5">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeLine(line.id)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                    {hasErr && (
                      <tr key={line.id + "-err"} className="bg-[#FCE8E8]/40">
                        <td colSpan={costCenters.length > 0 ? 7 : 6} className="px-3 pb-2 pt-0">
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-[#7A1F1E]">
                            {rowErr.account && <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{rowErr.account}</span>}
                            {rowErr.empty && <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{rowErr.empty}</span>}
                            {rowErr.duplicate && <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{rowErr.duplicate}</span>}
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Balance indicator ── */}
        <div className={cn(
          "flex items-center justify-between rounded-[12px] border-[0.5px] p-[14px]",
          isBalanced ? "border-[#BFE6D6] bg-[#E1F5EE]" : "border-[#F4C8C8] bg-[#FCE8E8]"
        )}>
          <div className="flex items-center gap-6 text-[12px]">
            <div>
              <span className="text-[11px] text-[#64748B]">Summa debet:</span>
              <span className="ml-2 font-mono font-medium text-[#0F172A] tabular-nums">{totalDebit.toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr</span>
            </div>
            <div>
              <span className="text-[11px] text-[#64748B]">Summa kredit:</span>
              <span className="ml-2 font-mono font-medium text-[#0F172A] tabular-nums">{totalCredit.toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr</span>
            </div>
            <div>
              <span className="text-[11px] text-[#64748B]">Differens:</span>
              <DSBalance balanced={isBalanced} className="ml-2 font-mono">
                {difference.toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr
              </DSBalance>
            </div>
          </div>
          {isBalanced ? (
            <CheckCircle className="h-5 w-5 text-[#1D9E75]" />
          ) : (
            <div className="flex items-center gap-2 text-[#7A1F1E] text-[11px] font-medium">
              <AlertTriangle className="h-4 w-4" />
              Inte i balans — {signedDiff > 0 ? "saknas kredit" : "saknas debet"} {difference.toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr
            </div>
          )}
        </div>

        {/* ── Validation banners ── */}
        {(validation.tooFew || validation.vatWarning) && (
          <div className="rounded-[12px] border-[0.5px] border-[#F0DDB7] bg-[#FAEEDA] p-[12px] space-y-1">
            {validation.tooFew && (
              <p className="text-[12px] text-[#7A5417] flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />{validation.tooFew}</p>
            )}
            {validation.vatWarning && (
              <p className="text-[12px] text-[#7A5417] flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />{validation.vatWarning}</p>
            )}
          </div>
        )}

        {/* ── AI Validation ── */}
        {aiLoading && (
          <div className="flex items-center gap-2 text-[12px] text-[#475569] py-[10px] px-[12px] rounded-[12px] border-[0.5px] border-[#C8DDF5] bg-[#EFF6FF]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1E3A5F]" />
            AI-granskning pågår...
          </div>
        )}
        {!aiLoading && aiValidation.status && (
          <div className={cn(
            "flex items-start gap-2 rounded-[12px] border-[0.5px] p-[14px]",
            aiValidation.status === "ok" ? "border-[#BFE6D6] bg-[#E1F5EE]" : "border-[#F0DDB7] bg-[#FAEEDA]"
          )}>
            {aiValidation.status === "ok" ? (
              <CheckCircle className="h-4 w-4 text-[#1D9E75] mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-[#C28A2B] mt-0.5 shrink-0" />
            )}
            <div>
              <p className={`text-[12px] font-medium ${aiValidation.status === "ok" ? "text-[#085041]" : "text-[#7A5417]"}`}>{aiValidation.status === "ok" ? "AI-granskning: Konteringen ser korrekt ut" : "AI-granskning: Kontrollera konteringen"}</p>
              <p className={`text-[11px] mt-0.5 ${aiValidation.status === "ok" ? "text-[#085041]/80" : "text-[#7A5417]/80"}`}>{aiValidation.message}</p>
            </div>
          </div>
        )}

        {/* ── Attachments ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Paperclip className="h-4 w-4" />
              Bilagor ({attachments.length})
            </Label>
            <label className="cursor-pointer">
              <input type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={e => addAttachment(e.target.files)} />
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs pointer-events-none">
                <Upload className="w-3.5 h-3.5 mr-1" />Lägg till bilaga
              </Button>
            </label>
          </div>
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map(att => (
                <span key={att.id} className="inline-flex items-center gap-1.5 rounded-full text-[11px] font-medium px-[8px] py-[3px] border-[0.5px] bg-[#F1F5F9] text-[#0F172A] border-[#E2E8F0]">
                  <FileText className="h-3 w-3" />
                  <span className="max-w-[120px] truncate">{att.file.name}</span>
                  <button type="button" className="ml-1 hover:text-[#B43A3A]" onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Action buttons ── */}
        <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
          <Button variant="outline" size="sm" onClick={() => setIsOpen(false)} className="h-[34px] rounded-[8px] text-[12px] border-[#E2E8F0]">
            Avbryt
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleSave(true)} disabled={isSaving} className="h-[34px] rounded-[8px] text-[12px] border-[#E2E8F0]">
            {isSaving && isDraft ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Spara utkast
          </Button>
          <Button size="sm" onClick={() => handleSave(false)} disabled={isSaving || validation.blocking} className="h-[34px] rounded-[8px] text-[12px] bg-[#0F1F3D] hover:bg-[#15294D] text-white disabled:opacity-60">
            {isSaving && !isDraft ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-1" />}
            {!isBalanced ? `Inte i balans (${difference.toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr)` : "Bokför"}
          </Button>
        </div>
      </>
    );
  }
};
