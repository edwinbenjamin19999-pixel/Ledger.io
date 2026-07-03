import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Banknote, Bell, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Obligation = {
  id: string;
  payment_type: "vat" | "f_tax" | "employer_tax" | "employee_tax";
  period: string;
  amount: number;
  due_date: string;
  status: string;
  ocr_reference: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  vat: "Moms",
  f_tax: "F-skatt",
  employer_tax: "Arbetsgivaravgifter",
  employee_tax: "Personalskatt",
};

function fmtSEK(n: number) {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";
}

function daysUntil(d: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(d + "T00:00:00");
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export function SKVUpcomingPayments({ companyId }: { companyId: string | null | undefined }) {
  const [items, setItems] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!companyId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const horizon = new Date(today.getTime() + 30 * 86_400_000);
    const { data, error } = await supabase
      .from("skv_payment_obligations")
      .select("id, payment_type, period, amount, due_date, status, ocr_reference")
      .eq("company_id", companyId)
      .lte("due_date", horizon.toISOString().slice(0, 10))
      .neq("status", "paid")
      .order("due_date", { ascending: true });
    if (error) console.error(error);
    setItems((data as Obligation[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [companyId]);

  async function handlePayNow(o: Obligation) {
    if (!confirm(`Markera ${TYPE_LABEL[o.payment_type]} ${o.period} (${fmtSEK(o.amount)}) som betald?\n\nGå till respektive modul (moms/agi/skatteagent) för full bokföring av betalningen.`)) return;
    try {
      const { error } = await supabase
        .from("skv_payment_obligations")
        .update({ status: "paid" })
        .eq("id", o.id);
      if (error) throw error;
      toast.success("Markerad som betald");
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Kunde inte markera som betald");
    }
  }

  return (
    <Card className="border-cyan-200/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-[#3b82f6]" />
          Kommande SKV-betalningar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Laddar…
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3 text-center">
            Inga SKV-betalningar inom 30 dagar
          </p>
        ) : items.map((o) => {
          const days = daysUntil(o.due_date);
          const colorClass =
            days <= 3 ? "text-[#7A1A1A] border-[#F4C8C8] bg-[#FCE8E8]"
              : days <= 10 ? "text-[#7A5417] border-[#F0DDB7] bg-[#FAEEDA]"
              : "text-slate-700 border-slate-200 bg-slate-50";
          return (
            <div key={o.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{TYPE_LABEL[o.payment_type]}</Badge>
                  <span className="text-sm font-medium">{o.period}</span>
                  <Badge variant="outline" className={cn("text-xs", colorClass)}>
                    {days < 0 ? `Försenad ${Math.abs(days)}d` : days === 0 ? "Idag" : `Om ${days} dagar`}
                  </Badge>
                  {o.status === "scheduled" && (
                    <Badge className="bg-[#3b82f6] text-xs">AI betalar automatiskt</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Förfaller {o.due_date} · <span className="font-mono tabular-nums">{fmtSEK(Number(o.amount))}</span>
                </div>
              </div>
              <Button size="sm" onClick={() => handlePayNow(o)} className="bg-[#3b82f6] hover:bg-[#3b82f6]">
                <Banknote className="h-3.5 w-3.5 mr-1" /> Betala nu
              </Button>
            </div>
          );
        })}
        {!loading && items.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-[#085041] pt-2">
            <CheckCircle2 className="h-3.5 w-3.5" /> Betalda obligationer visas inte
          </div>
        )}
      </CardContent>
    </Card>
  );
}
