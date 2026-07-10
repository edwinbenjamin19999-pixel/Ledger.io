import { useEffect, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ACTIVE_COMPANY_STORAGE_KEY,
  broadcastActiveCompanyChange,
  getStoredActiveCompanyId,
  setStoredActiveCompanyId,
} from "@/lib/company-selection";
import { cn } from "@/lib/utils";

interface CompanyOption {
  id: string;
  name: string;
  org_number: string | null;
  is_test: boolean;
}

/**
 * F07 · Företagsväxlare i sidebarens blå toppanel.
 * Pill mot #0052FF: rgba-vit yta, vit initial-badge (blå text), bolagsnamn i
 * vitt, chevrons-up-down. Återanvänder samma localStorage-mekanik som
 * GlobalCompanyPicker (aktivt bolag + broadcast) — bara stylingen är ny.
 */
export const SidebarCompanySwitcher = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [activeId, setActiveId] = useState<string | null>(getStoredActiveCompanyId());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("company_id, companies:company_id(id, name, org_number, metadata)")
        .eq("user_id", user.id);

      if (cancelled) return;
      if (error) {
        setLoading(false);
        return;
      }

      const list: CompanyOption[] = [];
      const seen = new Set<string>();
      for (const row of data ?? []) {
        const c = (row as any).companies;
        if (c?.id && !seen.has(c.id)) {
          seen.add(c.id);
          const meta = (c.metadata as Record<string, unknown> | null) ?? {};
          list.push({
            id: c.id,
            name: c.name,
            org_number: c.org_number ?? null,
            is_test: meta.is_test_account === true,
          });
        }
      }
      list.sort((a, b) => a.name.localeCompare(b.name, "sv"));
      setCompanies(list);

      const stored = getStoredActiveCompanyId();
      if (!stored && list[0]) {
        setStoredActiveCompanyId(list[0].id);
        setActiveId(list[0].id);
        broadcastActiveCompanyChange(list[0].id);
      } else if (stored && !list.some((c) => c.id === stored) && list[0]) {
        setStoredActiveCompanyId(list[0].id);
        setActiveId(list[0].id);
        broadcastActiveCompanyChange(list[0].id);
      } else {
        setActiveId(stored);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const onChange = () => setActiveId(getStoredActiveCompanyId());
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === ACTIVE_COMPANY_STORAGE_KEY) onChange();
    };
    window.addEventListener("company-changed", onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("company-changed", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const switchTo = (id: string) => {
    if (id === activeId) return;
    setStoredActiveCompanyId(id);
    setActiveId(id);
    if (typeof window !== "undefined") {
      const advisorClientId = window.localStorage.getItem("advisor:activeClientId");
      if (advisorClientId && advisorClientId !== id) {
        window.localStorage.removeItem("advisor:activeClientId");
        window.localStorage.removeItem("advisor:activeClientName");
        window.localStorage.removeItem("advisor:activeClientOrg");
      }
    }
    broadcastActiveCompanyChange(id);
  };

  if (loading || !user || companies.length === 0) return null;

  const current = companies.find((c) => c.id === activeId) ?? companies[0];
  const initials = current.name.substring(0, 1).toUpperCase();

  const pill = (
    <div className="flex h-[38px] w-full items-center gap-2 rounded-lg border border-white/25 bg-white/[0.14] px-2.5 text-left transition-colors hover:bg-white/20">
      <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[5px] bg-white text-[12px] font-semibold text-[#0052FF] font-display">
        {initials}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white">
        {current.name}
      </span>
      {current.is_test && (
        <span className="shrink-0 rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white">
          TEST
        </span>
      )}
      <ChevronsUpDown className="h-[13px] w-[13px] shrink-0 text-white/70" />
    </div>
  );

  // Single company → static pill, no dropdown
  if (companies.length === 1) {
    return pill;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full outline-none">{pill}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[248px] max-h-[60vh] overflow-y-auto">
        <DropdownMenuLabel className="text-xs">Aktivt bolag</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {companies.map((c) => (
          <DropdownMenuItem
            key={c.id}
            onClick={() => switchTo(c.id)}
            className="flex items-center gap-2"
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[5px] bg-[#EFF6FF] text-[11px] font-semibold text-[#0052FF]">
              {c.name.substring(0, 1).toUpperCase()}
            </span>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-medium">{c.name}</div>
              {c.org_number && (
                <div className="truncate text-[10px] text-muted-foreground">{c.org_number}</div>
              )}
            </div>
            <Check
              className={cn("h-4 w-4 shrink-0", c.id === current.id ? "opacity-100" : "opacity-0")}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
