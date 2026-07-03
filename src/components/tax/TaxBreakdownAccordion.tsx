/**
 * Collapsible breakdown wrapper. Default closed.
 */
import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function TaxBreakdownAccordion({ items }: { items: AccordionItem[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-[#0F1F3D]">Detaljer</h2>
      <div className="rounded-[12px] border-[0.5px] border-[#E2E8F0] bg-white overflow-hidden">
        {items.map((item, i) => (
          <AccordionRow key={item.id} item={item} isLast={i === items.length - 1} />
        ))}
      </div>
    </section>
  );
}

function AccordionRow({ item, isLast }: { item: AccordionItem; isLast: boolean }) {
  const [open, setOpen] = useState(!!item.defaultOpen);

  return (
    <div className={cn(!isLast && "border-b border-[#E2E8F0]")}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#F8FAFC] transition-colors text-left"
      >
        {item.icon && <span className="text-[#64748B]">{item.icon}</span>}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[#0F1F3D]">{item.title}</div>
          {item.subtitle && <div className="text-xs text-[#64748B] mt-0.5">{item.subtitle}</div>}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-[#94A3B8] transition-transform duration-200 shrink-0",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 pt-0 text-[13px] text-[#0F1F3D] animate-in fade-in slide-in-from-top-1 duration-200">
          {item.children}
        </div>
      )}
    </div>
  );
}
