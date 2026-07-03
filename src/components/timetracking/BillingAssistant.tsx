import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUnbilledSummary, formatKr, formatHours } from "@/hooks/useTimeTracking";
import { Sparkles, ArrowRight, ChevronDown, ChevronUp, Clock, AlertTriangle } from "lucide-react";
import { BillReviewDialog } from "./BillReviewDialog";
import { cn } from "@/lib/utils";

export function BillingAssistant() { const { unbilled } = useUnbilledSummary();
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [reviewClient, setReviewClient] = useState<string | null>(null);

  const totalValue = unbilled.reduce((s, u) => s + u.value, 0);
  const totalHours = unbilled.reduce((s, u) => s + u.hours, 0);

  // Check för entries missing descriptions
  const warningClients = unbilled
    .map((u) => { const missing = u.entries.filter((e) => !e.description || e.description.trim() === "").length;
      return { client: u.client, missing };
    })
    .filter((w) => w.missing > 0);

  return (
    <div className="space-y-4 mt-4">
      {/* Summary banner */}
      <div className="rounded-lg border border-[#3b82f6]/30 bg-[#3b82f6]/5 p-4">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-[#3b82f6] mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Dags att fakturera — AI har identifierat:</p>
            <p className="text-2xl font-bold">{formatKr(totalValue)}</p>
            <p className="text-xs text-muted-foreground">
              {totalHours.toFixed(1).replace(".", ",")} ofakturerade timmar fördelat på {unbilled.length} {unbilled.length === 1 ? "kund" : "kunder"}
            </p>
          </div>
        </div>
      </div>

      {/* AI Warnings */}
      {warningClients.length > 0 && (
        <div className="space-y-2">
          {warningClients.map((w) => (
            <div key={w.client} className="p-3 rounded-lg border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/10 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-[#7A5417] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{w.client}</span>-fakturan innehåller{" "}
                <span className="font-bold">{w.missing} {w.missing === 1 ? "timme" : "timmar"} utan beskrivning</span>{" "}
                — lägg till notat för att undvika tvist.
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Per client billing queue */}
      {unbilled.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Inga ofakturerade timmar just nu</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {unbilled
            .sort((a, b) => b.value - a.value)
            .map((u) => { const isExpanded = expandedClient === u.client;
              const urgency = u.hours > 20 ? "high" : u.hours > 10 ? "medium" : "low";
              const missingDesc = u.entries.filter((e) => !e.description || e.description.trim() === "").length;

              return (
                <Card key={u.client} className={cn(
                  "overflow-hidden transition-all",
                  urgency === "high" && "border-orange-500/30"
                )}>
                  <CardContent className="p-4 space-y-3">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedClient(isExpanded ? null : u.client)}
                    >
                      <div className="flex items-center gap-2">
                        {urgency === "high" && (
                          <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{u.client}</p>
                            {missingDesc > 0 && (
                              <Badge variant="outline" className="bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7] text-[10px]">
                                {missingDesc} utan beskrivning
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {u.hours.toFixed(1).replace(".", ",")}h ofakturerade — {u.entries.length} poster
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">{formatKr(u.value)}</span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t pt-3 space-y-2">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-muted-foreground text-left border-b">
                                <th className="py-1 pr-2">Datum</th>
                                <th className="py-1 pr-2">Beskrivning</th>
                                <th className="py-1 text-right pr-2">Timmar</th>
                                <th className="py-1 text-right">Belopp</th>
                              </tr>
                            </thead>
                            <tbody>
                              {u.entries.slice(0, 10).map((e) => (
                                <tr key={e.id} className={cn("border-b last:border-0", !e.description && "bg-amber-50/30 dark:bg-amber-950/10")}>
                                  <td className="py-1 pr-2">{e.entry_date}</td>
                                  <td className="py-1 pr-2 truncate max-w-[180px]">
                                    {e.description || <span className="text-[#7A5417] italic">Saknar beskrivning</span>}
                                  </td>
                                  <td className="py-1 text-right pr-2">{formatHours(e.duration_minutes)}h</td>
                                  <td className="py-1 text-right font-medium">
                                    {formatKr((e.duration_minutes / 60) * (e.hourly_rate || 0))}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {u.entries.length > 10 && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              +{u.entries.length - 10} fler poster
                            </p>
                          )}
                        </div>

                        <div className="flex justify-between items-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => setReviewClient(u.client)}
                          >
                            Välj poster att fakturera
                          </Button>
                          <Button
                            size="sm"
                            className="gap-1 bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-foreground"
                            onClick={() => setReviewClient(u.client)}
                          >
                            Fakturera allt
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      <BillReviewDialog
        open={!!reviewClient}
        onOpenChange={(open) => !open && setReviewClient(null)}
        clientName={reviewClient || ""}
      />
    </div>
  );
}
