import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Download, Eye, Trash2, Sparkles, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateMigrationReportPDF } from "@/lib/migrationReportPDF";

interface MigrationJob {
  id: string;
  source_system: string;
  source_format: string;
  status: string;
  stats: any;
  errors: any;
  ai_report: string | null;
  created_at: string;
  completed_at: string | null;
  transition_date: string | null;
}

const STATUS_BADGE: Record<string, { bg: string; fg: string; label: string }> = {
  complete: { bg: "bg-[#E1F5EE]", fg: "text-[#085041]", label: "Klar" },
  fetched: { bg: "bg-[#E1F5EE]", fg: "text-[#085041]", label: "Klar" },
  importing: { bg: "bg-[#EFF6FF]", fg: "text-[#0C447C]", label: "Importerar…" },
  fetching: { bg: "bg-[#EFF6FF]", fg: "text-[#0C447C]", label: "Hämtar…" },
  failed: { bg: "bg-[#FCEBEB]", fg: "text-[#501313]", label: "Misslyckades" },
  partial: { bg: "bg-[#FAEEDA]", fg: "text-[#412402]", label: "Delvis klar" },
};

interface Props {
  companyId: string;
}

export const MigrationHistoryPanel = ({ companyId }: Props) => {
  const [jobs, setJobs] = useState<MigrationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailJob, setDetailJob] = useState<MigrationJob | null>(null);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("migration_jobs")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(25);
    if (!error && data) setJobs(data as MigrationJob[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [companyId]);

  const handleDownloadReport = async (job: MigrationJob) => {
    setGeneratingReport(job.id);
    try {
      let reportText = job.ai_report;
      if (!reportText) {
        // Generate on the fly via edge function
        const { data, error } = await supabase.functions.invoke("ai-migration-report", {
          body: { jobId: job.id },
        });
        if (error) throw error;
        reportText = data?.report || "";
        if (reportText) {
          await supabase.from("migration_jobs").update({ ai_report: reportText }).eq("id", job.id);
        }
      }
      generateMigrationReportPDF({ job, reportText: reportText || "Ingen AI-rapport tillgänglig." });
      toast.success("Rapport genererad");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Kunde inte generera rapport");
    } finally {
      setGeneratingReport(null);
    }
  };

  const handleDelete = async (job: MigrationJob) => {
    try {
      // Soft-delete imported_* by clearing migration_job_id link, then mark job failed
      await Promise.all([
        supabase.from("imported_customers").delete().eq("migration_job_id", job.id),
        supabase.from("imported_suppliers").delete().eq("migration_job_id", job.id),
        supabase.from("imported_customer_invoices").delete().eq("migration_job_id", job.id),
        supabase.from("imported_supplier_invoices").delete().eq("migration_job_id", job.id),
        supabase.from("opening_balances").delete().eq("migration_job_id", job.id),
      ]);
      await supabase.from("migration_jobs").delete().eq("id", job.id);
      toast.success("Import borttagen");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Kunde inte ta bort");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Laddar migreringshistorik…
        </CardContent>
      </Card>
    );
  }

  if (!jobs.length) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Migreringshistorik</CardTitle>
        <CardDescription>Tidigare och pågående importer för detta bolag</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-[#DFE4EA] overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-[#F5F7FA] text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Datum</th>
                <th className="text-left px-3 py-2">Källsystem</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Kunder</th>
                <th className="text-right px-3 py-2">Lev.</th>
                <th className="text-right px-3 py-2">Fakturor</th>
                <th className="text-center px-3 py-2">Rapport</th>
                <th className="text-right px-3 py-2">Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => {
                const s = STATUS_BADGE[j.status] || { bg: "bg-muted", fg: "text-foreground", label: j.status };
                const stats = (j.stats || {}) as Record<string, number>;
                const invCount = (stats.customerInvoices || 0) + (stats.supplierInvoices || 0) + (stats.invoices || 0);
                return (
                  <tr key={j.id} className="border-t border-[#EEF1F5] hover:bg-[#FAFBFC]">
                    <td className="px-3 py-2 tabular-nums text-[11px]">
                      {new Date(j.created_at).toLocaleString("sv-SE", {
                        year: "numeric", month: "2-digit", day: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2 capitalize">
                      {j.source_system} <span className="text-muted-foreground text-[10px]">({j.source_format})</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${s.bg} ${s.fg}`}>
                        {(j.status === "importing" || j.status === "fetching") && (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        )}
                        {s.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{stats.customers ?? 0}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{stats.suppliers ?? 0}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{invCount}</td>
                    <td className="px-3 py-2 text-center">
                      {(j.status === "complete" || j.status === "fetched") && (
                        <button
                          onClick={() => handleDownloadReport(j)}
                          disabled={generatingReport === j.id}
                          className="inline-flex items-center text-primary hover:underline text-[11px]"
                          title="Ladda ner AI-rapport (PDF)"
                        >
                          {generatingReport === j.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setDetailJob(j)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <Trash2 className="h-3.5 w-3.5 text-red-600" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Ta bort import?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Detta tar bort alla {(stats.customers ?? 0) + (stats.suppliers ?? 0) + invCount} importerade poster.
                                Bokföringsverifikationer som redan skapats påverkas inte. Kan inte ångras.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Avbryt</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(j)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Ta bort
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Detail modal */}
      <Dialog open={!!detailJob} onOpenChange={(o) => !o && setDetailJob(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Importdetaljer
            </DialogTitle>
            <DialogDescription>
              {detailJob && (
                <>
                  {detailJob.source_system} · {detailJob.source_format} ·{" "}
                  {new Date(detailJob.created_at).toLocaleString("sv-SE")}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {detailJob && (
            <div className="space-y-4 text-[12px]">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                <Badge>{detailJob.status}</Badge>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Importerade poster</p>
                <pre className="bg-[#F5F7FA] rounded p-2 text-[11px] overflow-auto">
                  {JSON.stringify(detailJob.stats, null, 2)}
                </pre>
              </div>
              {Array.isArray(detailJob.errors) && detailJob.errors.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-red-700 mb-1">Fel / hoppade över</p>
                  <pre className="bg-red-50 border border-red-200 rounded p-2 text-[11px] overflow-auto">
                    {JSON.stringify(detailJob.errors, null, 2)}
                  </pre>
                </div>
              )}
              {detailJob.ai_report && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> AI-rapport
                  </p>
                  <div className="bg-[#EFF6FF] border border-[#B5D4F4] rounded p-3 text-[12px] whitespace-pre-wrap leading-relaxed">
                    {detailJob.ai_report}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailJob(null)}>Stäng</Button>
            {detailJob && (detailJob.status === "complete" || detailJob.status === "fetched") && (
              <Button onClick={() => handleDownloadReport(detailJob)}>
                <Download className="h-4 w-4 mr-2" />
                Ladda ner PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
