import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyRole } from "@/hooks/useCompanyRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, AlertTriangle, FileText, Eye, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorFallback } from "@/components/common/ErrorFallback";

interface JournalEntry { id: string;
  journal_number: string | null;
  entry_date: string;
  description: string | null;
  status: string;
  ai_confidence: number | null;
  ai_explanation: string | null;
  created_at: string;
  documents?: { file_name: string;
  };
  companies?: { name: string;
  };
}

const AuditorDashboard = () => { const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const { role, loading: roleLoading } = useCompanyRole(selectedCompany);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => { if (!loading && !user) { navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => { if (user) { loadCompanies();
    }
  }, [user]);

  useEffect(() => { if (selectedCompany) { loadJournalEntries();
    }
  }, [selectedCompany]);

  const loadCompanies = async () => { try { setError(null);
      // Only load companies where user has auditor access
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", user?.id)
        .eq("role", "auditor");

      if (rolesError) throw rolesError;

      if (!roles || roles.length === 0) { toast.info("Du har inte tillgång till några företag som revisor ännu", { description: "Be en företagsägare att lägga till dig under Inställningar → Användare"
        });
        setCompanies([]);
        return;
      }

      const companyIds = roles.map(r => r.company_id);

      const { data, error } = await supabase
        .from("companies")
        .select("id, name, org_number")
        .in("id", companyIds)
        .order("name");

      if (error) throw error;
      setCompanies(data || []);
      if (data && data.length > 0) { setSelectedCompany(data[0].id);
      }
    } catch (error: any) { console.error("Error loading companies:", error);
      setError(error);
      toast.error(error.message || "Kunde inte ladda företag");
    }
  };

  const loadJournalEntries = async () => { setIsLoading(true);
    try { const { data, error } = await supabase
        .from("journal_entries")
        .select(`
          *,
          documents(file_name),
          companies(name)
        `)
        .eq("company_id", selectedCompany)
        .in("status", ["draft", "pending_approval"])
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setEntries(data || []);
    } catch (error: any) { toast.error(error.message || "Kunde inte ladda verifikat");
    } finally { setIsLoading(false);
    }
  };

  const handleReview = async (entryId: string, action: "approved" | "rejected") => { setIsReviewing(true);
    try { // Update journal entry status
      const newStatus = action === "approved" ? "approved" : "rejected";
      const { error: updateError } = await supabase
        .from("journal_entries")
        .update({ status: newStatus,
          approved_by: action === "approved" ? user!.id : null,
        })
        .eq("id", entryId);

      if (updateError) throw updateError;

      // Log review
      const { error: logError } = await supabase
        .from("review_logs")
        .insert({ journal_entry_id: entryId,
          reviewer_id: user!.id,
          review_action: action,
          review_notes: reviewNotes || null,
        });

      if (logError) throw logError;

      toast.success(
        action === "approved" ? "Verifikat godkänt!" : "Verifikat avvisat"
      );
      setSelectedEntry(null);
      setReviewNotes("");
      loadJournalEntries();
    } catch (error: any) { toast.error(error.message || "Kunde inte spara granskning");
    } finally { setIsReviewing(false);
    }
  };

  const getConfidenceBadge = (confidence: number | null) => { if (confidence === null) return null;

    const percent = confidence * 100;
    if (percent >= 95) { return (
        <Badge variant="outline" className="text-[#085041] border-green-600">
          {percent.toFixed(0)}% säkerhet
        </Badge>
      );
    } else if (percent >= 80) { return (
        <Badge variant="outline" className="text-[#7A5417] border-yellow-600">
          {percent.toFixed(0)}% säkerhet
        </Badge>
      );
    } else { return (
        <Badge variant="outline" className="text-[#7A1A1A] border-red-600">
          {percent.toFixed(0)}% säkerhet
        </Badge>
      );
    }
  };

  const getStatusIcon = (confidence: number | null) => { if (confidence === null) return <FileText className="w-5 h-5 text-gray-500" />;

    const percent = confidence * 100;
    if (percent >= 95) { return <CheckCircle className="w-5 h-5 text-[#085041]" />;
    } else if (percent >= 80) { return <AlertTriangle className="w-5 h-5 text-[#7A5417]" />;
    } else { return <XCircle className="w-5 h-5 text-[#7A1A1A]" />;
    }
  };

  if (loading || isLoading) { return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Laddar...</div>
      </div>
    );
  }

  if (!user) { return null;
  }

  const needsReview = entries.filter(
    (e) => e.status === "draft" || (e.ai_confidence !== null && e.ai_confidence < 0.9)
  );
  const pendingApproval = entries.filter(
    (e) => e.status === "pending_approval" && (e.ai_confidence === null || e.ai_confidence >= 0.9)
  );

  return (
    <div>
<main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Granskningspanel</h1>
            <p className="text-muted-foreground mt-2">
              Granska och godkänn AI-genererade verifikat
            </p>
          </div>

          <div className="w-64">
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger>
                <SelectValue placeholder="Välj företag" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Kräver granskning</CardDescription>
              <CardTitle className="text-3xl">{needsReview.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                AI-säkerhet {'<'} 90% eller utkast
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Väntar på godkännande</CardDescription>
              <CardTitle className="text-3xl">{pendingApproval.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">AI-säkerhet ≥ 90%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Totalt antal</CardDescription>
              <CardTitle className="text-3xl">{entries.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Alla obehandlade verifikat
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="review" className="space-y-4">
          <TabsList>
            <TabsTrigger value="review">
              Kräver granskning ({needsReview.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Väntar godkännande ({pendingApproval.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="review" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Verifikat som kräver extra granskning</CardTitle>
                <CardDescription>
                  Låg AI-säkerhet eller markerade som utkast
                </CardDescription>
              </CardHeader>
              <CardContent>
                {needsReview.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Inga verifikat behöver granskas just nu</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {needsReview.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="mt-1">{getStatusIcon(entry.ai_confidence)}</div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {entry.journal_number || "Inget verifikatsnummer"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {entry.description || "Ingen beskrivning"}
                              </p>
                            </div>
                            {getConfidenceBadge(entry.ai_confidence)}
                          </div>
                          {entry.ai_explanation && (
                            <p className="text-sm text-muted-foreground">
                              <strong>AI-förklaring:</strong> {entry.ai_explanation}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Datum: {entry.entry_date}</span>
                            {entry.documents && (
                              <span>Dokument: {entry.documents.file_name}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Granska
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Väntar på godkännande</CardTitle>
                <CardDescription>AI-säkerhet ≥ 90%</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingApproval.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Inga verifikat väntar på godkännande</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingApproval.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="mt-1">{getStatusIcon(entry.ai_confidence)}</div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {entry.journal_number || "Inget verifikatsnummer"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {entry.description || "Ingen beskrivning"}
                              </p>
                            </div>
                            {getConfidenceBadge(entry.ai_confidence)}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Datum: {entry.entry_date}</span>
                            {entry.documents && (
                              <span>Dokument: {entry.documents.file_name}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Granska
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Review Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Granska verifikat</DialogTitle>
            <DialogDescription>
              {selectedEntry?.description || "Ingen beskrivning"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Verifikatsnummer:</span>
                <p className="font-medium">
                  {selectedEntry?.journal_number || "Ingen"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Datum:</span>
                <p className="font-medium">{selectedEntry?.entry_date}</p>
              </div>
              <div>
                <span className="text-muted-foreground">AI-säkerhet:</span>
                <p className="font-medium">
                  {selectedEntry?.ai_confidence
                    ? `${(selectedEntry.ai_confidence * 100).toFixed(0)}%`
                    : "Ej tillgänglig"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className="font-medium">{selectedEntry?.status}</p>
              </div>
            </div>

            {selectedEntry?.ai_explanation && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">AI-förklaring:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedEntry.ai_explanation}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Granskningsanteckningar:</label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Skriv eventuella kommentarer eller ändringar..."
                rows={4}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleReview(selectedEntry!.id, "rejected")}
                disabled={isReviewing}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Avvisa
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleReview(selectedEntry!.id, "approved")}
                disabled={isReviewing}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Godkänn
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditorDashboard;
