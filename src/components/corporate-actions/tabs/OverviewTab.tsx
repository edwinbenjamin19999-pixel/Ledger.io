import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Landmark, ArrowDownToLine, ArrowUpFromLine, Banknote,
  Plus, AlertTriangle, Clock, PenTool, CheckCircle2,
  ChevronRight, Sparkles, ArrowRight, FileText, XCircle,
} from "lucide-react";
import { useCorporateEvents, useCorporateEventStats } from "@/hooks/useCorporateActions";
import { formatSEK } from "@/lib/formatNumber";

interface OverviewTabProps {
  onNewEvent: () => void;
  onViewTimeline: () => void;
}

export const OverviewTab = ({ onNewEvent, onViewTimeline }: OverviewTabProps) => {
  const { data: events, isLoading } = useCorporateEvents();
  const { stats } = useCorporateEventStats();

  // Calculate KPI values from events
  const totalEquity = events?.filter(e =>
    ['unconditional_contribution', 'conditional_contribution', 'tillskott'].includes(e.event_type) && e.status === 'completed'
  ).reduce((s, e) => s + Number(e.amount ?? 0), 0) ?? 0;

  const totalDividends = events?.filter(e =>
    ['dividend_agm', 'dividend_proposal', 'utdelning'].includes(e.event_type) && e.status === 'completed'
  ).reduce((s, e) => s + Number(e.amount ?? 0), 0) ?? 0;

  const totalLoans = events?.filter(e =>
    ['shareholder_loan_in', 'shareholder_loan_out', 'aktieagarlaan'].includes(e.event_type) && e.status === 'completed'
  ).reduce((s, e) => s + Number(e.amount ?? 0), 0) ?? 0;

  const kpis = [
    { label: "Tillskjutet kapital", value: totalEquity, icon: Landmark, color: "text-primary" },
    { label: "Kapitalinsatser", value: totalEquity, icon: ArrowDownToLine, color: "text-[#085041]" },
    { label: "Utdelningar", value: totalDividends, icon: Banknote, color: "text-[#7A5417]" },
    { label: "Lån ägare", value: totalLoans, icon: ArrowUpFromLine, color: "text-blue-600" },
  ];

  const pipeline = [
    { label: "Utkast", count: stats.draft, icon: Clock, color: "text-[#7A5417] bg-[#FAEEDA]" },
    { label: "Pågående", count: stats.pending, icon: AlertTriangle, color: "text-purple-600 bg-[#F1F5F9]" },
    { label: "Klara", count: stats.completed, icon: CheckCircle2, color: "text-[#085041] bg-[#E1F5EE]" },
    { label: "Avbrutna", count: stats.cancelled, icon: XCircle, color: "text-muted-foreground bg-muted" },
  ];

  const recentEvents = (events ?? []).slice(0, 5);

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      draft: { label: "Utkast", cls: "bg-muted text-muted-foreground" },
      pending: { label: "Pågående", cls: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]" },
      completed: { label: "Klar", cls: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]" },
      cancelled: { label: "Avbruten", cls: "bg-destructive/10 text-destructive" },
    };
    const s = map[status] ?? map.draft;
    return <Badge variant="outline" className={`text-[10px] ${s.cls}`}>{s.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-xl font-bold">{formatSEK(kpi.value)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI alerts + Next action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-secondary/20">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-secondary/10">
                <Sparkles className="h-4 w-4 text-secondary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Rekommenderad åtgärd</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.total === 0
                    ? "Ingen bokföringsdata tillgänglig ännu. Skapa din första bolagshändelse för att komma igång."
                    : stats.draft > 0
                    ? `Du har ${stats.draft} utkast som väntar på att slutföras.`
                    : "Alla händelser är uppdaterade. Skapa en ny händelse vid behov."}
                </p>
                <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={onNewEvent}>
                  Skapa ny händelse <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-sm mb-3">Händelser totalt</h3>
            <div className="text-center py-4">
              <p className="text-4xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground mt-1">registrerade händelser</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Händelser i pipeline</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {pipeline.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.label} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card">
                  <div className={`p-1.5 rounded-md ${p.color.split(" ")[1]}`}>
                    <Icon className={`h-3.5 w-3.5 ${p.color.split(" ")[0]}`} />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{p.count}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{p.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent events */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Senaste händelser</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={onViewTimeline}>
              Visa tidslinje <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mb-3 opacity-40" />
              <p className="font-medium text-foreground text-sm">Inga händelser ännu</p>
              <p className="text-xs mt-1">Händelser du skapar visas här i kronologisk ordning.</p>
              <Button size="sm" className="mt-4" onClick={onNewEvent}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Skapa första händelsen
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentEvents.map(ev => (
                <div key={ev.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{ev.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{ev.event_date}</span>
                      {ev.amount && <span>{formatSEK(Number(ev.amount))}</span>}
                    </div>
                  </div>
                  {statusBadge(ev.status ?? 'draft')}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
