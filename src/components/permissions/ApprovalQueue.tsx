import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock, ClipboardList, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useApprovalFlows, type ApprovalRequest } from "@/hooks/useApprovalFlows";

interface ApprovalQueueProps { companyId: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = { pending: { label: "Väntar", variant: "outline" },
  approved: { label: "Godkänd", variant: "default" },
  rejected: { label: "Avvisad", variant: "destructive" },
  cancelled: { label: "Avbruten", variant: "secondary" },
};

const entityTypeLabels: Record<string, string> = { invoice: "Faktura",
  payment_proposal: "Betalningsförslag",
  payroll_run: "Lönekörning",
  expense_claim: "Utlägg",
  journal_entry: "Verifikation",
  corporate_action: "Företagshändelse",
};

export const ApprovalQueue = ({ companyId }: ApprovalQueueProps) => { const { user } = useAuth();
  const { requests, loading, submitDecision, refreshRequests } = useApprovalFlows(companyId);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [comment, setComment] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("pending");
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => { if (requests.length > 0) { const userIds = [...new Set(requests.map((r) => r.requested_by))];
      loadProfiles(userIds);
    }
  }, [requests]);

  const loadProfiles = async (userIds: string[]) => { try { const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", userIds);
      if (data) { const map: Record<string, string> = {};
        data.forEach((p: any) => { map[p.id] = p.first_name && p.last_name
            ? `${p.first_name} ${p.last_name}`
            : p.email || p.id.slice(0, 8);
        });
        setProfiles(map);
      }
    } catch {}
  };

  const handleDecision = async (decision: "approved" | "rejected") => { if (!selectedRequest || !user) return;
    setDeciding(true);
    try { await submitDecision(selectedRequest.id, selectedRequest.current_step, decision, comment);
      toast.success(decision === "approved" ? "Godkänd" : "Avvisad");
      setSelectedRequest(null);
      setComment("");
    } catch (error: any) { toast.error(error.message || "Kunde inte spara beslut");
    } finally { setDeciding(false);
    }
  };

  const filteredRequests = requests.filter((r) => { if (filter === "pending") return r.status === "pending";
    if (filter === "completed") return r.status !== "pending";
    return true;
  });

  if (loading) { return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-5 w-5" />
                Godkännandekö
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-1">{pendingCount}</Badge>
                )}
              </CardTitle>
              <CardDescription>Ärenden som väntar på godkännande</CardDescription>
            </div>
            <div className="flex gap-1">
              {(["pending", "completed", "all"] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f === "pending" ? "Väntande" : f === "completed" ? "Klara" : "Alla"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="font-medium">
                {filter === "pending" ? "Inga väntande godkännanden" : "Inga ärenden"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Typ</TableHead>
                  <TableHead>Begärd av</TableHead>
                  <TableHead>Detaljer</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => { const status = statusConfig[req.status] || statusConfig.pending;
                  return (
                    <TableRow key={req.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {entityTypeLabels[req.entity_type] || req.entity_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {profiles[req.requested_by] || req.requested_by.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                        {req.metadata?.description || req.metadata?.title || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString("sv-SE")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {req.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedRequest(req)}
                          >
                            Granska
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Granska ärende</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  {entityTypeLabels[selectedRequest.entity_type] || selectedRequest.entity_type}
                  {" — "}begärd av {profiles[selectedRequest.requested_by] || "okänd"}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Typ</span>
                  <span>{entityTypeLabels[selectedRequest.entity_type] || selectedRequest.entity_type}</span>
                </div>
                {selectedRequest.metadata?.amount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Belopp</span>
                    <span className="font-medium">
                      {Number(selectedRequest.metadata.amount).toLocaleString("sv-SE")} kr
                    </span>
                  </div>
                )}
                {selectedRequest.metadata?.description && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Beskrivning</span>
                    <span>{selectedRequest.metadata.description}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Steg</span>
                  <span>{selectedRequest.current_step} av {selectedRequest.metadata?.total_steps || 1}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Kommentar (valfritt)
                </label>
                <Textarea
                  placeholder="Skriv en kommentar..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  variant="destructive"
                  onClick={() => handleDecision("rejected")}
                  disabled={deciding}
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Avvisa
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleDecision("approved")}
                  disabled={deciding}
                >
                  {deciding ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  )}
                  Godkänn
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
