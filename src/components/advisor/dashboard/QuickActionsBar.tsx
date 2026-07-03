import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ClipboardList, FileUp } from "lucide-react";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { AddClientDialog } from "@/components/firm/AddClientDialog";
import { RequestDocumentsDialog } from "./RequestDocumentsDialog";

export const QuickActionsBar = () => {
  const { firmId } = useAdvisorContext();
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);

  const Btn = ({
    icon: Icon,
    label,
    onClick,
  }: { icon: typeof Plus; label: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0F172A] transition-all hover:-translate-y-0.5"
      style={{
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 6px 16px rgba(15,23,42,0.04)",
      }}
    >
      <Icon className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
      {label}
    </button>
  );

  return (
    <>
      <div
        className="rounded-3xl p-4 flex flex-wrap items-center gap-3"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--brand-primary) / 0.06), hsl(var(--brand-primary) / 0.01))",
          border: "1px solid hsl(var(--brand-primary) / 0.10)",
        }}
      >
        <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#64748B] mr-1">
          Snabbåtgärder
        </span>
        <Btn icon={Plus} label="Lägg till klient" onClick={() => setAddOpen(true)} />
        <Btn icon={ClipboardList} label="Skapa uppgift" onClick={() => navigate("/wl/app/approvals?new=true")} />
        <Btn icon={FileUp} label="Begär dokument" onClick={() => setReqOpen(true)} />
      </div>

      {firmId && (
        <AddClientDialog
          firmId={firmId}
          open={addOpen}
          onOpenChange={setAddOpen}
          onClientAdded={() => setAddOpen(false)}
        />
      )}
      <RequestDocumentsDialog open={reqOpen} onOpenChange={setReqOpen} />
    </>
  );
};
