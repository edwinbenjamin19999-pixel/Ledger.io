import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Users, Mail, Building2, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface WaitlistEntry { id: string;
  email: string;
  name: string | null;
  company_name: string | null;
  source: string | null;
  created_at: string;
}

export const WaitlistPanel = () => { const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => { loadEntries();
  }, []);

  const loadEntries = async () => { setLoading(true);
    const { data, error } = await supabase
      .from("waitlist")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) { setEntries(data);
    }
    setLoading(false);
  };

  const filtered = entries.filter((e) => { if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.email.toLowerCase().includes(q) ||
      (e.name?.toLowerCase().includes(q) ?? false) ||
      (e.company_name?.toLowerCase().includes(q) ?? false)
    );
  });

  const sourceLabel = (s: string | null) => { switch (s) { case "early_bird_cta": return "Early Bird";
      case "landing_page": return "Landningssida";
      default: return s || "Okänd";
    }
  };

  const sourceBadgeVariant = (s: string | null): "default" | "secondary" | "outline" => { switch (s) { case "early_bird_cta": return "default";
      case "landing_page": return "secondary";
      default: return "outline";
    }
  };

  if (loading) { return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Laddar intresseanmälningar...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{entries.length}</p>
              <p className="text-xs text-muted-foreground">Totalt anmälda</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Mail className="h-8 w-8 text-secondary" />
            <div>
              <p className="text-2xl font-bold">
                {entries.filter((e) => e.source === "early_bird_cta").length}
              </p>
              <p className="text-xs text-muted-foreground">Via Early Bird CTA</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-accent-foreground" />
            <div>
              <p className="text-2xl font-bold">
                {entries.filter((e) => e.company_name).length}
              </p>
              <p className="text-xs text-muted-foreground">Med företagsnamn</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Send launch email button */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium">Skicka lanseringsmejl</p>
            <p className="text-sm text-muted-foreground">
              Skicka mejl till alla {entries.length} registrerade om att Ledger.io AI lanseras
            </p>
          </div>
          <Button
            onClick={async () => { setSending(true);
              try { const { data, error } = await supabase.functions.invoke("send-launch-emails");
                if (error) throw error;
                toast.success(`Lanseringsmejl skickade till ${data?.sent || 0} av ${data?.total || 0} mottagare`);
              } catch (err: any) { toast.error("Kunde inte skicka mejl: " + (err?.message || "Okänt fel"));
              } finally { setSending(false);
              }
            }}
            disabled={sending || entries.length === 0}
          >
            {sending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Skickar...</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> Skicka lanseringsmejl</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Search + Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Intresseanmälningar
          </CardTitle>
          <CardDescription>
            Alla som anmält sig via landningssidan eller early bird-erbjudandet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sök e-post, namn eller företag..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Namn</TableHead>
                  <TableHead>E-post</TableHead>
                  <TableHead>Företag</TableHead>
                  <TableHead>Källa</TableHead>
                  <TableHead>Datum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.name || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{entry.email}</TableCell>
                    <TableCell>
                      {entry.company_name || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sourceBadgeVariant(entry.source)}>
                        {sourceLabel(entry.source)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString("sv-SE")}{" "}
                      {new Date(entry.created_at).toLocaleTimeString("sv-SE", { hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Inga intresseanmälningar ännu
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
