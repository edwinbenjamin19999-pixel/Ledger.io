import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStoredActiveCompanyId } from "@/lib/company-selection";
import { Camera, FolderOpen, FileText, Image as ImageIcon, Mic, Zap, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MobileBottomSheet } from "../MobileBottomSheet";
import { MobileVoiceOverlay } from "../MobileVoiceOverlay";
import { streamAIResponse } from "@/lib/stream-helpers";
import { getModuleContext } from "@/config/moduleContexts";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

type Segment = "receipt" | "expense";

interface UploadItem {
  id: string;
  file_name: string | null;
  status: string;
  amount?: number | null;
  supplier?: string | null;
  doc_type?: string | null;
  created_at?: string | null;
}

/** Extract a friendly label + icon from supplier/doc type */
function getCategoryInfo(supplier?: string | null, docType?: string | null): { icon: string; label: string } {
  const s = (supplier || "").toLowerCase();
  if (/restaurang|bar|cafe|café|bistro|pizza|sushi|burger|mcdonald|max\s/.test(s)) return { icon: "🍽️", label: supplier || "Restaurang" };
  if (/ica|coop|willys|hemköp|lidl|netto|city\s?gross/.test(s)) return { icon: "🛒", label: supplier || "Dagligvaror" };
  if (/taxi|uber|bolt|sj\b|flyg|hotel|scandic|nordic\s?choice/.test(s)) return { icon: "🚕", label: supplier || "Resa" };
  if (/bensin|circle\s?k|okq8|preem|shell|st1/.test(s)) return { icon: "⛽", label: supplier || "Drivmedel" };
  if (supplier) return { icon: "📄", label: supplier };
  if (docType === "invoice" || docType === "faktura") return { icon: "📄", label: "Faktura" };
  if (docType === "contract" || docType === "avtal") return { icon: "📝", label: "Avtal" };
  return { icon: "📄", label: "Dokument" };
}

function isStuck(status: string, createdAt?: string | null): boolean {
  if (status !== "pending" || !createdAt) return false;
  return Date.now() - new Date(createdAt).getTime() > 5 * 60 * 1000;
}

