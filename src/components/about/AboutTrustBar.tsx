import { ShieldCheck, BookOpen, Lock, Receipt } from "lucide-react";

const items = [
  { icon: BookOpen, label: "Svensk redovisningsstandard" },
  { icon: ShieldCheck, label: "BAS 2026-kompatibel" },
  { icon: Lock, label: "GDPR & EU-hosting" },
  { icon: Receipt, label: "Automatisk moms & AGI" },
];

export const AboutTrustBar = () => (
  <section className="bg-white border-y border-[#E2E8F0] py-6">
    <div className="container mx-auto max-w-6xl px-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className="inline-flex items-center gap-2 text-slate-400 text-[13px] font-medium">
          <Icon className="w-4 h-4 text-[#0052FF]" />
          {label}
        </div>
      ))}
    </div>
  </section>
);
