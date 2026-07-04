import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Plus, Building2, ExternalLink, AlertTriangle, FileText, Receipt, Loader2 } from "lucide-react";
import { useFirmClients, type FirmClientEnriched } from "@/hooks/useFirmDashboard";

interface FirmClientListProps {
  firmId: string;
  onAddClient: () => void;
}

const urgencyConfig = {
  high: { label: "Hög", className: "bg-[#FCE8E8] text-[#7A1A1A] dark:bg-red-900/30 dark:text-[#C73838] border-[#F4C8C8]" },
  medium: { label: "Medel", className: "bg-[#FAEEDA] text-[#7A5417] dark:bg-amber-900/30 dark:text-[#C28A2B] border-[#F0DDB7]" },
  low: { label: "OK", className: "bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-[#1D9E75] border-[#BFE6D6]" },
};

export const FirmClientList = ({ firmId, onAddClient }: FirmClientListProps) => {
  const navigate = useNavigate();
  const { data: clients, isLoading } = useFirmClients(firmId);
  const [search, setSearch] = useState("");

  const handleSwitchToClient = (companyId: string) => {
    localStorage.setItem("firm_context", JSON.stringify({ firmId, returnTo: "/firm/dashboard" }));
    localStorage.setItem("selected_company", companyId);
    navigate("/dashboard");
  };

  const filtered = (clients ?? []).filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.org_number.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök klient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={onAddClient}>
          <Plus className="h-4 w-4 mr-1" /> Lägg till klient
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {search ? "Inga klienter matchar sökningen." : "Du är inte kopplad till några klientbolag ännu."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => {
            const urg = urgencyConfig[client.urgency];
            return (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.org_number}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${urg.className}`}>
                      {client.alerts > 0 ? `${client.alerts} alerts` : "OK"}
                    </Badge>
                  </div>

                  {client.alerts > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {client.draftEntries > 0 && (
                        <Badge variant="outline" className="text-xs gap-1 bg-[#FAEEDA] dark:bg-amber-900/20">
                          <FileText className="h-3 w-3" /> {client.draftEntries} utkast
                        </Badge>
                      )}
                      {client.overdueInvoices > 0 && (
                        <Badge variant="outline" className="text-xs gap-1 bg-[#FCE8E8] dark:bg-red-900/20">
                          <AlertTriangle className="h-3 w-3" /> {client.overdueInvoices} förfallna
                        </Badge>
                      )}
                      {client.pendingExpenses > 0 && (
                        <Badge variant="outline" className="text-xs gap-1 bg-[#EFF6FF] dark:bg-blue-900/20">
                          <Receipt className="h-3 w-3" /> {client.pendingExpenses} utlägg
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => handleSwitchToClient(client.id)}
                    >
                      Öppna <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
