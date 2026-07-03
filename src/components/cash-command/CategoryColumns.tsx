import { Lock, FileCheck, Repeat, ExternalLink } from "lucide-react";
import type { CapitalItem } from "@/hooks/useMonthlyCapitalNeed";
import { formatSEK } from "@/lib/formatNumber";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Props { items: CapitalItem[]; }

const COLUMNS = [
  { key: "locked", title: "Låst", subtitle: "Måste betalas — löner & skatter", icon: Lock, color: "text-[#C73838]", bg: "bg-[#FCE8E8]", border: "border-[#F4C8C8]",
    cats: ["salaries", "social_fees", "tax", "vat"] as const },
  { key: "decided", title: "Beslutat", subtitle: "Leverantörsfakturor", icon: FileCheck, color: "text-[#C28A2B]", bg: "bg-[#FAEEDA]", border: "border-[#F0DDB7]",
    cats: ["supplier_invoices"] as const },
  { key: "recurring", title: "Återkommande", subtitle: "Hyra, SaaS, abonnemang", icon: Repeat, color: "text-[#1E3A5F]", bg: "bg-[#EFF6FF]", border: "border-[#C8DDF5]",
    cats: ["recurring"] as const },
];

export function CategoryColumns({ items }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map((col) => {
        const colItems = items.filter((i) => (col.cats as readonly string[]).includes(i.category) && i.direction === "outflow");
        const total = colItems.reduce((a, b) => a + b.amount, 0);
        const Icon = col.icon;
        return (
          <div key={col.key} className={cn("rounded-2xl border bg-card p-4", col.border)}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", col.bg, col.color)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-sm font-semibold">{col.title}</h3>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 ml-9">{col.subtitle}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold tabular-nums">{formatSEK(total)}</div>
                <div className="text-[10px] text-muted-foreground">{colItems.length} poster</div>
              </div>
            </div>
            <div className="space-y-1.5 max-h-72 overflow-auto pr-1">
              {colItems.length === 0 && <p className="text-xs text-muted-foreground italic py-2">Inga poster denna månad.</p>}
              {colItems.sort((a, b) => a.date.localeCompare(b.date)).map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2.5 py-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{it.label}</div>
                    <div className="text-muted-foreground flex items-center gap-1.5">
                      <span>{new Date(it.date).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}</span>
                      {typeof it.confidence === "number" && it.confidence < 1 && (
                        <span className={cn("px-1 rounded text-[9px] font-semibold", it.confidence >= 0.8 ? "bg-[#E1F5EE] text-[#1D9E75]" : "bg-[#FAEEDA] text-[#C28A2B]")}>
                          {Math.round(it.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">{formatSEK(it.amount)}</div>
                    {it.link && (
                      <Link to={it.link} className="text-[10px] text-[#1E3A5F] hover:underline inline-flex items-center gap-0.5">
                        Öppna <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
