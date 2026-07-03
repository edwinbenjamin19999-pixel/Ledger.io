import { useMemo, useState } from "react";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, Send, Download, Eye, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ReportRow {
  companyId: string;
  companyName: string;
  enabled: boolean;
  sendDay: number;
  status: "idle" | "generating" | "review" | "sent" | "error";
  lastSent?: string;
  recipient?: string;
}

interface SentRow {
  id: string;
  companyName: string;
  period: string;
  sentAt: string;
  recipient: string;
  status: "delivered" | "opened" | "bounced";
}

export default function AdvisorReports() {
  const { clients } = useAdvisorContext();
  const [rows, setRows] = useState<ReportRow[]>(() =>
    clients.map((c) => ({
      companyId: c.id,
      companyName: c.name,
      enabled: true,
      sendDay: 2,
      status: "idle" as const,
    }))
  );
  const [sent] = useState<SentRow[]>([]);
  const [generating, setGenerating] = useState(false);
  const [previewClient, setPreviewClient] = useState<ReportRow | null>(null);

  // Refresh rows when clients load late
  useMemo(() => {
    if (rows.length === 0 && clients.length > 0) {
      setRows(clients.map((c) => ({
        companyId: c.id, companyName: c.name, enabled: true, sendDay: 2, status: "idle" as const,
      })));
    }
  }, [clients.length]);

  const generateAll = async () => {
    setGenerating(true);
    const enabled = rows.filter((r) => r.enabled);
    setRows((rs) => rs.map((r) => r.enabled ? { ...r, status: "generating" } : r));
    // Simulate staggered generation
    for (let i = 0; i < enabled.length; i++) {
      await new Promise((res) => setTimeout(res, 400));
      setRows((rs) => rs.map((r) => r.companyId === enabled[i].companyId ? { ...r, status: "review" } : r));
    }
    setGenerating(false);
    toast.success(`${enabled.length} rapporter klara för granskning`);
  };

  const approveAndSend = (row: ReportRow) => {
    setRows((rs) => rs.map((r) => r.companyId === row.companyId ? { ...r, status: "sent", lastSent: new Date().toISOString() } : r));
    toast.success(`Rapport skickad till ${row.companyName}`);
    setPreviewClient(null);
  };

  return (
    <div className="px-6 py-6 max-w-[1300px] mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-medium tracking-[-0.02em] text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5" /> Rapporter
          </h1>
          <p className="text-[12px] text-slate-500 mt-0.5">Generera och skicka månadsrapporter till klienter</p>
        </div>
        <Button onClick={generateAll} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
          Generera månadsrapporter
        </Button>
      </div>

      {/* CONFIGURATION + GENERATION TABLE */}
      <div className="bg-white border border-slate-200 rounded-[12px] overflow-hidden">
        <h3 className="text-[12px] font-medium uppercase tracking-wide text-slate-500 px-4 py-3 border-b border-slate-100">
          Konfiguration & status
        </h3>
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
            <tr>
              <th className="text-left px-4 py-2">Klient</th>
              <th className="text-left px-4 py-2">Aktiv</th>
              <th className="text-left px-4 py-2">Skickdatum</th>
              <th className="text-left px-4 py-2">Mottagare</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-right px-4 py-2">Åtgärd</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.companyId} className="border-t border-slate-100">
                <td className="px-4 py-2.5 font-medium">{r.companyName}</td>
                <td className="px-4 py-2.5">
                  <Switch
                    checked={r.enabled}
                    onCheckedChange={(v) => setRows((rs) => rs.map((x) => x.companyId === r.companyId ? { ...x, enabled: v } : x))}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <Input
                    type="number" min={1} max={10} className="h-7 w-16 text-[12px]"
                    value={r.sendDay}
                    onChange={(e) => setRows((rs) => rs.map((x) => x.companyId === r.companyId ? { ...x, sendDay: Number(e.target.value) || 2 } : x))}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <Input
                    type="email" className="h-7 text-[12px]" placeholder="klient@bolag.se"
                    value={r.recipient ?? ""}
                    onChange={(e) => setRows((rs) => rs.map((x) => x.companyId === r.companyId ? { ...x, recipient: e.target.value } : x))}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-2.5 text-right">
                  {r.status === "review" && (
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setPreviewClient(r)}>
                      <Eye className="h-3 w-3 mr-1" /> Granska
                    </Button>
                  )}
                  {r.status === "sent" && r.lastSent && (
                    <span className="text-[11px] text-slate-500">Skickad {format(new Date(r.lastSent), "yyyy-MM-dd HH:mm")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PREVIEW PANEL */}
      {previewClient && (
        <div className="bg-white border border-slate-200 rounded-[12px] p-5 relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Förhandsgranskning · UTKAST</p>
              <h3 className="text-[18px] font-medium">{previewClient.companyName} — Månadsrapport</h3>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPreviewClient(null)}>Stäng</Button>
              <Button variant="outline">Skicka tillbaka</Button>
              <Button onClick={() => approveAndSend(previewClient)}>
                <Send className="h-4 w-4 mr-1.5" /> Godkänn och skicka
              </Button>
            </div>
          </div>
          <div className="space-y-3 text-[13px] text-slate-700 max-h-[420px] overflow-y-auto bg-slate-50 rounded-md p-4">
            <ReportPage title={`${previewClient.companyName}`} subtitle={`Månadsrapport — ${format(new Date(), "MMMM yyyy")}`} />
            <ReportPage title="Månadssammanfattning" subtitle="Resultatet för månaden ligger i linje med plan. Kassaposition är stabil." />
            <ReportPage title="Resultaträkning" subtitle="Intäkter, kostnader och resultat för perioden." />
            <ReportPage title="Kassaflöde" subtitle="Kassainflöde från drift och förväntade utbetalningar." />
            <ReportPage title="Nyckeltal vs branschsnitt" subtitle="Marginal, soliditet och likviditet jämfört med branschen." />
            <ReportPage title="Nästa månads åtgärder" subtitle="Moms-deadline 12:e samt rekommenderad fakturapåminnelse." />
          </div>
          <p className="text-[10px] text-slate-400 mt-3 text-center">
            Sammanställt med Ledger.io · Watermark "UTKAST" tas bort vid godkännande
          </p>
        </div>
      )}

      {/* SENT ARCHIVE */}
      <div className="bg-white border border-slate-200 rounded-[12px] overflow-hidden">
        <h3 className="text-[12px] font-medium uppercase tracking-wide text-slate-500 px-4 py-3 border-b border-slate-100">
          Skickade rapporter
        </h3>
        {sent.length === 0 ? (
          <p className="p-6 text-center text-[12px] text-slate-400">Inga skickade rapporter ännu.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-2">Klient</th>
                <th className="text-left px-4 py-2">Period</th>
                <th className="text-left px-4 py-2">Skickad</th>
                <th className="text-left px-4 py-2">Mottagare</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-right px-4 py-2">PDF</th>
              </tr>
            </thead>
            <tbody>
              {sent.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-2.5">{s.companyName}</td>
                  <td className="px-4 py-2.5">{s.period}</td>
                  <td className="px-4 py-2.5 text-slate-500">{s.sentAt}</td>
                  <td className="px-4 py-2.5 text-slate-500">{s.recipient}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={s.status === "opened" ? "review" : "sent"} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <a className="text-blue-600 inline-flex items-center text-[12px]"><Download className="h-3 w-3 mr-1" /> Hämta</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const StatusBadge = ({ status }: { status: ReportRow["status"] }) => {
  const map: Record<string, { label: string; cls: string }> = {
    idle: { label: "Vilande", cls: "bg-slate-100 text-slate-600" },
    generating: { label: "Genererar…", cls: "bg-blue-50 text-blue-700" },
    review: { label: "Inväntar granskning", cls: "bg-amber-50 text-amber-700" },
    sent: { label: "Skickad", cls: "bg-emerald-50 text-emerald-700" },
    error: { label: "Fel", cls: "bg-red-50 text-red-700" },
  };
  const m = map[status];
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${m.cls}`}>{m.label}</span>;
};

const ReportPage = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="bg-white border border-slate-200 rounded-md p-4">
    <p className="text-[14px] font-medium text-slate-900">{title}</p>
    <p className="text-[12px] text-slate-500 mt-0.5">{subtitle}</p>
  </div>
);
