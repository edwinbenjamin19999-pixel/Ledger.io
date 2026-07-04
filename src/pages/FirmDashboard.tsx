import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Building2, Users, ClipboardList, BarChart3, LogOut, Plus, Search,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Calendar, User
} from "lucide-react";
import { FirmClientList } from "@/components/firm/FirmClientList";
import { FirmTaskBoard } from "@/components/firm/FirmTaskBoard";
import { FirmOverview } from "@/components/firm/FirmOverview";
import { FirmTeam } from "@/components/firm/FirmTeam";
import { AddClientDialog } from "@/components/firm/AddClientDialog";

interface FirmData { id: string;
  name: string;
  org_number: string;
  email: string | null;
}

const FirmDashboard = () => { const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [firm, setFirm] = useState<FirmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddClient, setShowAddClient] = useState(false);

  useEffect(() => { if (!user) return;
    loadFirm();
  }, [user]);

  const loadFirm = async () => { if (!user) return;
    try { const { data: membership } = await supabase
        .from("firm_members")
        .select("firm_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!membership) { navigate("/firm/auth");
        return;
      }

      const { data: firmData, error } = await supabase
        .from("accounting_firms")
        .select("*")
        .eq("id", membership.firm_id)
        .maybeSingle();

      if (error) throw error;
      setFirm(firmData);
    } catch (error) { console.error("Error loading firm:", error);
      toast.error("Kunde inte ladda byrådata");
    } finally { setLoading(false);
    }
  };

  if (loading) { return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!firm) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">{firm.name}</h1>
              <p className="text-xs text-muted-foreground">Cogniq Byrå</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddClient(true)}>
              <Plus className="h-4 w-4 mr-1" /> Lägg till klient
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Översikt
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2">
              <Building2 className="h-4 w-4" /> Klienter
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <ClipboardList className="h-4 w-4" /> Uppgifter
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" /> Team
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <FirmOverview firmId={firm.id} />
          </TabsContent>

          <TabsContent value="clients">
            <FirmClientList firmId={firm.id} onAddClient={() => setShowAddClient(true)} />
          </TabsContent>

          <TabsContent value="tasks">
            <FirmTaskBoard firmId={firm.id} />
          </TabsContent>

          <TabsContent value="team">
            <FirmTeam firmId={firm.id} />
          </TabsContent>
        </Tabs>
      </main>

      <AddClientDialog
        firmId={firm.id}
        open={showAddClient}
        onOpenChange={setShowAddClient}
        onClientAdded={loadFirm}
      />
    </div>
  );
};

export default FirmDashboard;
