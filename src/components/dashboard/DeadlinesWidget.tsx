import { useEffect, useState } from "react";
import { CalendarClock, ArrowRight, Zap, Calculator, Users, FileText, PieChart, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { sv } from "date-fns/locale";
import { generateDeadlines, parseCompanySettings } from "@/lib/tax/generateDeadlines";
import { cn } from "@/lib/utils";

interface DeadlinesWidgetProps {
  companyId: string;
}

interface WidgetDeadline {
  id: string;
  title: string;
  date: Date;
  daysLeft: number;
  type: string;
  status: "overdue" | "urgent" | "upcoming" | "ok";
  path: string;
}

const TAB_PATHS: Record<string, string> = {
  agi: "/automation",
  vat: "/vat-reports",
  annual: "/automation",
};

const getTypeIcon = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes("f-skatt") || t.includes("fskatt")) return { icon: Zap, bg: "bg-[#F1F5F9]", color: "text-violet-600" };
  if (t.includes("moms") || t === "vat") return { icon: Calculator, bg: "bg-[#EFF6FF]", color: "text-[#0052FF]" };
  if (t.includes("agi")) return { icon: Users, bg: "bg-[#E1F5EE]", color: "text-[#085041]" };
  if (t.includes("ink2") || t.includes("deklaration")) return { icon: FileText, bg: "bg-[#FAEEDA]", color: "text-[#7A5417]" };
  if (t.includes("k10")) return { icon: PieChart, bg: "bg-[#FCE8E8]", color: "text-[#7A1A1A]" };
  return { icon: Calendar, bg: "bg-slate-100", color: "text-slate-500" };
};

export const DeadlinesWidget = ({ companyId }: DeadlinesWidgetProps) => {
  const navigate = useNavigate();
  const [deadlines, setDeadlines] = useState<WidgetDeadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { buildDeadlines(); }, [companyId]);

  const buildDeadlines = async () => {
    try {
      const now = new Date();
      const { data: company } = await supabase
        .from("companies")
        .select("fiscal_year_start, fiscal_year_end, vat_period_type, company_type, registered_for_fskatt, num_employees, eu_vat_liable")
        .eq("id", companyId)
        .maybeSingle();

      const settings = parseCompanySettings((company as Record<string, unknown>) || {});
      const allDeadlines = generateDeadlines(settings, now.getFullYear());
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 14);

      const items: WidgetDeadline[] = allDeadlines
        .filter(d => d.dueDate >= cutoff)
        .slice(0, 8)
        .map(d => {
          const daysLeft = differenceInDays(d.dueDate, now);
          return {
            id: d.id,
            title: d.description || d.title,
            date: d.dueDate,
            daysLeft,
            type: d.type.toLowerCase(),
            status: daysLeft < 0 ? "overdue" : daysLeft <= 5 ? "urgent" : daysLeft <= 14 ? "upcoming" : "ok",
            path: TAB_PATHS[d.tab] || "/automation",
          };
        });

      setDeadlines(items);
    } catch (error) {
      console.error("Error building deadlines:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  const overdueCount = deadlines.filter(d => d.status === "overdue" || d.status === "urgent").length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-none border border-[#E2E8F0] dark:border-slate-800 overflow-hidden">
      {/* F07 · ljus header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#E2E8F0] dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#FAEEDA] rounded-xl p-2">
            <CalendarClock className="w-5 h-5 text-[#B45309]" />
          </div>
          <span className="text-[#0F172A] dark:text-white font-bold">Kommande deadlines</span>
        </div>
        {overdueCount > 0 && (
          <div className="bg-[#DC2626] text-white text-xs font-black rounded-full w-6 h-6 flex items-center justify-center">
            {overdueCount}
          </div>
        )}
      </div>

      {/* Deadline rows */}
      <div className="px-4 py-3 space-y-1">
        {deadlines.slice(0, 5).map(d => {
          const typeStyle = getTypeIcon(d.type);
          const TypeIcon = typeStyle.icon;
          const isOverdueOrToday = d.daysLeft <= 0;

          return (
            <button
              key={d.id}
              onClick={() => navigate(d.path)}
              className={cn(
                "w-full rounded-2xl px-4 py-3.5 flex items-center gap-4 transition cursor-pointer text-left group",
                isOverdueOrToday
                  ? "bg-[#FCE8E8] border border-red-100 dark:bg-red-950/20 dark:border-red-900/30"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", typeStyle.bg, "dark:bg-opacity-20")}>
                <TypeIcon className={cn("w-4 h-4", typeStyle.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{d.title}</p>
                <p className="text-slate-400 text-xs mt-0.5">{format(d.date, "d MMM yyyy", { locale: sv })}</p>
              </div>
              <div className="shrink-0">
                {d.daysLeft < 0 && (
                  <span className="bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full animate-pulse">
                    {Math.abs(d.daysLeft)}d försenad
                  </span>
                )}
                {d.daysLeft === 0 && (
                  <span className="bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full animate-pulse">
                    Idag!
                  </span>
                )}
                {d.daysLeft > 0 && d.daysLeft <= 7 && (
                  <span className="bg-[#FAEEDA] text-[#7A5417] dark:bg-amber-900/30 dark:text-[#C28A2B] font-semibold text-xs px-3 py-1 rounded-full">
                    {d.daysLeft}d kvar
                  </span>
                )}
                {d.daysLeft > 7 && d.daysLeft <= 30 && (
                  <span className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 text-xs px-3 py-1 rounded-full">
                    {d.daysLeft}d kvar
                  </span>
                )}
                {d.daysLeft > 30 && (
                  <span className="text-slate-300 dark:text-slate-600 text-xs">{d.daysLeft}d kvar</span>
                )}
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
