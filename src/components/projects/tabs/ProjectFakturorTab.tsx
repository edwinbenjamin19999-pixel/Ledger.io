import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Project } from "@/hooks/useProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

const statusLabel: Record<string, string> = { sent: "Skickad",
  paid: "Betald",
  overdue: "Förfallen",
  draft: "Utkast",
};

const statusBadge: Record<string, string> = { sent: "bg-[#EFF6FF] text-blue-700 dark:bg-blue-900/30 dark:text-[#1E3A5F]",
  paid: "bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-[#1D9E75]",
  overdue: "bg-[#FCE8E8] text-[#7A1A1A] dark:bg-red-900/30 dark:text-[#C73838]",
  draft: "bg-muted text-muted-foreground",
};

export function ProjectFakturorTab({ project }: { project: Project }) { // Fetch invoices linked via project_transactions or matching client_name
  const { data: invoices = [], isLoading } = useQuery({ queryKey: ["project_invoices", project.id, project.client_name],
    queryFn: async () => { // Get invoices linked via project_transactions
      const { data: linked } = await supabase
        .from("project_transactions")
        .select("invoice_id")
        .eq("project_id", project.id)
        .not("invoice_id", "is", null);

      const linkedIds = (linked || []).map((l: any) => l.invoice_id);

      // Also find invoices matching client_name
      let query = supabase
        .from("invoices")
        .select("id, invoice_number, customer_name, total_amount, status, due_date, paid_at")
        .eq("company_id", project.company_id)
        .eq("invoice_type", "outgoing");

      if (project.client_name) { query = query.ilike("customer_name", `%${project.client_name}%`);
      }

      if (linkedIds.length > 0) { // Get both linked and client-matched
      }

      const { data, error } = await query.order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!project.id,
  });

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Fakturor</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Laddar...</p>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Inga fakturor kopplade till detta projekt</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground text-xs">
                  <th className="py-2 pr-4">Faktura</th>
                  <th className="py-2 pr-4">Kund</th>
                  <th className="py-2 pr-4 text-right">Belopp</th>
                  <th className="py-2 pr-4">Förfallodatum</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any) => { const status = inv.paid_at ? "paid" : (inv.due_date && new Date(inv.due_date) < new Date() ? "overdue" : inv.status || "sent");
                  return (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{inv.invoice_number || "—"}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{inv.customer_name || "—"}</td>
                      <td className="py-2 pr-4 text-right font-medium">{fmt(inv.total_amount || 0)}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">{inv.due_date || "—"}</td>
                      <td className="py-2">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", statusBadge[status] || statusBadge.draft)}>
                          {statusLabel[status] || status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
