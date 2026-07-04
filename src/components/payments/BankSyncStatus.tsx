import { useState } from "react";
import { differenceInMinutes, format } from "date-fns";
import { sv } from "date-fns/locale";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Account { name: string; bank: string; balance: number; last_synced: string | null }

interface Props {
  accounts: Account[];
  onOpenSync?: () => void;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

export function BankSyncStatus({ accounts, onOpenSync }: Props) {
  const [open, setOpen] = useState(false);

  if (!accounts || accounts.length === 0) {
    return (
      <button
        type="button"
        onClick={onOpenSync}
        className="inline-flex items-center gap-1.5 text-[11px] text-[#7A1A1A] hover:underline"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Anslut bank
      </button>
    );
  }

  const latest = accounts
    .map(a => (a.last_synced ? new Date(a.last_synced).getTime() : 0))
    .reduce((m, t) => (t > m ? t : m), 0);
  const mins = latest ? differenceInMinutes(new Date(), new Date(latest)) : Infinity;
  const tone = mins < 30 ? "emerald" : mins < 120 ? "amber" : "rose";
  const label =
    mins === Infinity ? "Aldrig synkat" :
    mins < 1 ? "Synkat nu" :
    mins < 60 ? `Synkat ${mins} min sedan` :
    mins < 1440 ? `Synkat ${Math.round(mins / 60)} h sedan` :
    `Synkat ${Math.round(mins / 1440)} d sedan`;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 text-[11px] hover:underline",
            tone === "emerald" && "text-[#085041]",
            tone === "amber" && "text-[#7A5417]",
            tone === "rose" && "text-[#7A1A1A]",
          )}
        >
          <span className={cn(
            "h-1.5 w-1.5 rounded-full",
            tone === "emerald" && "bg-emerald-500",
            tone === "amber" && "bg-amber-500",
            tone === "rose" && "bg-rose-500",
          )} />
          {label} · {accounts.length} konto{accounts.length !== 1 ? "n" : ""}
        </button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Banksynkronisering</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {accounts.map((a, i) => (
            <div key={i} className="rounded-lg border border-slate-100 p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-slate-500">{a.bank}</p>
                </div>
                <p className="font-mono text-sm tabular-nums">{fmt(a.balance)} kr</p>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {a.last_synced
                  ? `Senast synkat ${format(new Date(a.last_synced), "d MMM HH:mm", { locale: sv })}`
                  : <span className="text-[#7A1A1A] inline-flex items-center gap-1"><AlertCircle className="h-3 w-3" />Inte synkat</span>}
              </p>
            </div>
          ))}
          <Button
            className="w-full gap-2"
            variant="outline"
            onClick={() => { onOpenSync?.(); setOpen(false); }}
          >
            <RefreshCw className="h-4 w-4" />
            Synka nu
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
