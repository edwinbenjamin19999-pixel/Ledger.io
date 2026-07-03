import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X, UserCheck, Mail, ShieldOff, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface AuditorAccessProps { companyId: string; companyName?: string; }

interface AuditorRow {
  key: string;
  kind: "active" | "pending";
  email: string;
  name?: string | null;
  user_id?: string;
  invitation_id?: string;
}

export const AuditorAccess = ({ companyId, companyName }: AuditorAccessProps) => {
  const [rows, setRows] = useState<AuditorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  const [revokeTarget, setRevokeTarget] = useState<AuditorRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AuditorRow | null>(null);

  useEffect(() => {
    loadAuditorsAndInvitations();

    const channel = supabase
      .channel(`auditor-roles-${companyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles", filter: `company_id=eq.${companyId}` },
        () => loadAuditorsAndInvitations(),
      )
      .subscribe();

    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.companyId === companyId) loadAuditorsAndInvitations();
    };
    window.addEventListener("company-members-changed", onChanged);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("company-members-changed", onChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const loadAuditorsAndInvitations = async () => {
    setLoading(true);
    try {
      const [rolesRes, invitesRes] = await Promise.all([
        supabase.from("user_roles").select("user_id").eq("company_id", companyId).eq("role", "auditor"),
        supabase
          .from("user_invitations")
          .select("id, email, status, accepted_by")
          .eq("company_id", companyId)
          .eq("role", "auditor"),
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (invitesRes.error) throw invitesRes.error;

      const userIds = (rolesRes.data || []).map((r) => r.user_id);
      let profiles: Array<{ id: string; email: string | null; first_name: string | null; last_name: string | null }> = [];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name")
          .in("id", userIds);
        profiles = profs || [];
      }

      // Map invitations by accepted_by user id for active rows
      const invByUser = new Map<string, { id: string; email: string }>();
      const pendingInvites: AuditorRow[] = [];
      for (const inv of invitesRes.data || []) {
        if (inv.accepted_by) invByUser.set(inv.accepted_by, { id: inv.id, email: inv.email });
        if (inv.status === "pending") {
          pendingInvites.push({
            key: `inv-${inv.id}`,
            kind: "pending",
            email: inv.email,
            invitation_id: inv.id,
          });
        }
      }

      const activeRows: AuditorRow[] = userIds.map((uid) => {
        const p = profiles.find((x) => x.id === uid);
        const inv = invByUser.get(uid);
        const name = p && (p.first_name || p.last_name) ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : null;
        return {
          key: `role-${uid}`,
          kind: "active",
          user_id: uid,
          email: p?.email || inv?.email || uid.slice(0, 8) + "…",
          name,
          invitation_id: inv?.id,
        };
      });

      // Hide pending if user has already accepted (in active list by accepted_by email)
      const activeEmails = new Set(activeRows.map((r) => r.email.toLowerCase()));
      const visiblePending = pendingInvites.filter((p) => !activeEmails.has(p.email.toLowerCase()));

      setRows([...activeRows, ...visiblePending]);
    } catch (error: any) {
      console.error("Error loading auditors:", error);
      toast.error("Kunde inte ladda revisorer", { description: error?.message });
    } finally {
      setLoading(false);
    }
  };

  const addAuditor = async () => {
    if (!newEmail) { toast.error("Ange e-postadress"); return; }
    setWorking(true);
    try {
      const response = await supabase.functions.invoke("send-invitation", {
        body: { email: newEmail.trim().toLowerCase(), companyId, role: "auditor", companyName },
      });
      if (response.error) {
        const serverMsg = (response.data as any)?.error || response.error.message;
        throw new Error(serverMsg || "Kunde inte skicka inbjudan");
      }
      if (response.data?.alreadyMember) {
        toast.info(response.data.message || "Användaren har redan åtkomst");
      } else if (response.data?.emailSent === false) {
        toast.warning("Inbjudan skapades men mejl kunde inte skickas", {
          description: response.data?.emailError || "Kopiera länken manuellt.",
        });
        if (response.data?.inviteUrl) navigator.clipboard.writeText(response.data.inviteUrl);
      } else {
        toast.success(`Inbjudan skickad till ${newEmail}`);
        if (response.data?.inviteUrl) navigator.clipboard.writeText(response.data.inviteUrl);
      }
      setNewEmail("");
      setShowAddDialog(false);
      loadAuditorsAndInvitations();
      window.dispatchEvent(new CustomEvent("company-members-changed", { detail: { companyId } }));
    } catch (error: any) {
      console.error("Error adding auditor:", error);
      toast.error(error.message || "Kunde inte lägga till revisor");
    } finally {
      setWorking(false);
    }
  };

  const resendPending = async (row: AuditorRow) => {
    try {
      const response = await supabase.functions.invoke("send-invitation", {
        body: { email: row.email, companyId, role: "auditor", companyName, resend: true },
      });
      if (response.error) {
        const serverMsg = (response.data as any)?.error || response.error.message;
        throw new Error(serverMsg || "Kunde inte skicka inbjudan igen");
      }
      toast.success(`Inbjudan skickades igen till ${row.email}`);
    } catch (error: any) {
      toast.error(error.message || "Kunde inte skicka inbjudan igen");
    }
  };

  const cancelPending = async () => {
    if (!cancelTarget?.invitation_id) return;
    const { error } = await supabase
      .from("user_invitations")
      .update({ status: "cancelled" })
      .eq("id", cancelTarget.invitation_id);
    if (error) { toast.error(error.message || "Kunde inte avbryta"); return; }
    toast.success("Inbjudan avbruten");
    loadAuditorsAndInvitations();
    window.dispatchEvent(new CustomEvent("company-members-changed", { detail: { companyId } }));
  };

  const revokeActive = async () => {
    if (!revokeTarget) return;
    const target = revokeTarget;
    try {
      if (target.invitation_id) {
        const response = await supabase.functions.invoke("revoke-invitation-access", {
          body: { invitationId: target.invitation_id },
        });
        if (response.error) {
          const serverMsg = (response.data as any)?.error || response.error.message;
          throw new Error(serverMsg || "Kunde inte ta bort åtkomst");
        }
      } else if (target.user_id) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", target.user_id)
          .eq("company_id", companyId)
          .eq("role", "auditor");
        if (error) throw error;
      }
      toast.success(`Åtkomst borttagen för ${target.email}`);
      loadAuditorsAndInvitations();
      window.dispatchEvent(new CustomEvent("company-members-changed", { detail: { companyId } }));
    } catch (error: any) {
      toast.error(error.message || "Kunde inte ta bort åtkomst");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Revisorsbehörighet</CardTitle>
              <CardDescription>
                Ge revisorer läsbehörighet till företagets bokföring
              </CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Lägg till revisor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Lägg till revisor</DialogTitle>
                  <DialogDescription>
                    Revisorn får en inbjudan via mejl. Externa revisorer kan skapa konto via länken.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="auditor-email">E-postadress</Label>
                    <Input
                      id="auditor-email"
                      type="email"
                      placeholder="revisor@exempel.se"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addAuditor()}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addAuditor} disabled={working} className="flex-1">
                      {working ? "Skickar..." : "Skicka inbjudan"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Avbryt
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Inga revisorer har tillgång än</p>
              <p className="text-sm mt-2">
                Lägg till revisorer som ska kunna granska bokföringen
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between p-3 border rounded-lg gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{row.name || row.email}</p>
                    {row.name && (
                      <p className="text-sm text-muted-foreground truncate">{row.email}</p>
                    )}
                    {row.kind === "active" ? (
                      <Badge variant="secondary" className="mt-1">
                        <UserCheck className="w-3 h-3 mr-1" />
                        Revisor (läsbehörighet)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="mt-1">
                        <Mail className="w-3 h-3 mr-1" />
                        Inbjudan skickad
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {row.kind === "pending" ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => resendPending(row)}>
                          Skicka igen
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setCancelTarget(row)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setRevokeTarget(row)}>
                        <ShieldOff className="w-4 h-4 mr-1" />
                        Ta bort access
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
        title="Ta bort revisorns åtkomst?"
        description={`${revokeTarget?.email} kommer inte längre att kunna granska bokföringen.`}
        confirmLabel="Ta bort åtkomst"
        variant="destructive"
        onConfirm={revokeActive}
      />
      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title="Avbryt inbjudan?"
        description={`Inbjudan till ${cancelTarget?.email} kommer att tas bort.`}
        confirmLabel="Avbryt inbjudan"
        variant="destructive"
        onConfirm={cancelPending}
      />
    </>
  );
};
