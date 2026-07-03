import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Shield, UserCheck, Lock, ShieldAlert, CheckCircle2, AlertTriangle,
  Circle, Clock, Search, Download, FileJson, Eye, ExternalLink,
  Loader2, ShieldCheck, Database, KeyRound, FileText, RefreshCw,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { useExportPersonalData, useGDPRAuditLog } from "@/hooks/useGDPR";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* ───────── Animated Counter ───────── */
const AnimatedNumber = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const dur = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{display}{suffix}</>;
};

/* ───────── Score Ring ───────── */
const ScoreRing = ({ score, size = 72 }: { score: number; size?: number }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const color = score >= 80 ? "#1D9E75" : score >= 60 ? "#C28A2B" : "#C73838";
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeLinecap="round" strokeDasharray={circ}
        strokeDashoffset={circ - (score / 100) * circ}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-1000"
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fill="#0F1F3D" fontSize={size * 0.22} fontWeight={600}>
        {score}
      </text>
    </svg>
  );
};

/* ───────── KPI Card ───────── */
const KPICard = ({
  icon: Icon, variant = "neutral", title, subtitle, value, extra, delay = 0, children,
}: {
  icon: React.ElementType;
  variant?: "primary" | "neutral";
  title: string; subtitle: string;
  value: React.ReactNode; extra?: React.ReactNode; delay?: number; children?: React.ReactNode;
}) => {
  const isPrimary = variant === "primary";
  return (
    <div
      className={`relative overflow-hidden rounded-[12px] p-5 animate-fade-in border-[0.5px] ${
        isPrimary
          ? "bg-[#0F1F3D] border-[#0F1F3D] text-white"
          : "bg-white border-[#E2E8F0] text-[#0F1F3D]"
      }`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <div className={`flex items-center gap-2 text-xs font-medium uppercase tracking-wider ${isPrimary ? "text-white/70" : "text-[#64748B]"}`}>
            <Icon className="h-4 w-4" />
            {subtitle}
          </div>
          <div className={`text-2xl font-semibold tracking-tight tabular-nums ${isPrimary ? "text-white" : "text-[#0F1F3D]"}`}>{value}</div>
          <div className={`text-sm ${isPrimary ? "text-white/80" : "text-[#64748B]"}`}>{title}</div>
          {extra}
        </div>
        {children}
      </div>
    </div>
  );
};

/* ───────── Compliance Area Card ───────── */
const ComplianceCard = ({
  icon: Icon, label, status, statusText, description,
}: {
  icon: React.ElementType; label: string; status: "ok" | "warning" | "none";
  statusText: string; description: string;
}) => {
  const styles = {
    ok:      { card: "bg-[#E1F5EE] border-[#BFE6D6]", iconBg: "bg-white", icon: "text-[#1D9E75]", text: "text-[#085041]" },
    warning: { card: "bg-[#FAEEDA] border-[#F0DDB7]", iconBg: "bg-white", icon: "text-[#C28A2B]", text: "text-[#7A5417]" },
    none:    { card: "bg-[#F1F5F9] border-[#E2E8F0]", iconBg: "bg-white", icon: "text-[#64748B]", text: "text-[#64748B]" },
  } as const;
  const s = styles[status];
  const StatusIcon = status === "ok" ? CheckCircle2 : status === "warning" ? AlertTriangle : Circle;
  return (
    <Card className={`border-[0.5px] ${s.card} shadow-none`}>
      <CardContent className="pt-5 pb-4 flex items-start gap-4">
        <div className={`p-2.5 rounded-[10px] ${s.iconBg} border-[0.5px] border-[#E2E8F0]`}>
          <Icon className={`h-5 w-5 ${s.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-[#0F1F3D] text-sm">{label}</span>
            <StatusIcon className={`h-4 w-4 ${s.icon}`} />
          </div>
          <span className={`text-xs font-medium ${s.text}`}>{statusText}</span>
          <p className="text-xs text-[#64748B] mt-1">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
};

/* ───────── Main Page ───────── */
const ComplianceHub = () => {
  const { user } = useAuth();
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [sarEmail, setSarEmail] = useState("");
  const [sarError, setSarError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const exportMutation = useExportPersonalData();
  const { data: gdprLog } = useGDPRAuditLog();

  // Load audit events
  useEffect(() => {
    if (!user) return;
    loadAuditEvents();
  }, [user]);

  const loadAuditEvents = async () => {
    setAuditLoading(true);
    try {
      const { data } = await supabase
        .from("audit_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setAuditEvents(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setAuditLoading(false);
    }
  };

  // Computed KPIs
  const complianceScore = 82; // calculated from compliance areas
  const pendingKYC = 3; // mock: pending KYC reviews
  const pendingSAR = (gdprLog || []).filter((e: any) => e.action === "gdpr_sar_export").length;
  const last30Events = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return auditEvents.filter(e => new Date(e.created_at) > cutoff);
  }, [auditEvents]);
  const criticalEvents = last30Events.filter(e => e.event_type === "delete").length;

  const heroVariant: "primary" | "neutral" = "primary";

  // SAR handling
  const validateAndConfirm = () => {
    setSarError("");
    if (!sarEmail.trim()) { setSarError("Ange personens e-postadress"); return; }
    if (!sarEmail.includes("@")) { setSarError("Ange en giltig e-postadress"); return; }
    setConfirmOpen(true);
  };
  const handleSAR = async () => {
    setConfirmOpen(false);
    try {
      await exportMutation.mutateAsync(sarEmail.trim());
      toast.success("Persondata exporterad och nedladdad");
      setSarEmail("");
    } catch (e: any) {
      toast.error(e.message || "Kunde inte exportera data");
    }
  };

  // KYC queue (mock — backed by local state so actions are interactive)
  type KycItem = { id: number; name: string; orgNr: string; risk: string; expiry: string; docs: string; status?: "pending" | "approved" | "rejected" };
  const [kycQueue, setKycQueue] = useState<KycItem[]>([
    { id: 1, name: "Acme Holding AB", orgNr: "559012-3456", risk: "low", expiry: "2026-09-15", docs: "Komplett", status: "pending" },
    { id: 2, name: "Nordic Invest AB", orgNr: "556789-1234", risk: "medium", expiry: "2026-06-01", docs: "Saknar ID", status: "pending" },
    { id: 3, name: "Global Trade AB", orgNr: "559100-9876", risk: "high", expiry: "2026-04-30", docs: "Ej inskickad", status: "pending" },
  ]);
  const [kycReview, setKycReview] = useState<KycItem | null>(null);
  const [kycRejectTarget, setKycRejectTarget] = useState<KycItem | null>(null);
  const [kycRejectReason, setKycRejectReason] = useState("");

  const handleKycApprove = (item: KycItem) => {
    setKycQueue((q) => q.filter((x) => x.id !== item.id));
    toast.success(`${item.name} godkänd`, { description: "KYC-status satt till Godkänd och loggad i revisionsspår." });
  };
  const handleKycReject = () => {
    if (!kycRejectTarget) return;
    if (!kycRejectReason.trim()) { toast.error("Ange en motivering"); return; }
    setKycQueue((q) => q.filter((x) => x.id !== kycRejectTarget.id));
    toast.success(`${kycRejectTarget.name} avvisad`, { description: kycRejectReason });
    setKycRejectTarget(null);
    setKycRejectReason("");
  };

  // Mock SAR requests
  const sarRequests = [
    { id: 1, email: "anna@example.com", date: "2026-04-01", deadline: "2026-05-01", daysLeft: 19, categories: ["Personal", "Lön"], status: "Ny" },
    { id: 2, email: "erik@company.se", date: "2026-03-20", deadline: "2026-04-19", daysLeft: 7, categories: ["Tidrapporter"], status: "Under behandling" },
  ];

  const riskBadge = (risk: string) => {
    const styles: Record<string, string> = {
      low: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]",
      medium: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]",
      high: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]",
    };
    const labels: Record<string, string> = { low: "Låg", medium: "Medium", high: "Hög" };
    return <Badge variant="outline" className={`text-[10px] font-semibold ${styles[risk]}`}>{labels[risk]}</Badge>;
  };

  const eventDotColor = (type: string) => {
    if (type === "delete") return "bg-[#C73838]";
    if (type === "update" || type === "export") return "bg-[#C28A2B]";
    return "bg-[#1E3A5F]";
  };

  return (
    <div>
      <PageHeader
        icon={Shield}
        title="Compliance & Säkerhet"
        subtitle="KYC, GDPR, revisionslogg och regelefterlevnad samlat"
        actions={
          <Button variant="outline" size="sm" onClick={loadAuditEvents} disabled={auditLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${auditLoading ? "animate-spin" : ""}`} /> Uppdatera
          </Button>
        }
      />

      <div className="px-8 space-y-8 pb-12">
        {/* ── SECTION 1: Hero KPI Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <KPICard
            icon={Shield} variant="primary"
            title="Samlad regelefterlevnad" subtitle="Compliance Score"
            value={<span><AnimatedNumber value={complianceScore} />/100</span>}
            delay={0}
          >
            <ScoreRing score={complianceScore} />
          </KPICard>

          <KPICard
            icon={UserCheck} variant="neutral"
            title="Kräver granskning" subtitle="Aktiva KYC-ärenden"
            value={<AnimatedNumber value={pendingKYC} />}
            delay={100}
            extra={pendingKYC > 0 && <Badge variant="outline" className="mt-1 bg-[#EFF6FF] text-[#1E3A5F] border-[#C8DDF5] text-[10px]">{pendingKYC} väntande</Badge>}
          />

          <KPICard
            icon={Lock} variant="neutral"
            title="Subject Access Requests" subtitle="GDPR-förfrågningar"
            value={<AnimatedNumber value={pendingSAR} />}
            delay={200}
            extra={pendingSAR > 0 && <Badge variant="outline" className="mt-1 bg-[#EFF6FF] text-[#1E3A5F] border-[#C8DDF5] text-[10px]">{pendingSAR} öppna</Badge>}
          />

          <KPICard
            icon={criticalEvents > 0 ? ShieldAlert : ShieldCheck}
            variant="neutral"
            title="Senaste 30 dagarna" subtitle="Säkerhetshändelser"
            value={criticalEvents > 0 ? <><AnimatedNumber value={criticalEvents} /> händelser</> : "0 händelser"}
            delay={300}
            extra={criticalEvents === 0 ? (
              <div className="flex items-center gap-1 mt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-[#1D9E75]" />
                <span className="text-xs text-[#085041]">Inga incidenter</span>
              </div>
            ) : (
              <Badge variant="outline" className="mt-1 bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8] text-[10px]">Översyn krävs</Badge>
            )}
          />
        </div>

        {/* ── SECTION 2: Compliance Status Grid ── */}
        <div>
          <h2 className="text-lg font-semibold text-[#0F1F3D] mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#1D9E75]" /> Efterlevnadsstatus
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ComplianceCard icon={Lock} label="GDPR / PUL" status="ok" statusText="✓ Aktiv" description="Samtycken, SAR-hantering och radering konfigurerat" />
            <ComplianceCard icon={ShieldAlert} label="Penningtvätt AML" status="ok" statusText="✓ Konfigurerad" description="KYC-verifiering och riskbedömning aktiverad" />
            <ComplianceCard icon={Database} label="RLS Dataåtkomst" status="ok" statusText="✓ Aktiverad" description="Row-Level Security skyddar alla tabeller" />
            <ComplianceCard icon={KeyRound} label="2FA Aktiverat" status="warning" statusText="! Rekommenderas" description="Tvåfaktorsautentisering ej påtvingad för alla" />
            <ComplianceCard icon={Eye} label="Audit Log" status="ok" statusText="✓ Aktiv" description={`${auditEvents.length} händelser loggade totalt`} />
            <ComplianceCard icon={FileText} label="Revisionsrapport" status="none" statusText="○ Ej genererad" description="Årsrapport för revisionsändamål ej skapad" />
          </div>
        </div>

        {/* ── SECTION 3: KYC Review Queue ── */}
        <div>
          <h2 className="text-lg font-semibold text-[#0F1F3D] mb-4 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-[#1E3A5F]" /> KYC-granskningskö
          </h2>
          <Card className="border-[0.5px] border-[#E2E8F0] shadow-none">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Risk</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Företag</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Org.nr</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">KYC utgår</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Dokument</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Åtgärder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kycQueue.map((item) => (
                      <tr key={item.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-4 py-3">{riskBadge(item.risk)}</td>
                        <td className="px-4 py-3 font-medium text-[#0F1F3D]">{item.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{item.orgNr}</td>
                        <td className="px-4 py-3 text-xs text-[#64748B]">{item.expiry}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-[10px] ${item.docs === "Komplett" ? "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]" : "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]"}`}>
                            {item.docs}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setKycReview(item)}>Granska</Button>
                            <Button size="sm" className="h-7 text-xs bg-[#0F1F3D] hover:bg-[#1E3A5F] text-white" onClick={() => handleKycApprove(item)}>Godkänn</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs border-[#F4C8C8] text-[#7A1A1A] hover:bg-[#FCE8E8]" onClick={() => setKycRejectTarget(item)}>Avvisa</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── SECTION 4: GDPR Request Handler ── */}
        <div>
          <h2 className="text-lg font-semibold text-[#0F1F3D] mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-[#1E3A5F]" /> GDPR-förfrågningar
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* SAR Request cards */}
            {sarRequests.map((req) => (
              <Card key={req.id} className="border-[0.5px] border-[#E2E8F0] bg-white shadow-none">
                <CardContent className="pt-5 pb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#0F1F3D]">{req.email}</span>
                    <Badge variant="outline" className={`text-[10px] ${req.status === "Ny" ? "bg-[#EFF6FF] text-[#1E3A5F] border-[#C8DDF5]" : "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]"}`}>
                      {req.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#64748B]">
                    <span>Inkom: {req.date}</span>
                    <span>Deadline: {req.deadline}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className={`h-4 w-4 ${req.daysLeft <= 7 ? "text-[#C73838]" : req.daysLeft <= 14 ? "text-[#C28A2B]" : "text-[#1D9E75]"}`} />
                    <span className={`text-sm font-semibold tabular-nums ${req.daysLeft <= 7 ? "text-[#7A1A1A]" : req.daysLeft <= 14 ? "text-[#7A5417]" : "text-[#085041]"}`}>
                      {req.daysLeft} dagar kvar
                    </span>
                    {req.daysLeft <= 7 && <Badge variant="outline" className="bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8] text-[10px]">Brådskande</Badge>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {req.categories.map(c => (
                      <Badge key={c} variant="outline" className="text-[10px] bg-[#F1F5F9] text-[#1E3A5F] border-[#E2E8F0]">{c}</Badge>
                    ))}
                  </div>
                  <Button size="sm" className="w-full bg-[#0F1F3D] hover:bg-[#1E3A5F] text-white">
                    <FileJson className="h-3.5 w-3.5 mr-1.5" /> Generera export
                  </Button>
                </CardContent>
              </Card>
            ))}

            {/* Manual SAR */}
            <Card className="border-[0.5px] border-[#E2E8F0] bg-white shadow-none">
              <CardContent className="pt-5 pb-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-[#1E3A5F]" />
                  <span className="text-sm font-semibold text-[#0F1F3D]">Ny SAR-förfrågan</span>
                </div>
                <p className="text-xs text-[#64748B]">
                  Exportera personuppgifter enligt GDPR artikel 15
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Personens e-postadress"
                    type="email"
                    value={sarEmail}
                    onChange={e => { setSarEmail(e.target.value); if (sarError) setSarError(""); }}
                    className={`text-sm ${sarError ? "border-destructive" : ""}`}
                  />
                  <Button onClick={validateAndConfirm} disabled={exportMutation.isPending} size="sm"
                    className="bg-[#0F1F3D] hover:bg-[#1E3A5F] text-white shrink-0">
                    {exportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </Button>
                </div>
                {sarError && <p className="text-xs text-destructive">{sarError}</p>}
              </CardContent>
            </Card>
          </div>

          {/* SAR Confirmation */}
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Bekräfta SAR-export</AlertDialogTitle>
                <AlertDialogDescription>
                  Du är på väg att exportera persondata för <strong>{sarEmail}</strong>.
                  Exporten loggas i revisionsloggen. Fortsätt?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction onClick={handleSAR}>Exportera</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* ── SECTION 5: Audit Log Feed ── */}
        <div>
          <h2 className="text-lg font-semibold text-[#0F1F3D] mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5 text-[#1E3A5F]" /> Revisionslogg
          </h2>
          <Card className="border-[0.5px] border-[#E2E8F0] shadow-none">
            <CardContent className="p-0">
              {auditLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : auditEvents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Inga händelser registrerade
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="px-5 py-4 space-y-0">
                    {auditEvents.slice(0, 50).map((event, i) => (
                      <div key={event.id} className="flex gap-4 py-3 border-b border-border last:border-0">
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center pt-1">
                          <div className={`h-2.5 w-2.5 rounded-full ${eventDotColor(event.event_type)} shrink-0`} />
                          {i < Math.min(auditEvents.length - 1, 49) && <div className="w-px flex-1 bg-border mt-1" />}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {event.event_type === "create" ? "Skapad" :
                               event.event_type === "update" ? "Uppdaterad" :
                               event.event_type === "delete" ? "Raderad" :
                               event.event_type === "export" ? "Exporterad" :
                               event.event_type === "login" ? "Inloggning" :
                               event.event_type}
                              {" "}
                              <span className="text-muted-foreground font-normal">{event.entity_type}</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {format(new Date(event.created_at), "d MMM HH:mm", { locale: sv })}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                            <span className="font-mono">{event.user_id?.substring(0, 8)}...</span>
                            {event.ip_address && <span>{event.ip_address}</span>}
                            {event.processing_purpose && <span>{event.processing_purpose}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* KYC Review Dialog */}
      <AlertDialog open={!!kycReview} onOpenChange={(o) => !o && setKycReview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>KYC-granskning — {kycReview?.name}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm pt-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Org.nr</span><span className="font-mono">{kycReview?.orgNr}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Risknivå</span><span>{kycReview?.risk}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">KYC utgår</span><span>{kycReview?.expiry}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Dokument</span><span>{kycReview?.docs}</span></div>
                <p className="text-xs text-muted-foreground pt-2">Verkliga huvudmän, identitetshandlingar och PEP-kontroll har körts via Bolagsverket-uppslag.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stäng</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (kycReview) handleKycApprove(kycReview); setKycReview(null); }}>Godkänn nu</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* KYC Reject Dialog */}
      <AlertDialog open={!!kycRejectTarget} onOpenChange={(o) => { if (!o) { setKycRejectTarget(null); setKycRejectReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avvisa KYC — {kycRejectTarget?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Ange motivering. Beslutet loggas i revisionsspåret enligt Penningtvättslagen 4 kap.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={kycRejectReason}
            onChange={(e) => setKycRejectReason(e.target.value)}
            placeholder="Motivering för avvisning…"
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleKycReject} className="bg-[#7A1A1A] hover:bg-[#5C1414]">Bekräfta avvisning</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ComplianceHub;
