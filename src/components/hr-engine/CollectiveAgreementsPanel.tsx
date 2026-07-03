import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props { companyId: string }

/**
 * Kollektivavtals-väljare: mallar + per-anställd koppling.
 * Mall-väljaren skapar en bolagsspecifik kopia som kan finjusteras.
 */
export function CollectiveAgreementsPanel({ companyId }: Props) {
  const qc = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const { data: templates } = useQuery({
    queryKey: ["agreement-templates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("collective_agreements")
        .select("*")
        .eq("is_template", true)
        .order("name");
      return data || [];
    },
  });

  const { data: companyAgreements } = useQuery({
    queryKey: ["company-agreements", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("collective_agreements")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_template", false);
      return data || [];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-with-agreements", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, first_name, last_name, collective_agreement_id")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("first_name");
      return data || [];
    },
  });

  const adoptTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const tmpl = templates?.find((t: any) => t.id === templateId);
      if (!tmpl) throw new Error("Mall hittades inte");
      const { error } = await supabase.from("collective_agreements").insert({
        company_id: companyId,
        is_template: false,
        template_key: tmpl.template_key,
        name: tmpl.name,
        description: tmpl.description,
        rules: tmpl.rules,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avtal aktiverat för bolaget");
      qc.invalidateQueries({ queryKey: ["company-agreements", companyId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const assignAgreement = useMutation({
    mutationFn: async ({ empId, agreementId }: { empId: string; agreementId: string | null }) => {
      const { error } = await supabase
        .from("employees")
        .update({ collective_agreement_id: agreementId })
        .eq("id", empId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees-with-agreements", companyId] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <ScrollText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Kollektivavtal — mallar</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Välj en mall för att aktivera regler för övertid, OB, semester och väntedagar. Mallarna kan finjusteras.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {(templates || []).map((t: any) => {
            const adopted = companyAgreements?.some((c: any) => c.template_key === t.template_key);
            const rules = t.rules as any;
            return (
              <div
                key={t.id}
                className={`p-3 rounded-lg border ${adopted ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </div>
                  {adopted ? (
                    <Badge className="bg-[#E1F5EE] text-[#085041] border-[#BFE6D6] text-[10px]">
                      <Check className="h-3 w-3 mr-0.5" /> Aktiv
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => adoptTemplate.mutate(t.id)}
                      disabled={adoptTemplate.isPending}
                      className="h-7 text-xs"
                    >
                      Aktivera
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                  {rules?.vacation_days && <Badge variant="secondary" className="text-[10px] h-4">{rules.vacation_days} sem.dagar</Badge>}
                  {rules?.overtime?.weekday_50 && <Badge variant="secondary" className="text-[10px] h-4">Övertid 50%</Badge>}
                  {rules?.ob?.evening_pct && <Badge variant="secondary" className="text-[10px] h-4">OB kväll {rules.ob.evening_pct}%</Badge>}
                  {rules?.sick_waiting_day && <Badge variant="secondary" className="text-[10px] h-4">Karensdag</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-3 text-sm">Koppla anställda till avtal</h3>
        <div className="space-y-1.5">
          {(employees || []).map((e: any) => (
            <div key={e.id} className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/50">
              <span className="text-sm">{e.first_name} {e.last_name}</span>
              <select
                value={e.collective_agreement_id || ""}
                onChange={(ev) =>
                  assignAgreement.mutate({
                    empId: e.id,
                    agreementId: ev.target.value || null,
                  })
                }
                className="text-xs rounded-md border border-input bg-background px-2 py-1 min-w-[200px]"
              >
                <option value="">— Inget avtal —</option>
                {(companyAgreements || []).map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          ))}
          {(!employees || employees.length === 0) && (
            <p className="text-sm text-muted-foreground italic">Inga aktiva anställda.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
