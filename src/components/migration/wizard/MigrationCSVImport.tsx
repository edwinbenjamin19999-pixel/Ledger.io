import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2, Upload, Sparkles, FileSpreadsheet, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { parseCSV } from "@/lib/csv-utils";
import {
  mapColumnsWithAI,
  heuristicColumnMap,
  TARGET_FIELDS,
  type ColumnMapping,
  type TargetType,
} from "@/lib/aiColumnMapper";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  companyId: string;
  onImported: (summary: { rows: number; targetType: TargetType }) => void;
}

const TARGET_LABELS: Record<TargetType, string> = {
  customers: "Kunder",
  suppliers: "Leverantörer",
  invoices: "Fakturor (historik)",
  ar_open: "Kundfakturor (öppna poster)",
  ap_open: "Leverantörsfakturor (öppna poster)",
};

const isOpenItems = (t: TargetType) => t === "ar_open" || t === "ap_open";

// Parse 1 234,56 / "1,234.56" / "-2 500"
function parseNumber(v: any): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).trim().replace(/\s/g, "").replace(/[^\d,.\-]/g, "");
  if (!s) return 0;
  // If both , and . present, assume , is thousand sep
  if (s.includes(",") && s.includes(".")) return Number(s.replace(/,/g, "")) || 0;
  // Otherwise treat , as decimal
  return Number(s.replace(",", ".")) || 0;
}

function parseDate(v: any): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  // 2024-12-31, 2024/12/31, 31/12/2024, 31.12.2024, 20241231
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

type ExcelCellValue = string | number | boolean | Date | null | undefined;

type SheetLike = Record<string, ExcelCellValue> & { "!ref"?: string };

interface XlsxModuleLike {
  read: (data: ArrayBuffer, options: Record<string, unknown>) => {
    SheetNames: string[];
    Sheets: Record<string, SheetLike | undefined>;
  };
  utils: {
    sheet_to_json: (
      sheet: SheetLike,
      options: Record<string, unknown>,
    ) => ExcelCellValue[][];
    encode_range: (r: { s: { r: number; c: number }; e: { r: number; c: number } }) => string;
  };
}

/**
 * Some Excel exporters (e.g. older ERPs) write cell refs as lowercase ("a1")
 * and/or produce a malformed worksheet `!ref` like `"1:A54"`. SheetJS then
 * throws "invalid column -1" when iterating. Normalize keys to uppercase and
 * recompute `!ref` from the actual cells.
 */
function normalizeSheet(ws: SheetLike, XLSX: XlsxModuleLike): SheetLike {
  const out: SheetLike = {};
  let minR = Infinity, minC = Infinity, maxR = -1, maxC = -1;
  for (const k of Object.keys(ws)) {
    if (k.startsWith("!")) { (out as Record<string, unknown>)[k] = (ws as Record<string, unknown>)[k]; continue; }
    const up = k.toUpperCase();
    const m = up.match(/^([A-Z]+)(\d+)$/);
    if (!m) continue;
    out[up] = ws[k];
    const r = parseInt(m[2], 10) - 1;
    let c = 0;
    for (let i = 0; i < m[1].length; i++) c = c * 26 + (m[1].charCodeAt(i) - 64);
    c -= 1;
    if (r < minR) minR = r; if (r > maxR) maxR = r;
    if (c < minC) minC = c; if (c > maxC) maxC = c;
  }
  if (maxR >= 0 && maxC >= 0) {
    out["!ref"] = XLSX.utils.encode_range({ s: { r: minR, c: minC }, e: { r: maxR, c: maxC } });
  }
  return out;
}

function rowsToObjects(rows: ExcelCellValue[][]): Record<string, string>[] {
  if (!rows.length) return [];
  const headerIdx = rows.findIndex((r) => r.some((c) => c != null && String(c).trim() !== ""));
  if (headerIdx < 0) return [];
  const headers = rows[headerIdx].map((h) => String(h ?? "").trim());
  return rows.slice(headerIdx + 1)
    .filter((r) => r.some((c) => c != null && String(c).trim() !== ""))
    .map((r) => {
      const o: Record<string, string> = {};
      headers.forEach((h, i) => {
        const v = r[i];
        o[h] = v instanceof Date
          ? v.toISOString().slice(0, 10)
          : v == null ? "" : String(v);
      });
      return o;
    });
}

