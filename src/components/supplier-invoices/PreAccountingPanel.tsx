import { useEffect, useRef, useState } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { APInvoice } from "@/hooks/useAPInvoices";
import { useInvoicePreAccounting } from "@/hooks/useInvoicePreAccounting";
import { useInvoiceWorkflow } from "@/hooks/useInvoiceWorkflow";

interface Props {
  invoice: APInvoice;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

export function PreAccountingPanel({ invoice }: Props) {
  const { data: pre, isLoading } = useInvoicePreAccounting(invoice.id);
  const wf = useInvoiceWorkflow(invoice.company_id);

  const [account, setAccount] = useState("");
  const [vatCode, setVatCode] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [project, setProject] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // Sync form with fetched data
  useEffect(() => {
    if (pre) {
      setAccount(pre.account ?? "");
      setVatCode(pre.vat_code ?? "");
      setCostCenter(pre.cost_center ?? "");
      setProject(pre.project_code ?? "");
    }
  }, [pre?.id]);

  const debounceRef = useRef<number | null>(null);
  const queueSave = (next: Partial<{ account: string; vat_code: string; cost_center: string; project_code: string }>) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      wf.savePreAccounting.mutate({
        invoice_id: invoice.id,
        company_id: invoice.company_id,
        account: next.account ?? account,
        vat_code: next.vat_code ?? vatCode,
        cost_center: next.cost_center ?? costCenter,
        project_code: next.project_code ?? project,
        periodization_plan: pre?.periodization_plan ?? null,
      });
    }, 800);
  };

  const isAI = pre?.source === "ai" || pre?.source === "history";
  const conf = pre?.confidence != null ? Math.round(pre.confidence * 100) : null;

  if (isLoading) {
    return <div className="rounded-2xl border border-[#E2E8F0] p-4 text-sm text-[#475569]">Laddar förkontering…</div>;
  }

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[#0C447C]" />
        <span className="text-sm font-semibold text-[#0F172A]">Förkontering</span>
        {isAI && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#E6F4FA] text-[#0C447C] border border-[#C8DDF5] font-bold">
            AI-förslag {conf !== null ? `${conf}%` : ""}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PreField
          label="Konto"
          value={account}
          onChange={(v) => { setAccount(v); queueSave({ account: v }); }}
        />
        <PreField
          label="Momskod"
          value={vatCode}
          onChange={(v) => { setVatCode(v); queueSave({ vat_code: v }); }}
        />
        <PreField
          label="Kostnadsställe"
          value={costCenter}
          onChange={(v) => { setCostCenter(v); queueSave({ cost_center: v }); }}
        />
        <PreField
          label="Projekt"
          value={project}
          onChange={(v) => { setProject(v); queueSave({ project_code: v }); }}
        />
      </div>

      {pre?.periodization_plan?.months && pre.periodization_plan.months.length > 0 && (
        <Collapsible open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs font-semibold text-[#0C447C] hover:underline">
            {scheduleOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Periodisering · {pre.periodization_plan.months.length} månader
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="rounded-lg border border-[#E2E8F0] overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-[#F8FAFB] text-[10px] uppercase tracking-wide text-[#475569]">
                  <tr>
                    <th className="text-left px-2 py-1.5">Månad</th>
                    <th className="text-right px-2 py-1.5">Belopp</th>
                  </tr>
                </thead>
                <tbody>
                  {pre.periodization_plan.months.map((m) => (
                    <tr key={m.month} className="border-t border-[#E2E8F0]">
                      <td className="px-2 py-1">{m.month}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{fmt(m.amount)} kr</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {pre && (
        <div className="flex items-center gap-1.5 text-[11px] text-[#085041]">
          <CheckCircle2 className="h-3 w-3" />
          Sparas automatiskt vid ändring
        </div>
      )}
      {!pre && (
        <div className="text-[11px] text-[#475569]">
          Ingen förkontering ännu — AI fyller i automatiskt när fakturan analyseras.
        </div>
      )}
    </div>
  );
}

function PreField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wide text-[#475569]">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-xs" />
    </div>
  );
}
