import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStoredActiveCompanyId } from "@/lib/company-selection";
import { toast } from "sonner";
import {
  Check, X, Search, ChevronRight, FileText, Sparkles, Loader2, Pencil,
  ChevronDown, ChevronUp, ArrowLeft, ZoomIn, ZoomOut,
} from "lucide-react";
import { MobileBottomSheet } from "../MobileBottomSheet";
import { cn } from "@/lib/utils";

interface SupplierInvoice {
  id: string;
  counterparty_name: string;
  invoice_number: string;
  due_date: string;
  total_amount: number;
  vat_amount: number;
  status: string;
  ai_confidence: number | null;
  document_id: string | null;
}

interface JournalLine { description: string; amount: number }

const formatSEK = (n: number) =>
  `${new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n))} kr`;

const daysUntil = (date: string) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
};

const RECENT_ACCOUNTS_KEY = "mobile:recent-accounts";

const ACCOUNT_CATALOG: { number: string; name: string }[] = [
  { number: "4010", name: "Inköp varor och material" },
  { number: "5410", name: "Förbrukningsinventarier" },
  { number: "5460", name: "Förbrukningsmaterial" },
  { number: "5710", name: "Frakter och transporter" },
  { number: "5800", name: "Resekostnader" },
  { number: "5900", name: "Reklam och PR" },
  { number: "6110", name: "Kontorsmaterial" },
  { number: "6212", name: "Mobiltelefon" },
  { number: "6230", name: "Datakommunikation" },
  { number: "6540", name: "IT-tjänster" },
  { number: "6550", name: "Konsultarvoden" },
  { number: "6970", name: "Tidningar, facklitteratur" },
  { number: "7610", name: "Utbildning" },
];