export const MobileReceipts = ({ initialSegment = "receipt" }: { initialSegment?: Segment } = {}) => {
  const [segment, setSegment] = useState<Segment>(initialSegment);
  useEffect(() => { setSegment(initialSegment); }, [initialSegment]);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const expenseCameraRef = useRef<HTMLInputElement>(null);
  const expenseFileRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showQuickInvoice, setShowQuickInvoice] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [invoiceText, setInvoiceText] = useState("");
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<"receipt" | "expense">("receipt");

  const companyId = getStoredActiveCompanyId();

  useEffect(() => {
    if (!companyId) return;

    // Fetch documents and enrich with journal entry data for accuracy
    const loadData = async () => {
      const { data: docs } = await supabase
        .from("documents")
        .select("id, file_name, processing_status, extracted_data, ai_document_type, ai_confidence, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!docs) return;

      // Check which documents have linked journal entries (source of truth)
      const docIds = docs.map(d => d.id);
      const { data: entries } = await supabase
        .from("journal_entries")
        .select("id, document_id, description, status")
        .in("document_id", docIds);

      const entryMap = new Map(
        (entries || []).map(e => [e.document_id, e])
      );

      setUploads(docs.map(d => {
        const ext = d.extracted_data as Record<string, any> | null;
        const entry = entryMap.get(d.id);
        const effectiveStatus = entry
          ? (entry.status === "approved" || entry.status === "posted" ? "booked" : entry.status)
          : d.processing_status || "pending";
        return {
          id: d.id,
          file_name: d.file_name,
          status: effectiveStatus,
          amount: ext?.total_amount ?? ext?.amount ?? null,
          supplier: ext?.supplier ?? ext?.merchant ?? ext?.counterparty ?? (entry?.description || null),
          doc_type: d.ai_document_type,
          created_at: d.created_at,
        };
      }));
    };

    loadData();
    supabase.from("expense_claims").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(20).then(({ data }) => {
      if (data) setExpenses(data as any[]);
    });
  }, [companyId]);

  const resolveMimeType = (file: File): string => {
    if (file.type) return file.type;
    const ext = file.name.split(".").pop()?.toLowerCase();
    const map: Record<string, string> = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
      webp: "image/webp", heic: "image/heic", heif: "image/heif",
      pdf: "application/pdf",
    };
    return map[ext || ""] || "application/octet-stream";
  };

  const handleFile = async (file: File) => {
    if (!companyId) return;
    const isExpense = uploadMode === "expense";
    const toastId = toast.loading(isExpense ? "Laddar upp utlägg..." : "Laddar upp kvitto...");
    const storagePath = `${companyId}/${crypto.randomUUID()}-${file.name}`;
    const mimeType = resolveMimeType(file);

    try {
      const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, file);
      if (uploadError) throw uploadError;

      const userId = (await supabase.auth.getUser()).data.user?.id || "";
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .insert({
          company_id: companyId,
          file_url: storagePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: mimeType,
          uploaded_by: userId,
          document_type: isExpense ? "expense" : "receipt",
        } as any)
        .select()
        .maybeSingle();

      if (docError || !doc) throw docError || new Error("Kunde inte spara dokument");

      const tempId = doc.id;
      setUploads(prev => [{ id: tempId, file_name: file.name, status: "pending", created_at: new Date().toISOString() }, ...prev]);
      toast.loading("AI analyserar...", { id: toastId });

      const { data: aiResult, error: aiError } = await supabase.functions.invoke("ai-process-document", {
        body: { documentId: doc.id, companyId, asExpenseClaim: isExpense },
      });

      if (aiError) throw new Error(aiError.message || "AI-analys misslyckades");

      if (isExpense) {
        const ext = (aiResult?.extracted_data || {}) as Record<string, any>;
        const { data: claim } = await supabase
          .from("expense_claims")
          .insert({
            company_id: companyId,
            user_id: userId,
            amount: ext.total_amount ?? ext.amount ?? 0,
            description: ext.supplier ?? ext.merchant ?? file.name,
            category: ext.category ?? "Övrigt",
            receipt_url: storagePath,
            status: "submitted",
            ai_confidence: aiResult?.confidence ?? null,
          } as any)
          .select()
          .maybeSingle();
        if (claim) setExpenses(prev => [claim, ...prev]);
        toast.success("Utlägg registrerat ✓", { id: toastId });
        setUploads(prev => prev.filter(u => u.id !== tempId));
      } else if (aiResult?.noBooking) {
        toast.success(`Sparat som underlag — ${aiResult.message || "inget att bokföra"}`, { id: toastId });
        setUploads(prev => prev.map(u => u.id === tempId ? { ...u, status: "archived" } : u));
      } else {
        toast.success("Bokförd ✓", { id: toastId });
        setUploads(prev => prev.map(u => u.id === tempId ? { ...u, status: "booked" } : u));
      }
    } catch (err: any) {
      console.error("Upload/process error:", err);
      toast.error(`Fel: ${err.message || "Okänt fel"}`, { id: toastId });
    }
  };

  const retryProcess = async (docId: string) => {
    if (!companyId) return;
    setRetryingId(docId);
    try {
      const { data, error } = await supabase.functions.invoke("ai-process-document", {
        body: { documentId: docId, companyId },
      });
      if (error) throw error;
      if (data?.duplicate || data?.alreadyProcessed) {
        setUploads(prev => prev.map(u => u.id === docId ? { ...u, status: "duplicate" } : u));
        toast.info("Duplikat — redan bokförd");
      } else if (data?.noBooking) {
        setUploads(prev => prev.map(u => u.id === docId ? { ...u, status: "archived" } : u));
        toast.success("Sparat som underlag");
      } else if (data?.success === false) {
        setUploads(prev => prev.map(u => u.id === docId ? { ...u, status: "failed" } : u));
        toast.error(data?.message || "Bearbetning misslyckades");
      } else {
        // Re-fetch actual document state from DB to ensure accuracy
        const { data: freshDoc } = await supabase
          .from("documents")
          .select("processing_status, extracted_data, ai_document_type")
          .eq("id", docId)
          .maybeSingle();
        const ext = freshDoc?.extracted_data as Record<string, any> | null;
        setUploads(prev => prev.map(u => u.id === docId ? {
          ...u,
          status: freshDoc?.processing_status || "completed",
          amount: ext?.total_amount ?? ext?.amount ?? u.amount,
          supplier: ext?.supplier ?? ext?.merchant ?? u.supplier,
          doc_type: freshDoc?.ai_document_type ?? u.doc_type,
        } : u));
        toast.success("Bokförd ✓");
      }
    } catch (err: any) {
      toast.error(`Retry misslyckades: ${err.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  const statusChip = (s: string, createdAt?: string | null) => {
    if (s === "matched" || s === "booked" || s === "processed" || s === "completed") return <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">✅ Bokförd</span>;
    if (s === "duplicate") return <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">🔁 Duplikat</span>;
    if (s === "failed") return <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">❌ Misslyckades</span>;
    if (s === "archived") return <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">📁 Underlag</span>;
    if (s === "pending" && isStuck(s, createdAt)) return <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">⚠️ Försök igen</span>;
    if (s === "pending") return <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full animate-pulse">⏳ Granskas</span>;
    return <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{s}</span>;
  };

  const formatShortDate = (dateStr?: string | null) => {
    if (!dateStr) return "";
    try {
      return format(new Date(dateStr), "d MMM", { locale: sv });
    } catch { return ""; }
  };

  return (
    <div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onInputChange} />
      <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={onInputChange} />
      <input ref={expenseCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onInputChange} />
      <input ref={expenseFileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={onInputChange} />

      {/* Quick Invoice */}
      <button
        onClick={() => setShowQuickInvoice(true)}
        className="mx-5 mt-5 w-[calc(100%-2.5rem)] bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl py-4 flex items-center justify-center gap-2 text-base font-semibold shadow-lg shadow-indigo-500/25 active:scale-[0.97] transition-all duration-200 min-h-[52px]"
      >
        <Zap className="h-5 w-5" />
        <span>Snabbfaktura via AI</span>
      </button>

      {/* Segmented control */}
      <div className="bg-slate-100 rounded-xl p-1 mx-5 mt-4 flex">
        {([["receipt", "Kvitto & Faktura"], ["expense", "Utlägg"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSegment(id)}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 min-h-[44px]",
              segment === id ? "bg-white shadow-sm text-slate-800" : "text-slate-400"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {segment === "receipt" ? (
        <div>
          {/* Smart Capture Card */}
          <div className="mx-5 mt-4 bg-white rounded-[20px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex flex-col items-center py-8 px-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-teal-500 flex items-center justify-center shadow-lg shadow-[#3b82f6]/20 mb-4">
                <Camera className="h-7 w-7 text-white" />
              </div>
              <p className="text-slate-800 font-bold text-lg">Skanna eller ladda upp</p>
              <p className="text-slate-400 text-sm mt-1">Kvitto, faktura eller underlag</p>
            </div>
            <div className="px-5 pb-5 space-y-2.5">
              <button onClick={() => { setUploadMode("receipt"); cameraRef.current?.click(); }} className="w-full bg-slate-900 text-white rounded-xl py-3.5 font-semibold text-sm active:scale-[0.97] transition-all duration-200 min-h-[44px]">
                📷 Öppna kamera
              </button>
              <button onClick={() => { setUploadMode("receipt"); fileRef.current?.click(); }} className="w-full bg-white border-2 border-slate-200 text-slate-700 rounded-xl py-3.5 font-semibold text-sm active:scale-[0.97] transition-all duration-200 min-h-[44px]">
                📁 Välj fil
              </button>
            </div>
          </div>

          {/* Recent uploads — horizontal scroll with rich cards */}
          {uploads.length > 0 && (
            <div className="mt-6">
              <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-widest px-5 mb-2.5">Senaste</p>
              <div className="flex gap-3 overflow-x-auto snap-x scrollbar-hide px-5 pb-1">
                {uploads.slice(0, 10).map((u) => {
                  const { icon, label } = getCategoryInfo(u.supplier, u.doc_type);
                  const stuck = isStuck(u.status, u.created_at);
                  const isRetrying = retryingId === u.id;

                  return (
                    <div
                      key={u.id}
                      className={cn(
                        "snap-start min-w-[150px] max-w-[170px] bg-white rounded-2xl border shadow-sm p-3.5 flex flex-col gap-1.5 transition-all duration-200",
                        stuck ? "border-red-200" : "border-slate-100"
                      )}
                      onClick={() => {
                        if (stuck && !isRetrying) retryProcess(u.id);
                      }}
                    >
                      {/* Category icon + label */}
                      <div className="flex items-center gap-2">
                        <span className="text-lg leading-none">{icon}</span>
                        <p className="text-[13px] font-semibold text-slate-800 truncate flex-1">{label}</p>
                      </div>

                      {/* Amount */}
                      {u.amount != null && (
                        <p className="text-base font-bold text-slate-900 tabular-nums">
                          {Number(u.amount).toLocaleString("sv-SE")} kr
                        </p>
                      )}

                      {/* Date */}
                      {u.created_at && (
                        <p className="text-[11px] text-slate-400">{formatShortDate(u.created_at)}</p>
                      )}

                      {/* Status */}
                      <div className="mt-auto pt-1">
                        {stuck && isRetrying ? (
                          <span className="text-[11px] font-semibold text-[#3b82f6] bg-cyan-50 px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                            <Loader2 className="h-3 w-3 animate-spin" /> Försöker...
                          </span>
                        ) : (
                          statusChip(u.status, u.created_at)
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Expense Capture Card */}
          <div className="mx-5 mt-4 bg-white rounded-[20px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex flex-col items-center py-8 px-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4">
                <Camera className="h-7 w-7 text-white" />
              </div>
              <p className="text-slate-800 font-bold text-lg">Registrera utlägg</p>
              <p className="text-slate-400 text-sm mt-1">Fota eller ladda upp kvitto för utlägg</p>
            </div>
            <div className="px-5 pb-5 space-y-2.5">
              <button onClick={() => { setUploadMode("expense"); expenseCameraRef.current?.click(); }} className="w-full bg-emerald-600 text-white rounded-xl py-3.5 font-semibold text-sm active:scale-[0.97] transition-all duration-200 min-h-[44px]">
                📷 Öppna kamera
              </button>
              <button onClick={() => { setUploadMode("expense"); expenseFileRef.current?.click(); }} className="w-full bg-white border-2 border-slate-200 text-slate-700 rounded-xl py-3.5 font-semibold text-sm active:scale-[0.97] transition-all duration-200 min-h-[44px]">
                📁 Välj fil
              </button>
            </div>
          </div>

          <div className="px-5 mt-6">
            <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-widest mb-2.5">Mina utlägg</p>
            {expenses.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">Inga utlägg ännu</div>
            ) : (
              expenses.map((e) => (
                <div key={e.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-3 flex items-center gap-3 px-4 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{e.description || "Utlägg"}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{e.category || "Övrigt"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 text-base tabular-nums">{Number(e.amount || 0).toLocaleString("sv-SE")} kr</p>
                    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", e.status === "approved" ? "bg-emerald-50 text-emerald-600" : e.status === "submitted" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500")}>{e.status === "approved" ? "Godkänd" : e.status === "submitted" ? "Väntar" : e.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Quick Invoice Bottom Sheet */}
      <MobileBottomSheet open={showQuickInvoice} onClose={() => { setShowQuickInvoice(false); setInvoiceResult(""); setInvoiceText(""); }}>
        <div className="px-5 pb-6">
          <h3 className="text-lg font-bold text-slate-900 mb-1">⚡ Snabbfaktura via AI</h3>
          <p className="text-sm text-slate-400 mb-4">Beskriv fakturan med egna ord</p>
          <div className="relative">
            <textarea
              value={invoiceText}
              onChange={(e) => setInvoiceText(e.target.value)}
              placeholder='t.ex. "Konsultarvode mars, Företaget AB, 8500 kr"'
              rows={3}
              className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-base placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 border border-slate-200 min-h-[80px] transition-all duration-200"
              style={{ fontSize: "16px" }}
            />
            <button
              onClick={() => setShowVoice(true)}
              className="absolute right-3 top-3 text-indigo-500 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-[0.97] transition-all duration-200"
            >
              <Mic className="h-5 w-5" />
            </button>
          </div>
          {invoiceResult && (
            <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-sm text-slate-700">
              {invoiceResult}
            </div>
          )}
          <button
            onClick={async () => {
              if (!invoiceText.trim()) return;
              setInvoiceLoading(true);
              const ctx = getModuleContext("/dashboard");
              const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-bookkeeper-stream`;
              let result = "";
              await streamAIResponse(url, {
                message: `Skapa en faktura baserat på denna beskrivning: ${invoiceText}. Ge mig en sammanfattning med kund, belopp, moms och förfallodatum.`,
                companyId: companyId || "00000000-0000-0000-0000-000000000000",
              }, {
                onDelta: (t) => { result += t; setInvoiceResult(result); },
                onDone: () => setInvoiceLoading(false),
                onError: (e) => { toast.error(e); setInvoiceLoading(false); },
              });
            }}
            disabled={!invoiceText.trim() || invoiceLoading}
            className={cn(
              "w-full mt-4 rounded-2xl py-4 text-base font-semibold min-h-[52px] active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2",
              invoiceText.trim() && !invoiceLoading ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25" : "bg-slate-200 text-slate-400"
            )}
          >
            {invoiceLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {invoiceLoading ? "Genererar..." : "Generera faktura"}
          </button>
        </div>
      </MobileBottomSheet>

      <MobileVoiceOverlay
        open={showVoice}
        onClose={() => setShowVoice(false)}
        onConfirm={(text) => { setShowVoice(false); setInvoiceText(text); }}
      />
    </div>
  );
};
