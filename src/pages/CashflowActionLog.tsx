import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, History } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface LogRow {
  id: string;
  action_type: string;
  status: string;
  payload: any;
  error_message: string | null;
  created_at: string;
  reversible_until: string | null;
}

const statusColor: Record<string, string> = {
  completed: "bg-[#E1F5EE] text-[#085041]",
  failed: "bg-[#FCE8E8] text-[#7A1A1A]",
  pending: "bg-[#FAEEDA] text-[#7A5417]",
};

export default function CashflowActionLog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("system_action_log")
      .select("id, action_type, status, payload, error_message, created_at, reversible_until")
      .like("action_type", "cashflow.%")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setRows((data || []) as any);
        setLoading(false);
      });
  }, [user]);

  return (
    <main className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/cashflow")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Tillbaka
        </Button>
        <History className="w-4 h-4 text-primary ml-2" />
        <h1 className="text-lg font-bold">Action log</h1>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-2">Tid</th>
              <th className="text-left p-2">Åtgärd</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Detaljer</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Laddar…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Inga loggade åtgärder ännu</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-2 font-mono text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("sv-SE")}
                  </td>
                  <td className="p-2 font-medium">{r.action_type.replace("cashflow.", "")}</td>
                  <td className="p-2">
                    <Badge className={`text-[10px] ${statusColor[r.status] ?? ""}`}>{r.status}</Badge>
                  </td>
                  <td className="p-2 text-muted-foreground truncate max-w-xs">
                    {r.error_message ?? JSON.stringify(r.payload).slice(0, 80)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
