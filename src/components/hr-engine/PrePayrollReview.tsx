import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, AlertTriangle, AlertCircle, Sparkles, Play, ShieldCheck, FileText, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props { companyId: string }

/**
 * Pre-Payroll Review — obligatorisk granskning innan lön körs.
 * AI flaggar avvikelser per anställd; admin måste godkänna varje rad.
 */
export function PrePayrollReview({ companyId }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Senaste lönekörning i status 'draft' eller 'review'
  const { data: run, isLoading: runLoading } = useQuery({
    queryKey: ["latest-payroll-run", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_runs")
        .select("id, period_start, period_end, status, total_gross, total_net, total_tax, total_employer_cost, payment_date, created_at")
        .eq("company_id", companyId)
        .in("status", ["draft", "review"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: lines } = useQuery({
    queryKey: ["payroll-lines-review", run?.id],
    enabled: !!run?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_lines")
        .select("id, employee_id, gross_salary, net_salary, tax_deduction, employee:employees(first_name, last_name, monthly_salary)")
        .eq("payroll_run_id", run!.id);
      return data || [];
    },
  });

  const { data: flags } = useQuery({
    queryKey: ["payroll-review-flags", run?.id],
    enabled: !!run?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_review_flags")
        .select("*")
        .eq("payroll_run_id", run!.id);
      return data || [];
    },
  });

  const { data: approvals } = useQuery({
    queryKey: ["payroll-emp-approvals", run?.id],
    enabled: !!run?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_employee_approvals")
        .select("*")
        .eq("payroll_run_id", run!.id);
      return data || [];
    },
  });

  const flagsByEmployee = useMemo(() => {
    const m = new Map<string, any[]>();
    (flags || []).forEach((f: any) => {
      if (!f.employee_id) return;
      if (!m.has(f.employee_id)) m.set(f.employee_id, []);
      m.get(f.employee_id)!.push(f);
    });
    return m;
  }, [flags]);

  const approvalByEmployee = useMemo(() => {
    const m = new Map<string, any>();
    (approvals || []).forEach((a: any) => m.set(a.employee_id, a));
    return m;
  }, [approvals]);

  const globalFlags = (flags || []).filter((f: any) => !f.employee_id);

  const runReview = useMutation({
    mutationFn: async () => {
      if (!run?.id) throw new Error("Ingen lönekörning hittad");
      const { data, error } = await supabase.functions.invoke("payroll-prereview", {
        body: { payroll_run_id: run.id, company_id: companyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`AI-granskning klar — ${data.flags_created} flagg${data.flags_created === 1 ? "a" : "or"}`);
      qc.invalidateQueries({ queryKey: ["payroll-review-flags", run?.id] });
      qc.invalidateQueries({ queryKey: ["payroll-emp-approvals", run?.id] });
    },
    onError: (e: any) => toast.error(e.message || "AI-granskning misslyckades"),
  });

  const approveEmployee = useMutation({
    mutationFn: async ({ empId, status }: { empId: string; status: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("payroll_employee_approvals").upsert(
        {
          payroll_run_id: run!.id,
          employee_id: empId,
          company_id: companyId,
          status,
          approved_by: status === "approved" ? u.user?.id : null,
          approved_at: status === "approved" ? new Date().toISOString() : null,
          excluded: status === "excluded",
        },
        { onConflict: "payroll_run_id,employee_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payroll-emp-approvals", run?.id] }),
    onError: (e: any) => toast.error(e.message || "Kunde inte uppdatera"),
  });

  const approveAllOk = useMutation({
    mutationFn: async () => {
      const okIds = (approvals || [])
        .filter((a: any) => a.status === "ok")
        .map((a: any) => a.employee_id);
      if (okIds.length === 0) throw new Error("Inga rader utan flaggor");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("payroll_employee_approvals")
        .update({ status: "approved", approved_by: u.user?.id, approved_at: new Date().toISOString() })
        .eq("payroll_run_id", run!.id)
        .in("employee_id", okIds);
      if (error) throw error;
      return okIds.length;
    },
    onSuccess: (n) => {
      toast.success(`${n} anställd${n === 1 ? "" : "a"} godkända`);
      qc.invalidateQueries({ queryKey: ["payroll-emp-approvals", run?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createJournal = useMutation({
    mutationFn: async () => {
      if (!run?.id) throw new Error("Ingen lönekörning");
      const { data, error } = await supabase.functions.invoke("payroll-to-journal", {
        body: { payroll_run_id: run.id, company_id: companyId },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Bokföring misslyckades");
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        data.reused
          ? "Verifikation finns redan — öppnar..."
          : `Verifikation skapad (${data.lineCount} rader) — granska och godkänn`,
      );
      navigate(`/journal-entries?id=${data.journal_entry_id}`);
    },
    onError: (e: any) => toast.error(e.message || "Kunde inte skapa bokföring"),
  });

  const goToAGI = () => {
    if (!run?.period_end) return;
    const d = new Date(run.period_end);
    navigate(`/agi?year=${d.getFullYear()}&month=${d.getMonth() + 1}`);
  };

  if (runLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!run) {
    return (
      <Card className="p-8 text-center">
        <ShieldCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold mb-1">Ingen lönekörning att granska</h3>
        <p className="text-sm text-muted-foreground">Skapa en lönekörning under HR-modulen för att starta granskningen.</p>
      </Card>
    );
  }

  const total = (lines || []).length;
  const okCount = (approvals || []).filter((a: any) => a.status === "ok").length;
  const reviewCount = (approvals || []).filter((a: any) => a.status === "review").length;
  const errorCount = (approvals || []).filter((a: any) => a.status === "error").length;
  const approvedCount = (approvals || []).filter((a: any) => a.status === "approved").length;
  const reviewProgress = total > 0 ? Math.round((approvedCount / total) * 100) : 0;
  const allApproved = total > 0 && approvedCount === total;

  return (
    <div className="space-y-4">
      {/* Hero */}
      <Card className="p-5 bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="capitalize">{run.status}</Badge>
              <span className="text-xs text-muted-foreground">
                {run.period_start} → {run.period_end} · utbetalning {run.payment_date}
              </span>
            </div>
            <h2 className="text-xl font-semibold">Pre-Payroll Review</h2>
            <p className="text-sm text-muted-foreground">
              Granskning krävs innan lön kan slutföras. {reviewProgress}% klart.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Bruttolön totalt</p>
            <p className="text-2xl font-bold">{Number(run.total_gross || 0).toLocaleString("sv-SE")} kr</p>
            <p className="text-xs text-muted-foreground">
              Arb.giv.kostnad {Number(run.total_employer_cost || 0).toLocaleString("sv-SE")} kr
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => runReview.mutate()}
            disabled={runReview.isPending}
          >
            {runReview.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Kör AI-granskning
          </Button>
          <Button
            size="sm"
            onClick={() => approveAllOk.mutate()}
            disabled={approveAllOk.isPending || okCount === 0}
          >
            <Check className="h-4 w-4 mr-1" /> Godkänn {okCount} OK-rader
          </Button>
          <div className="ml-auto flex gap-2 text-xs">
            <Badge variant="secondary">{okCount} OK</Badge>
            <Badge className="bg-[#FAEEDA] text-[#7A5417] hover:bg-[#FAEEDA] border-[#F0DDB7]">{reviewCount} granska</Badge>
            <Badge variant="destructive">{errorCount} fel</Badge>
            <Badge className="bg-[#E1F5EE] text-[#085041] hover:bg-[#E1F5EE] border-[#BFE6D6]">{approvedCount} godkända</Badge>
          </div>
        </div>
      </Card>

      {/* Globala flaggor */}
      {globalFlags.length > 0 && (
        <Card className="p-4 border-[#F0DDB7] bg-[#FAEEDA]">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-[#7A5417]" /> AI-observationer på körningsnivå
          </h4>
          <div className="space-y-2">
            {globalFlags.map((f: any) => (
              <div key={f.id} className="text-sm">
                <p className="font-medium">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.description}</p>
                {f.ai_recommendation && (
                  <p className="text-xs italic text-primary mt-0.5">💡 {f.ai_recommendation}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Anställd-rader */}
      <div className="space-y-2">
        {(lines || []).map((line: any) => {
          const empFlags = flagsByEmployee.get(line.employee_id) || [];
          const approval = approvalByEmployee.get(line.employee_id);
          const status = approval?.status || "ok";
          const isApproved = status === "approved";
          const isExcluded = approval?.excluded;

          return (
            <Card
              key={line.id}
              className={[
                "p-4",
                status === "error" && "border-destructive/40",
                status === "review" && "border-[#F0DDB7]",
                isApproved && "border-[#BFE6D6] bg-[#E1F5EE]",
                isExcluded && "opacity-50",
              ].filter(Boolean).join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {line.employee?.first_name} {line.employee?.last_name}
                    </span>
                    {status === "error" && (
                      <Badge variant="destructive" className="text-[10px] h-4">
                        <AlertCircle className="h-3 w-3 mr-0.5" /> Fel
                      </Badge>
                    )}
                    {status === "review" && (
                      <Badge className="bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7] text-[10px] h-4">
                        <AlertTriangle className="h-3 w-3 mr-0.5" /> Granska
                      </Badge>
                    )}
                    {status === "ok" && !isApproved && (
                      <Badge variant="secondary" className="text-[10px] h-4">OK</Badge>
                    )}
                    {isApproved && (
                      <Badge className="bg-[#E1F5EE] text-[#085041] border-[#BFE6D6] text-[10px] h-4">
                        <Check className="h-3 w-3 mr-0.5" /> Godkänd
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Brutto {Number(line.gross_salary).toLocaleString("sv-SE")} kr ·
                    Skatt {Number(line.tax_deduction).toLocaleString("sv-SE")} kr ·
                    Netto {Number(line.net_salary).toLocaleString("sv-SE")} kr
                  </div>
                </div>

                <div className="flex gap-1.5">
                  {!isApproved && !isExcluded && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveEmployee.mutate({ empId: line.employee_id, status: "excluded" })}
                        disabled={approveEmployee.isPending}
                      >
                        Exkludera
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => approveEmployee.mutate({ empId: line.employee_id, status: "approved" })}
                        disabled={approveEmployee.isPending || status === "error"}
                      >
                        <Check className="h-4 w-4 mr-1" /> Godkänn
                      </Button>
                    </>
                  )}
                  {(isApproved || isExcluded) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => approveEmployee.mutate({ empId: line.employee_id, status: "ok" })}
                      disabled={approveEmployee.isPending}
                    >
                      Återställ
                    </Button>
                  )}
                </div>
              </div>

              {empFlags.length > 0 && (
                <div className="mt-3 pt-3 border-t space-y-1.5">
                  {empFlags.map((f: any) => (
                    <div key={f.id} className="text-xs">
                      <span className="font-medium">{f.title}</span>
                      {f.description && <span className="text-muted-foreground"> — {f.description}</span>}
                      {f.ai_recommendation && (
                        <p className="text-primary italic mt-0.5">💡 {f.ai_recommendation}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Bottom action bar */}
      <Card className={`p-4 sticky bottom-4 ${allApproved ? "bg-[#E1F5EE] border-[#BFE6D6]" : "bg-card"}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm">
            <span className="font-medium">{approvedCount}/{total}</span>{" "}
            <span className="text-muted-foreground">anställda godkända</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!allApproved} size="lg">
              <Play className="h-4 w-4 mr-2" />
              {allApproved ? "Slutför lönekörning" : "Granska alla rader först"}
            </Button>
          </div>
        </div>

        {/* Post-approval next-steps row */}
        {allApproved && (
          <div className="mt-3 pt-3 border-t flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground mr-2">Nästa steg:</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => createJournal.mutate()}
              disabled={createJournal.isPending}
            >
              {createJournal.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Receipt className="h-4 w-4 mr-1.5" />}
              Bokför lönekörning
            </Button>
            <Button size="sm" variant="outline" onClick={goToAGI}>
              <FileText className="h-4 w-4 mr-1.5" /> Skapa AGI för perioden
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