async function readExcel(file: File): Promise<Record<string, string>[]> {
  const buf = await file.arrayBuffer();

  try {
    const mod = await import("@e965/xlsx") as unknown as XlsxModuleLike & { default?: XlsxModuleLike };
    const XLSX = typeof mod.read === "function" ? mod : mod.default;
    if (!XLSX || typeof XLSX.read !== "function") throw new Error("SheetJS module shape unexpected");
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    for (const wsName of wb.SheetNames) {
      const raw = wb.Sheets[wsName];
      if (!raw) continue;
      const ws = normalizeSheet(raw, XLSX);
      const rows = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: "",
        raw: false,
        blankrows: false,
      });
      const objs = rowsToObjects(rows);
      if (objs.length) return objs;
    }
    return [];
  } catch (e) {
    console.error("[readExcel] SheetJS parse failed", e);
    throw new Error("Kunde inte läsa Excel-filen. Spara gärna om filen som .xlsx eller exportera som CSV och försök igen.");
  }
}

interface ReconResult {
  ledgerBalance: number;
  fileSum: number;
  difference: number;
  matches: boolean;
  account: string;
  cutoverDate: string;
}

async function reconcileOpenItems(
  companyId: string,
  targetType: "ar_open" | "ap_open",
  cutoverDate: string,
  fileSum: number,
): Promise<ReconResult> {
  const account = targetType === "ar_open" ? "1510" : "2440";

  // 1) Opening balance (IB) from opening_balances
  let ib = 0;
  const { data: ob } = await supabase
    .from("opening_balances")
    .select("balance, balance_type, transition_date")
    .eq("company_id", companyId)
    .eq("account_code", account)
    .lte("transition_date", cutoverDate)
    .order("transition_date", { ascending: false })
    .limit(1);
  if (ob && ob.length) {
    const row: any = ob[0];
    const bal = Number(row.balance) || 0;
    ib = row.balance_type === "credit" ? -bal : bal;
  }

  // 2) Movements from posted/approved journal entries through cutoverDate
  let movements = 0;
  try {
    const { data: coa } = await supabase
      .from("chart_of_accounts")
      .select("id")
      .eq("company_id", companyId)
      .eq("account_number", account)
      .maybeSingle();
    if (coa?.id) {
      const { data: jes } = await supabase
        .from("journal_entries")
        .select("id")
        .eq("company_id", companyId)
        .in("status", ["posted", "approved"])
        .lte("entry_date", cutoverDate);
      const ids = (jes || []).map((j: any) => j.id);
      for (let i = 0; i < ids.length; i += 500) {
        const batch = ids.slice(i, i + 500);
        if (!batch.length) continue;
        const { data: lines } = await supabase
          .from("journal_entry_lines")
          .select("debit, credit")
          .eq("account_id", coa.id)
          .in("journal_entry_id", batch);
        for (const l of lines || []) {
          movements += (Number((l as any).debit) || 0) - (Number((l as any).credit) || 0);
        }
      }
    }
  } catch (e) {
    console.warn("[reconcile] journal lookup failed", e);
  }

  const signed = ib + movements; // debit-positive
  const expected = targetType === "ap_open" ? Math.abs(signed) : signed;
  const diff = Math.round((fileSum - expected) * 100) / 100;
  return {
    ledgerBalance: Math.round(expected * 100) / 100,
    fileSum: Math.round(fileSum * 100) / 100,
    difference: diff,
    matches: Math.abs(diff) <= 1,
    account,
    cutoverDate,
  };
}

