import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { ArrowUpRight, FileCheck, Banknote, Sparkles, Building2 } from "lucide-react";
import type { TaxInsight } from "@/lib/skatteagent/aiTaxAdvisor";
import type { FTaxJournalLine } from "@/lib/skatteagent/preliminaryTaxEngine";

interface AccountingAuditTrailProps {
  ftaxJournal: (FTaxJournalLine & { journalEntryId?: string; description?: string })[];
  insights: TaxInsight[];
  skvLastSync?: string | null;
  skvConnected: boolean;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString("sv-SE");
}

export function AccountingAuditTrail({
  ftaxJournal,
  insights,
  skvLastSync,
  skvConnected,
}: AccountingAuditTrailProps) {
  const sorted = [...ftaxJournal].sort((a, b) => b.entryDate.localeCompare(a.entryDate));

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Bokföring & revisionsspår</h2>
        <p className="text-sm text-slate-500 mt-0.5">Full transparens för varje åtgärd</p>
      </div>

      <Tabs defaultValue="postings">
        <TabsList>
          <TabsTrigger value="postings">
            <FileCheck className="w-3.5 h-3.5 mr-1.5" /> Bokföringar
          </TabsTrigger>
          <TabsTrigger value="bank">
            <Banknote className="w-3.5 h-3.5 mr-1.5" /> Bank-matchningar
          </TabsTrigger>
          <TabsTrigger value="skv">
            <Building2 className="w-3.5 h-3.5 mr-1.5" /> SKV-loggar
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI-historik
          </TabsTrigger>
        </TabsList>

        <TabsContent value="postings" className="mt-4">
          {sorted.length === 0 ? (
            <EmptyState text="Inga F-skattebokningar (D 2518) ännu." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Datum</th>
                    <th className="text-left px-4 py-2 font-medium">Beskrivning</th>
                    <th className="text-right px-4 py-2 font-medium">Belopp</th>
                    <th className="text-right px-4 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sorted.map((l, i) => (
                    <tr key={`${l.entryDate}-${i}`}>
                      <td className="px-4 py-2.5 tabular-nums text-slate-600">{l.entryDate}</td>
                      <td className="px-4 py-2.5 text-slate-900">
                        {l.description ?? "Preliminärskatt (F-skatt)"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                        {fmt(l.debit)} kr
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link to="/verifications" className="text-indigo-600 hover:text-indigo-700 inline-flex items-center text-xs">
                          Öppna <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="bank" className="mt-4">
          <EmptyState text="Bank-matchningar visas när banktransaktioner kopplas till F-skattebetalningar." />
        </TabsContent>

        <TabsContent value="skv" className="mt-4">
          {skvConnected ? (
            <div className="rounded-xl border border-slate-200 p-4 text-sm">
              <div className="flex items-center gap-2 text-[#085041] font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Anslutning aktiv
              </div>
              <div className="text-slate-500 mt-2">
                Senast synkad:{" "}
                {skvLastSync ? new Date(skvLastSync).toLocaleString("sv-SE") : "okänt"}
              </div>
            </div>
          ) : (
            <EmptyState text="Skatteverket är ej anslutet — anslut för att se loggar." />
          )}
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          {insights.length === 0 ? (
            <EmptyState text="AI-rekommendationer visas här när de genereras." />
          ) : (
            <div className="space-y-2">
              {insights.map((i) => (
                <div key={i.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-slate-900">{i.title}</div>
                    <span className="text-xs text-slate-500">
                      {Math.round(i.confidence * 100)} % konfidens
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1 line-clamp-2">{i.message}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
