import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Search, Download, RefreshCw, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface AuditEvent { id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  created_at: string;
  ip_address: string | null;
  data_categories: string[] | null;
  processing_purpose: string | null;
  legal_basis: string | null;
}

const EVENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: "Skapad", color: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]" },
  update: { label: "Uppdaterad", color: "bg-[#EFF6FF] text-[#1E3A5F] border-[#C8DDF5]" },
  delete: { label: "Raderad", color: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]" },
  view:   { label: "Visad", color: "bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]" },
  export: { label: "Exporterad", color: "bg-[#EFF6FF] text-[#1E3A5F] border-[#C8DDF5]" },
  login:  { label: "Inloggning", color: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]" },
  logout: { label: "Utloggning", color: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]" },
};

const AuditLog = () => { const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");

  useEffect(() => { if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => { if (user) loadEvents();
  }, [user]);

  const loadEvents = async () => { setLoading(true);
    try { const { data, error } = await supabase
        .from("audit_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) { console.error("Error loading audit events:", error);
    } finally { setLoading(false);
    }
  };

  const filteredEvents = events.filter((e) => { if (eventTypeFilter !== "all" && e.event_type !== eventTypeFilter) return false;
    if (entityTypeFilter !== "all" && e.entity_type !== entityTypeFilter) return false;
    if (searchQuery) { const q = searchQuery.toLowerCase();
      return (
        e.entity_type.toLowerCase().includes(q) ||
        e.event_type.toLowerCase().includes(q) ||
        e.entity_id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const uniqueEntityTypes = [...new Set(events.map((e) => e.entity_type))];
  const uniqueEventTypes = [...new Set(events.map((e) => e.event_type))];

  const exportCSV = () => { const headers = ["Tidpunkt", "Händelse", "Entitet", "Entitet-ID", "Användare", "IP", "Syfte", "Rättslig grund"];
    const rows = filteredEvents.map((e) => [
      e.created_at,
      e.event_type,
      e.entity_type,
      e.entity_id,
      e.user_id,
      e.ip_address || "",
      e.processing_purpose || "",
      e.legal_basis || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div>
      <PageHeader
        icon={Shield}
        title="Revisionslogg"
        subtitle="Spårning av alla händelser för compliance"
        actions={ <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadEvents} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Uppdatera
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" />
              Exportera CSV
            </Button>
          </div>
        }
      />
      <div className="px-8 space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold">{events.length}</p>
            <p className="text-xs text-muted-foreground">Totalt händelser</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold">{events.filter((e) => e.event_type === "create").length}</p>
            <p className="text-xs text-muted-foreground">Skapade</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold">{events.filter((e) => e.event_type === "update").length}</p>
            <p className="text-xs text-muted-foreground">Uppdateringar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold">{uniqueEntityTypes.length}</p>
            <p className="text-xs text-muted-foreground">Entitetstyper</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sök i loggen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Händelsetyp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla händelser</SelectItem>
                {uniqueEventTypes.map((t) => (
                  <SelectItem key={t} value={t}>{EVENT_TYPE_LABELS[t]?.label || t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Entitetstyp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla entiteter</SelectItem>
                {uniqueEntityTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tidpunkt</TableHead>
                    <TableHead>Händelse</TableHead>
                    <TableHead>Entitet</TableHead>
                    <TableHead className="hidden md:table-cell">Syfte</TableHead>
                    <TableHead className="hidden md:table-cell">Rättslig grund</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Inga händelser hittades
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEvents.map((event) => { const config = EVENT_TYPE_LABELS[event.event_type];
                      return (
                        <TableRow key={event.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(event.created_at), "d MMM yyyy HH:mm", { locale: sv })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={config?.color || ""}>
                              {config?.label || event.event_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">{event.entity_type}</span>
                            <br />
                            <span className="text-xs text-muted-foreground font-mono">
                              {event.entity_id.substring(0, 8)}...
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            {event.processing_purpose || "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            {event.legal_basis || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default AuditLog;
