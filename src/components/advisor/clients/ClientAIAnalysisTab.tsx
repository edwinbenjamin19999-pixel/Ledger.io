import { useState } from "react";
import { Sparkles, Copy, RefreshCw, ChevronDown, ChevronRight, AlertTriangle, ArrowUp, ArrowDown, Minus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Section {
  key: string;
  title: string;
  body: string;
}

interface RiskRow {
  signal: string;
  current: string;
  threshold: string;
  trend: "up" | "down" | "flat";
  action: string;
  deeplink?: string;
}

interface Anomaly {
  date: string;
  description: string;
  amount: string;
  reason: string;
}

interface Props {
  clientName: string;
  generatedAt: string;
  sections: Section[];
  risks: RiskRow[];
  anomalies: Anomaly[];
  onRegenerate?: () => void;
}

export const ClientAIAnalysisTab = ({ clientName, generatedAt, sections, risks, anomalies, onRegenerate }: Props) => {
  const [open, setOpen] = useState<Record<string, boolean>>({ [sections[0]?.key]: true });

  const copy = () => {
    const text = sections.map((s) => `## ${s.title}\n${s.body}`).join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Kopierat till urklipp");
  };

  return (
    <div className="space-y-5">
      <div className="bg-[#EFF6FF] border border-[#B5D4F4] rounded-[12px] p-[14px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-700">
              AI-analys — {clientName}
            </span>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" className="h-7" onClick={copy}>
              <Copy className="h-3 w-3 mr-1" /> Kopiera
            </Button>
            <Button size="sm" variant="outline" className="h-7" onClick={onRegenerate}>
              <RefreshCw className="h-3 w-3 mr-1" /> Regenerera
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          {sections.map((s) => (
            <div key={s.key} className="bg-white/60 rounded-md border border-[#DBEAFE]">
              <button
                onClick={() => setOpen((o) => ({ ...o, [s.key]: !o[s.key] }))}
                className="w-full flex items-center justify-between px-3 py-2 text-[13px] font-medium text-slate-800"
              >
                <span>{s.title}</span>
                {open[s.key] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {open[s.key] && (
                <div className="px-3 pb-3 text-[13px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {s.body}
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="mt-3 text-[10px] text-slate-500">
          Genererat {generatedAt} — granska innan du skickar till klient.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-[12px] overflow-hidden">
        <h3 className="text-[12px] font-medium uppercase tracking-wide text-slate-500 px-4 py-3 border-b border-slate-100">
          Risksignaler
        </h3>
        {risks.length === 0 ? (
          <p className="p-6 text-center text-[12px] text-slate-400">Inga aktiva risksignaler.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-2">Signal</th>
                <th className="text-left px-4 py-2">Värde</th>
                <th className="text-left px-4 py-2">Tröskel</th>
                <th className="text-left px-4 py-2">Trend</th>
                <th className="text-left px-4 py-2">Rekommendation</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {risks.map((r, i) => {
                const Trend = r.trend === "up" ? ArrowUp : r.trend === "down" ? ArrowDown : Minus;
                const trendColor = r.trend === "up" ? "text-red-600" : r.trend === "down" ? "text-emerald-600" : "text-slate-400";
                return (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{r.signal}</td>
                    <td className="px-4 py-2.5 tabular-nums">{r.current}</td>
                    <td className="px-4 py-2.5 text-slate-500 tabular-nums">{r.threshold}</td>
                    <td className={`px-4 py-2.5 ${trendColor}`}><Trend className="h-4 w-4" /></td>
                    <td className="px-4 py-2.5 text-slate-700">{r.action}</td>
                    <td className="px-4 py-2.5">
                      {r.deeplink && (
                        <a href={r.deeplink} className="text-blue-600 hover:underline inline-flex items-center text-[12px]">
                          Åtgärda <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-[12px] overflow-hidden">
        <h3 className="text-[12px] font-medium uppercase tracking-wide text-slate-500 px-4 py-3 border-b border-slate-100 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Anomalier
        </h3>
        {anomalies.length === 0 ? (
          <p className="p-6 text-center text-[12px] text-slate-400">Inga anomalier upptäckta.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-2">Datum</th>
                <th className="text-left px-4 py-2">Beskrivning</th>
                <th className="text-left px-4 py-2">Belopp</th>
                <th className="text-left px-4 py-2">Anledning</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((a, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 tabular-nums text-slate-600">{a.date}</td>
                  <td className="px-4 py-2.5 text-slate-800">{a.description}</td>
                  <td className="px-4 py-2.5 tabular-nums">{a.amount}</td>
                  <td className="px-4 py-2.5 text-slate-600">{a.reason}</td>
                  <td className="px-4 py-2.5"><a className="text-blue-600 text-[12px] hover:underline">Verifiera →</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
