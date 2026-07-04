import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Users, Building2, CreditCard, Search,
  UserPlus, CheckCircle, XCircle, Clock, AlertTriangle,
  TrendingUp, Eye, BarChart3
} from "lucide-react";
import { AdminCompanyDetail } from "@/components/admin/AdminCompanyDetail";
import { AdminInsightsPanel } from "@/components/admin/AdminInsightsPanel";
import { WaitlistPanel } from "@/components/admin/WaitlistPanel";

interface CompanyRow { id: string;
  name: string;
  org_number: string;
  subscription_tier: string | null;
  subscription_status: string | null;
  subscription_end_date: string | null;
  created_at: string;
  industry: string | null;
  kam?: { email: string; full_name: string } | null;
  pendingCount?: number;
  totalEntries?: number;
}

const tierLabels: Record<string, string> = { mini: "Mini",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

const statusColors: Record<string, string> = { active: "bg-[#E1F5EE] text-[#085041] dark:bg-green-900 dark:text-green-200",
  trialing: "bg-[#EFF6FF] text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  past_due: "bg-[#FCE8E8] text-[#7A1A1A] dark:bg-red-900 dark:text-red-200",
  canceled: "bg-muted text-muted-foreground",
};

const AdminDashboard = () => { const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // KAM assignment dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignCompanyId, setAssignCompanyId] = useState<string | null>(null);
  const [kamEmail, setKamEmail] = useState("");
  const [kamNotes, setKamNotes] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => { if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => { if (user) checkAccessAndLoad();
  }, [user]);

  const checkAccessAndLoad = async () => { if (!user) return;
    // Check if user is a platform admin (internal Cogniq team only)
    const { data: isAdmin } = await supabase.rpc("is_platform_admin", { _user_id: user.id,
    });

    setIsPlatformAdmin(!!isAdmin);

    if (!isAdmin) { toast.error("Ingen behörighet. Kontakta administratören.");
      navigate("/dashboard");
      return;
    }

    await loadCompanies();
  };

  const loadCompanies = async () => { setLoadingData(true);
    try { const { data, error } = await supabase
        .from("companies")
        .select("id, name, org_number, subscription_tier, subscription_status, subscription_end_date, created_at, industry")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Load KAM assignments and entry counts
      const companiesWithExtras = await Promise.all(
        (data || []).map(async (c) => { // KAM
          const { data: kamData } = await supabase
            .from("kam_assignments")
            .select("kam_user_id")
            .eq("company_id", c.id)
            .eq("is_active", true)
            .limit(1);

          let kam = null;
          if (kamData && kamData.length > 0) { const { data: profile } = await supabase
              .from("profiles")
              .select("email, full_name")
              .eq("id", String((kamData[0] as Record<string, unknown>).kam_user_id))
              .maybeSingle();
            kam = profile;
          }

          // Pending entries count
          const { count: pendingCount } = await supabase
            .from("journal_entries")
            .select("id", { count: "exact", head: true })
            .eq("company_id", c.id)
            .eq("status", "pending_approval");

          const { count: totalEntries } = await supabase
            .from("journal_entries")
            .select("id", { count: "exact", head: true })
            .eq("company_id", c.id);

          return { ...c, kam, pendingCount: pendingCount || 0, totalEntries: totalEntries || 0 };
        })
      );

      setCompanies(companiesWithExtras);
    } catch (error: any) { toast.error("Kunde inte ladda företag: " + error.message);
    } finally { setLoadingData(false);
    }
  };

  const assignKAM = async () => { if (!assignCompanyId || !kamEmail || !user) return;
    setAssigning(true);
    try { // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", kamEmail)
        .maybeSingle();

      if (profileError || !profile) { toast.error("Kunde inte hitta användare med den e-postadressen");
        return;
      }

      // Assign KAM role
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({ user_id: profile.id,
          role: "kam" as const,
          company_id: assignCompanyId,
        }, { onConflict: "user_id,role" });

      if (roleError) console.warn("Role upsert:", roleError.message);

      // Create KAM assignment
      const { error } = await supabase
        .from("kam_assignments")
        .upsert({ company_id: assignCompanyId,
          kam_user_id: profile.id,
          assigned_by: user.id,
          notes: kamNotes || null,
          is_active: true,
        }, { onConflict: "company_id,kam_user_id" });

      if (error) throw error;

      toast.success("KAM tilldelad!");
      setAssignOpen(false);
      setKamEmail("");
      setKamNotes("");
      loadCompanies();
    } catch (error: any) { toast.error("Kunde inte tilldela KAM: " + error.message);
    } finally { setAssigning(false);
    }
  };

  // Filter logic
  const filtered = companies.filter(c => { const matchSearch = !search || 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.org_number.includes(search);
    const matchTier = filterTier === "all" || c.subscription_tier === filterTier;
    const matchStatus = filterStatus === "all" || c.subscription_status === filterStatus;
    return matchSearch && matchTier && matchStatus;
  });

  // Stats
  const totalActive = companies.filter(c => c.subscription_status === "active").length;
  const totalTrialing = companies.filter(c => c.subscription_status === "trialing").length;
  const totalPastDue = companies.filter(c => c.subscription_status === "past_due").length;
  const totalPending = companies.reduce((s, c) => s + (c.pendingCount || 0), 0);

  if (loading || loadingData) { return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isPlatformAdmin) return null;

  if (selectedCompanyId) { return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <AdminCompanyDetail companyId={selectedCompanyId} onBack={() => setSelectedCompanyId(null)} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">Överblick av alla kunder och deras status</p>
        </div>
      </div>

      {/* Smart Insights */}
      <AdminInsightsPanel />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{companies.length}</p>
              <p className="text-xs text-muted-foreground">Totalt företag</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-[#085041]" />
            <div>
              <p className="text-2xl font-bold">{totalActive}</p>
              <p className="text-xs text-muted-foreground">Aktiva</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{totalTrialing}</p>
              <p className="text-xs text-muted-foreground">Trial</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-2xl font-bold">{totalPastDue}</p>
              <p className="text-xs text-muted-foreground">Obetalt</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending entries alert */}
      {totalPending > 0 && (
        <Card className="border-yellow-300 dark:border-yellow-700">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-[#7A5417]" />
            <p className="text-sm">
              <strong>{totalPending}</strong> verifikationer väntar på godkännande totalt bland alla kunder
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök företag eller org.nr..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Paket" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla paket</SelectItem>
            <SelectItem value="mini">Mini</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla status</SelectItem>
            <SelectItem value="active">Aktiv</SelectItem>
            <SelectItem value="trialing">Trial</SelectItem>
            <SelectItem value="past_due">Obetalt</SelectItem>
            <SelectItem value="canceled">Avslutad</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Company Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Kunder ({filtered.length})</CardTitle>
          <CardDescription>Klicka på ett företag för att se detaljer</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Företag</TableHead>
                  <TableHead>Paket</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Verifikationer</TableHead>
                  <TableHead>KAM</TableHead>
                  <TableHead>Registrerad</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(company => (
                  <TableRow key={company.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelectedCompanyId(company.id)}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-xs text-muted-foreground">{company.org_number}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {tierLabels[company.subscription_tier || ""] || "Inget"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[company.subscription_status || ""] || "bg-muted text-muted-foreground"}>
                        {company.subscription_status === "active" ? "Aktiv" :
                         company.subscription_status === "trialing" ? "Trial" :
                         company.subscription_status === "past_due" ? "Obetalt" :
                         company.subscription_status === "canceled" ? "Avslutad" : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm">{company.totalEntries}</span>
                        {(company.pendingCount || 0) > 0 && (
                          <Badge variant="destructive" className="text-xs">{company.pendingCount} väntande</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {company.kam ? (
                        <span className="text-sm">{company.kam.full_name || company.kam.email}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Ej tilldelad</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(company.created_at).toLocaleDateString("sv-SE")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => { setAssignCompanyId(company.id);
                            setAssignOpen(true);
                          }}
                        >
                          <UserPlus className="h-3 w-3 mr-1" />KAM
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Inga företag matchar filtret
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Waitlist / Intresseanmälningar */}
      <WaitlistPanel />

      {/* KAM Assignment Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Tilldela KAM
            </DialogTitle>
            <DialogDescription>
              KAM (Key Account Manager) får tillgång att granska och rätta bokföring för detta företag.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium">KAM:s e-postadress</label>
              <Input
                placeholder="kam@cogniq.se"
                value={kamEmail}
                onChange={e => setKamEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Anteckningar (valfritt)</label>
              <Textarea
                placeholder="T.ex. fokusområde, specialkompetens..."
                value={kamNotes}
                onChange={e => setKamNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignOpen(false)}>Avbryt</Button>
              <Button onClick={assignKAM} disabled={assigning || !kamEmail}>
                {assigning ? "Tilldelar..." : "Tilldela KAM"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
