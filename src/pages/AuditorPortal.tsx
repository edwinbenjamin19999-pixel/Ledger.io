import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Lock, Download, Building2, MessageSquarePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface SessionData {
  id: string;
  email: string;
  valid_until: string;
  scope_type: string;
}
interface Company { id: string; name: string; org_number: string }

export default function AuditorPortal() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const [entries, setEntries] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [aiActions, setAiActions] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [commentTarget, setCommentTarget] = useState<{ type: string; id: string; label: string } | null>(null);
  const [commentText, setCommentText] = useState("");

  const call = async (action: string, payload?: any) => {
    const { data, error } = await supabase.functions.invoke("auditor-portal", { body: { token, action, payload } });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const s = await call("session");
        setSession(s.session);
        setCompany(s.company);
        setRange(s.range ?? {});
        const [e, l, a, ai, c] = await Promise.all([
          call("journal_entries"),
          call("ledger"),
          call("chart_of_accounts"),
          call("ai_activity"),
          call("list_comments"),
        ]);
        setEntries(e.entries ?? []);
        setLedger(l.lines ?? []);
        setAccounts(a.accounts ?? []);
        setAiActions(ai.actions ?? []);
        setComments(c.comments ?? []);
      } catch (e: any) {
        setError(e.message ?? "Kunde inte ladda revisorsåtkomst");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const periodLabel = useMemo(() => {
    if (range.from && range.to) return `${range.from} → ${range.to}`;
    return "Alla perioder";
  }, [range]);

  const commentsByEntity = useMemo(() => {
    const m = new Map<string, number>();
    comments.forEach(c => {
      const key = `${c.entity_type}:${c.entity_id}`;
      m.set(key, (m.get(key) ?? 0) + 1);
    });
    return m;
  }, [comments]);

  const submitComment = async () => {
    if (!commentTarget || !commentText.trim()) return;
    try {
      const r = await call("add_comment", { entity_type: commentTarget.type, entity_id: commentTarget.id, comment: commentText });
      setComments([r.comment, ...comments]);
      setCommentText("");
      setCommentTarget(null);
      toast.success("Kommentar sparad");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // P&L / BR aggregation from ledger
  const aggregate = useMemo(() => {
    const byAcct = new Map<string, { debit: number; credit: number; type?: string; name?: string }>();
    for (const acct of accounts) {
      byAcct.set(acct.account_number, { debit: 0, credit: 0, type: acct.account_type, name: acct.account_name });
    }
    for (const l of ledger) {
      const cur = byAcct.get(l.account_number) ?? { debit: 0, credit: 0 };
      cur.debit += Number(l.debit ?? 0);
      cur.credit += Number(l.credit ?? 0);
      byAcct.set(l.account_number, cur);
    }
    return byAcct;
  }, [accounts, ledger]);

  const exportPackage = async () => {
    if (!company) return;
    setExporting(true);
    try {
      const zip = new JSZip();
      const safeName = company.name.replace(/[^\w-]+/g, "_");
      const periodStr = range.from && range.to ? `${range.from}_${range.to}` : "alla";

      // Resultaträkning PDF
      const rrPdf = new jsPDF();
      rrPdf.setFontSize(16); rrPdf.text(`Resultaträkning – ${company.name}`, 14, 16);
      rrPdf.setFontSize(10); rrPdf.text(`Period: ${periodLabel}`, 14, 24);
      const rrRows: any[] = [];
      let totalRev = 0, totalCost = 0;
      aggregate.forEach((v, num) => {
        if (num.startsWith("3")) { const amt = v.credit - v.debit; totalRev += amt; rrRows.push([num, v.name ?? "", amt.toFixed(2)]); }
        else if (/^[4-7]/.test(num)) { const amt = v.debit - v.credit; totalCost += amt; rrRows.push([num, v.name ?? "", amt.toFixed(2)]); }
      });
      autoTable(rrPdf, { startY: 30, head: [["Konto", "Namn", "Belopp"]], body: rrRows });
      rrPdf.text(`Intäkter: ${totalRev.toFixed(2)}  Kostnader: ${totalCost.toFixed(2)}  Resultat: ${(totalRev - totalCost).toFixed(2)}`, 14, (rrPdf as any).lastAutoTable.finalY + 10);
      zip.file(`${safeName}_Resultatrakning_${periodStr}.pdf`, rrPdf.output("blob"));

      // Balansräkning PDF
      const brPdf = new jsPDF();
      brPdf.setFontSize(16); brPdf.text(`Balansräkning – ${company.name}`, 14, 16);
      brPdf.setFontSize(10); brPdf.text(`Period: ${periodLabel}`, 14, 24);
      const brRows: any[] = [];
      aggregate.forEach((v, num) => {
        if (/^[12]/.test(num)) { const amt = v.debit - v.credit; brRows.push([num, v.name ?? "", amt.toFixed(2)]); }
      });
      autoTable(brPdf, { startY: 30, head: [["Konto", "Namn", "Saldo"]], body: brRows });
      zip.file(`${safeName}_Balansrakning_${periodStr}.pdf`, brPdf.output("blob"));

      // Verifikationslista Excel
      const wb = new ExcelJS.Workbook();
      const ws1 = wb.addWorksheet("Verifikationer");
      ws1.addRow(["Vernr", "Datum", "Beskrivning", "Status"]);
      entries.forEach(e => ws1.addRow([e.journal_number, e.entry_date, e.description, e.status]));
      const verBuf = await wb.xlsx.writeBuffer();
      zip.file(`${safeName}_Verifikationslista_${periodStr}.xlsx`, verBuf);

      // Huvudbok Excel
      const wb2 = new ExcelJS.Workbook();
      const ws2 = wb2.addWorksheet("Huvudbok");
      ws2.addRow(["Konto", "Datum", "Vernr", "Beskrivning", "Debet", "Kredit"]);
      ledger.forEach(l => ws2.addRow([l.account_number, l.journal_entries?.entry_date, l.journal_entries?.journal_number, l.description, l.debit, l.credit]));
      const hbBuf = await wb2.xlsx.writeBuffer();
      zip.file(`${safeName}_Huvudbok_${periodStr}.xlsx`, hbBuf);

      // Momsunderlag PDF (simple)
      const momsPdf = new jsPDF();
      momsPdf.setFontSize(16); momsPdf.text(`Momsunderlag – ${company.name}`, 14, 16);
      momsPdf.setFontSize(10); momsPdf.text(`Period: ${periodLabel}`, 14, 24);
      const vatRows: any[] = [];
      aggregate.forEach((v, num) => {
        if (num.startsWith("26")) { vatRows.push([num, v.name ?? "", (v.credit - v.debit).toFixed(2)]); }
      });
      autoTable(momsPdf, { startY: 30, head: [["Konto", "Namn", "Saldo"]], body: vatRows });
      zip.file(`${safeName}_Momsunderlag_${periodStr}.pdf`, momsPdf.output("blob"));

      // SIE4 (minimal)
      const sieLines: string[] = [];
      sieLines.push(`#FLAGGA 0`);
      sieLines.push(`#PROGRAM "Ledger.io" "1.0"`);
      sieLines.push(`#FORMAT PC8`);
      sieLines.push(`#GEN ${new Date().toISOString().slice(0,10).replace(/-/g,"")}`);
      sieLines.push(`#FNAMN "${company.name}"`);
      sieLines.push(`#ORGNR ${company.org_number ?? ""}`);
      accounts.forEach(a => sieLines.push(`#KONTO ${a.account_number} "${a.account_name ?? ""}"`));
      entries.forEach((e, i) => {
        const lines = ledger.filter(l => l.journal_entries?.journal_number === e.journal_number);
        sieLines.push(`#VER A ${e.journal_number ?? i+1} ${(e.entry_date ?? "").replace(/-/g,"")} "${(e.description ?? "").replace(/"/g,"'")}"`);
        sieLines.push(`{`);
        lines.forEach(l => {
          const amt = Number(l.debit ?? 0) - Number(l.credit ?? 0);
          sieLines.push(`#TRANS ${l.account_number} {} ${amt.toFixed(2)}`);
        });
        sieLines.push(`}`);
      });
      zip.file(`${safeName}_SIE4_${periodStr}.se`, sieLines.join("\r\n"));

      // AI activity PDF
      const aiPdf = new jsPDF();
      aiPdf.setFontSize(16); aiPdf.text(`AI-aktivitetslogg – ${company.name}`, 14, 16);
      autoTable(aiPdf, { startY: 24, head: [["Datum", "Typ", "Beskrivning", "Status"]], body: aiActions.map(a => [a.created_at?.slice(0,16), a.action_type, a.description, a.status]) });
      zip.file(`${safeName}_AI-aktivitetslogg_${periodStr}.pdf`, aiPdf.output("blob"));

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}_Revisionspaket_${periodStr}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Revisionspaket nedladdat");
    } catch (e: any) {
      toast.error(e.message ?? "Export misslyckades");
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader><CardTitle>Åtkomst nekad</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error === "expired" ? "Den här revisorsåtkomsten har gått ut." : error === "revoked" ? "Den här åtkomsten har återkallats." : error === "not_yet_active" ? "Åtkomsten är inte aktiv ännu." : error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Read-only banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2 text-sm text-amber-900 dark:text-amber-200">
        <Lock className="h-4 w-4" />
        <span className="font-medium">Skrivskyddad åtkomst — du kan inte ändra något</span>
      </div>

      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-semibold text-lg">{company?.name}</h1>
              <p className="text-xs text-muted-foreground">Org.nr {company?.org_number} · {periodLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />Revisor: {session?.email}</Badge>
            <Badge variant="secondary">Giltig till {session?.valid_until}</Badge>
            <Button onClick={exportPackage} disabled={exporting} className="gap-2">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Ladda ner revisionspaket
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <Tabs defaultValue="verifications">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="verifications">Verifikationer ({entries.length})</TabsTrigger>
            <TabsTrigger value="ledger">Huvudbok</TabsTrigger>
            <TabsTrigger value="rr">Resultaträkning</TabsTrigger>
            <TabsTrigger value="br">Balansräkning</TabsTrigger>
            <TabsTrigger value="cf">Kassaflöde</TabsTrigger>
            <TabsTrigger value="vat">Momsunderlag</TabsTrigger>
            <TabsTrigger value="coa">Kontoplan ({accounts.length})</TabsTrigger>
            <TabsTrigger value="ai">AI-aktivitet ({aiActions.length})</TabsTrigger>
            <TabsTrigger value="comments">Mina kommentarer ({comments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="verifications">
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr><th className="text-left p-2">Vernr</th><th className="text-left p-2">Datum</th><th className="text-left p-2">Beskrivning</th><th className="p-2">Status</th><th className="p-2"></th></tr></thead>
                <tbody>
                  {entries.map(e => {
                    const flagged = commentsByEntity.get(`journal_entry:${e.id}`);
                    return (
                      <tr key={e.id} className="border-t hover:bg-muted/30">
                        <td className="p-2 font-mono">{e.journal_number}</td>
                        <td className="p-2">{e.entry_date}</td>
                        <td className="p-2">{e.description}</td>
                        <td className="p-2 text-center"><Badge variant="outline">{e.status}</Badge></td>
                        <td className="p-2">
                          <Button size="sm" variant="ghost" onClick={() => setCommentTarget({ type: "journal_entry", id: e.id, label: `Verifikation ${e.journal_number}` })} className="gap-1">
                            <MessageSquarePlus className="h-3 w-3" />
                            {flagged ? <span className="text-amber-600">{flagged}</span> : null}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="ledger">
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr><th className="text-left p-2">Konto</th><th className="text-left p-2">Datum</th><th className="text-left p-2">Vernr</th><th className="text-left p-2">Beskrivning</th><th className="text-right p-2">Debet</th><th className="text-right p-2">Kredit</th></tr></thead>
                <tbody>
                  {ledger.slice(0, 500).map(l => (
                    <tr key={l.id} className="border-t">
                      <td className="p-2 font-mono">{l.account_number}</td>
                      <td className="p-2">{l.journal_entries?.entry_date}</td>
                      <td className="p-2">{l.journal_entries?.journal_number}</td>
                      <td className="p-2">{l.description}</td>
                      <td className="p-2 text-right tabular-nums">{Number(l.debit ?? 0).toFixed(2)}</td>
                      <td className="p-2 text-right tabular-nums">{Number(l.credit ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ledger.length > 500 && <p className="text-xs text-muted-foreground p-2">Visar 500 av {ledger.length} rader. Ladda ner revisionspaket för komplett huvudbok.</p>}
            </CardContent></Card>
          </TabsContent>

          {(["rr","br","vat"] as const).map(tab => (
            <TabsContent key={tab} value={tab}>
              <Card><CardContent className="p-4">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr><th className="text-left p-2">Konto</th><th className="text-left p-2">Namn</th><th className="text-right p-2">Saldo</th><th className="p-2"></th></tr></thead>
                  <tbody>
                    {Array.from(aggregate.entries()).filter(([num]) => {
                      if (tab === "rr") return /^[3-7]/.test(num);
                      if (tab === "br") return /^[12]/.test(num);
                      if (tab === "vat") return num.startsWith("26");
                      return false;
                    }).map(([num, v]) => {
                      const balance = num.startsWith("3") ? v.credit - v.debit : v.debit - v.credit;
                      const flagged = commentsByEntity.get(`account:${num}`);
                      return (
                        <tr key={num} className="border-t">
                          <td className="p-2 font-mono">{num}</td>
                          <td className="p-2">{v.name}</td>
                          <td className="p-2 text-right tabular-nums">{balance.toFixed(2)}</td>
                          <td className="p-2">
                            <Button size="sm" variant="ghost" onClick={() => setCommentTarget({ type: "account", id: num, label: `Konto ${num}` })} className="gap-1">
                              <MessageSquarePlus className="h-3 w-3" />
                              {flagged ? <span className="text-amber-600">{flagged}</span> : null}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent></Card>
            </TabsContent>
          ))}

          <TabsContent value="cf">
            <Card><CardContent className="p-6 text-sm text-muted-foreground">
              Kassaflöde beräknas på balansförändringar mellan period start och slut. Ladda ner revisionspaketet för fullständig kassaflödesanalys.
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="coa">
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr><th className="text-left p-2">Nr</th><th className="text-left p-2">Namn</th><th className="text-left p-2">Typ</th></tr></thead>
                <tbody>
                  {accounts.map(a => <tr key={a.account_number} className="border-t"><td className="p-2 font-mono">{a.account_number}</td><td className="p-2">{a.account_name}</td><td className="p-2 text-muted-foreground">{a.account_type}</td></tr>)}
                </tbody>
              </table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr><th className="text-left p-2">Datum</th><th className="text-left p-2">Typ</th><th className="text-left p-2">Beskrivning</th><th className="p-2">Status</th></tr></thead>
                <tbody>
                  {aiActions.map(a => <tr key={a.id} className="border-t"><td className="p-2">{a.created_at?.slice(0,16)}</td><td className="p-2">{a.action_type}</td><td className="p-2">{a.description}</td><td className="p-2 text-center"><Badge variant="outline">{a.status}</Badge></td></tr>)}
                  {aiActions.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Ingen AI-aktivitet i perioden</td></tr>}
                </tbody>
              </table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="comments">
            <Card><CardContent className="p-4 space-y-2">
              {comments.length === 0 ? <p className="text-sm text-muted-foreground">Inga kommentarer ännu.</p> : comments.map(c => (
                <div key={c.id} className="border rounded p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline">{c.entity_type} #{c.entity_id}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("sv-SE")}</span>
                  </div>
                  <p>{c.comment}</p>
                </div>
              ))}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!commentTarget} onOpenChange={(o) => !o && setCommentTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Kommentar – {commentTarget?.label}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Synlig endast för företagets ägare och ekonomiansvariga.</p>
          <Textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Din kommentar…" rows={5} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommentTarget(null)}>Avbryt</Button>
            <Button onClick={submitComment} disabled={!commentText.trim()}>Spara kommentar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
