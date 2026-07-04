import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Users, Mail, Shield, User } from "lucide-react";

interface FirmTeamProps { firmId: string;
}

interface Member { id: string;
  user_id: string;
  role: string;
  title: string | null;
  is_active: boolean;
  profiles?: { email: string; first_name: string | null; last_name: string | null } | null;
}

const roleLabels: Record<string, string> = { admin: "Administratör",
  consultant: "Konsult",
  viewer: "Läsbehörighet",
};

export const FirmTeam = ({ firmId }: FirmTeamProps) => { const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("consultant");

  useEffect(() => { loadMembers();
  }, [firmId]);

  const loadMembers = async () => { try { const { data, error } = await supabase
        .from("firm_members")
        .select("id, user_id, role, title, is_active")
        .eq("firm_id", firmId)
        .order("created_at");

      if (error) throw error;
      const memberRows = data || [];
      const userIds = memberRows.map(m => m.user_id);
      let profileMap: Record<string, { email: string; first_name: string | null; last_name: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name")
          .in("id", userIds);
        (profiles || []).forEach(p => { profileMap[p.id] = { email: p.email, first_name: p.first_name, last_name: p.last_name }; });
      }
      setMembers(memberRows.map(m => ({ ...m, profiles: profileMap[m.user_id] || null })));
    } catch (error) { console.error("Error loading members:", error);
    } finally { setLoading(false);
    }
  };

  const updateRole = async (memberId: string, newRole: string) => { const { error } = await supabase
      .from("firm_members")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", memberId);

    if (error) { toast.error("Kunde inte uppdatera roll");
    } else { setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      toast.success("Roll uppdaterad");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" /> Teammedlemmar
        </h2>
        <Dialog open={showInvite} onOpenChange={setShowInvite}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Bjud in</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bjud in teammedlem</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>E-post</Label>
                <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="kollega@byrå.se" />
              </div>
              <div className="space-y-2">
                <Label>Roll</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administratör</SelectItem>
                    <SelectItem value="consultant">Konsult</SelectItem>
                    <SelectItem value="viewer">Läsbehörighet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                En inbjudan skickas till personen. De måste ha ett konto på Cogniq för att kunna ansluta.
              </p>
              <ComingSoonButton tooltipText="E-postinbjudan aktiveras i kommande version">
                <Mail className="h-4 w-4 mr-1" /> Skicka inbjudan
              </ComingSoonButton>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Namn</TableHead>
                <TableHead>E-post</TableHead>
                <TableHead>Roll</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map(member => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {member.profiles?.first_name || ""} {member.profiles?.last_name || ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.profiles?.email || "-"}
                  </TableCell>
                  <TableCell>
                    {member.user_id === user?.id ? (
                      <Badge>{roleLabels[member.role]}</Badge>
                    ) : (
                      <Select value={member.role} onValueChange={val => updateRole(member.id, val)}>
                        <SelectTrigger className="w-36 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administratör</SelectItem>
                          <SelectItem value="consultant">Konsult</SelectItem>
                          <SelectItem value="viewer">Läsbehörighet</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.is_active ? "default" : "secondary"}>
                      {member.is_active ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
