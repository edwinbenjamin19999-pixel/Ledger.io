import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, Clock, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { journalStatusLabel } from "@/lib/i18n/journalStatus";

interface Activity { id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  time: string;
  confidence: number | null;
}

export const RecentActivity = () => { const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => { if (user) { loadActivities();
    }
  }, [user]);

  const loadActivities = async () => { if (!user) return;
    
    setLoading(true);
    try { // First get companies the user has access to
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", user.id);

      const companyIds = userRoles?.map(r => r.company_id) || [];

      if (companyIds.length === 0) { setActivities([]);
        setLoading(false);
        return;
      }

      // Get recent journal entries för user's companies
      const { data: journalEntries, error: jeError } = await supabase
        .from("journal_entries")
        .select(`
          id,
          description,
          created_at,
          status,
          ai_confidence,
          ai_explanation,
          journal_entry_lines (
            debit,
            credit
          )
        `)
        .in("company_id", companyIds)
        .order("created_at", { ascending: false })
        .limit(10);

      if (jeError) throw jeError;

      const mappedActivities: Activity[] = (journalEntries || []).map(je => { const totalAmount = je.journal_entry_lines?.reduce(
          (sum, line) => sum + (line.debit || 0),
          0
        ) || 0;

        let status = je.status === "approved" ? "completed" : "pending";
        if (je.status === "draft" && je.ai_confidence && je.ai_confidence < 0.8) { status = "review";
        }

        // Show AI indicator in title if it was AI-generated
        const isAiGenerated = je.ai_confidence !== null;
        const titlePrefix = isAiGenerated ? "🤖 " : "";

        return { id: je.id,
          type: "journal",
          title: titlePrefix + (je.description || "Bokföringspost"),
          description: `${totalAmount.toLocaleString()} kr`,
          status,
          time: formatDistanceToNow(new Date(je.created_at), { addSuffix: true,
            locale: sv 
          }),
          confidence: je.ai_confidence,
        };
      });

      setActivities(mappedActivities);
    } catch (error) { console.error("Error loading activities:", error);
    } finally { setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => { switch (status) { case "completed":
        return <CheckCircle className="h-4 w-4 text-[#085041]" />;
      case "pending":
        return <Clock className="h-4 w-4 text-[#7A5417]" />;
      case "review":
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string, confidence: number | null) => {
    if (confidence !== null && confidence < 0.8) {
      return <Badge variant="outline" className="text-orange-600 border-orange-600">Kräver granskning</Badge>;
    }
    const tone =
      status === "completed" ? "text-[#085041] border-green-600"
      : status === "pending" ? "text-[#7A5417] border-yellow-600"
      : status === "review" ? "text-orange-600 border-orange-600"
      : "text-slate-500 border-slate-300";
    return <Badge variant="outline" className={tone}>{journalStatusLabel(status)}</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Senaste aktivitet</CardTitle>
          <CardDescription>Dina senaste transaktioner och händelser</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={loadActivities} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div className="mt-1">{getStatusIcon(activity.status)}</div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <p
                      className="text-sm font-medium leading-tight truncate min-w-0 flex-1"
                      title={activity.title}
                    >
                      {activity.title}
                    </p>
                    <div className="flex-shrink-0">
                      {getStatusBadge(activity.status, activity.confidence)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{activity.time}</span>
                    {activity.confidence !== null && (
                      <span>AI-säkerhet: {(activity.confidence * 100).toFixed(0)}%</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Ingen aktivitet ännu</p>
            <p className="text-sm mt-2">Börja ladda upp dokument för att se aktivitet här</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
