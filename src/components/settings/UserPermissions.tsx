import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, Loader2 } from "lucide-react";

interface UserPermissionsProps { companyId: string;
}

interface UserWithPermissions {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: Record<string, string>;
}

const modules = [
  { id: "invoices", label: "Fakturor" },
  { id: "bookkeeping", label: "Bokföring" },
  { id: "payroll", label: "Lön" },
  { id: "bank", label: "Bank" },
  { id: "reports", label: "Rapporter" },
  { id: "tax", label: "Skatt" },
  { id: "employees", label: "Anställda" },
  { id: "settings", label: "Inställningar" },
  { id: "consolidation", label: "Koncern" },
];

const permissionLevels = [
  { id: "none", label: "Ingen" },
  { id: "view", label: "Visa" },
  { id: "create", label: "Skapa" },
  { id: "edit", label: "Redigera" },
  { id: "approve", label: "Godkänn" },
  { id: "full", label: "Full" },
];

const roleLabels: Record<string, string> = {
  owner: "Ägare",
  accountant: "Redovisare",
  auditor: "Revisor",
  cfo: "CFO",
};

export const UserPermissions = ({ companyId }: UserPermissionsProps) => {
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const loadUsersAndPermissions = useCallback(async () => {
    try {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          role,
          profiles:user_id (
            id,
            email,
            first_name,
            last_name
          )
        `)
        .eq("company_id", companyId);

      if (rolesError) throw rolesError;

      // Hämta inbjudningar för fallback-email när profil saknas
      const { data: invites } = await supabase
        .from("user_invitations")
        .select("accepted_by, email")
        .eq("company_id", companyId)
        .not("accepted_by", "is", null);

      const inviteEmailMap = new Map<string, string>();
      invites?.forEach((i) => {
        if (i.accepted_by && i.email) inviteEmailMap.set(i.accepted_by, i.email);
      });

      const { data: permissions, error: permError } = await supabase
        .from("user_permissions")
        .select("user_id, module, permission")
        .eq("company_id", companyId);

      if (permError) throw permError;

      const usersMap = new Map<string, UserWithPermissions>();

      roles?.forEach((r) => {
        const profile = r.profiles as unknown as Record<string, unknown> | null;
        const fallbackEmail = inviteEmailMap.get(r.user_id) || "";
        usersMap.set(r.user_id, {
          userId: r.user_id,
          email: ((profile?.email as string) || fallbackEmail || ""),
          firstName: (profile?.first_name as string) || "",
          lastName: (profile?.last_name as string) || "",
          role: r.role,
          permissions: {},
        });
      });

      permissions?.forEach((p) => {
        const user = usersMap.get(p.user_id);
        if (user) user.permissions[p.module] = p.permission;
      });

      setUsers(Array.from(usersMap.values()));
    } catch (error) {
      console.error("Error loading permissions:", error);
      toast.error("Kunde inte ladda behörigheter");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadUsersAndPermissions();
  }, [loadUsersAndPermissions]);

  // Lyssna på custom event från UserInvitations
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.companyId === companyId) {
        loadUsersAndPermissions();
      }
    };
    window.addEventListener("company-members-changed", handler);
    return () => window.removeEventListener("company-members-changed", handler);
  }, [companyId, loadUsersAndPermissions]);

  // Realtime: reload när user_roles ändras för detta bolag
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel(`user_roles-${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_roles",
          filter: `company_id=eq.${companyId}`,
        },
        () => loadUsersAndPermissions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, loadUsersAndPermissions]);

  const updatePermission = async (userId: string, module: string, permission: string) => {
    setSaving(`${userId}-${module}`);
    try {
      const { error } = await supabase
        .from("user_permissions")
        .upsert({
          user_id: userId,
          company_id: companyId,
          module: module as "invoices" | "bookkeeping" | "payroll" | "bank" | "reports" | "tax" | "employees" | "settings" | "consolidation",
          permission: permission as "none" | "view" | "create" | "edit" | "approve" | "full",
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,company_id,module" });

      if (error) throw error;

      setUsers(users.map(u => {
        if (u.userId === userId) {
          return { ...u, permissions: { ...u.permissions, [module]: permission } };
        }
        return u;
      }));

      toast.success("Behörighet uppdaterad");
    } catch (error) {
      console.error("Error updating permission:", error);
      toast.error("Kunde inte uppdatera behörighet");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const displayName = (u: UserWithPermissions) => {
    const full = `${u.firstName} ${u.lastName}`.trim();
    if (full) return full;
    if (u.email) return u.email;
    return `Användare ${u.userId.slice(0, 8)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Modulbehörigheter
        </CardTitle>
        <CardDescription>
          Anpassa vilka moduler varje användare har tillgång till
        </CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Inga användare har tillgång till detta företag ännu
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Användare</TableHead>
                  {modules.map((mod) => (
                    <TableHead key={mod.id} className="text-center min-w-24">
                      {mod.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{displayName(user)}</div>
                        {user.email && (user.firstName || user.lastName) && (
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        )}
                        <Badge variant="outline" className="mt-1">
                          {roleLabels[user.role] || user.role}
                        </Badge>
                      </div>
                    </TableCell>
                    {modules.map((mod) => (
                      <TableCell key={mod.id} className="text-center">
                        {user.role === "owner" ? (
                          <Badge>Full</Badge>
                        ) : (
                          <Select
                            value={user.permissions[mod.id] || "none"}
                            onValueChange={(value) => updatePermission(user.userId, mod.id, value)}
                            disabled={saving === `${user.userId}-${mod.id}`}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {permissionLevels.map((level) => (
                                <SelectItem key={level.id} value={level.id}>
                                  {level.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
