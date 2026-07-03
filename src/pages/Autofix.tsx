import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Wrench, ShieldCheck, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { KOMMUN_SKATT_2026 } from "@/lib/kommunSkatt";

interface Finding {
  id: string;
  module: string;
  rule_key: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  title: string;
  description: string;
  suggested_action: string;
  status: string;
  payload: any;
  created_at: string;
}

const moduleLabel: Record<string, string> = {
  hr: "HR & Lön",
  accounting: "Bokföring",
  payroll: "Lönekörning",
  vat: "Moms",
};

const sevColor: Record<string, string> = {
  critical: "bg-[#FEE2E2] text-[#7A1A1A] border-[#FCA5A5]",
  high: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]",
  medium: "bg-[#EFF6FF] text-[#1E3A5F] border-[#BFDBFE]",
  low: "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]",
};

export default function Autofix() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    setCompanyId(localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY));
  }, []);

  const load = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("autofix_findings")
      .select("*")
      .eq("company_id", companyId)
      .eq("status", "open")
      .order("severity", { ascending: false })
      .order("confidence", { ascending: false });
    setFindings((data as Finding[]) ?? []);
  };

  useEffect(() => { load(); }, [companyId]);

  const scan = async () => {
    if (!companyId) return;
    setScanning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/autofix-scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ company_id: companyId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Skanning misslyckades");
      toast.success(`Hittade ${j.findings} avvikelser`);
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setScanning(false); }
  };

  const kommunMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const [name, info] of Object.entries(KOMMUN_SKATT_2026)) m[name] = info.skattetabell;
    return m;
  }, []);

  const apply = async (ids: string[], dismiss = false) => {
    if (!companyId || ids.length === 0) return;
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/autofix-apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ company_id: companyId, finding_ids: ids, dismiss, kommun_map: kommunMap }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Misslyckades");
      toast.success(dismiss ? `${j.applied} avfärdade` : `${j.applied} fixade · ${j.failed} misslyckades`);
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const grouped = useMemo(() => {
    const g: Record<string, Finding[]> = {};
    for (const f of findings) (g[f.module] ??= []).push(f);
    return g;
  }, [findings]);

  const highConfidence = findings.filter(f => f.confidence >= 95 && f.payload?.fix_kind && f.payload.fix_kind !== "manual");

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div>
      <PageHeader
        icon={Sparkles}
        title="AI Autofix"
        subtitle="Detekterar och åtgärdar avvikelser i hela plattformen — med audit trail."
      />

      <div className="px-8 pb-12 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={scan} disabled={scanning}>
              {scanning ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
              Skanna nu
            </Button>
            <Button onClick={() => apply(highConfidence.map(f => f.id))} disabled={busy || highConfidence.length === 0}>
              <Wrench className="w-3.5 h-3.5 mr-2" />
              Fixa alla med ≥95% ({highConfidence.length})
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#64748B]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            {findings.length} öppna findings
          </div>
        </div>

        {findings.length === 0 ? (
          <Card className="rounded-[12px] border-[0.5px] border-[#E2E8F0]">
            <CardContent className="py-16 text-center">
              <div className="rounded-2xl bg-[#E1F5EE] p-3 inline-block mb-4">
                <ShieldCheck className="w-12 h-12 text-emerald-600" />
              </div>
              <p className="font-medium text-[#0F1F3D]">Inga öppna avvikelser</p>
              <p className="text-sm text-[#64748B] mt-1">Klicka "Skanna nu" för att leta efter problem.</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(grouped).map(([mod, items]) => (
            <Card key={mod} className="rounded-[12px] border-[0.5px] border-[#E2E8F0]">
              <CardHeader className="border-b border-[#E2E8F0] py-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>{moduleLabel[mod] ?? mod} <span className="text-[#94A3B8] ml-2">{items.length}</span></span>
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => apply(items.filter(f => f.confidence >= 95 && f.payload?.fix_kind !== "manual").map(f => f.id))}>
                    Fixa alla i {moduleLabel[mod] ?? mod}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-[#E2E8F0]">
                {items.map(f => (
                  <div key={f.id} className="p-4 flex items-start gap-3">
                    <div className="mt-0.5">
                      <AlertTriangle className={`w-4 h-4 ${f.severity === "critical" || f.severity === "high" ? "text-[#7A1A1A]" : "text-[#7A5417]"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[#0F1F3D] text-sm">{f.title}</span>
                        <Badge variant="outline" className={`text-[10px] ${sevColor[f.severity]}`}>{f.severity}</Badge>
                        <Badge variant="outline" className="text-[10px] bg-[#EFF6FF] text-[#1E3A5F] border-[#BFDBFE]">
                          {f.confidence.toFixed(0)}% säkerhet
                        </Badge>
                      </div>
                      <p className="text-sm text-[#64748B] mt-1">{f.description}</p>
                      <p className="text-xs text-[#475569] mt-1"><strong>Föreslagen åtgärd:</strong> {f.suggested_action}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {f.payload?.fix_kind && f.payload.fix_kind !== "manual" && (
                        <Button size="sm" disabled={busy} onClick={() => apply([f.id])}>
                          <Wrench className="w-3 h-3 mr-1" /> Fixa
                        </Button>
                      )}
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => apply([f.id], true)}>
                        Avfärda
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