export const MigrationCSVImport = ({ companyId, onImported }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [targetType, setTargetType] = useState<TargetType>("customers");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cutoverDate, setCutoverDate] = useState<string>(() => {
    const y = new Date().getFullYear();
    return `${y}-01-01`;
  });
  const [recon, setRecon] = useState<ReconResult | null>(null);
  const [reconConfirmed, setReconConfirmed] = useState(false);

  const resetFile = () => {
    setMappings([]);
    setHeaders([]);
    setRows([]);
    setRecon(null);
    setReconConfirmed(false);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const lower = f.name.toLowerCase();
    if (!lower.match(/\.(csv|tsv|txt|xlsx|xls)$/)) {
      toast.error("Format stöds ej — använd .csv, .tsv eller .xlsx");
      return;
    }
    setFile(f);
    resetFile();
    try {
      let parsed: Record<string, string>[];
      if (lower.match(/\.(xlsx|xls)$/)) {
        parsed = await readExcel(f);
      } else {
        const text = await f.text();
        parsed = parseCSV(text);
      }
      if (!parsed.length) {
        toast.error("Filen verkar tom eller saknar rubrikrad");
        return;
      }
      setHeaders(Object.keys(parsed[0]));
      setRows(parsed);
      toast.success(`${parsed.length} rader inlästa`);
    } catch (err: any) {
      toast.error(err.message || "Kunde inte läsa filen");
    }
  };

  const handleAnalyze = async () => {
    if (!headers.length) return;
    setAnalyzing(true);
    try {
      let result: ColumnMapping[] = [];
      try {
        result = await mapColumnsWithAI(headers, rows.slice(0, 3), targetType);
      } catch { result = []; }
      if (!result.length) {
        result = heuristicColumnMap(headers, rows.slice(0, 3), targetType);
        toast.message("AI ej tillgänglig — använder heuristisk mappning");
      } else {
        toast.success("AI har föreslagit kolumnmappning");
      }
      setMappings(result);
      setRecon(null);
      setReconConfirmed(false);
    } catch (err: any) {
      toast.error(err.message || "Mappning misslyckades");
    } finally {
      setAnalyzing(false);
    }
  };

  const updateMapping = (sourceColumn: string, targetField: string) => {
    setMappings((prev) => {
      const exists = prev.find((m) => m.sourceColumn === sourceColumn);
      if (!targetField) return prev.filter((m) => m.sourceColumn !== sourceColumn);
      if (exists) {
        return prev.map((m) =>
          m.sourceColumn === sourceColumn
            ? { ...m, targetField, confidence: 100 } : m,
        );
      }
      return [...prev, {
        sourceColumn, targetField, confidence: 100,
        sampleValue: rows.find((r) => r[sourceColumn])?.[sourceColumn] ?? "",
      }];
    });
    setRecon(null);
    setReconConfirmed(false);
  };

  // Build transformed rows for open-item import.
  const buildOpenItemRows = () => {
    const get = (row: Record<string, string>, field: string) => {
      const m = mappings.find((x) => x.targetField === field);
      return m ? row[m.sourceColumn] : "";
    };
    return rows.map((row) => {
      const original = parseNumber(get(row, "original_amount"));
      const remaining = parseNumber(get(row, "remaining_amount"));
      return {
        counterparty_name: String(get(row, "counterparty_name") || "").trim(),
        counterparty_org_number: String(get(row, "counterparty_org_number") || "").trim() || null,
        counterparty_code: String(get(row, "supplier_code") || get(row, "customer_code") || "").trim() || null,
        invoice_number: String(get(row, "invoice_number") || "").trim(),
        ocr: String(get(row, "ocr") || "").trim() || null,
        reference: String(get(row, "reference") || "").trim() || null,
        invoice_date: parseDate(get(row, "invoice_date")),
        due_date: parseDate(get(row, "due_date")),
        currency: String(get(row, "currency") || "SEK").trim().toUpperCase() || "SEK",
        original_amount: original || remaining,
        remaining_amount: remaining || original,
        vat_amount: parseNumber(get(row, "vat_amount")),
        description: String(get(row, "description") || "").trim() || null,
        status_text: String(get(row, "status") || "").trim() || null,
        document_type: String(get(row, "document_type") || "").trim() || null,
      };
    });
  };

  const handleReconcile = async () => {
    if (!isOpenItems(targetType)) return;
    const items = buildOpenItemRows();
    const sum = items.reduce((s, r) => s + (r.remaining_amount || 0), 0);
    const r = await reconcileOpenItems(
      companyId, targetType as "ar_open" | "ap_open", cutoverDate, sum,
    );
    setRecon(r);
    setReconConfirmed(false);
  };

  const handleImport = async () => {
    const tid = toast.loading(`Importerar ${rows.length} rader till ${TARGET_LABELS[targetType]}…`);
    // Explicit gating — never rely on a disabled button to provide feedback.
    if (importing) { toast.dismiss(tid); return; }
    if (!mappings.length) {
      toast.error("Mappa minst en kolumn först", { id: tid });
      return;
    }
    if (isOpenItems(targetType)) {
      if (!recon) { toast.error("Kör reskontra-avstämning först", { id: tid }); return; }
      if (!recon.matches && !reconConfirmed) {
        toast.error("Bekräfta differensen innan import", { id: tid });
        return;
      }
    }
    setImporting(true);
    setProgress(10);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error("Ej inloggad");


      const { data: jobData, error: jobErr } = await supabase
        .from("migration_jobs")
        .insert({
          company_id: companyId,
          source_system: "csv",
          source_format: file?.name.toLowerCase().match(/\.(xlsx|xls)$/) ? "excel" : "csv",
          status: "importing",
          stats: { targetType, fileName: file?.name ?? "okänd", rowCount: rows.length },
        })
        .select().single();
      if (jobErr) throw jobErr;

      setProgress(35);

      if (isOpenItems(targetType)) {
        const direction = targetType === "ar_open" ? "outgoing" : "incoming";
        const invoiceType = targetType === "ar_open" ? "customer" : "supplier";
        const items = buildOpenItemRows();

        // Validate
        const invalid = items.filter(
          (r) => !r.counterparty_name || !r.invoice_number || !r.invoice_date,
        );
        if (invalid.length) {
          throw new Error(
            `${invalid.length} rader saknar motpart, fakturanr eller datum`,
          );
        }

        // Dedupe against existing
        const { data: existing } = await supabase
          .from("invoices")
          .select("invoice_number, counterparty_name, invoice_direction")
          .eq("company_id", companyId)
          .eq("invoice_direction", direction);
        const existingSet = new Set(
          (existing || []).map(
            (r: any) =>
              `${(r.invoice_number || "").trim().toLowerCase()}|${(r.counterparty_name || "").trim().toLowerCase()}`,
          ),
        );

        const payload = items
          .filter((r) => {
            const k = `${r.invoice_number.toLowerCase()}|${r.counterparty_name.toLowerCase()}`;
            return !existingSet.has(k);
          })
          .map((r) => ({
            company_id: companyId,
            created_by: userId,
            invoice_type: invoiceType,
            invoice_direction: direction,
            invoice_number: r.invoice_number,
            counterparty_name: r.counterparty_name,
            counterparty_org_number: r.counterparty_org_number,
            invoice_date: r.invoice_date!,
            due_date: r.due_date ?? r.invoice_date!,
            currency: r.currency,
            total_amount: r.remaining_amount || r.original_amount,
            vat_amount: r.vat_amount || 0,
            status: "sent" as const,
            notes: [
              r.document_type ? `Typ: ${r.document_type}` : null,
              r.status_text ? `Status: ${r.status_text}` : null,
              r.counterparty_code ? `Motpartskod: ${r.counterparty_code}` : null,
              r.ocr ? `OCR: ${r.ocr}` : null,
              r.reference ? `Ref: ${r.reference}` : null,
              r.description ? r.description : null,
              `Importerad öppen post per ${cutoverDate}`,
              r.original_amount && r.original_amount !== r.remaining_amount
                ? `Originalbelopp: ${r.original_amount}` : null,
            ].filter(Boolean).join(" • "),
          }));

        setProgress(60);
        const skipped = items.length - payload.length;
        let inserted = 0;
        const errors: string[] = [];

        if (payload.length) {
          for (let i = 0; i < payload.length; i += 200) {
            const batch = payload.slice(i, i + 200);
            const { error, count } = await supabase
              .from("invoices")
              .insert(batch, { count: "exact" });
            if (error) {
              errors.push(error.message);
              break;
            }
            inserted += count ?? batch.length;
          }
        }

        if (errors.length) {
          await supabase.from("migration_jobs").update({
            status: "failed",
            error_message: errors.join("; "),
            completed_at: new Date().toISOString(),
          }).eq("id", jobData.id);
          throw new Error(`Import misslyckades: ${errors.join("; ")}`);
        }

        // Persistence proof: re-query DB
        const { count: verifiedCount } = await supabase
          .from("invoices")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("invoice_direction", direction);

        await supabase.from("migration_jobs").update({
          status: "completed",
          completed_at: new Date().toISOString(),
          stats: {
            targetType, fileName: file?.name ?? null, rowCount: rows.length,
            inserted, skipped, verifiedTotal: verifiedCount ?? null,
            reconciliation: recon ? { ...recon } : null,
          } as any,
        }).eq("id", jobData.id);

        setProgress(100);
        toast.success(
          `${inserted} fakturor importerade${skipped ? ` (${skipped} dubbletter hoppade)` : ""} — totalt ${verifiedCount} i registret`,
          { id: tid },
        );
        window.dispatchEvent(new CustomEvent("registry-updated"));
        onImported({ rows: inserted, targetType });
        return;

      }

      // Customers / Suppliers → write DIRECTLY to registry tables
      // (single source of truth — no staging). Invoices history still uses staging.
      if (targetType === "customers" || targetType === "suppliers") {
        let baseCurrency = "SEK";
        try {
          const { data: comp } = await supabase
            .from("companies").select("currency").eq("id", companyId).maybeSingle();
          if (comp?.currency) baseCurrency = String(comp.currency).toUpperCase();
        } catch { /* fallback SEK */ }

        const BOOL_TRUE = new Set(["aktiv", "active", "true", "1", "ja", "yes", "y"]);
        const BOOL_FALSE = new Set(["inaktiv", "inactive", "spärrad", "blocked", "false", "0", "nej", "no", "n"]);

        const isSupplier = targetType === "suppliers";
        const numberKey = isSupplier ? "supplier_number" : "customer_number";

        const FIELD_MAP: Record<string, string> = { payment_terms: "payment_terms_days" };

        const transformed = rows.map((row) => {
          const out: Record<string, any> = {
            company_id: companyId,
            created_by: userId,
            source: "csv_import",
          };
          for (const m of mappings) {
            const raw = row[m.sourceColumn];
            if (raw === undefined || raw === null) continue;
            const val = String(raw).trim();
            if (val === "") continue;
            const target = FIELD_MAP[m.targetField] ?? m.targetField;
            if (target === "is_active") {
              const lc = val.toLowerCase();
              if (BOOL_TRUE.has(lc)) out.is_active = true;
              else if (BOOL_FALSE.has(lc)) out.is_active = false;
              continue;
            }
            if (target === "payment_terms_days") {
              const n = parseInt(val.replace(/\D/g, ""), 10);
              if (!isNaN(n)) out.payment_terms_days = n;
              continue;
            }
            if (target === "currency") { out.currency = val.toUpperCase(); continue; }
            out[target] = val;
          }
          if (!out.currency) out.currency = baseCurrency;
          if (!out.country) out.country = "SE";
          return out;
        });

        const missingName = transformed.filter((r) => !r.name).length;
        if (missingName) {
          throw new Error(`${missingName} rader saknar namn — mappa kolumnen 'Namn'`);
        }

        const table = isSupplier ? "suppliers" : "customers";
        const withNumber = transformed.filter((r) => r[numberKey]);
        const withoutNumber = transformed.filter((r) => !r[numberKey]);

        setProgress(70);
        let inserted = 0;
        let skipped = 0;
        const errors: string[] = [];

        if (withNumber.length) {
          for (let i = 0; i < withNumber.length; i += 500) {
            const batch = withNumber.slice(i, i + 500);
            const { error, data } = await supabase
              .from(table as any)
              .upsert(batch, { onConflict: `company_id,${numberKey}` })
              .select("id");
            if (error) { errors.push(error.message); break; }
            inserted += data?.length ?? batch.length;
            setProgress(70 + Math.round(((i + batch.length) / transformed.length) * 25));
          }
        }

        if (!errors.length && withoutNumber.length) {
          const { data: existing } = await supabase
            .from(table as any).select("name").eq("company_id", companyId);
          const existingNames = new Set(
            (existing || []).map((r: any) => String(r.name || "").trim().toLowerCase()),
          );
          const toInsert = withoutNumber.filter(
            (r) => !existingNames.has(String(r.name).trim().toLowerCase()),
          );
          skipped = withoutNumber.length - toInsert.length;
          if (toInsert.length) {
            for (let i = 0; i < toInsert.length; i += 500) {
              const batch = toInsert.slice(i, i + 500);
              const { error, data } = await supabase
                .from(table as any).insert(batch).select("id");
              if (error) { errors.push(error.message); break; }
              inserted += data?.length ?? batch.length;
            }
          }
        }

        if (errors.length) {
          await supabase.from("migration_jobs").update({
            status: "failed",
            error_message: errors.join("; "),
            completed_at: new Date().toISOString(),
          }).eq("id", jobData.id);
          throw new Error(`Importen misslyckades: ${errors.join("; ")}`);
        }

        const { count: verifiedCount } = await supabase
          .from(table as any)
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId);

        await supabase.from("migration_jobs").update({
          status: "completed",
          completed_at: new Date().toISOString(),
          stats: {
            targetType, fileName: file?.name ?? null, rowCount: rows.length,
            inserted, skipped, verifiedTotal: verifiedCount ?? null,
          } as any,
        }).eq("id", jobData.id);

        setProgress(100);
        const label = isSupplier ? "leverantörer" : "kunder";
        toast.success(
          `${inserted} ${label} importerade${skipped ? ` (${skipped} dubbletter hoppade)` : ""} — totalt ${verifiedCount} i registret`,
          { id: tid },
        );
        window.dispatchEvent(new CustomEvent("registry-updated"));
        onImported({ rows: inserted, targetType });
        return;
      }

      // Invoice history → keep legacy staging path
      const transformed = rows.map((row) => {
        const out: Record<string, any> = { migration_job_id: jobData.id, company_id: companyId };
        for (const m of mappings) {
          const raw = row[m.sourceColumn];
          if (raw === undefined || raw === null) continue;
          const val = String(raw).trim();
          if (val === "") continue;
          out[m.targetField] = val;
        }
        return out;
      });

      setProgress(75);
      let inserted = 0;
      try {
        for (let i = 0; i < transformed.length; i += 500) {
          const batch = transformed.slice(i, i + 500);
          const { error, count } = await supabase
            .from("imported_customer_invoices" as any)
            .insert(batch, { count: "exact" });
          if (error) {
            throw new Error(
              `Importen avbröts efter ${inserted}/${transformed.length} rader: ${error.message}`,
            );
          }
          inserted += count ?? batch.length;
          setProgress(75 + Math.round(((i + batch.length) / transformed.length) * 20));
        }
      } catch (err: any) {
        await supabase.from("migration_jobs").update({
          status: "failed",
          error_message: err.message,
          completed_at: new Date().toISOString(),
        }).eq("id", jobData.id);
        throw err;
      }

      await supabase.from("migration_jobs").update({
        status: "completed", completed_at: new Date().toISOString(),
        stats: { targetType, fileName: file?.name ?? null, rowCount: rows.length, inserted } as any,
      }).eq("id", jobData.id);

      setProgress(100);
      toast.success(`${inserted} rader importerade till ${TARGET_LABELS[targetType]}`, { id: tid });
      window.dispatchEvent(new CustomEvent("registry-updated"));
      onImported({ rows: inserted, targetType });
    } catch (err: any) {
      console.error("[CSV import] failed", err);
      toast.error(err?.message || "Import misslyckades", { id: tid });
    } finally {
      setImporting(false);
    }
  };


  const openMode = isOpenItems(targetType);
  const needsRecon = openMode && !recon;
  // Only open-item flows require recon. Customers/suppliers/invoices must never
  // be gated by recon flags — a disabled button swallows clicks silently.
  const canImport = openMode
    ? !!recon && (recon.matches || reconConfirmed)
    : true;
  const importDisabled = importing; // ← ONLY importing disables the button


  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-sm">CSV / Excel-import med AI-mappning</p>
            <p className="text-xs text-muted-foreground">
              Ladda upp .csv, .tsv eller .xlsx — AI känner igen svenska & engelska kolumnnamn
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Datatyp</Label>
            <Select
              value={targetType}
              onValueChange={(v) => {
                setTargetType(v as TargetType);
                setMappings([]);
                setRecon(null);
                setReconConfirmed(false);
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TARGET_LABELS) as TargetType[]).map((k) => (
                  <SelectItem key={k} value={k}>{TARGET_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fil (.csv / .tsv / .xlsx)</Label>
            <Input
              type="file"
              accept=".csv,.tsv,.txt,.xlsx,.xls"
              onChange={handleFile}
              disabled={importing}
            />
          </div>
        </div>

        {openMode && (
          <div className="space-y-1.5">
            <Label>Brytdatum (öppna poster per)</Label>
            <Input
              type="date"
              value={cutoverDate}
              onChange={(e) => {
                setCutoverDate(e.target.value);
                setRecon(null);
                setReconConfirmed(false);
              }}
              disabled={importing}
            />
            <p className="text-xs text-muted-foreground">
              Avstäms mot konto {targetType === "ar_open" ? "1510 (Kundfordringar)" : "2440 (Leverantörsskulder)"} i huvudboken.
            </p>
          </div>
        )}

        {file && headers.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm">
                <span className="font-medium">{file.name}</span>{" "}
                <span className="text-muted-foreground">— {rows.length} rader, {headers.length} kolumner</span>
              </p>
              <Button onClick={handleAnalyze} disabled={analyzing} size="sm">
                {analyzing
                  ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                AI-mappa kolumner
              </Button>
            </div>

            {mappings.length > 0 && (
              <div className="rounded-lg border divide-y">
                <div className="grid grid-cols-12 px-3 py-2 bg-muted/50 text-xs font-medium">
                  <div className="col-span-4">Källkolumn</div>
                  <div className="col-span-1 text-center">→</div>
                  <div className="col-span-4">Målfält</div>
                  <div className="col-span-2">Exempel</div>
                  <div className="col-span-1 text-right">Säkerhet</div>
                </div>
                {headers.map((h) => {
                  const m = mappings.find((x) => x.sourceColumn === h);
                  const sample = rows.find((r) => r[h])?.[h] ?? "";
                  return (
                    <div key={h} className="grid grid-cols-12 px-3 py-2 items-center text-xs">
                      <div className="col-span-4 font-medium truncate">{h}</div>
                      <div className="col-span-1 text-center text-muted-foreground">→</div>
                      <div className="col-span-4">
                        <Select
                          value={m?.targetField ?? ""}
                          onValueChange={(v) => updateMapping(h, v === "__none__" ? "" : v)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="— ignorera —" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— ignorera —</SelectItem>
                            {TARGET_FIELDS[targetType].map((f) => (
                              <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 text-muted-foreground truncate">{String(sample).slice(0, 30)}</div>
                      <div className="col-span-1 text-right">
                        {m ? (
                          <Badge variant={m.confidence >= 90 ? "default" : "secondary"} className="text-[10px]">
                            {m.confidence}%
                          </Badge>
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-muted-foreground inline" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {openMode && mappings.length > 0 && (
              <div className="space-y-2">
                <Button
                  onClick={handleReconcile}
                  variant="outline"
                  size="sm"
                  disabled={importing}
                >
                  Kör reskontra-avstämning mot huvudboken
                </Button>
                {recon && (
                  recon.matches ? (
                    <Alert className="border-emerald-500/40 bg-emerald-500/5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <AlertDescription className="text-xs">
                        <span className="font-medium">Reskontra stämmer mot huvudbok</span>{" "}
                        — Filsumma {recon.fileSum.toLocaleString("sv-SE")} kr vs konto {recon.account}-saldo {recon.ledgerBalance.toLocaleString("sv-SE")} kr per {recon.cutoverDate}.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs space-y-2">
                        <div>
                          <span className="font-medium">Differens {recon.difference.toLocaleString("sv-SE")} kr</span>
                          {" — saknade fakturor eller fel brytdatum?"}
                        </div>
                        <div className="text-muted-foreground">
                          Filsumma: {recon.fileSum.toLocaleString("sv-SE")} kr · Konto {recon.account} per {recon.cutoverDate}: {recon.ledgerBalance.toLocaleString("sv-SE")} kr
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={reconConfirmed}
                            onChange={(e) => setReconConfirmed(e.target.checked)}
                          />
                          <span>Jag bekräftar differensen och vill importera ändå</span>
                        </label>
                      </AlertDescription>
                    </Alert>
                  )
                )}
              </div>
            )}

            {importing && (
              <div className="space-y-1.5">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Importerar...
                </p>
              </div>
            )}

            {mappings.length > 0 && (
              <Button
                onClick={() => {
                  console.log("[CSV import] click — disabled:", importDisabled, "targetType:", targetType, "mappings:", mappings.length);
                  void handleImport();
                }}
                disabled={importDisabled}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {importing
                  ? "Importerar..."
                  : `Importera ${rows.length} rader till ${TARGET_LABELS[targetType]}`}
              </Button>
            )}

          </div>
        )}
      </CardContent>
    </Card>
  );
};
