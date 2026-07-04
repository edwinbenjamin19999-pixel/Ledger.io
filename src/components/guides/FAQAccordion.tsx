import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface FAQItem { q: string; a: string }

export const FAQAccordion = ({ items }: { items: FAQItem[] }) => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 text-left px-6 py-5 hover:bg-slate-50/50 transition-colors"
            >
              <span className="font-semibold text-[#0F172A]">{item.q}</span>
              <ChevronDown className={`w-4 h-4 text-[#94a3b8] transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div className="px-6 pb-5 text-[#475569] leading-relaxed">{item.a}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};
