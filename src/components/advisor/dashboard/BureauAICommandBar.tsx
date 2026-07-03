import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Sparkles, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBureauSync } from "@/hooks/useBureauSync";

const QUICK_QUERIES = [
  { label: "Riskklienter", route: "/wl/app/clients?filter=critical" },
  { label: "Moms denna vecka", route: "/wl/app/vat?filter=week" },
  { label: "Saknar underlag", route: "/wl/app/clients?filter=missing-receipts" },
  { label: "Mina uppgifter", route: "/wl/app/approvals" },
] as const;

const fmtSEK = (n: number) =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);

interface Hit {
  client: string;
  detail: string;
  route: string;
}

/**
 * Bureau AI command bar.
 *
 * Dark search surface with chips and an expandable inline answer panel.
 * Powered locally by useBureauSync — the AI overlay is deterministic for now
 * (rule-based interpretation of common bureau questions); upgrade path is to
 * forward the query to the AI gateway when free-form prompts arrive.
 */
export const BureauAICommandBar = () => {
  const { summaries } = useBureauSync();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [answer, setAnswer] = useState<{ headline: string; hits: Hit[]; actions: { label: string; route: string }[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const interpret = (raw: string) => {
    const text = raw.toLowerCase().trim();
    if (!text) return null;

    if (text.includes("risk") || text.includes("kritisk")) {
      const list = summaries.filter((s) => s.client_status === "watch" || s.overdue_customer_invoices_count > 0 || s.missing_receipts_count > 5);
      return {
        headline: `${list.length} klient${list.length === 1 ? "" : "er"} i riskzonen`,
        hits: list.slice(0, 6).map<Hit>((s) => ({
          client: s.company_name,
          detail: `${s.overdue_customer_invoices_count} förfallna · ${s.missing_receipts_count} saknar underlag`,
          route: `/wl/app/clients/${s.company_id}`,
        })),
        actions: [{ label: "Visa alla riskklienter", route: "/wl/app/clients?filter=critical" }],
      };
    }

    if (text.includes("moms")) {
      const today = new Date();
      const within7 = (d: string | null) => d && (new Date(d).getTime() - today.getTime()) / (1000 * 3600 * 24) <= 7;
      const list = summaries.filter((s) => within7(s.vat_next_deadline));
      const total = list.reduce((acc, s) => acc + s.vat_amount_due, 0);
      return {
        headline: `${list.length} klient${list.length === 1 ? "" : "er"} med moms denna vecka — ${fmtSEK(total)}`,
        hits: list.slice(0, 6).map<Hit>((s) => ({
          client: s.company_name,
          detail: `${fmtSEK(s.vat_amount_due)} · deadline ${s.vat_next_deadline ?? "—"}`,
          route: `/wl/app/clients/${s.company_id}`,
        })),
        actions: [{ label: "Öppna momsmodul", route: "/wl/app/vat" }],
      };
    }

    if (text.includes("underlag") || text.includes("kvitto")) {
      const list = summaries.filter((s) => s.missing_receipts_count > 0).sort((a, b) => b.missing_receipts_count - a.missing_receipts_count);
      const total = list.reduce((acc, s) => acc + s.missing_receipts_count, 0);
      return {
        headline: `${total} verifikationer saknar underlag (${list.length} klienter)`,
        hits: list.slice(0, 6).map<Hit>((s) => ({
          client: s.company_name,
          detail: `${s.missing_receipts_count} saknar underlag`,
          route: `/wl/app/clients/${s.company_id}`,
        })),
        actions: [{ label: "Skicka påminnelse till alla", route: "/wl/app/clients?bulk=remind" }],
      };
    }

    if (text.includes("uppgift") || text.includes("godkänn")) {
      return {
        headline: "Dina öppna uppgifter",
        hits: [],
        actions: [{ label: "Öppna godkännandekö", route: "/wl/app/approvals" }],
      };
    }

    // Fallback — fuzzy match on client names
    const list = summaries.filter((s) => s.company_name.toLowerCase().includes(text) || s.org_number.includes(text));
    return {
      headline: list.length > 0 ? `${list.length} klient${list.length === 1 ? "" : "er"} matchar "${raw}"` : `Inga träffar för "${raw}"`,
      hits: list.slice(0, 6).map<Hit>((s) => ({ client: s.company_name, detail: s.org_number, route: `/wl/app/clients/${s.company_id}` })),
      actions: [],
    };
  };

  const submit = (override?: string) => {
    const query = (override ?? q).trim();
    if (!query) return;
    setThinking(true);
    setOpen(true);
    // Mimic AI latency for UX polish
    setTimeout(() => {
      setAnswer(interpret(query));
      setThinking(false);
    }, 220);
  };

  const close = () => {
    setOpen(false);
    setAnswer(null);
    setQ("");
  };

  return (
    <div className="w-full max-w-[680px] mx-auto">
      <div
        className="flex items-center gap-3 rounded-[12px] px-4 py-3"
        style={{ background: "#0B1929", border: "0.5px solid rgba(255,255,255,0.12)" }}
      >
        {thinking ? (
          <Loader2 className="h-4 w-4 text-white/60 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 text-[#3b82f6]" />
        )}
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Fråga AI… t.ex. 'visa riskklienter' eller 'moms denna vecka'  (⌘K)"
          className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/40 focus:outline-none"
        />
        <kbd className="hidden md:inline-flex items-center gap-1 rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-mono text-white/50">⌘K</kbd>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {QUICK_QUERIES.map((c) => (
          <button
            key={c.label}
            onClick={() => {
              setQ(c.label);
              submit(c.label);
            }}
            className="rounded-full bg-white/[0.08] text-white/60 px-[9px] py-[2px] text-[10px] transition-colors hover:bg-white/[0.14] hover:text-white/90"
          >
            {c.label}
          </button>
        ))}
      </div>

      {open && (
        <div
          className="relative mt-2 rounded-[12px] bg-white p-[14px]"
          style={{ border: "0.5px solid #E2E8F0", boxShadow: "0 8px 24px rgba(15,23,42,0.06)" }}
        >
          <button
            onClick={close}
            className="absolute top-2 right-2 h-6 w-6 rounded-md text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#0F172A] flex items-center justify-center"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          {thinking || !answer ? (
            <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              AI tänker…
            </div>
          ) : (
            <>
              <div className="text-[12px] font-semibold text-[#0F172A] pr-6">{answer.headline}</div>
              {answer.hits.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {answer.hits.map((h, i) => (
                    <li key={i}>
                      <button
                        onClick={() => {
                          navigate(h.route);
                          close();
                        }}
                        className="w-full text-left flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-[#F8FAFC]"
                      >
                        <div>
                          <div className="text-[12px] font-medium text-[#0F172A]">{h.client}</div>
                          <div className="text-[10px] text-[#94A3B8]">{h.detail}</div>
                        </div>
                        <span className="text-[10px] text-[#94A3B8]">Öppna →</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {answer.actions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-[#F1F5F9]">
                  {answer.actions.map((a) => (
                    <button
                      key={a.label}
                      onClick={() => {
                        navigate(a.route);
                        close();
                      }}
                      className="rounded-md bg-[#0B1929] text-white text-[11px] font-semibold px-2.5 py-1 hover:bg-[#142a44]"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
