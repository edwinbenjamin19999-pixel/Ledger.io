import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Settings, Building2, ChevronDown, Check } from "lucide-react";
import { MobileBottomSheet } from "./MobileBottomSheet";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  getStoredActiveCompanyId,
  setStoredActiveCompanyId,
} from "@/lib/company-selection";

interface MobileTopBarProps {
  user: User;
  signOut: () => Promise<void>;
}

interface CompanyOption {
  id: string;
  name: string;
  org_number: string | null;
  is_test: boolean;
}

export const MobileTopBar = ({ user, signOut }: MobileTopBarProps) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [activeId, setActiveId] = useState<string | null>(getStoredActiveCompanyId());
  const navigate = useNavigate();
  const initials = (user.email || "").substring(0, 2).toUpperCase();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("company_id, companies:company_id(id, name, org_number, metadata)")
        .eq("user_id", user.id);
      if (cancelled || error) return;
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
    })();
    return () => { cancelled = true; };
  }, [user.id]);

  useEffect(() => {
    const handler = () => setActiveId(getStoredActiveCompanyId());
    window.addEventListener("company-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("company-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const activeCompany = companies.find((c) => c.id === activeId) ?? null;
  const hasMultiple = companies.length >= 2;

  const choose = (id: string) => {
    setStoredActiveCompanyId(id);
    setActiveId(id);
    window.dispatchEvent(new Event("company-changed"));
    setCompanyOpen(false);
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 bg-[#0B1929] text-white flex items-center justify-between"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          height: "calc(56px + env(safe-area-inset-top))",
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        {/* LEFT: logo */}
        <div className="flex items-center shrink-0">
          <span className="text-white font-medium text-[18px] leading-none">Bok</span>
          <span className="text-[#3b82f6] font-medium text-[18px] leading-none">fy</span>
        </div>

        {/* CENTER: company selector */}
        <div className="flex-1 flex justify-center min-w-0 px-3">
          {hasMultiple ? (
            <button
              onClick={() => setCompanyOpen(true)}
              className="flex items-center gap-1 min-w-0 bg-white/[0.08] border-[0.5px] border-white/[0.12] rounded-full px-[10px] py-[4px] active:bg-white/[0.14] transition-colors min-h-[28px]"
              aria-label="Byt bolag"
            >
              <span className="text-[12px] text-white/80 truncate max-w-[120px]">
                {activeCompany?.name?.slice(0, 12) ?? "Välj bolag"}
              </span>
              <ChevronDown className="h-3 w-3 text-white/60 shrink-0" />
            </button>
          ) : activeCompany ? (
            <span className="text-[12px] text-white/60 truncate max-w-[160px]">
              {activeCompany.name}
            </span>
          ) : null}
          {activeCompany?.is_test && (
            <span className="ml-2 px-1.5 py-0.5 rounded-md bg-amber-400/90 text-[10px] font-bold text-slate-900 tracking-wide shrink-0">
              TEST
            </span>
          )}
        </div>

        {/* RIGHT: avatar */}
        <button
          onClick={() => setProfileOpen(true)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 relative"
          aria-label="Mitt konto"
        >
          <div className="w-[32px] h-[32px] rounded-full bg-[#1D4ED8] flex items-center justify-center">
            <span className="text-[12px] font-medium text-[#E6F4FA]">{initials}</span>
          </div>
        </button>
      </header>

      <MobileBottomSheet open={companyOpen} onClose={() => setCompanyOpen(false)}>
        <div className="px-6 pb-6 space-y-2">
          <p className="text-sm font-medium text-slate-800">Välj bolag</p>
          <p className="text-xs text-slate-400 mb-4">
            Underlag och e-post skickas till det aktiva bolaget.
          </p>
          {companies.map((c) => {
            const isActive = c.id === activeId;
            return (
              <button
                key={c.id}
                onClick={() => choose(c.id)}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-ds-card border-0.5 active:scale-[0.97] transition-all duration-200 min-h-[44px] ${
                  isActive ? "bg-ds-deep/5 border-ds-deep/30" : "bg-ds-surface border-ds-border"
                }`}
              >
                <Building2 className={`h-5 w-5 shrink-0 ${isActive ? "text-ds-deep" : "text-slate-500"}`} />
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{c.name}</div>
                  {c.org_number && (
                    <div className="text-xs text-slate-500 truncate tabular-nums">Org.nr {c.org_number}</div>
                  )}
                </div>
                {isActive && <Check className="h-4 w-4 text-ds-deep shrink-0" />}
              </button>
            );
          })}
        </div>
      </MobileBottomSheet>

      <MobileBottomSheet open={profileOpen} onClose={() => setProfileOpen(false)}>
        <div className="px-6 pb-6 space-y-2">
          <p className="text-sm font-medium text-slate-800">Mitt konto</p>
          <p className="text-xs text-slate-400 mb-4">{user.email}</p>
          <button
            onClick={() => { setProfileOpen(false); navigate("/settings"); }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-ds-card bg-ds-surface border-0.5 border-ds-border active:scale-[0.97] transition-all duration-200 min-h-[44px]"
          >
            <Settings className="h-5 w-5 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Inställningar</span>
          </button>
          <button
            onClick={() => { setProfileOpen(false); signOut(); }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-ds-card bg-ds-surface border-0.5 border-rose-200 active:scale-[0.97] transition-all duration-200 min-h-[44px]"
          >
            <LogOut className="h-5 w-5 text-rose-500" />
            <span className="text-sm font-medium text-rose-600">Logga ut</span>
          </button>
        </div>
      </MobileBottomSheet>
    </>
  );
};
