import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, FileWarning, Users } from "lucide-react";

interface AdminInsights { totalFlags: number;
  unreviewedFlags: number;
  criticalFlags: number;
  companiesWithFlags: number;
  recentFlags: { company_name: string; flag_type: string; severity: string; description: string; created_at: string; journal_number: string | null; entry_date: string | null }[];
}

export const AdminInsightsPanel = () => { const [insights, setInsights] = useState<AdminInsights>({ totalFlags: 0, unreviewedFlags: 0, criticalFlags: 0, companiesWithFlags: 0, recentFlags: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadInsights(); }, []);

  const loadInsights = async () => { try { const { data: flags } = await supabase
        .from("flagged_transactions")
        .select("id, company_id, flag_type, severity, description, is_reviewed, created_at, journal_entry_id, journal_entries!flagged_transactions_journal_entry_id_fkey(journal_number, entry_date)")
        .order("created_at", { ascending: false })
        .limit(200);

      const allFlags = (flags || []);
      const unreviewed = allFlags.filter(f => !f.is_reviewed);
      const critical = unreviewed.filter(f => f.severity === "critical" || f.severity === "high");
      const uniqueCompanies = new Set(unreviewed.map(f => f.company_id));

      // Get company names för recent flags
      const recentUnreviewed = unreviewed.slice(0, 5);
      const companyIds = [...new Set(recentUnreviewed.map(f => f.company_id))];
      
      let companyMap: Record<string, string> = {};
      if (companyIds.length > 0) { const { data: companies } = await supabase
          .from("companies")
          .select("id, name")
          .in("id", companyIds);
        (companies || []).forEach(c => { companyMap[c.id] = c.name; });
      }

      setInsights({ totalFlags: allFlags.length,
        unreviewedFlags: unreviewed.length,
        criticalFlags: critical.length,
        companiesWithFlags: uniqueCompanies.size,
        recentFlags: recentUnreviewed.map((f: any) => ({ company_name: companyMap[f.company_id] || "Okänt",
          flag_type: f.flag_type,
          severity: f.severity,
          description: f.description,
          created_at: f.created_at,
          journal_number: f.journal_entries?.journal_number || null,
          entry_date: f.journal_entries?.entry_date || null,
        })),
      });
    } catch (err) { console.error("Error loading insights:", err);
    } finally { setLoading(false);
    }
  };

  const severityColor: Record<string, string> = { critical: "bg-destructive text-destructive-foreground",
    high: "bg-[#FCE8E8] text-[#7A1A1A] dark:bg-red-900 dark:text-red-200",
    medium: "bg-[#FAEEDA] text-[#7A5417] dark:bg-yellow-900 dark:text-yellow-200",
    low: "bg-[#EFF6FF] text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  };

  const flagLabels: Record<string, string> = { imbalanced: "Obalanserad",
    unusual_amount: "Ovanligt belopp",
    round_number: "Jämnt belopp",
    missing_document: "Saknar underlag",
    duplicate_suspect: "Möjlig dubblett",
  };

  if (loading) return null;

  return (
    <div className="space-y-4">
      {/* Alert banner */}
      {insights.criticalFlags > 0 && (
        <Card className="border-destructive">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm">
              <strong>{insights.criticalFlags}</strong> kritiska/höga flaggor kräver omedelbar granskning hos{" "}
              <strong>{insights.companiesWithFlags}</strong> företag
            </p>
          </CardContent>
        </Card>
      )}

      {/* Smart KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileWarning className="h-6 w-6 text-[#7A5417]" />
            <div>
              <p className="text-xl font-bold">{insights.unreviewedFlags}</p>
              <p className="text-xs text-muted-foreground">Ogranskade flaggor</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div>
              <p className="text-xl font-bold">{insights.criticalFlags}</p>
              <p className="text-xs text-muted-foreground">Kritiska/Höga</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <div>
              <p className="text-xl font-bold">{insights.companiesWithFlags}</p>
              <p className="text-xs text-muted-foreground">Berörda företag</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-[#085041]" />
            <div>
              <p className="text-xl font-bold">{insights.totalFlags}</p>
              <p className="text-xs text-muted-foreground">Totala flaggor</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent flags feed */}
      {insights.recentFlags.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Senaste flaggor som behöver granskning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.recentFlags.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/50">
                <Badge className={severityColor[f.severity] || "bg-muted"} variant="secondary">
                  {f.severity === "critical" ? "!" : f.severity === "high" ? "⚠" : "•"}
                </Badge>
                <span className="font-medium truncate">{f.company_name}</span>
                {f.journal_number && (
                  <span className="font-mono text-xs text-primary shrink-0">{f.journal_number}</span>
                )}
                <Badge variant="outline" className="text-xs shrink-0">{flagLabels[f.flag_type] || f.flag_type}</Badge>
                <span className="text-muted-foreground truncate flex-1">{f.description}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {f.entry_date ? new Date(f.entry_date).toLocaleDateString("sv-SE") : new Date(f.created_at).toLocaleDateString("sv-SE")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
