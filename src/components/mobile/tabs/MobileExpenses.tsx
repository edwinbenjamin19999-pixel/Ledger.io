import { useEffect, useState, useRef, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getStoredActiveCompanyId } from "@/lib/company-selection";
import { Plus, Receipt, Loader2, Camera, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MobileBottomSheet } from "../MobileBottomSheet";
import { PullToRefresh } from "../PullToRefresh";
import { haptic } from "@/lib/haptics";

interface Expense {
  id: string;
  description: string | null;
  amount: number;
  category: string | null;
  status: string;
  expense_date: string | null;
  created_at: string;
}

const FILTERS = [
  { id: "all", label: "Alla", match: () => true },
  { id: "submitted", label: "Väntar", match: (s: string) => s === "pending_approval" || s === "submitted" || s === "draft" },
  { id: "approved", label: "Godkända", match: (s: string) => s === "approved" },
  { id: "paid", label: "Utbetalda", match: (s: string) => s === "paid" || s === "paid_via_salary" || s === "reimbursed" },
] as const;

const CATEGORIES = [
  { id: "Mat & dryck", color: "bg-orange-500" },
  { id: "Transport", color: "bg-blue-500" },
  { id: "Kontorsmaterial", color: "bg-blue-500" },
  { id: "Representation", color: "bg-emerald-500" },
  { id: "Övrigt", color: "bg-slate-400" },
] as const;

const VAT_OPTIONS = ["25%", "12%", "6%", "Ingen"];

interface MobileExpensesProps {
  user: User;
}

