import { useFirmDeadlineRadar, type FirmDeadlineItem } from "@/hooks/useFirmDeadlineRadar";
import { useAdvisorActiveClient } from "@/contexts/AdvisorActiveClientContext";
import { useNavigate } from "react-router-dom";
import { CalendarClock } from "lucide-react";

const CARD_STYLE: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid rgba(15,23,42,0.06)",
  boxShadow: "0 30px 80px rgba(15,23,42,0.08)",
};

const KIND_LABEL: Record<FirmDeadlineItem["kind"], string> = {
  vat: "Moms",
  agi: "AGI",
  ink2: "INK2",
  annual: "Årsredovisning",
};

const SEVERITY_COLOR: Record<FirmDeadlineItem["severity"], string> = {
  critical: "text-[#7A1A1A] bg-[#FCE8E8]",
  warning: "text-[#7A5417] bg-[#FAEEDA]",
  info: "text-[#64748B] bg-[#F1F5F9]",
};

export const DeadlineRadarWidget = () => {
  const { items } = useFirmDeadlineRadar();
  const { setActiveClient } = useAdvisorActiveClient();
  const navigate = useNavigate();
  const top = items.slice(0, 8);

  const handleOpen = (item: FirmDeadlineItem) => {
    setActiveClient({ id: item.client_id, name: item.client_name });
    const route =
      item.kind === "vat" ? "/moms" :
      item.kind === "agi" ? "/agi" :
      item.kind === "ink2" ? "/tax-calculation" :
      "/dashboard";
    navigate(route);
  };

  return (
    <div className="rounded-3xl p-6" style={CARD_STYLE}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-[#94A3B8]">
            Deadline-radar
          </p>
          <h2 className="text-lg font-semibold text-[#0F172A] mt-0.5">
            Kommande 30 dagar
          </h2>
        </div>
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center"
          style={{ background: "hsl(var(--brand-primary) / 0.1)" }}
        >
          <CalendarClock className="h-4 w-4" style={{ color: "hsl(var(--brand-primary))" }} />
        </div>
      </div>

      {top.length === 0 ? (
        <p className="text-sm text-[#64748B] py-6 text-center">
          Inga deadlines på radar.
        </p>
      ) : (
        <div className="divide-y divide-[#F1F5F9]">
          {top.map((it, i) => (
            <button
              key={`${it.client_id}-${it.kind}-${i}`}
              onClick={() => handleOpen(it)}
              className="w-full py-3 flex items-center justify-between text-left hover:bg-[#F8FAFC] -mx-2 px-2 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${SEVERITY_COLOR[it.severity]}`}
                >
                  {KIND_LABEL[it.kind]}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#0F172A] truncate">{it.client_name}</div>
                  <div className="text-xs text-[#94A3B8]">{it.label}</div>
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <div className="text-sm font-semibold text-[#0F172A] tabular-nums">
                  {it.daysLeft <= 0 ? "Idag" : `${it.daysLeft} d`}
                </div>
                <div className="text-[11px] text-[#94A3B8] tabular-nums">
                  {it.due_date.toLocaleDateString("sv-SE", { day: "2-digit", month: "short" })}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
