import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { MigrationWizard } from "@/components/migration/MigrationWizard";
import { OpeningBalancesPanel } from "@/components/migration/wizard/OpeningBalancesPanel";
import { MigrationHistoryPanel } from "@/components/migration/MigrationHistoryPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pickDefaultCompanyId, setStoredActiveCompanyId, broadcastActiveCompanyChange } from "@/lib/company-selection";

interface Company { id: string;
  name: string;
}

const Migration = () => { const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");

  useEffect(() => { if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Hämta endast bolag användaren faktiskt har roll på
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", user.id);
      const companyIds = Array.from(new Set((roleRows || []).map(r => r.company_id).filter(Boolean)));
      if (!companyIds.length) { setCompanies([]); return; }
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .in("id", companyIds)
        .order("name");
      if (error) { toast.error("Kunde inte ladda företag"); return; }
      setCompanies(data || []);
      if (data?.length) setSelectedCompany(pickDefaultCompanyId(data));
    })();
  }, [user]);

  // Sync with global active company changes (header picker)
  useEffect(() => {
    const sync = () => {
      if (!companies.length) return;
      const next = pickDefaultCompanyId(companies);
      if (next && next !== selectedCompany) setSelectedCompany(next);
    };
    window.addEventListener("company-changed", sync);
    window.addEventListener("active-company-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("company-changed", sync);
      window.removeEventListener("active-company-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, [companies, selectedCompany]);

  const handleCompanyChange = (id: string) => {
    setSelectedCompany(id);
    setStoredActiveCompanyId(id);
    broadcastActiveCompanyChange(id);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!user) return null;

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Migrera från annat system</h1>
        <p className="text-muted-foreground mt-1">
          Byt till Ledger.io smidigt — SIE-import eller direktanslutning, klart på minuter
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Välj företag</CardTitle>
          <CardDescription>Vilket företag ska du migrera data till?</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCompany} onValueChange={handleCompanyChange}>
            <SelectTrigger><SelectValue placeholder="Välj ett företag" /></SelectTrigger>
            <SelectContent>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCompany && (
        <Tabs defaultValue="wizard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="wizard">Migrering</TabsTrigger>
            <TabsTrigger value="opening">Ingående balanser</TabsTrigger>
            <TabsTrigger value="history">Historik</TabsTrigger>
          </TabsList>
          <TabsContent value="wizard">
            <MigrationWizard
              companyId={selectedCompany}
              onComplete={() => { toast.success("Migrering slutförd!"); navigate("/dashboard"); }}
            />
          </TabsContent>
          <TabsContent value="opening">
            <OpeningBalancesPanel companyId={selectedCompany} transitionDate={new Date().toISOString().slice(0,10).replace(/-\d{2}$/, "-01")} />
          </TabsContent>
          <TabsContent value="history">
            <MigrationHistoryPanel companyId={selectedCompany} />
          </TabsContent>
        </Tabs>
      )}
    </main>
  );
};

export default Migration;
