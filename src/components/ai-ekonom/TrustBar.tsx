import { Lock, Eye, Shield, UserCheck } from "lucide-react";

const items = [
  { icon: Lock,      label: "Full revisionslogg" },
  { icon: Eye,       label: "Spårbar AI" },
  { icon: Shield,    label: "Skatteverket-kompatibel" },
  { icon: UserCheck, label: "Du har alltid kontroll" },
];

export const TrustBar = () => (
  <div className="flex items-center justify-center gap-1 sm:gap-4 px-3 py-2 text-[11px] text-slate-500 border-t border-slate-100 bg-white/60 backdrop-blur-sm flex-wrap">
    {items.map(({ icon: Icon, label }) => (
      <div key={label} className="inline-flex items-center gap-1.5">
        <Icon className="w-3 h-3" style={{ color: "hsl(var(--brand-primary))" }} />
        <span className="font-medium">{label}</span>
      </div>
    ))}
  </div>
);
