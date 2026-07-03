import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Banknote, ArrowDownToLine, ArrowUpFromLine, FileText,
  Users, Gavel, GitBranch, TrendingUp,
} from "lucide-react";
import { useCorporateEvents } from "@/hooks/useCorporateActions";
import { formatSEK } from "@/lib/formatNumber";

const iconMap: Record<string, React.ElementType> = {
  dividend_agm: Banknote,
  dividend_proposal: Banknote,
  utdelning: Banknote,
  unconditional_contribution: ArrowDownToLine,
  conditional_contribution: ArrowDownToLine,
  tillskott: ArrowDownToLine,
  shareholder_loan_in: ArrowUpFromLine,
  shareholder_loan_out: ArrowUpFromLine,
  aktieagarlaan: ArrowUpFromLine,
  loan_repayment: ArrowUpFromLine,
  loan_interest: ArrowUpFromLine,
  board_resolution: Gavel,
  agm: Users,
  extra_meeting: Users,
  board_change: Users,
  signatory_change: Users,
  new_share_issue: TrendingUp,
  bonus_issue: TrendingUp,
  nyemission: TrendingUp,
};

const statusColors: Record<string, string> = {
  completed: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]",
  pending: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]",
  draft: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<string, string> = {
  completed: "Verkställd",
  pending: "Pågående",
  draft: "Utkast",
  cancelled: "Avbruten",
};

export const TimelineTab = () => {
  const { data: events, isLoading } = useCorporateEvents();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><h2 className="text-lg font-semibold">Tidslinje</h2></div>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 ml-12" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Tidslinje</h2>
        <p className="text-sm text-muted-foreground">Kronologisk översikt av alla bolagshändelser</p>
      </div>

      {(!events || events.length === 0) ? (
        <Card>
          <CardContent className="py-16 text-center">
            <GitBranch className="h-10 w-10 mx-auto mb-4 text-muted-foreground/40" />
            <p className="font-medium">Ingen tidslinje ännu</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Bolagshändelser visas här i kronologisk ordning allt eftersom de skapas och verkställs.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-4">
            {events.map((event) => {
              const Icon = iconMap[event.event_type] || FileText;
              const status = event.status ?? 'draft';
              return (
                <div key={event.id} className="relative pl-12">
                  <div className="absolute left-3 top-4 w-5 h-5 rounded-full border-2 border-border bg-card flex items-center justify-center">
                    <Icon className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                  <Card className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{event.title}</p>
                            <Badge variant="outline" className={`text-[10px] ${statusColors[status] ?? statusColors.draft}`}>
                              {statusLabels[status] ?? status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{event.event_date}</span>
                            <span>{event.event_type.replace(/_/g, ' ')}</span>
                          </div>
                          {event.description && (
                            <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                          )}
                        </div>
                        {event.amount && (
                          <p className="text-sm font-medium">{formatSEK(Number(event.amount))}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
