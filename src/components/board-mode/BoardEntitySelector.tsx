import { useEffect, useState } from "react";
import { Check, ChevronDown, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface CompanyRow {
  id: string;
  name: string;
}

export const BoardEntitySelector = ({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) => {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", user.id);
      const ids = Array.from(new Set((roles || []).map((r: any) => r.company_id).filter(Boolean)));
      if (ids.length === 0) { setLoading(false); return; }
      const { data: cos } = await supabase
        .from("companies")
        .select("id, name")
        .in("id", ids);
      setCompanies((cos || []) as CompanyRow[]);
      setLoading(false);
    })();
  }, []);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      const next = selectedIds.filter(x => x !== id);
      onChange(next.length === 0 ? [id] : next); // never empty
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const label = (() => {
    if (loading) return "Laddar bolag…";
    if (selectedIds.length === 0) return "Välj bolag";
    if (selectedIds.length === 1) {
      const c = companies.find(x => x.id === selectedIds[0]);
      return c?.name || "1 bolag";
    }
    return `${selectedIds.length} bolag (koncern)`;
  })();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-white/80 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-xl"
        >
          <Building2 className="h-4 w-4 text-[#1E3A5F]" />
          <span className="max-w-[180px] truncate">{label}</span>
          <ChevronDown className="h-3 w-3 text-white/50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2 bg-[#0f1428] border-white/10 text-white" align="end">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 px-2 pt-1 pb-2">
          Välj ett eller flera bolag
        </p>
        <div className="max-h-72 overflow-y-auto">
          {companies.length === 0 && !loading && (
            <p className="px-3 py-4 text-sm text-white/50">Inga bolag tillgängliga.</p>
          )}
          {companies.map(c => {
            const selected = selectedIds.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                  selected ? "bg-[#EFF6FF] text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                )}
              >
                <span className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                  selected ? "bg-[#3b82f6] border-[#3b82f6]" : "border-white/30"
                )}>
                  {selected && <Check className="h-3 w-3 text-white" />}
                </span>
                <span className="flex-1 text-left truncate">{c.name}</span>
              </button>
            );
          })}
        </div>
        {selectedIds.length > 1 && (
          <p className="text-[11px] text-[#3b82f6]/80 px-2 pt-2 border-t border-white/5 mt-1">
            Koncernvy aktiv — KPI:er aggregeras
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
};
