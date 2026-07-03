import { useEffect, useState } from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
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
import { useIndustry } from "@/contexts/IndustryContext";
import { industryBadge } from "@/lib/industry-account-suggestions";

/**
 * Liten branschbadge som visas bredvid bolagsnamnet i topbar/dropdown
 * när bolagets bransch är 'restaurant' eller 'hotel'. Tom render annars.
 */
const IndustryBadge = () => {
  const { industry } = useIndustry();
  const badge = industryBadge(industry);
  if (!badge) return null;
  return (
    <span
      className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-teal-500/15 text-teal-700 dark:text-teal-300 text-[10px] font-medium tracking-wide shrink-0"
      title={badge.label}
    >
      <span aria-hidden>{badge.emoji}</span>
      <span>{badge.label}</span>
    </span>
  );
};

interface CompanyOption {
  id: string;
  name: string;
  org_number: string | null;
  is_test: boolean;
}

/**
 * Global company picker rendered in the topbar.
 * Reads/writes the canonical localStorage key and broadcasts a `company-changed`
 * event so all consumers of `useCompanyId` re-render instantly.
 */
export const GlobalCompanyPicker = () => {
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

      // Auto-select first company if none stored
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

  // Sync if another tab/component changes selection
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

    // Clear advisor "active client" mode when the user explicitly switches
    // companies via the global picker. Otherwise the AdvisorActiveClient
    // context re-asserts the previously active client on the next mount and
    // the picker change appears to "bounce back".
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

  // Single company → show as static label, no dropdown
  if (companies.length === 1) {
    return (
      <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground">
        <Building2 className="h-3.5 w-3.5" />
        <span className="truncate max-w-[180px]">{current.name}</span>
        {current.is_test && (
          <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-[10px] font-bold text-amber-950 tracking-wide">
            TEST
          </span>
        )}
        <IndustryBadge />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 max-w-[260px]">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-xs font-medium">{current.name}</span>
          {current.is_test && (
            <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-[10px] font-bold text-amber-950 tracking-wide shrink-0">
              TEST
            </span>
          )}
          <IndustryBadge />
          <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 max-h-[60vh] overflow-y-auto">
        <DropdownMenuLabel className="text-xs">Aktivt bolag</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {companies.map((c) => (
          <DropdownMenuItem
            key={c.id}
            onClick={() => switchTo(c.id)}
            className="flex items-center gap-2"
          >
            <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-medium">{c.name}</div>
              {c.org_number && (
                <div className="truncate text-[10px] text-muted-foreground">
                  {c.org_number}
                </div>
              )}
            </div>
            <Check
              className={cn(
                "h-4 w-4 shrink-0",
                c.id === current.id ? "opacity-100" : "opacity-0",
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
