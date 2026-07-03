import { useEffect, useState } from "react";
import { Mail, CheckCircle2, AlertTriangle, Inbox, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

interface IncomingEmailRow {
  id: string;
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  attachments: Array<{ filename?: string }> | null;
  status: string | null;
  document_ids: string[] | null;
  error_message: string | null;
  created_at: string;
}

interface Props { companyId: string | null }

const statusMeta: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  new: { label: "Mottaget", icon: CheckCircle2, className: "bg-primary/10 text-primary border-primary/20" },
  processed: { label: "Bokfört", icon: CheckCircle2, className: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]" },
  error: { label: "Misslyckades", icon: AlertTriangle, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export const EmailInboxLog = ({ companyId }: Props) => {
  const [rows, setRows] = useState<IncomingEmailRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("incoming_emails")
        .select("id, from_email, from_name, subject, attachments, status, document_ids, error_message, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (mounted) {
        setRows((data as unknown as IncomingEmailRow[]) || []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [companyId]);

  if (loading) {
    return <div className="text-sm text-muted-foreground p-6">Laddar…</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
        <Inbox className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">Inga inkommande mejl ännu</p>
        <p className="text-xs text-muted-foreground mt-1">När du mailar underlag dyker de upp här.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="divide-y divide-border">
        {rows.map((r) => {
          const meta = statusMeta[r.status || "new"] || statusMeta.new;
          const Icon = meta.icon;
          const attCount = Array.isArray(r.attachments) ? r.attachments.length : 0;
          return (
            <div key={r.id} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">
                      {r.subject || "(utan ämne)"}
                    </p>
                    <Badge variant="outline" className={meta.className}>
                      <Icon className="h-3 w-3 mr-1" />
                      {meta.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    Från {r.from_name || r.from_email || "okänd"}
                    {attCount > 0 && (
                      <span className="inline-flex items-center gap-1 ml-2">
                        <Paperclip className="h-3 w-3" />
                        {attCount}
                      </span>
                    )}
                    {" · "}
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: sv })}
                  </p>
                  {r.error_message && (
                    <p className="text-xs text-destructive mt-1">{r.error_message}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
