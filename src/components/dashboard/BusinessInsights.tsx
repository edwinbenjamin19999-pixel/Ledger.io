import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BusinessInsightsProps { companyId: string;
  industry: string | null;
}

export const BusinessInsights = ({ companyId, industry }: BusinessInsightsProps) => { const [insights, setInsights] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-load insights on mount
  useEffect(() => { const timer = setTimeout(() => getInsights(), 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const getInsights = async () => { setIsLoading(true);

    try { const { data, error } = await supabase.functions.invoke("business-insights", { body: { company_id: companyId },
      });

      if (error) throw error;

      setInsights(data.insights);
      setMetrics(data.metrics);
      toast.success("Nya insikter från AI!");
    } catch (error: any) { console.error("Error getting insights:", error);
      toast.error("Kunde inte hämta insikter");
    } finally { setIsLoading(false);
    }
  };

  const parseInsights = (text: string) => { const sections = text.split(/\d+\.\s+\*\*/).filter(Boolean);
    return sections.map((section) => { const [title, ...content] = section.split("**");
      return { title: title.trim(),
        content: content.join("").trim(),
      };
    });
  };

  const getIndustryName = (ind: string | null) => { const names: Record<string, string> = { real_estate: "Fastighetsförvaltning",
      construction: "Bygg & Anläggning",
      restaurant: "Restaurang & Café",
      retail: "Detaljhandel",
      consulting: "Konsult & Tjänster",
      manufacturing: "Tillverkning",
      general: "Allmän verksamhet",
    };
    return names[ind || "general"] || "Allmän verksamhet";
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Ekonomirådgivare
            </CardTitle>
            <CardDescription>
              Branschspecifika råd för {getIndustryName(industry)}
            </CardDescription>
          </div>
          <Button onClick={getInsights} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyserar...
              </>
            ) : (
              <>
                <Lightbulb className="h-4 w-4 mr-2" />
                Få nya råd
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {metrics && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Intäkter (3 mån)</p>
              <p className="text-xl font-bold text-[#085041]">
                {metrics.totalIncome.toLocaleString("sv-SE")} kr
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Kostnader (3 mån)</p>
              <p className="text-xl font-bold text-[#7A1A1A]">
                {metrics.totalExpenses.toLocaleString("sv-SE")} kr
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nettoresultat</p>
              <p className={`text-xl font-bold ${metrics.netResult >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"}`}>
                {metrics.netResult.toLocaleString("sv-SE")} kr
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Marginal</p>
              <p className={`text-xl font-bold ${metrics.margin >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"}`}>
                {metrics.margin.toFixed(1)}%
              </p>
            </div>
          </div>

          {insights && (
            <div className="space-y-4 mt-6">
              {parseInsights(insights).map((section, idx) => { const isUrgent = section.title.toLowerCase().includes("akut");
                const isCost = section.title.toLowerCase().includes("kostnad");
                const isRevenue = section.title.toLowerCase().includes("intäkt");
                const isPositive = section.title.toLowerCase().includes("bra") || 
                                 section.title.toLowerCase().includes("strategi");

                return (
                  <Alert
                    key={idx}
                    variant={isUrgent ? "destructive" : "default"}
                    className={ isUrgent
                        ? "border-red-500"
                        : isCost
                        ? "border-orange-500 bg-orange-50"
                        : isRevenue
                        ? "border-green-500 bg-[#E1F5EE]"
                        : isPositive
                        ? "border-blue-500 bg-[#EFF6FF]"
                        : ""
                    }
                  >
                    <div className="flex items-start gap-3">
                      {isUrgent ? (
                        <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      ) : isCost ? (
                        <TrendingUp className="h-5 w-5 mt-0.5 flex-shrink-0 text-orange-600" />
                      ) : isRevenue ? (
                        <TrendingUp className="h-5 w-5 mt-0.5 flex-shrink-0 text-[#085041]" />
                      ) : (
                        <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-blue-600" />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">{section.title}</h4>
                        <AlertDescription className="whitespace-pre-line text-sm">
                          {section.content}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                );
              })}
            </div>
          )}
        </CardContent>
      )}

      {!insights && !isLoading && (
        <CardContent>
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              Klicka på "Få nya råd" för att få AI-baserade ekonomiska insikter och tips för att förbättra din verksamhet.
              AI:n analyserar dina senaste 3 månaders bokföring och ger branschspecifika råd.
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
    </Card>
  );
};
