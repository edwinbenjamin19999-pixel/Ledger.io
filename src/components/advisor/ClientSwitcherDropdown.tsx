import { useMemo, useState } from "react";
import { Building2, Check, ChevronsUpDown, Search, Users, X, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useAdvisorActiveClient } from "@/contexts/AdvisorActiveClientContext";
import { useClientPriorityEngine, type ClientPriority } from "@/hooks/useClientPriorityEngine";
import { cn } from "@/lib/utils";

interface Props {
  variant?: "desktop" | "mobile";
}

/**
 * The defining WL UX element: a global dropdown letting the advisor jump
 * between "Byrå-vy" (firm cockpit) and any client (full NorthLedger scoped to that
 * client). Selecting a client navigates into the standard product surface so
 * every existing module works out of the box.
 */
export const ClientSwitcherDropdown = ({ variant = "desktop" }: Props) => {
  const navigate = useNavigate();
  const { clients, isLoading } = useAdvisorContext();
  const { activeClient, setActiveClient, clearActiveClient } = useAdvisorActiveClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { clients: prioritized, byId: priorityById } = useClientPriorityEngine();

  // Sort by AI priority score (critical → warning → stable). Falls back to
  // raw client list while priority engine is loading.
  const sortedClients = useMemo(() => {
    if (prioritized.length === 0) return clients;
    const orderedIds = prioritized.map((p) => p.client.id);
    const ordered = orderedIds
      .map((id) => clients.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => !!c);
    // Append any clients that didn't appear in the priority list (edge cases)
    const seen = new Set(ordered.map((c) => c.id));
    clients.forEach((c) => {
      if (!seen.has(c.id)) ordered.push(c);
    });
    return ordered;
  }, [clients, prioritized]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedClients;
    return sortedClients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.org_number.toLowerCase().includes(q),
    );
  }, [sortedClients, query]);

  const criticalCount = useMemo(
    () => prioritized.filter((p) => p.tier === "critical").length,
    [prioritized],
  );

  const isMobile = variant === "mobile";
  const triggerLabel = activeClient?.name ?? "Byråöversikt";
  const triggerSub = activeClient?.orgNumber ?? `${clients.length} klienter`;

  const handleSelectClient = (id: string, name: string, orgNumber: string) => {
    setActiveClient({ id, name, orgNumber });
    setOpen(false);
    setQuery("");
    // Selecting a client switches the global company_id context. All standard
    // NorthLedger modules (invoices, vat, bookkeeping, …) re-scope automatically
    // via useCompanyId() listening to the "company-changed" event.
    navigate("/dashboard");
  };

  const handleBackToFirm = () => {
    clearActiveClient();
    setOpen(false);
    setQuery("");
    navigate("/wl/app/dashboard");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group flex items-center gap-2 rounded-xl transition-all active:scale-[0.98]",
            isMobile
              ? "px-2.5 py-1.5 bg-white/10 hover:bg-white/15 text-white max-w-[180px]"
              : "h-9 px-2.5 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[hsl(var(--brand-primary)/0.4)] max-w-[260px]",
          )}
          style={
            isMobile
              ? undefined
              : { boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }
          }
          title={activeClient ? `${triggerLabel}${triggerSub ? " · " + triggerSub : ""}` : triggerLabel}
        >
          <div
            className={cn(
              "rounded-md flex items-center justify-center shrink-0",
              isMobile ? "h-7 w-7 bg-white/15" : "h-6 w-6 bg-[hsl(var(--brand-primary)/0.1)]",
            )}
          >
            {activeClient ? (
              <Building2
                className={cn("h-3.5 w-3.5", isMobile ? "text-white" : "text-[hsl(var(--brand-primary))]")}
              />
            ) : (
              <Users
                className={cn("h-3.5 w-3.5", isMobile ? "text-white" : "text-[hsl(var(--brand-primary))]")}
              />
            )}
          </div>
          {isMobile ? (
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[9px] uppercase tracking-[0.18em] font-bold leading-tight text-white/55">
                {activeClient ? "Aktiv klient" : "Arbetar i"}
              </div>
              <div className="text-[13px] font-semibold truncate leading-tight text-white">
                {triggerLabel}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[12px] font-medium text-[#0F172A] truncate max-w-[140px]">
                {triggerLabel}
              </span>
              {triggerSub && (
                <span className="text-[11px] text-[#94A3B8] tabular-nums shrink-0">
                  {triggerSub}
                </span>
              )}
            </div>
          )}
          <ChevronsUpDown
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              isMobile ? "text-white/60" : "text-[#94A3B8] group-hover:text-[hsl(var(--brand-primary))]",
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[340px] p-0 rounded-2xl border-[#E2E8F0] overflow-hidden"
        style={{ boxShadow: "0 20px 40px -12px rgba(15,23,42,0.18)" }}
      >
        {/* Brand header */}
        <div
          className="px-4 py-3 text-white"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--brand-primary)) 0%, hsl(192 91% 38%) 100%)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[9px] uppercase tracking-[0.2em] font-bold text-white/60">
                Klientväxlare · AI-prioriterad
              </div>
              <div className="text-sm font-semibold">Sorterad efter brådska</div>
            </div>
            {criticalCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FCE8E8] text-white border border-rose-300/30">
                <Flame className="h-2.5 w-2.5" />
                {criticalCount} kritisk{criticalCount === 1 ? "" : "a"}
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[#F1F5F9]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sök klient eller org.nr…"
              className="pl-9 h-9 rounded-xl border-[#E2E8F0] text-sm"
            />
          </div>
        </div>

        {/* Firm view option */}
        <button
          type="button"
          onClick={handleBackToFirm}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 transition-colors text-left",
            !activeClient
              ? "bg-[hsl(var(--brand-primary)/0.08)]"
              : "hover:bg-[#F8FAFC]",
          )}
        >
          <div className="h-8 w-8 rounded-lg bg-[hsl(var(--brand-primary)/0.12)] flex items-center justify-center">
            <Users className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[#0F172A]">Byråöversikt</div>
            <div className="text-[11px] text-[#64748B]">
              Översikt över alla {clients.length} klienter
            </div>
          </div>
          {!activeClient && <Check className="h-4 w-4 text-[hsl(var(--brand-primary))]" />}
        </button>

        <div className="border-t border-[#F1F5F9]" />

        {/* Client list */}
        <div className="max-h-[320px] overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-6 text-center text-xs text-[#94A3B8]">Laddar klienter…</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-[#94A3B8]">
              {query ? "Inga klienter matchar" : "Inga klienter kopplade"}
            </div>
          ) : (
            filtered.map((c) => {
              const active = activeClient?.id === c.id;
              const p: ClientPriority | undefined = priorityById.get(c.id);
              const tier = p?.tier ?? "stable";
              const dot =
                tier === "critical"
                  ? "bg-rose-500"
                  : tier === "warning"
                  ? "bg-amber-500"
                  : "bg-emerald-500";
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectClient(c.id, c.name, c.org_number)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left",
                    active ? "bg-[hsl(var(--brand-primary)/0.08)]" : "hover:bg-[#F8FAFC]",
                  )}
                >
                  <div className="relative h-8 w-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-[#64748B]" />
                    <span
                      aria-hidden
                      className={cn(
                        "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-white",
                        dot,
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-[#0F172A] truncate">{c.name}</span>
                      {p && p.score > 0 && (
                        <span className="text-[9px] tabular-nums font-bold text-[#94A3B8]">
                          {p.score}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#64748B] tabular-nums truncate">
                      {c.org_number}
                      {p?.topReason && (
                        <span
                          className={cn(
                            "ml-2 font-semibold",
                            tier === "critical"
                              ? "text-[#7A1A1A]"
                              : tier === "warning"
                              ? "text-[#7A5417]"
                              : "text-[#085041]",
                          )}
                        >
                          · {p.topReason.label}
                        </span>
                      )}
                    </div>
                  </div>
                  {active && <Check className="h-4 w-4 text-[hsl(var(--brand-primary))]" />}
                </button>
              );
            })
          )}
        </div>

        {activeClient && (
          <div className="border-t border-[#F1F5F9] p-2">
            <button
              type="button"
              onClick={handleBackToFirm}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Lämna klientläge
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
