import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import Fuse from "fuse.js";
import { useNavigate } from "react-router-dom";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useAdvisorActiveClient } from "@/contexts/AdvisorActiveClientContext";

export const AdvisorCommandBar = () => {
  const { clients, isLoading } = useAdvisorContext();
  const { setActiveClient } = useAdvisorActiveClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fuse = useMemo(
    () =>
      new Fuse(clients, {
        keys: ["name", "org_number"],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [clients],
  );

  const results = useMemo(() => {
    if (!q.trim()) return [];
    return fuse.search(q.trim()).slice(0, 8).map((r) => r.item);
  }, [q, fuse]);

  // ⌘K / Ctrl+K to focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (c: { id: string; name: string; org_number: string }) => {
    setActiveClient({ id: c.id, name: c.name, orgNumber: c.org_number });
    setOpen(false);
    setQ("");
    navigate(`/wl/app/clients/${c.id}`);
  };

  return (
    <div className="relative">
      <div
        className="flex items-center gap-3 rounded-2xl bg-white px-4 h-12"
        style={{
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 4px 12px rgba(15,23,42,0.04)",
        }}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 text-[#94A3B8] animate-spin" />
        ) : (
          <Search className="h-4 w-4 text-[#94A3B8]" />
        )}
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Sök klient, faktura, deadline..."
          className="flex-1 bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none"
        />
        <kbd className="hidden md:inline-flex items-center gap-1 rounded-md bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-mono text-[#64748B]">
          ⌘K
        </kbd>
      </div>

      {open && results.length > 0 && (
        <div
          className="absolute z-50 mt-2 w-full rounded-2xl bg-white overflow-hidden"
          style={{
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 20px 50px rgba(15,23,42,0.12)",
          }}
        >
          {results.map((c) => (
            <button
              key={c.id}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(c);
              }}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#F8FAFC] transition-colors"
            >
              <div>
                <div className="text-sm font-semibold text-[#0F172A]">{c.name}</div>
                <div className="text-xs text-[#94A3B8]">{c.org_number}</div>
              </div>
              <span className="text-xs text-[#94A3B8]">Öppna →</span>
            </button>
          ))}
        </div>
      )}
      {open && q.trim() && results.length === 0 && (
        <div
          className="absolute z-50 mt-2 w-full rounded-2xl bg-white px-4 py-3 text-sm text-[#94A3B8]"
          style={{ border: "1px solid rgba(15,23,42,0.08)" }}
        >
          Inga träffar för "{q}"
        </div>
      )}
    </div>
  );
};
