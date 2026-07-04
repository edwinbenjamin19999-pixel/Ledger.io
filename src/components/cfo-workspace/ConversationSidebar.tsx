import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { useCFOConversations } from "@/hooks/useCFOConversations";
import { cn } from "@/lib/utils";

interface Props {
  companyId: string;
  activeId: string | null;
}

const groupLabels: Record<string, string> = {
  kpi: "KPI-analyser",
  benchmark: "Branschjämförelser",
  scenario: "Scenarier",
  action: "Åtgärder",
  general: "Övrigt",
};

export const ConversationSidebar = ({ companyId, activeId }: Props) => {
  const { conversations, loading } = useCFOConversations(companyId);
  const navigate = useNavigate();

  const groups = conversations.reduce((acc, c) => {
    (acc[c.context_type] ||= []).push(c);
    return acc;
  }, {} as Record<string, typeof conversations>);

  return (
    <aside className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950/30 border-r border-slate-200 dark:border-slate-800 p-3">
      <button
        onClick={() => navigate("/cfo/workspace")}
        className="w-full mb-3 rounded-lg bg-[#3b82f6] hover:bg-[#3b82f6] text-white text-sm font-medium px-3 py-2 transition-colors"
      >
        + Ny dialog
      </button>

      {loading && <p className="text-xs text-slate-500 px-2">Laddar…</p>}

      {Object.entries(groups).map(([type, items]) => (
        <div key={type} className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold px-2 mb-1.5">{groupLabels[type] || type}</div>
          <ul className="space-y-0.5">
            {items.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => navigate(`/cfo/workspace?conversation=${c.id}`)}
                  className={cn(
                    "w-full text-left rounded-md px-2 py-1.5 text-xs flex items-start gap-2 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors",
                    activeId === c.id && "bg-[#EFF6FF] text-[#3b82f6] dark:text-[#3b82f6] font-medium",
                  )}
                >
                  <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 opacity-60" />
                  <span className="line-clamp-2 flex-1">{c.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {!loading && conversations.length === 0 && (
        <p className="text-xs text-slate-500 px-2">Inga dialoger än. Starta din första analys.</p>
      )}
    </aside>
  );
};
