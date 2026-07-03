import { AlertTriangle } from "lucide-react";

interface MistakesCalloutProps {
  items: { title: string; body: string }[];
}

export const MistakesCallout = ({ items }: MistakesCalloutProps) => (
  <div className="not-prose my-14 rounded-2xl border border-amber-200/50 bg-amber-50/40 p-7">
    <div className="flex items-center gap-2 text-[#7A5417] text-[11px] uppercase tracking-[0.14em] font-semibold">
      <AlertTriangle className="w-3.5 h-3.5" />
      Vanliga fel att undvika
    </div>
    <ul className="mt-5 space-y-4">
      {items.map((m, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
          <div className="flex-1">
            <div className="text-[15px] font-semibold text-[#0F1B2D]">{m.title}</div>
            <p className="mt-0.5 text-[14px] text-slate-600 leading-relaxed">{m.body}</p>
          </div>
        </li>
      ))}
    </ul>
  </div>
);
