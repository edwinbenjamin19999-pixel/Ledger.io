import { useState } from "react";
import { Mail, RefreshCw, Copy, Check, AlertTriangle, CheckCircle2, Inbox, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIncomingEmailsAdmin } from "@/hooks/useIncomingEmailsAdmin";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { supabase } from "@/integrations/supabase/client";

const statusBadge = (status: string | null) => {
  switch (status) {
    case "processed":
      return <Badge className="bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]"><CheckCircle2 className="h-3 w-3 mr-1" />Bokfört</Badge>;
    case "error":
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><AlertTriangle className="h-3 w-3 mr-1" />Fel</Badge>;
    case "new":
    default:
      return <Badge variant="outline">Mottaget</Badge>;
  }
};

const EmailInboxDiagnostics = () => {
  const { isPlatformAdmin, loading: roleLoading } = usePlatformAdmin();
  const { rows, companies, loading, error, reload } = useIncomingEmailsAdmin();
  const [copied, setCopied] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(txt);
    toast.success("Kopierad");
    setTimeout(() => setCopied(null), 1500);
  };

  const sendTest = async (company: { id: string; email_inbox_address: string | null; name: string }) => {
    if (!company.email_inbox_address) {
      toast.error("Bolaget saknar inbox-adress");
      return;
    }
    setTesting(company.id);
    try {
      const { error } = await supabase.functions.invoke("process-email-inbox", {
        body: {
          to: company.email_inbox_address,
          from: "diagnostics@bokfy.se",
          from_name: "Bokfy Diagnostics",
          subject: `Testmejl ${new Date().toISOString()}`,
          text: "Detta är ett testmejl från diagnos-vyn.",
          attachments: [],
        },
      });
      if (error) throw error;
      toast.success(`Testmejl skickat till ${company.name}`);
      setTimeout(reload, 1000);
    } catch (e: any) {
      toast.error(e?.message ?? "Test misslyckades");
    } finally {
      setTesting(null);
    }
  };

  if (roleLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Kontrollerar behörighet…</div>;
  }
  if (!isPlatformAdmin) {
    return (
      <div className="p-8 max-w-md mx-auto mt-20 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
        <h1 className="text-xl font-semibold mb-2">Endast plattformsadministratörer</h1>
        <p className="text-sm text-muted-foreground">Denna sida är begränsad.</p>
      </div>
    );
  }

  const sendgridStats = {
    total: rows.length,
    processed: rows.filter((r) => r.status === "processed").length,
    errors: rows.filter((r) => r.status === "error").length,
    new: rows.filter((r) => r.status === "new" || !r.status).length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            E-postinkorg — diagnos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live-status för SendGrid Inbound Parse → <code className="text-xs">process-email-inbox</code>
          </p>
        </div>
        <Button variant="outline" onClick={reload} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span className="ml-2">Uppdatera</span>
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Totalt (50 senaste)</p><p className="text-2xl font-semibold mt-1">{sendgridStats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Bokförda</p><p className="text-2xl font-semibold mt-1 text-[#085041]">{sendgridStats.processed}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Fel</p><p className="text-2xl font-semibold mt-1 text-destructive">{sendgridStats.errors}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Nya / ej processade</p><p className="text-2xl font-semibold mt-1">{sendgridStats.new}</p></CardContent></Card>
      </div>

      {/* SendGrid config reminder */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">SendGrid Inbound Parse — exakt config</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Receiving Domain:</strong> <code>inbox.bokfy.se</code></p>
          <p className="break-all"><strong>Destination URL:</strong> <code>https://gvlzltcwdsglmkiijlie.supabase.co/functions/v1/process-email-inbox</code></p>
          <p><strong>POST raw, full MIME message:</strong> OFF</p>
          <p><strong>Check incoming emails for spam:</strong> ON</p>
          <p className="text-xs text-muted-foreground pt-2">
            Om listan nedan är tom efter ett mejl: SendGrid POSTar aldrig hit. Kolla Activity Feed i SendGrid-dashboard.
          </p>
        </CardContent>
      </Card>

      {/* Inbox addresses per company */}
      <Card>
        <CardHeader><CardTitle className="text-base">Inbox-adresser per bolag ({companies.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-72">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bolag</TableHead>
                  <TableHead>Org.nr</TableHead>
                  <TableHead>Inbox-adress</TableHead>
                  <TableHead className="text-right">Åtgärd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.org_number ?? "—"}</TableCell>
                    <TableCell><code className="text-xs">{c.email_inbox_address ?? "—"}</code></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {c.email_inbox_address && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => copy(c.email_inbox_address!)}>
                              {copied === c.email_inbox_address ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                            <Button variant="outline" size="sm" disabled={testing === c.id} onClick={() => sendTest(c)}>
                              <Send className="h-3 w-3" />
                              <span className="ml-1 text-xs">{testing === c.id ? "Skickar…" : "Test"}</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Incoming emails log */}
      <Card>
        <CardHeader><CardTitle className="text-base">Senaste 50 inkommande mejl (alla bolag)</CardTitle></CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-12 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm font-medium">Inga inkommande mejl loggade</p>
              <p className="text-xs text-muted-foreground mt-1">SendGrid har inte POSTat något till webhooken.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tid</TableHead>
                  <TableHead>Till</TableHead>
                  <TableHead>Från</TableHead>
                  <TableHead>Ämne</TableHead>
                  <TableHead>Bilagor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: sv })}
                    </TableCell>
                    <TableCell className="text-xs"><code>{r.to_email ?? "—"}</code></TableCell>
                    <TableCell className="text-xs">{r.from_name || r.from_email || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[280px] truncate">{r.subject ?? "(utan ämne)"}</TableCell>
                    <TableCell className="text-xs">{Array.isArray(r.attachments) ? r.attachments.length : 0}</TableCell>
                    <TableCell>
                      {statusBadge(r.status)}
                      {r.error_message && <p className="text-xs text-destructive mt-1 max-w-[240px] truncate">{r.error_message}</p>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailInboxDiagnostics;
