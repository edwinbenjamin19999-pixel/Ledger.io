import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FileCheck, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const AdvisorApprovals = () => {
  const { clients, isLoading } = useAdvisorContext();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-24 bg-white/5" />
        <Skeleton className="h-24 bg-white/5" />
      </div>
    );
  }

  const drafts = clients.filter((c) => c.draftEntries > 0);
  const expenses = clients.filter((c) => c.pendingExpenses > 0);

  return (
    <div className="space-y-5 p-4 pb-4">
      <h1 className="text-xl font-bold text-white">Att godkänna</h1>

      <Section title="Verifikat" Icon={FileCheck} items={drafts.map((c) => ({
        id: c.id, name: c.name, count: c.draftEntries,
      }))} onTap={(id) => navigate(`/firm/client/${id}`)} />

      <Section title="Utlägg" Icon={Receipt} items={expenses.map((c) => ({
        id: c.id, name: c.name, count: c.pendingExpenses,
      }))} onTap={(id) => navigate(`/firm/client/${id}`)} />
    </div>
  );
};

const Section = ({
  title, Icon, items, onTap,
}: {
  title: string;
  Icon: typeof FileCheck;
  items: { id: string; name: string; count: number }[];
  onTap: (id: string) => void;
}) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-3.5 w-3.5 text-[#3b82f6]" />
      <h2 className="text-[10px] uppercase tracking-widest text-white/50 font-semibold">{title}</h2>
      <span className="text-[10px] text-white/30 tabular-nums">({items.length})</span>
    </div>
    {items.length === 0 ? (
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 text-center text-xs text-white/50">
        Inget att granska
      </div>
    ) : (
      <div className="space-y-1.5">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => onTap(it.id)}
            className={cn(
              "w-full flex items-center justify-between rounded-xl px-3 py-3",
              "bg-white/[0.04] backdrop-blur-xl border border-white/10",
              "active:scale-[0.98] transition-transform",
            )}
          >
            <span className="text-sm font-medium text-white truncate">{it.name}</span>
            <span className="text-xs font-bold tabular-nums text-[#3b82f6] px-2 py-0.5 rounded-full bg-[#3b82f6]/15">
              {it.count}
            </span>
          </button>
        ))}
      </div>
    )}
  </div>
);
