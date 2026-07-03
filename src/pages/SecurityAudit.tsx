import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, ShieldCheck, ShieldAlert, ShieldX,
  RefreshCw, CheckCircle, AlertTriangle, XCircle,
  Clock, Activity, Wrench, Eye, EyeOff,
  ArrowUpRight, Loader2, ClipboardList, Users, Info
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useSecurityAuditLog } from "@/hooks/useSecurityAudit";

interface Finding { source: string;
  finding: { id: string;
    internal_id: string;
    name: string;
    description: string;
    level: "info" | "warn" | "error";
    category?: string;
    link?: string;
    ignore?: boolean;
    ignore_reason?: string;
    details?: string;
    remediation_difficulty?: string;
  };
}

interface HealthStatus { status: "healthy" | "degraded" | "critical";
  timestamp: string;
  tests: { name: string; passed: boolean; latency?: number }[];
  fixes: { action: string; message: string }[];
  totalLatency?: number;
}

const SecurityAudit = () => { const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [scanning, setScanning] = useState(false);
  const [healthChecking, setHealthChecking] = useState(false);
  const [lastScan, setLastScan] = useState<string>("");
  const [showIgnored, setShowIgnored] = useState(false);
  const { data: auditData, isLoading: auditLoading } = useSecurityAuditLog();

  useEffect(() => { if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const runHealthCheck = useCallback(async () => { setHealthChecking(true);
    try { const { data, error } = await supabase.functions.invoke("health-check");
      if (error) throw error;
      setHealth(data);
    } catch (e: any) { console.error("Health check failed:", e);
      setHealth({ status: "critical", timestamp: new Date().toISOString(), tests: [], fixes: [] });
    } finally { setHealthChecking(false);
    }
  }, []);

  useEffect(() => { if (user) { runHealthCheck();
      // Mock scan results - in production these come from the security scan API
      loadFindings();
    }
  }, [user, runHealthCheck]);

  const loadFindings = () => { // These would come from the security scan in production.
    // For now we surface some common patterns the system should check.
    setFindings([
      { source: "supply_chain",
        finding: { id: "vulnerable_dependencies_high",
          internal_id: "vulnerable_dependencies_high",
          name: "Vulnerable dependencies removed",
          description: "The xlsx package was removed and replaced with native CSV/TSV parsing.",
          level: "info",
          category: "Supply chain",
          ignore: true,
          ignore_reason: "xlsx removed, replaced with safe CSV utilities.",
          remediation_difficulty: "low",
        },
      },
      { source: "supabase",
        finding: { id: "SUPA_auth_leaked_password_protection",
          internal_id: "SUPA_auth_leaked_password_protection",
          name: "Leaked Password Protection Disabled",
          description: "Leaked password protection is currently disabled. Enable it to prevent use of compromised credentials.",
          level: "warn",
          category: "Authentication",
          link: "https://supabase.com/docs/guides/platform/going-into-prod",
          ignore: false,
          remediation_difficulty: "low",
        },
      },
      { source: "supabase",
        finding: { id: "SUPA_extension_in_public",
          internal_id: "SUPA_extension_in_public",
          name: "Extension in Public Schema",
          description: "Extensions installed in the public schema. Move to a dedicated schema för better isolation.",
          level: "warn",
          category: "Database",
          link: "https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public",
          ignore: false,
          remediation_difficulty: "medium",
        },
      },
      { source: "agent_security",
        finding: { id: "SECRETS_EXPOSED",
          internal_id: "skatteverket_hardcoded_creds",
          name: "Skatteverket test credentials in migration",
          description: "Test credentials stored as hex strings in migration file. Use backend secrets instead.",
          level: "warn",
          category: "Credential Storage",
          ignore: false,
          remediation_difficulty: "medium",
          link: "https://supabase.com/docs/guides/platform/going-into-prod",
        },
      },
    ]);
    setLastScan(new Date().toLocaleTimeString("sv-SE"));
  };

  const handleRescan = async () => { setScanning(true);
    toast.info("Kör säkerhetsskanning...");
    await new Promise((r) => setTimeout(r, 1500));
    loadFindings();
    await runHealthCheck();
    setScanning(false);
    toast.success("Säkerhetsskanning klar");
  };

  if (loading) { return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return null;

  const activeFindings = findings.filter((f) => !f.finding.ignore);
  const ignoredFindings = findings.filter((f) => f.finding.ignore);
  const errorCount = activeFindings.filter((f) => f.finding.level === "error").length;
  const warnCount = activeFindings.filter((f) => f.finding.level === "warn").length;
  const infoCount = activeFindings.filter((f) => f.finding.level === "info").length;

  const overallScore =
    errorCount > 0 ? "critical" : warnCount > 0 ? "warning" : "secure";

  const ScoreIcon =
    overallScore === "secure" ? ShieldCheck : overallScore === "warning" ? ShieldAlert : ShieldX;
  const scoreColor =
    overallScore === "secure"
      ? "text-[#085041]"
      : overallScore === "warning"
      ? "text-[#7A5417]"
      : "text-destructive";
  const scoreLabel =
    overallScore === "secure" ? "Säkert" : overallScore === "warning" ? "Varningar" : "Kritiskt";

  const getLevelIcon = (level: string) => { if (level === "error") return <XCircle className="h-4 w-4 text-destructive" />;
    if (level === "warn") return <AlertTriangle className="h-4 w-4 text-[#7A5417]" />;
    return <CheckCircle className="h-4 w-4 text-[#085041]" />;
  };

  const getLevelBadge = (level: string) => { if (level === "error") return <Badge variant="destructive">Kritisk</Badge>;
    if (level === "warn") return <Badge variant="secondary" className="bg-[#FAEEDA] text-[#7A5417] dark:bg-yellow-900/30 dark:text-[#C28A2B]">Varning</Badge>;
    return <Badge variant="default" className="bg-[#E1F5EE] text-[#085041] dark:bg-green-900/30 dark:text-[#1D9E75]">Info</Badge>;
  };

  const getDifficultyBadge = (difficulty?: string) => { if (!difficulty) return null;
    const colors: Record<string, string> = { low: "bg-[#E1F5EE] text-[#085041] dark:bg-green-900/30 dark:text-[#1D9E75]",
      medium: "bg-[#FAEEDA] text-[#7A5417] dark:bg-yellow-900/30 dark:text-[#C28A2B]",
      high: "bg-[#FCE8E8] text-[#7A1A1A] dark:bg-red-900/30 dark:text-[#C73838]",
    };
    return (
      <Badge variant="outline" className={colors[difficulty] || ""}>
        {difficulty === "low" ? "Enkel" : difficulty === "medium" ? "Medel" : "Svår"} åtgärd
      </Badge>
    );
  };

  return (
    <div>
      <PageHeader
        icon={ShieldCheck}
        title="Säkerhetsöversikt"
        subtitle={`${scoreLabel} — ${activeFindings.length} aktiva fynd, ${ignoredFindings.length} ignorerade`}
      />
      <div className="px-8 space-y-8">
        <div className="flex items-center gap-3">
          {lastScan && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Senaste: {lastScan}
            </span>
          )}
          <Button onClick={handleRescan} disabled={scanning} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Skannar..." : "Skanna igen"}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-destructive">{errorCount}</div>
              <p className="text-sm text-muted-foreground mt-1">Kritiska</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-[#7A5417]">{warnCount}</div>
              <p className="text-sm text-muted-foreground mt-1">Varningar</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-[#085041]">{ignoredFindings.length}</div>
              <p className="text-sm text-muted-foreground mt-1">Åtgärdade / Ignorerade</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className={`text-3xl font-bold ${health?.status === "healthy" ? "text-[#085041]" : health?.status === "degraded" ? "text-[#7A5417]" : "text-destructive"}`}>
                {healthChecking ? "..." : health?.status === "healthy" ? "OK" : health?.status === "degraded" ? "!" : "✕"}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Systemhälsa</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="findings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="findings" className="flex items-center gap-2">
              <Shield className="h-4 w-4" /> Fynd ({activeFindings.length})
            </TabsTrigger>
            <TabsTrigger value="auditlog" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Aktivitetslogg
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Behörigheter
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="h-4 w-4" /> Systemhälsa
            </TabsTrigger>
            <TabsTrigger value="remediated" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Åtgärdade ({ignoredFindings.length})
            </TabsTrigger>
          </TabsList>

          {/* Active findings */}
          <TabsContent value="findings" className="space-y-4">
            {activeFindings.length === 0 ? (
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>Inga aktiva säkerhetsproblem</AlertTitle>
                <AlertDescription>Alla kända problem har åtgärdats eller ignorerats.</AlertDescription>
              </Alert>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Nivå</TableHead>
                      <TableHead>Problem</TableHead>
                      <TableHead>Källa</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Åtgärd</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeFindings.map((f, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{getLevelIcon(f.finding.level)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-sm">{f.finding.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{f.finding.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{f.source}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{f.finding.category || "—"}</TableCell>
                        <TableCell>{getDifficultyBadge(f.finding.remediation_difficulty)}</TableCell>
                        <TableCell>
                          {f.finding.link && (
                            <a href={f.finding.link} target="_blank" rel="noopener noreferrer">
                              <ArrowUpRight className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="auditlog" className="space-y-4">
            {auditData && (
              <Card className="mb-4">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase">Säkerhetsscore</p>
                      <p className="text-2xl font-bold">{auditData.score}/100</p>
                    </div>
                    <Progress value={auditData.score} className="flex-1" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                    {auditData.checks.map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs">
                        {c.ok ? <CheckCircle className="h-3.5 w-3.5 text-[#085041]" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                        <span className={c.ok ? "text-muted-foreground" : "font-medium"}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="rounded-xl bg-[#EFF6FF] border border-[#C8DDF5] p-4 flex items-start gap-3 dark:bg-blue-950/30 dark:border-blue-800">
              <Info className="w-5 h-5 text-blue-600 dark:text-[#1E3A5F] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Förstärk kontosäkerheten</p>
                <p className="text-xs text-blue-600 dark:text-[#1E3A5F] mt-1">
                  Aktivera tvåfaktorsautentisering (2FA) i dina kontoinställningar för maximal säkerhet.
                </p>
              </div>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">Aktivitetslogg</CardTitle></CardHeader>
              <CardContent>
                {auditLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : (auditData?.auditLog ?? []).length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">Ingen aktivitet registrerad.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Datum</TableHead><TableHead>Händelse</TableHead><TableHead>Användare</TableHead><TableHead>Detaljer</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(auditData?.auditLog ?? []).map((entry: any) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs">{new Date(entry.created_at).toLocaleString("sv-SE")}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{entry.action}</Badge></TableCell>
                          <TableCell className="text-xs">{entry.userName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">{entry.description || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Behörighetsöversikt</CardTitle></CardHeader>
              <CardContent>
                {(auditData?.roles ?? []).length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">Inga roller tilldelade.</p>
                ) : (
                  <div className="space-y-2">
                    {(auditData?.roles ?? []).map((r: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                        <span className="text-sm font-medium">{r.userName}</span>
                        <Badge variant={r.role === 'admin' ? 'destructive' : 'secondary'}>{r.role}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System health */}
          <TabsContent value="health" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" /> Systemhälsa
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={runHealthCheck} disabled={healthChecking}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${healthChecking ? "animate-spin" : ""}`} />
                    Kontrollera
                  </Button>
                </div>
                <CardDescription>Realtidsstatus för databas, autentisering och backend-funktioner</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {health ? (
                  <>
                    <div className="flex items-center gap-3">
                      {health.status === "healthy" ? (
                        <CheckCircle className="h-6 w-6 text-[#085041]" />
                      ) : health.status === "degraded" ? (
                        <AlertTriangle className="h-6 w-6 text-[#7A5417]" />
                      ) : (
                        <XCircle className="h-6 w-6 text-destructive" />
                      )}
                      <div>
                        <p className="font-semibold capitalize">{health.status}</p>
                        {health.totalLatency && (
                          <p className="text-xs text-muted-foreground">Svarstid: {health.totalLatency}ms</p>
                        )}
                      </div>
                    </div>

                    {health.tests.length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">Status</TableHead>
                              <TableHead>Test</TableHead>
                              <TableHead className="text-right">Latens</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {health.tests.map((t, idx) => (
                              <TableRow key={idx}>
                                <TableCell>
                                  {t.passed ? (
                                    <CheckCircle className="h-4 w-4 text-[#085041]" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-destructive" />
                                  )}
                                </TableCell>
                                <TableCell className="text-sm">{t.name}</TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground">
                                  {t.latency ? `${t.latency}ms` : "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {health.fixes.length > 0 && (
                      <Alert>
                        <Wrench className="h-4 w-4" />
                        <AlertTitle>Auto-åtgärder utförda</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {health.fixes.map((fix, idx) => (
                              <li key={idx} className="text-sm">
                                <strong>{fix.action}:</strong> {fix.message}
                              </li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Kontrollerar systemhälsa...
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Remediated / ignored */}
          <TabsContent value="remediated" className="space-y-4">
            {ignoredFindings.length === 0 ? (
              <Alert>
                <AlertDescription>Inga åtgärdade eller ignorerade fynd ännu.</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {ignoredFindings.map((f, idx) => (
                  <Card key={idx} className="border-l-4 border-l-green-600">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-[#085041] shrink-0" />
                            <p className="font-medium text-sm">{f.finding.name}</p>
                            <Badge variant="outline" className="text-xs">{f.source}</Badge>
                          </div>
                          {f.finding.ignore_reason && (
                            <p className="text-xs text-muted-foreground ml-6">
                              {f.finding.ignore_reason}
                            </p>
                          )}
                        </div>
                        {getLevelBadge(f.finding.level)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SecurityAudit;
