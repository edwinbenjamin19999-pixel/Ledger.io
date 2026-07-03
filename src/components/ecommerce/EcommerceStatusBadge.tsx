import { cn } from "@/lib/utils";

type BadgeType =
  | "betald" | "bokford" | "matchad" | "delvis_retur" | "returnerad"
  | "vantande" | "granskning" | "verifikat" | "slutsald" | "kritiskt"
  | "lagt_lager" | "i_lager";

const badgeStyles: Record<BadgeType, string> = { betald: "bg-[#E1F5EE] text-[#085041] border border-[#BFE6D6]",
  bokford: "bg-[#E1F5EE] text-[#085041] border border-[#BFE6D6]",
  matchad: "bg-teal-100 text-teal-700 border border-teal-200",
  delvis_retur: "bg-[#FAEEDA] text-[#7A5417] border border-[#F0DDB7]",
  returnerad: "bg-[#FCE8E8] text-[#7A1A1A] border border-[#F4C8C8]",
  vantande: "bg-slate-100 text-slate-600 border border-slate-200",
  granskning: "bg-orange-100 text-orange-600 border border-orange-200",
  verifikat: "bg-[#EFF6FF] text-indigo-700 border border-[#C8DDF5]",
  slutsald: "bg-red-500 text-white font-bold border-0",
  kritiskt: "bg-orange-500 text-white font-bold border-0",
  lagt_lager: "bg-amber-400 text-white font-semibold border-0",
  i_lager: "bg-emerald-500 text-white border-0",
};

const badgeLabels: Record<BadgeType, string> = { betald: "Betald",
  bokford: "Bokförd",
  matchad: "Matchad",
  delvis_retur: "Delvis retur",
  returnerad: "Returnerad",
  vantande: "Väntande",
  granskning: "Granskning",
  verifikat: "Verifikat skapat",
  slutsald: "SLUTSÅLD",
  kritiskt: "KRITISKT",
  lagt_lager: "Lågt lager",
  i_lager: "I lager",
};

interface Props { type: BadgeType;
  label?: string;
  className?: string;
}

export const EcommerceStatusBadge = ({ type, label, className }: Props) => { return (
    <span
      className={cn(
        "text-xs font-medium px-2.5 py-0.5 rounded-full inline-flex items-center gap-1",
        badgeStyles[type],
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      {label || badgeLabels[type]}
    </span>
  );
};

export type { BadgeType };
