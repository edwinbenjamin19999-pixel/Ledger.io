import { Shield, FileCheck, Landmark } from "lucide-react";

/**
 * Subtle trust signals shown at the bottom of the onboarding right-panel.
 * Communicates enterprise-grade compliance without shouting.
 */
export const TrustBar = () => (
  <div className="mt-10 pt-5 border-t border-slate-100 flex items-center justify-center gap-4 flex-wrap">
    <Item icon={Shield}    label="GDPR-säkrat" />
    <Dot />
    <Item icon={FileCheck} label="BAS 2026" />
    <Dot />
    <Item icon={Landmark}  label="Svensk redovisningsstandard" />
  </div>
);

const Item = ({ icon: Icon, label }: { icon: any; label: string }) => (
  <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
    <Icon className="w-3 h-3" />
    {label}
  </span>
);

const Dot = () => <span className="text-slate-300 text-[10px]">·</span>;