export const MobileExpenses = ({ user }: MobileExpensesProps) => {
  const companyId = getStoredActiveCompanyId();
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("expense_claims")
      .select("id, description, amount, category, status, expense_date, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(80);
    setItems((data || []) as Expense[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = items.filter((e) => {
    const f = FILTERS.find((x) => x.id === filter);
    return f ? f.match(e.status) : true;
  });

  const statusBadge = (s: string) => {
    if (s === "approved")
      return <span className="text-[10px] text-[#9A6300] bg-[#FFFBF0] px-[8px] py-[2px] rounded-full font-medium">Godkänt – väntar på utbetalning</span>;
    if (s === "paid" || s === "reimbursed" || s === "paid_via_salary")
      return <span className="text-[10px] text-[#0F6E56] bg-[#F2FBF7] px-[8px] py-[2px] rounded-full font-medium">Utbetalt</span>;
    if (s === "rejected")
      return <span className="text-[10px] text-[#791F1F] bg-[#FFF1F1] px-[8px] py-[2px] rounded-full font-medium">Avvisat</span>;
    if (s === "draft")
      return <span className="text-[10px] text-[#475569] bg-[#F1F5F9] px-[8px] py-[2px] rounded-full font-medium">Utkast</span>;
    return <span className="text-[10px] text-[#1D4ED8] bg-[#EFF6FF] px-[8px] py-[2px] rounded-full font-medium">Väntar på godkännande</span>;
  };

  const categoryDot = (cat?: string | null) => {
    const c = CATEGORIES.find((x) => x.id === cat) ?? CATEGORIES[CATEGORIES.length - 1];
    return c.color;
  };

  return (
    <>
      <PullToRefresh onRefresh={load}>
        <div className="px-4 pt-4 pb-6 bg-[#F8FAFB] min-h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-[18px] font-medium text-[#0F172A]">Utlägg</h1>
            <button
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-[4px] bg-[#1D4ED8] text-white text-[12px] font-medium rounded-full px-[12px] h-[32px] active:bg-[#1074A0]"
            >
              <Plus size={14} strokeWidth={2} />
              Ny
            </button>
          </div>

          {/* Filter pills */}
          <div className="flex gap-[6px] overflow-x-auto pb-2 scrollbar-hide">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "shrink-0 px-[12px] h-[30px] rounded-full text-[12px] font-medium transition-colors",
                  filter === f.id
                    ? "bg-[#1D4ED8] text-white"
                    : "bg-white text-[#475569] border-[0.5px] border-[#E2E8F0]",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="mt-3 space-y-[8px]">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-[64px] bg-[#F1F5F9] rounded-[12px] animate-pulse" />
              ))
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Receipt size={40} color="#CBD5E1" strokeWidth={1.5} />
                <p className="mt-3 text-[13px] text-[#94A3B8]">Inga utlägg ännu</p>
                <button
                  onClick={() => setSheetOpen(true)}
                  className="mt-4 text-[12px] text-[#1D4ED8] font-medium"
                >
                  Skapa ditt första utlägg
                </button>
              </div>
            ) : (
              filtered.map((e) => (
                <div
                  key={e.id}
                  className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] px-[14px] py-[12px] flex items-center gap-[12px]"
                >
                  <div
                    className={cn(
                      "w-[36px] h-[36px] rounded-full flex items-center justify-center shrink-0",
                      categoryDot(e.category),
                    )}
                  >
                    <Receipt size={16} color="white" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#0F172A] truncate">
                      {e.description || e.category || "Utlägg"}
                    </p>
                    <p className="text-[11px] text-[#94A3B8] mt-[1px]">
                      {new Date(e.expense_date || e.created_at).toLocaleDateString("sv-SE")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[14px] font-medium text-[#0F172A] tabular-nums">
                      {Number(e.amount).toLocaleString("sv-SE")} kr
                    </p>
                    <div className="mt-[2px]">{statusBadge(e.status)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </PullToRefresh>

      <NewExpenseSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        companyId={companyId}
        userId={user.id}
        onCreated={(claim) => {
          setItems((prev) => [claim, ...prev]);
          setSheetOpen(false);
          haptic("success");
          toast.success("Utlägg sparat");
        }}
      />
    </>
  );
};

/* ──────────────────────────────────────────────────────────────────── */

interface NewExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  userId: string;
  onCreated: (claim: Expense) => void;
}

const NewExpenseSheet = ({
  open,
  onClose,
  companyId,
  userId,
  onCreated,
}: NewExpenseSheetProps) => {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0].id);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [vat, setVat] = useState<string>("25%");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [aiFilled, setAiFilled] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setAmount("");
        setCategory(CATEGORIES[0].id);
        setDate(new Date().toISOString().slice(0, 10));
        setDescription("");
        setVat("25%");
        setPhoto(null);
        setPhotoPreview(null);
        setAiFilled(new Set());
      }, 300);
    }
  }, [open]);

  const handlePhoto = async (file: File) => {
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    if (!companyId) return;

    // AI auto-fill via existing edge function
    setAnalyzing(true);
    try {
      const path = `${companyId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: doc } = await supabase
        .from("documents")
        .insert({
          company_id: companyId,
          file_url: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || "image/jpeg",
          uploaded_by: userId,
          document_type: "expense",
        } as never)
        .select()
        .maybeSingle();

      if (!doc) return;

      const { data: aiResult } = await supabase.functions.invoke("ai-process-document", {
        body: { documentId: doc.id, companyId, asExpenseClaim: false },
      });

      const ext = (aiResult?.extracted_data || {}) as Record<string, unknown>;
      const filled = new Set<string>();
      if (ext.total_amount || ext.amount) {
        setAmount(String(ext.total_amount ?? ext.amount));
        filled.add("amount");
      }
      if (ext.category && typeof ext.category === "string") {
        const match = CATEGORIES.find((c) => c.id === ext.category);
        if (match) {
          setCategory(match.id);
          filled.add("category");
        }
      }
      if (ext.date && typeof ext.date === "string") {
        setDate(ext.date.slice(0, 10));
        filled.add("date");
      }
      if (ext.supplier && typeof ext.supplier === "string") {
        setDescription(ext.supplier);
        filled.add("description");
      }
      setAiFilled(filled);
      if (filled.size > 0) toast.success("AI fyllde i fälten åt dig");
    } catch (e) {
      console.warn("AI fill failed", e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!companyId) {
      toast.error("Inget bolag valt");
      return;
    }
    const num = parseFloat(amount.replace(",", "."));
    if (!num || num <= 0) {
      toast.error("Ange ett giltigt belopp");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("expense_claims")
        .insert({
          company_id: companyId,
          user_id: userId,
          amount: num,
          category,
          description: description || category,
          expense_date: date,
          status: "pending_approval",
          payment_method: "employee",
        } as never)
        .select("id, description, amount, category, status, expense_date, created_at")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Inget svar från servern");
      onCreated(data as Expense);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e && "message" in e
            ? String((e as { message: unknown }).message)
            : "Kunde inte spara utlägget";
      toast.error("Kunde inte spara utlägget", { description: msg });
      haptic("error");
    } finally {
      setSaving(false);
    }
  };

  const aiBadge = (field: string) =>
    aiFilled.has(field) ? (
      <span className="ml-2 inline-flex items-center gap-[3px] text-[9px] text-[#534AB7] bg-[#EEEDFE] px-[6px] py-[1px] rounded-full font-medium">
        <Sparkles size={8} /> AI-ifyllt
      </span>
    ) : null;

  return (
    <MobileBottomSheet open={open} onClose={onClose} className="!max-h-[92vh]">
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handlePhoto(f);
          e.target.value = "";
        }}
      />
      <div className="px-5 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-medium text-[#0F172A]">Nytt utlägg</h2>
          <button onClick={onClose} className="text-slate-400 active:text-slate-600 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Belopp */}
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.06em] text-[#94A3B8] font-medium">
            Belopp
            {aiBadge("amount")}
          </span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full mt-1 bg-transparent text-[28px] font-medium text-[#0F172A] tabular-nums focus:outline-none border-b border-[#E2E8F0] focus:border-[#1D4ED8] py-1"
          />
        </label>

        {/* Kategori */}
        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-[0.06em] text-[#94A3B8] font-medium mb-2">
            Kategori
            {aiBadge("category")}
          </p>
          <div className="flex gap-[6px] overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={cn(
                  "shrink-0 px-[14px] h-[36px] rounded-full text-[12px] font-medium transition-colors",
                  category === c.id
                    ? "bg-[#1D4ED8] text-white"
                    : "bg-white border-[0.5px] border-[#E2E8F0] text-[#475569]",
                )}
              >
                {c.id}
              </button>
            ))}
          </div>
        </div>

        {/* Datum */}
        <label className="block mt-5">
          <span className="text-[10px] uppercase tracking-[0.06em] text-[#94A3B8] font-medium">
            Datum
            {aiBadge("date")}
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full mt-1 bg-white border-[0.5px] border-[#E2E8F0] rounded-[10px] px-3 h-[44px] text-[14px] text-[#0F172A] focus:outline-none focus:border-[#1D4ED8]"
          />
        </label>

        {/* Beskrivning */}
        <label className="block mt-5">
          <span className="text-[10px] uppercase tracking-[0.06em] text-[#94A3B8] font-medium">
            Beskrivning
            {aiBadge("description")}
          </span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Vad gäller utlägget?"
            className="w-full mt-1 bg-white border-[0.5px] border-[#E2E8F0] rounded-[10px] px-3 h-[44px] text-[14px] text-[#0F172A] focus:outline-none focus:border-[#1D4ED8]"
          />
        </label>

        {/* Foto */}
        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-[0.06em] text-[#94A3B8] font-medium mb-2">
            Foto (kvitto)
          </p>
          <button
            onClick={() => photoRef.current?.click()}
            className="w-full bg-white border-[0.5px] border-dashed border-[#CBD5E1] rounded-[10px] px-3 h-[64px] flex items-center justify-center gap-2 active:bg-[#F8FAFB]"
          >
            {photoPreview ? (
              <img src={photoPreview} alt="" className="h-[48px] rounded-[6px]" />
            ) : (
              <>
                <Camera size={16} color="#94A3B8" />
                <span className="text-[12px] text-[#475569]">
                  {analyzing ? "AI analyserar…" : "Fota eller välj kvitto"}
                </span>
                {analyzing && <Loader2 className="h-4 w-4 animate-spin text-[#1D4ED8]" />}
              </>
            )}
          </button>
        </div>

        {/* Moms */}
        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-[0.06em] text-[#94A3B8] font-medium mb-2">
            Moms
          </p>
          <div className="flex gap-[6px]">
            {VAT_OPTIONS.map((v) => (
              <button
                key={v}
                onClick={() => setVat(v)}
                className={cn(
                  "flex-1 h-[36px] rounded-[8px] text-[12px] font-medium transition-colors",
                  vat === v
                    ? "bg-[#1D4ED8] text-white"
                    : "bg-white border-[0.5px] border-[#E2E8F0] text-[#475569]",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 w-full h-[52px] bg-[#1D4ED8] text-white rounded-[12px] text-[15px] font-medium active:bg-[#1074A0] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Spara utlägg"}
        </button>
      </div>
    </MobileBottomSheet>
  );
};
