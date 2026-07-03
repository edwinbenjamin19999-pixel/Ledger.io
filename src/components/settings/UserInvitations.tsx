import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { UserPlus, Mail, X, Loader2, ShieldOff } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface UserInvitationsProps { companyId: string }

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
  invited_by: string;
  accepted_by?: string | null;
}

const roleLabels: Record<string, string> = {
  owner: "Ägare",
  accountant: "Redovisare",
  auditor: "Revisor",
  cfo: "CFO",
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; hint?: string }> = {
  pending: {
    label: "Väntar på accept",
    variant: "secondary",
    hint: "Inbjudan är skickad men användaren har ännu inte loggat in och accepterat. Hen har inte åtkomst förrän inbjudan accepterats.",
  },
  accepted: {
    label: "Aktiv medlem",
    variant: "default",
    hint: "Användaren har accepterat inbjudan och har full åtkomst till bolaget.",
  },
  expired: {
    label: "Utgången",
    variant: "destructive",
    hint: "Inbjudan har gått ut. Skicka en ny inbjudan för att ge åtkomst.",
  },
};

// Statusar som ALDRIG visas i listan
const HIDDEN_STATUSES = new Set(["cancelled", "revoked"]);

export const UserInvitations = ({ companyId }: UserInvitationsProps) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("accountant");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  // Confirm dialog state
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Invitation | null>(null);

  useEffect(() => {
    loadInvitations();
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, [companyId]);

  const loadInvitations = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("user_invitations")
        .select("id, email, role, status, created_at, expires_at, invited_by, accepted_by")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const visible = (data || []).filter((i) => !HIDDEN_STATUSES.has(i.status));
      setInvitations(visible);
    } catch (error: any) {
      console.error("Error loading invitations:", error);
      const msg = error?.message || "Okänt fel";
      setLoadError(msg);
      toast.error("Kunde inte ladda inbjudningar", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async () => {
    if (!email || !role) { toast.error("Fyll i e-post och välj roll"); return; }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("send-invitation", {
        body: { email, companyId, role },
      });

      if (response.error) {
        const serverMsg = (response.data as any)?.error || response.error.message;
        throw new Error(serverMsg || "Kunde inte skicka inbjudan");
      }

      toast.success(`Inbjudan skickad till ${email}`);

      if (response.data?.inviteUrl) {
        toast.info("Inbjudningslänk kopierad till urklipp", { duration: 5000 });
        navigator.clipboard.writeText(response.data.inviteUrl);
      }

      setEmail("");
      setRole("accountant");
      setShowDialog(false);
      loadInvitations();
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error(error.message || "Kunde inte skicka inbjudan");
    } finally {
      setSending(false);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("user_invitations")
        .update({ status: "cancelled" })
        .eq("id", invitationId);
      if (error) throw error;
      toast.success("Inbjudan avbruten");
      loadInvitations();
      window.dispatchEvent(new CustomEvent("company-members-changed", { detail: { companyId } }));
    } catch (error: any) {
      console.error("Error cancelling invitation:", error);
      toast.error(error?.message || "Kunde inte avbryta inbjudan");
    }
  };

  const resendInvitation = async (invitation: Invitation) => {
    try {
      const response = await supabase.functions.invoke("send-invitation", {
        body: { email: invitation.email, companyId, role: invitation.role, resend: true },
      });
      if (response.error) {
        const serverMsg = (response.data as any)?.error || response.error.message;
        throw new Error(serverMsg || "Kunde inte skicka inbjudan igen");
      }
      if (response.data?.alreadyMember) {
        toast.info(response.data.message || "Användaren har redan åtkomst");
        loadInvitations();
        return;
      }
      if (response.data?.emailSent === false) {
        toast.warning("Inbjudan skapades men mejl kunde inte skickas", {
          description: response.data?.emailError || "Kopiera länken manuellt.",
        });
        if (response.data?.inviteUrl) navigator.clipboard.writeText(response.data.inviteUrl);
      } else {
        toast.success(`Inbjudan skickades igen till ${invitation.email}`);
      }
      loadInvitations();
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      toast.error(error.message || "Kunde inte skicka inbjudan igen");
    }
  };

  const revokeAccess = async () => {
    if (!revokeTarget) return;
    const target = revokeTarget;
    const response = await supabase.functions.invoke("revoke-invitation-access", {
      body: { invitationId: target.id },
    });
    if (response.error) {
      const serverMsg = (response.data as any)?.error || response.error.message;
      toast.error(serverMsg || "Kunde inte ta bort åtkomst");
      return;
    }
    toast.success(`Åtkomst borttagen för ${target.email}`);
    loadInvitations();
    window.dispatchEvent(new CustomEvent("company-members-changed", { detail: { companyId } }));
  };

  const removeFromList = async () => {
    if (!removeTarget) return;
    const target = removeTarget;
    const { error } = await supabase
      .from("user_invitations")
      .delete()
      .eq("id", target.id);
    if (error) {
      toast.error(error.message || "Kunde inte ta bort raden");
      return;
    }
    toast.success("Raden borttagen");
    loadInvitations();
    window.dispatchEvent(new CustomEvent("company-members-changed", { detail: { companyId } }));
  };

  const changeRole = async (invitation: Invitation, newRole: string) => {
    if (newRole === invitation.role) return;
    setUpdatingRoleId(invitation.id);
    try {
      if (invitation.status === "pending") {
        const { error } = await supabase
          .from("user_invitations")
          .update({ role: newRole as any })
          .eq("id", invitation.id);
        if (error) throw error;
        toast.success(`Roll uppdaterad till ${roleLabels[newRole] || newRole}`);
      } else if (invitation.status === "accepted") {
        const response = await supabase.functions.invoke("update-member-role", {
          body: { invitationId: invitation.id, newRole },
        });
        if (response.error) {
          const serverMsg = (response.data as any)?.error || response.error.message;
          throw new Error(serverMsg || "Kunde inte uppdatera roll");
        }
        toast.success(`Roll uppdaterad till ${roleLabels[newRole] || newRole}`);
      }
      loadInvitations();
      window.dispatchEvent(new CustomEvent("company-members-changed", { detail: { companyId } }));
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast.error(error.message || "Kunde inte uppdatera roll");
    } finally {
      setUpdatingRoleId(null);
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Bjud in användare
          </CardTitle>
          <CardDescription>Bjud in redovisare, revisorer och andra till företaget</CardDescription>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Ny inbjudan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bjud in användare</DialogTitle>
              <DialogDescription>
                Skicka en inbjudan via e-post. Användaren får en länk för att acceptera.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-postadress</Label>
                <Input id="email" type="email" placeholder="namn@foretag.se" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Roll</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accountant">Redovisare</SelectItem>
                    <SelectItem value="auditor">Revisor</SelectItem>
                    <SelectItem value="cfo">CFO</SelectItem>
                    <SelectItem value="owner">Ägare</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Avbryt</Button>
              <Button onClick={sendInvitation} disabled={sending}>
                {sending ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Skickar...</>) : (<><Mail className="h-4 w-4 mr-2" />Skicka inbjudan</>)}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loadError ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-destructive">Kunde inte ladda inbjudningar</p>
            <p className="text-xs text-muted-foreground">{loadError}</p>
            <Button variant="outline" size="sm" onClick={loadInvitations}>Försök igen</Button>
          </div>
        ) : invitations.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Inga inbjudningar skickade ännu</p>
        ) : (
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{invitation.email}</span>
                    <Badge
                      variant={statusLabels[invitation.status]?.variant || "secondary"}
                      title={statusLabels[invitation.status]?.hint}
                    >
                      {statusLabels[invitation.status]?.label || invitation.status}
                    </Badge>
                    {(invitation.status === "pending" || invitation.status === "accepted") ? (
                      <Select
                        value={invitation.role}
                        onValueChange={(v) => changeRole(invitation, v)}
                        disabled={
                          updatingRoleId === invitation.id ||
                          (invitation.status === "accepted" &&
                            invitation.accepted_by === currentUserId &&
                            invitation.role === "owner")
                        }
                      >
                        <SelectTrigger className="h-7 w-[140px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="accountant">Redovisare</SelectItem>
                          <SelectItem value="auditor">Revisor</SelectItem>
                          <SelectItem value="cfo">CFO</SelectItem>
                          <SelectItem value="owner">Ägare</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">{roleLabels[invitation.role] || invitation.role}</Badge>
                    )}
                    {updatingRoleId === invitation.id && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Skickad {format(new Date(invitation.created_at), "d MMM yyyy", { locale: sv })}
                    {invitation.status === "pending" && (
                      <> · Utgår {format(new Date(invitation.expires_at), "d MMM", { locale: sv })}</>
                    )}
                  </div>
                </div>

                {invitation.status === "pending" && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => resendInvitation(invitation)}>
                      Skicka igen
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => cancelInvitation(invitation.id)} title="Avbryt inbjudan">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {invitation.status === "accepted" && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRevokeTarget(invitation)}
                      className="text-destructive hover:text-destructive"
                    >
                      <ShieldOff className="h-4 w-4 mr-1" />
                      Ta bort access
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setRemoveTarget(invitation)} title="Ta bort från lista">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(o) => { if (!o) setRevokeTarget(null); }}
        title="Ta bort åtkomst?"
        description={`${revokeTarget?.email} kommer omedelbart förlora åtkomst till bolaget. Användarens konto raderas inte, men de kan inte längre logga in mot detta bolag förrän de bjuds in igen.`}
        confirmLabel="Ta bort åtkomst"
        variant="destructive"
        onConfirm={revokeAccess}
      />

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => { if (!o) setRemoveTarget(null); }}
        title="Ta bort raden från historiken?"
        description={`Inbjudan för ${removeTarget?.email} tas bort permanent från listan. Detta påverkar inte användarens nuvarande åtkomst.`}
        confirmLabel="Ta bort"
        variant="destructive"
        onConfirm={removeFromList}
      />
    </Card>
  );
};