/* ─── List view ─── */
export const MobileSupplierInvoices = () => {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<SupplierInvoice | null>(null);
  const companyId = getStoredActiveCompanyId();

  const load = async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("invoices")
      .select("id, counterparty_name, invoice_number, due_date, total_amount, vat_amount, status, ai_confidence, document_id")
      .eq("company_id", companyId)
      .eq("invoice_direction", "incoming")
      .in("status", ["draft", "sent"])
      .order("due_date", { ascending: true })
      .limit(50);
    setInvoices((data ?? []) as SupplierInvoice[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [companyId]);

  const removeRow = (id: string) => setInvoices((p) => p.filter((i) => i.id !== id));

  return (
    <div className="bg-[#F8FAFB] min-h-full">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-[20px] font-semibold text-[#0F172A]">Leverantörsfakturor</h1>
        <p className="text-[13px] text-[#64748B] leading-[1.6] mt-0.5">
          Svep höger för att attestera, vänster för att avvisa.
        </p>
      </div>

      {loading ? (
        <div className="px-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[78px] bg-white border-[0.5px] border-[#E2E8F0] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <Check size={28} className="mx-auto text-[#1D9E75]" strokeWidth={1.75} />
          <p className="mt-3 text-[15px] text-[#0F172A]">Inga fakturor väntar på attest.</p>
        </div>
      ) : (
        <ul className="px-4 space-y-2 pb-4">
          {invoices.map((inv) => (
            <SwipeRow
              key={inv.id}
              invoice={inv}
              onApprove={async () => {
                await supabase.from("invoices").update({ status: "attested", attested_at: new Date().toISOString() }).eq("id", inv.id);
                removeRow(inv.id);
                toast.success(`Faktura ${inv.invoice_number} attesterad.`);
              }}
              onReject={async () => {
                await supabase.from("invoices").update({ status: "rejected", rejected_at: new Date().toISOString() }).eq("id", inv.id);
                removeRow(inv.id);
                toast(`Faktura ${inv.invoice_number} avvisad.`);
              }}
              onOpen={() => setActive(inv)}
            />
          ))}
        </ul>
      )}

      <MobileInvoiceSheet
        invoice={active}
        onClose={() => setActive(null)}
        onPosted={(id) => { removeRow(id); setActive(null); }}
      />
    </div>
  );
};

/* ─── Swipeable row ─── */
const SWIPE_THRESHOLD = 80;

const SwipeRow = ({
  invoice,
  onApprove,
  onReject,
  onOpen,
}: {
  invoice: SupplierInvoice;
  onApprove: () => void | Promise<void>;
  onReject: () => void | Promise<void>;
  onOpen: () => void;
}) => {
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);
  const moved = useRef(false);

  const due = daysUntil(invoice.due_date);
  const status =
    invoice.status === "sent" ? { label: "Väntar attest", cls: "bg-[#FFFBEB] text-[#92400E]" } :
    due < 0 ? { label: "Förfallen", cls: "bg-[#FEF2F2] text-[#991B1B]" } :
    due === 0 ? { label: "Förfaller idag", cls: "bg-[#FFFBEB] text-[#92400E]" } :
    { label: "Utkast", cls: "bg-[#EFF6FF] text-[#1E40AF]" };

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    moved.current = false;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (Math.abs(dx) > 4) moved.current = true;
    const clamped = Math.max(-140, Math.min(140, dx));
    setOffset(clamped);
  };
  const onTouchEnd = () => {
    if (offset > SWIPE_THRESHOLD) {
      setOffset(0);
      void onApprove();
    } else if (offset < -SWIPE_THRESHOLD) {
      setOffset(0);
      void onReject();
    } else {
      setOffset(0);
    }
    startX.current = null;
  };

  return (
    <li className="relative overflow-hidden rounded-2xl">
      {/* Action backgrounds */}
      <div className="absolute inset-y-0 left-0 right-0 flex">
        <div className="flex-1 bg-[#1D9E75] flex items-center px-5 text-white text-[15px] font-medium gap-2">
          <Check size={20} /> Attestera
        </div>
        <div className="flex-1 bg-[#E24B4A] flex items-center justify-end px-5 text-white text-[15px] font-medium gap-2">
          Avvisa <X size={20} />
        </div>
      </div>
      {/* Foreground row */}
      <button
        onClick={() => { if (!moved.current) onOpen(); }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative w-full bg-white border-[0.5px] border-[#E2E8F0] rounded-2xl px-4 py-3 text-left transition-transform"
        style={{ transform: `translateX(${offset}px)`, transition: startX.current === null ? "transform 200ms ease" : "none" }}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-[#0F172A] truncate leading-[1.4]">
              {invoice.counterparty_name}
            </p>
            <p className="text-[13px] text-[#64748B] mt-0.5 leading-[1.6]">
              {invoice.invoice_number} · Förfaller {due === 0 ? "idag" : due > 0 ? `om ${due}d` : `${Math.abs(due)}d sen`}
            </p>
            <span className={cn("inline-block mt-1.5 px-2 py-0.5 rounded-full text-[12px] font-medium", status.cls)}>
              {status.label}
            </span>
          </div>
          <div className="text-right">
            <p className="text-[16px] font-semibold text-[#0F172A] tabular-nums">
              {formatSEK(invoice.total_amount)}
            </p>
            <p className="text-[12px] text-[#94A3B8] mt-0.5 tabular-nums">moms {formatSEK(invoice.vat_amount)}</p>
          </div>
        </div>
      </button>
    </li>
  );
};

/* ─── Detail bottom sheet ─── */
const MobileInvoiceSheet = ({
  invoice, onClose, onPosted,
}: {
  invoice: SupplierInvoice | null;
  onClose: () => void;
  onPosted: (id: string) => void;
}) => {
  const [linesOpen, setLinesOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [account, setAccount] = useState<{ number: string; name: string }>(
    { number: "5410", name: "Förbrukningsinventarier" }
  );

  // Reset chosen account when invoice changes (use sensible default)
  useEffect(() => {
    if (invoice) setAccount({ number: "5410", name: "Förbrukningsinventarier" });
  }, [invoice?.id]);

  if (!invoice) return null;

  const due = daysUntil(invoice.due_date);
  const aiPct = invoice.ai_confidence ? Math.round(invoice.ai_confidence * 100) : 96;
  const net = invoice.total_amount - invoice.vat_amount;

  const proposedLines: JournalLine[] = [
    { description: `${account.number} ${account.name}`, amount: net },
    { description: "2641 Ingående moms 25%", amount: invoice.vat_amount },
    { description: "2440 Leverantörsskulder", amount: -invoice.total_amount },
  ];

  const post = async () => {
    await supabase
      .from("invoices")
      .update({ status: "attested", attested_at: new Date().toISOString() })
      .eq("id", invoice.id);
    setConfirmOpen(false);
    toast.success(`Faktura ${invoice.invoice_number} bokförd.`);
    onPosted(invoice.id);
  };

  return (
    <>
      <MobileBottomSheet open={!!invoice && !pdfOpen && !accountPickerOpen} onClose={onClose} className="h-[85vh]">
        <div className="flex flex-col h-full">
          {/* ─── Top section (above fold) ─── */}
          <div className="px-5 pb-4 border-b-[0.5px] border-[#E2E8F0]">
            <p className="text-[13px] text-[#64748B] leading-[1.6]">{invoice.invoice_number}</p>
            <h2 className="text-[20px] font-semibold text-[#0F172A] leading-tight">{invoice.counterparty_name}</h2>
            <p className="mt-2 text-[28px] font-semibold text-[#0F172A] tabular-nums">
              {formatSEK(invoice.total_amount)}
            </p>
            <button
              onClick={() => setAccountPickerOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6] text-[13px] font-medium active:bg-[#3b82f6]/15"
            >
              <Sparkles size={14} strokeWidth={1.75} />
              AI föreslår: {account.number} {account.name} ({aiPct}%)
            </button>
            <p className="mt-3 text-[13px] text-[#64748B] leading-[1.6]">
              Förfallodag {new Date(invoice.due_date).toLocaleDateString("sv-SE")}
              {" · "}
              <span className={due < 0 ? "text-[#991B1B] font-medium" : due <= 3 ? "text-[#92400E] font-medium" : ""}>
                {due === 0 ? "förfaller idag" : due > 0 ? `om ${due} dagar` : `${Math.abs(due)} dagar sen`}
              </span>
            </p>
          </div>

          {/* ─── Scrollable middle ─── */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <section>
              <p className="text-[13px] uppercase tracking-[0.06em] text-[#64748B] font-medium mb-2">Rader</p>
              <div className="space-y-2">
                <DetailRow label="Nettobelopp" value={formatSEK(net)} />
                <DetailRow label="Moms 25%" value={formatSEK(invoice.vat_amount)} />
                <DetailRow label="Totalt" value={formatSEK(invoice.total_amount)} bold />
              </div>
            </section>

            <section>
              <button
                onClick={() => setLinesOpen((o) => !o)}
                className="w-full flex items-center justify-between py-2 min-h-[44px]"
              >
                <span className="text-[15px] font-medium text-[#0F172A]">AI bokföringsförslag</span>
                {linesOpen ? <ChevronUp size={18} color="#64748B" /> : <ChevronDown size={18} color="#64748B" />}
              </button>
              {linesOpen && (
                <div className="space-y-1.5 pt-1">
                  {proposedLines.map((l, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-[#F8FAFB] rounded-lg">
                      <span className="text-[13px] text-[#0F172A] leading-[1.6]">{l.description}</span>
                      <span className={cn("text-[13px] tabular-nums font-medium", l.amount < 0 ? "text-[#3b82f6]" : "text-[#1D9E75]")}>
                        {formatSEK(Math.abs(l.amount))} {l.amount < 0 ? "Kr" : "Db"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {invoice.document_id && (
              <button
                onClick={() => setPdfOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white border-[0.5px] border-[#E2E8F0] rounded-2xl active:bg-[#F8FAFB] min-h-[60px]"
              >
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                  <FileText size={18} color="#3b82f6" strokeWidth={1.75} />
                </div>
                <span className="flex-1 text-left text-[15px] text-[#0F172A]">Visa fakturabilaga</span>
                <ChevronRight size={18} color="#CBD5E1" />
              </button>
            )}
          </div>

          {/* ─── Sticky bottom actions ─── */}
          <div
            className="px-5 pt-3 pb-4 border-t-[0.5px] border-[#E2E8F0] bg-white"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
          >
            <button
              onClick={() => setConfirmOpen(true)}
              className="w-full h-[52px] rounded-xl bg-[#3b82f6] active:bg-[#2563eb] text-white text-[15px] font-medium"
            >
              Attestera & bokför
            </button>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => toast("Redigeringsläge öppnas i desktop-vy.")}
                className="flex-1 h-[44px] rounded-xl border border-[#E2E8F0] text-[#0F172A] text-[15px] font-medium active:bg-[#F8FAFB] inline-flex items-center justify-center gap-1.5"
              >
                <Pencil size={16} /> Redigera
              </button>
              <button
                onClick={async () => {
                  await supabase.from("invoices").update({ status: "rejected", rejected_at: new Date().toISOString() }).eq("id", invoice.id);
                  toast(`Faktura ${invoice.invoice_number} avvisad.`);
                  onPosted(invoice.id);
                }}
                className="flex-1 h-[44px] rounded-xl border border-[#FECACA] text-[#991B1B] text-[15px] font-medium active:bg-[#FEF2F2]"
              >
                Avvisa
              </button>
            </div>
          </div>
        </div>
      </MobileBottomSheet>

      {/* Confirm overlay */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={() => setConfirmOpen(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 animate-in slide-in-from-bottom duration-200" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[16px] font-semibold text-[#0F172A] leading-tight">
              Bokföra faktura {invoice.invoice_number} till {invoice.counterparty_name} på {formatSEK(invoice.total_amount)}?
            </h3>
            <div className="mt-3 space-y-1 border-t border-b border-[#E2E8F0] py-3">
              {proposedLines.slice(0, 3).map((l, i) => (
                <div key={i} className="flex items-center justify-between text-[13px]">
                  <span className="text-[#0F172A] truncate pr-2">{l.description}</span>
                  <span className="tabular-nums text-[#0F172A] font-medium">{formatSEK(Math.abs(l.amount))}</span>
                </div>
              ))}
            </div>
            <button
              onClick={post}
              className="mt-4 w-full h-[48px] rounded-xl bg-[#1D9E75] active:bg-[#0F6E56] text-white text-[15px] font-medium"
            >
              Bekräfta
            </button>
            <button
              onClick={() => setConfirmOpen(false)}
              className="mt-2 w-full h-[44px] text-[#64748B] text-[15px]"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {/* Account picker overlay */}
      {accountPickerOpen && (
        <AccountPickerOverlay
          onClose={() => setAccountPickerOpen(false)}
          onSelect={(a) => {
            setAccount(a);
            // Save recent
            try {
              const list = JSON.parse(localStorage.getItem(RECENT_ACCOUNTS_KEY) || "[]");
              const next = [a, ...list.filter((x: { number: string }) => x.number !== a.number)].slice(0, 5);
              localStorage.setItem(RECENT_ACCOUNTS_KEY, JSON.stringify(next));
            } catch { /* ignore */ }
            setAccountPickerOpen(false);
          }}
        />
      )}

      {/* PDF viewer overlay */}
      {pdfOpen && invoice.document_id && (
        <PdfViewerOverlay documentId={invoice.document_id} onClose={() => setPdfOpen(false)} />
      )}
    </>
  );
};

const DetailRow = ({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) => (
  <div className={cn("flex items-center justify-between py-2 border-b-[0.5px] border-[#F1F5F9]", bold && "border-none pt-2")}>
    <span className="text-[15px] text-[#64748B] leading-[1.6]">{label}</span>
    <span className={cn("text-[15px] tabular-nums", bold ? "font-semibold text-[#0F172A]" : "text-[#0F172A]")}>{value}</span>
  </div>
);

/* ─── Account picker (full-screen search) ─── */
const AccountPickerOverlay = ({
  onClose, onSelect,
}: {
  onClose: () => void;
  onSelect: (a: { number: string; name: string }) => void;
}) => {
  const [q, setQ] = useState("");
  const recent = useMemo<{ number: string; name: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_ACCOUNTS_KEY) || "[]"); }
    catch { return []; }
  }, []);
  const results = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return [];
    return ACCOUNT_CATALOG.filter(
      (a) => a.number.includes(ql) || a.name.toLowerCase().includes(ql)
    ).slice(0, 30);
  }, [q]);

  return (
    <div className="fixed inset-0 z-[70] bg-white flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b-[0.5px] border-[#E2E8F0]">
        <button onClick={onClose} className="w-11 h-11 flex items-center justify-center" aria-label="Stäng">
          <X size={20} color="#0F172A" />
        </button>
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Sök konto eller nummer"
            className="w-full h-11 pl-9 pr-3 bg-[#F8FAFB] border-[0.5px] border-[#E2E8F0] rounded-xl text-[15px] text-[#0F172A] focus:outline-none focus:border-[#3b82f6]"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {q.trim() === "" && recent.length > 0 && (
          <>
            <p className="px-4 pt-4 pb-1 text-[13px] uppercase tracking-[0.06em] text-[#64748B] font-medium">Senaste</p>
            {recent.map((a) => (
              <AccountResultRow key={a.number} a={a} onSelect={onSelect} />
            ))}
          </>
        )}
        {q.trim() !== "" && (
          <>
            <p className="px-4 pt-4 pb-1 text-[13px] uppercase tracking-[0.06em] text-[#64748B] font-medium">
              {results.length} {results.length === 1 ? "träff" : "träffar"}
            </p>
            {results.map((a) => (
              <AccountResultRow key={a.number} a={a} onSelect={onSelect} />
            ))}
          </>
        )}
        {q.trim() === "" && recent.length === 0 && (
          <p className="px-4 pt-4 text-[13px] text-[#64748B]">Börja skriva för att söka i kontoplanen.</p>
        )}
      </div>
    </div>
  );
};

const AccountResultRow = ({ a, onSelect }: { a: { number: string; name: string }; onSelect: (a: { number: string; name: string }) => void }) => (
  <button
    onClick={() => onSelect(a)}
    className="w-full h-[48px] px-4 flex items-center gap-3 active:bg-[#F8FAFB] border-b-[0.5px] border-[#F1F5F9]"
  >
    <span className="font-mono text-[14px] text-[#3b82f6] w-12 text-left">{a.number}</span>
    <span className="flex-1 text-left text-[15px] text-[#0F172A]">{a.name}</span>
    <ChevronRight size={16} color="#CBD5E1" />
  </button>
);

/* ─── PDF viewer (full-screen, pinch-zoom via native browser gestures on <object>) ─── */
const PdfViewerOverlay = ({ documentId, onClose }: { documentId: string; onClose: () => void }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("documents").select("file_path").eq("id", documentId).maybeSingle();
      const path = (data as { file_path?: string } | null)?.file_path;
      if (!path) return;
      const { data: signed } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 5);
      if (!cancelled && signed?.signedUrl) setUrl(signed.signedUrl);
    })();
    return () => { cancelled = true; };
  }, [documentId]);

  return (
    <div className="fixed inset-0 z-[80] bg-black flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="flex items-center justify-between px-3 py-2">
        <button onClick={onClose} className="w-11 h-11 flex items-center justify-center text-white" aria-label="Tillbaka">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="w-11 h-11 flex items-center justify-center text-white" aria-label="Zooma ut">
            <ZoomOut size={20} />
          </button>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="w-11 h-11 flex items-center justify-center text-white" aria-label="Zooma in">
            <ZoomIn size={20} />
          </button>
          <button onClick={onClose} className="w-11 h-11 flex items-center justify-center text-white" aria-label="Stäng">
            <X size={22} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-black flex items-start justify-center">
        {url ? (
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center", touchAction: "pinch-zoom pan-x pan-y" }}>
            <object data={url} type="application/pdf" className="w-[100vw] h-[80vh] bg-white" aria-label="Faktura PDF">
              <p className="p-4 text-white">Kan inte visa PDF i webbläsaren. <a className="underline" href={url} target="_blank" rel="noreferrer">Öppna i ny flik</a>.</p>
            </object>
          </div>
        ) : (
          <Loader2 className="text-white animate-spin mt-12" />
        )}
      </div>
      <button
        onClick={onClose}
        className="m-4 h-[48px] rounded-xl bg-white text-[#0F172A] text-[15px] font-medium active:bg-slate-100"
        style={{ marginBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        Tillbaka till faktura
      </button>
    </div>
  );
};
