import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Loader2, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface AccessRequestsProps { companyId: string;
}

interface AccessRequest { id: string;
  user_id: string;
  requested_role: string;
  status: string;
  message: string | null;
  created_at: string;
  user?: { email: string;
    first_name: string;
    last_name: string;
  };
}

const roleLabels: Record<string, string> = { owner: "Ägare",
  accountant: "Redovisare",
  auditor: "Revisor",
  cfo: "CFO",
};

export const AccessRequests = ({ companyId }: AccessRequestsProps) => { const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  useEffect(() => { loadRequests();
  }, [companyId]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("access_requests")
        .select("id, user_id, requested_role, status, message, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const baseRows = (data || []) as AccessRequest[];

      // Hämta profil-info via säker SECURITY DEFINER-RPC (scope: medlemmar i bolaget)
      const userIds = Array.from(new Set(baseRows.map((r) => r.user_id))).filter(Boolean);
      let profileMap = new Map<string, { email: string; first_name: string; last_name: string }>();

      if (userIds.length > 0) {
        const { data: profiles, error: profErr } = await supabase.rpc(
          "get_company_member_profiles",
          { _company_id: companyId, _user_ids: userIds }
        );
        if (profErr) {
          console.warn("Kunde inte hämta profilnamn:", profErr.message);
        } else if (profiles) {
          for (const p of profiles as any[]) {
            profileMap.set(p.id, {
              email: p.email ?? "",
              first_name: p.first_name ?? "",
              last_name: p.last_name ?? "",
            });
          }
        }
      }

      const enriched = baseRows.map((r) => ({
        ...r,
        user: profileMap.get(r.user_id) || { email: "", first_name: "", last_name: "" },
      }));

      setRequests(enriched);
    } catch (error: any) {
      console.error("Error loading access requests:", error);
      toast.error("Kunde inte ladda åtkomstförfrågningar", {
        description: error?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (request: AccessRequest, approved: boolean) => { setProcessing(request.id);
    try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update request status
      const { error: updateError } = await supabase
        .from("access_requests")
        .update({ status: approved ? "approved" : "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq("id", request.id);

      if (updateError) throw updateError;

      // If approved, create user role
      if (approved) { const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: request.user_id,
            company_id: companyId,
            role: request.requested_role as "owner" | "accountant" | "auditor" | "cfo" | "limited_user",
          });

        if (roleError) throw roleError;
      }

      toast.success(approved ? "Åtkomst beviljad" : "Åtkomst nekad");
      setSelectedRequest(null);
      setReviewNotes("");
      loadRequests();
    } catch (error) { console.error("Error processing request:", error);
      toast.error("Kunde inte behandla förfrågan");
    } finally { setProcessing(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  if (loading) { return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Åtkomstförfrågningar
            {pendingCount > 0 && (
              <Badge variant="destructive">{pendingCount}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Granska och godkänn förfrågningar om åtkomst till företaget
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Inga åtkomstförfrågningar
            </p>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {request.user?.first_name} {request.user?.last_name}
                      </span>
                      <Badge
                        variant={ request.status === "pending"
                            ? "secondary"
                            : request.status === "approved"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {request.status === "pending" && (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            Väntar
                          </>
                        )}
                        {request.status === "approved" && (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Godkänd
                          </>
                        )}
                        {request.status === "rejected" && (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Nekad
                          </>
                        )}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {request.user?.email}
                    </div>
                    <div className="text-sm mt-1">
                      Begär: <Badge variant="outline">{roleLabels[request.requested_role]}</Badge>
                    </div>
                    {request.message && (
                      <div className="text-sm mt-2 italic text-muted-foreground">
                        "{request.message}"
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                      {format(new Date(request.created_at), "d MMM yyyy HH:mm", { locale: sv })}
                    </div>
                  </div>
                  {request.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRequest(request)}
                        disabled={processing === request.id}
                      >
                        Granska
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Granska åtkomstförfrågan</DialogTitle>
            <DialogDescription>
              {selectedRequest?.user?.first_name} {selectedRequest?.user?.last_name} ({selectedRequest?.user?.email}) 
              begär {roleLabels[selectedRequest?.requested_role || ""]} åtkomst
            </DialogDescription>
          </DialogHeader>
          {selectedRequest?.message && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm italic">"{selectedRequest.message}"</p>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Anteckning (valfritt)</label>
            <Textarea
              placeholder="Lägg till en anteckning om ditt beslut..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="destructive"
              onClick={() => selectedRequest && handleRequest(selectedRequest, false)}
              disabled={processing === selectedRequest?.id}
            >
              {processing === selectedRequest?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Neka
                </>
              )}
            </Button>
            <Button
              onClick={() => selectedRequest && handleRequest(selectedRequest, true)}
              disabled={processing === selectedRequest?.id}
            >
              {processing === selectedRequest?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Godkänn
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
