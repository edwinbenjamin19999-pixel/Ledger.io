import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, HelpCircle, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { agentLearn } from "@/lib/autonomous-booking-agent";
import { toast } from "@/hooks/use-toast";

interface AgentReviewListProps { companyId: string;
  onAction?: () => void;
}

export function AgentReviewList({ companyId, onAction }: AgentReviewListProps) { const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => { loadData();
  }, [companyId]);

  const loadData = async () => { try { const [bookingsRes, accountsRes] = await Promise.all([
        supabase
          .from("agent_bookings")
          .select("*")
          .eq("company_id", companyId)
          .in("status", ["review_list", "user_flagged"])
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("chart_of_accounts")
          .select("account_number, account_name")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("account_number"),
      ]);
      setBookings(bookingsRes.data || []);
      setAccounts(accountsRes.data || []);
    } catch (err) { console.error("Error loading review list:", err);
    } finally { setLoading(false);
    }
  };

  const handleApprove = async (booking: any) => { setActionLoading(booking.id);
    try { await supabase
        .from("agent_bookings")
        .update({ status: "auto_booked" })
        .eq("id", booking.id);

      // Learn from approval
      await agentLearn(
        companyId,
        booking.counterparty || "",
        booking.account_number,
        booking.account_name,
        booking.vat_code
      );

      toast({ title: "Godkänd", description: `${booking.counterparty} → ${booking.account_number}` });
      setBookings(prev => prev.filter(b => b.id !== booking.id));
      onAction?.();
    } catch { toast({ title: "Fel", description: "Kunde inte godkänna", variant: "destructive" });
    } finally { setActionLoading(null);
    }
  };

  const handleCorrect = async (booking: any, newAccount: string) => { setActionLoading(booking.id);
    try { const account = accounts.find(a => a.account_number === newAccount);
      await supabase
        .from("agent_bookings")
        .update({ status: "auto_booked",
          user_corrected: true,
          corrected_account: newAccount,
          corrected_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      // Learn from correction
      await agentLearn(
        companyId,
        booking.counterparty || "",
        newAccount,
        account?.account_name || newAccount,
        booking.vat_code
      );

      toast({ title: "Korrigerad & inlärd", description: `Framtida "${booking.counterparty}" → ${newAccount}` });
      setBookings(prev => prev.filter(b => b.id !== booking.id));
      onAction?.();
    } catch { toast({ title: "Fel", description: "Kunde inte korrigera", variant: "destructive" });
    } finally { setActionLoading(null);
    }
  };

  const handleDismiss = async (bookingId: string) => { setActionLoading(bookingId);
    try { await supabase
        .from("agent_bookings")
        .update({ status: "dismissed" })
        .eq("id", bookingId);
      setBookings(prev => prev.filter(b => b.id !== bookingId));
      onAction?.();
    } catch { toast({ title: "Fel", variant: "destructive" });
    } finally { setActionLoading(null);
    }
  };

  if (loading) { return <div className="h-40 bg-muted/50 rounded-lg animate-pulse" />;
  }

  if (bookings.length === 0) { return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="h-12 w-12 text-[#085041] mx-auto mb-3" />
          <p className="text-lg font-semibold">Allt klart!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Inga transaktioner att granska. Agenten hanterar allt automatiskt.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{bookings.length} transaktioner att granska</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => bookings.forEach(b => b.confidence >= 0.75 && handleApprove(b))}
        >
          <CheckCircle className="h-4 w-4 mr-1.5" />
          Godkänn alla säkra
        </Button>
      </div>

      {bookings.map((booking) => (
        <Card key={booking.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold truncate">{booking.counterparty || "Okänd"}</span>
                  <ConfidenceBadge confidence={booking.confidence} />
                  <Badge variant="outline" className="text-xs">{booking.source_type}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">{booking.explanation}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>Föreslaget: <strong>{booking.account_number} {booking.account_name}</strong></span>
                  <span>•</span>
                  <span>{Math.abs(booking.amount).toLocaleString("sv-SE")} {booking.currency || "SEK"}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleApprove(booking)}
                  disabled={actionLoading === booking.id}
                >
                  {actionLoading === booking.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                </Button>

                <Select onValueChange={(v) => handleCorrect(booking, v)}>
                  <SelectTrigger className="w-48 h-9 text-xs">
                    <SelectValue placeholder="Byt konto..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {accounts.slice(0, 50).map(a => (
                      <SelectItem key={a.account_number} value={a.account_number} className="text-xs">
                        {a.account_number} – {a.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDismiss(booking.id)}
                  disabled={actionLoading === booking.id}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* "Varför?" explanation */}
            <details className="mt-3">
              <summary className="text-xs text-primary cursor-pointer flex items-center gap-1 hover:underline">
                <HelpCircle className="h-3 w-3" /> Varför detta konto?
              </summary>
              <p className="text-xs text-muted-foreground mt-1.5 pl-4 border-l-2 border-primary/20">
                {booking.explanation}
              </p>
            </details>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) { const pct = (confidence * 100).toFixed(0);
  if (confidence >= 0.92) { return <Badge className="gap-1 text-xs bg-[#E1F5EE] text-[#085041] border-green-500/20"><Sparkles className="h-3 w-3" />{pct}%</Badge>;
  }
  if (confidence >= 0.75) { return <Badge variant="secondary" className="gap-1 text-xs"><Sparkles className="h-3 w-3" />{pct}%</Badge>;
  }
  return <Badge variant="destructive" className="gap-1 text-xs"><Sparkles className="h-3 w-3" />{pct}%</Badge>;
}
