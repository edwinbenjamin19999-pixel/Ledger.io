import { LucideIcon } from "lucide-react";

export type LayerStatus = "live" | "expanding" | "next";

interface CapabilityLayerCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  capabilities: string[];
  audience?: string;
  status: LayerStatus;
}

const statusStyles: Record<LayerStatus, { label: string; className: string }> = {
  live: {
    label: "LIVE",
    className: "bg-[rgba(16,185,129,0.08)] text-[#059669]",
  },
  expanding: {
    label: "EXPANDING",
    className: "bg-[rgba(59,130,246,0.08)] text-[#0052FF]",
  },
  next: {
    label: "NEXT",
    className: "bg-[rgba(148,163,184,0.12)] text-[#475569]",
  },
};

export const CapabilityLayerCard = ({
  icon: Icon,
  title,
  description,
  capabilities,
  audience,
  status,
}: CapabilityLayerCardProps) => {
  const badge = statusStyles[status];

  return (
    <article className="rounded-[22px] border border-slate-900/[0.06] bg-white p-7 shadow-[0_20px_50px_rgba(15,23,42,0.06)] transition-all duration-[160ms] ease-out hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-slate-50 text-slate-700 ring-1 ring-slate-900/[0.04]">
            <Icon className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wider ${badge.className}`}
        >
          {badge.label}
        </span>
      </header>

      <p className="mt-4 text-sm leading-relaxed text-slate-600">{description}</p>

      <ul className="mt-5 grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {capabilities.map((cap) => (
          <li key={cap} className="flex items-start gap-2.5 text-sm text-slate-700">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
            <span>{cap}</span>
          </li>
        ))}
      </ul>

      {audience && (
        <>
          <div className="my-5 h-px bg-slate-900/[0.06]" />
          <p className="text-xs uppercase tracking-wider text-slate-500">
            <span className="text-slate-400">För</span> · {audience}
          </p>
        </>
      )}
    </article>
  );
};
