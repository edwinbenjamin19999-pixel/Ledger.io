import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Clock, XCircle, ClipboardCheck } from "lucide-react";
import { useMyApprovalRequests } from "@/hooks/useApprovalFlowsQuery";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export function PendingApprovalsWidget() {
  const { data, isLoading } = useMyApprovalRequests();

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-5 w-5" />Godkännanden</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-20 w-full" /></CardContent>
      </Card>
    );
  }

  const pending = data?.pending ?? [];
  const all = data?.all ?? [];

  if (all.length === 0) return null;

  const statusIcon = (s: string) => {
    if (s === 'approved') return <CheckCircle className="h-3.5 w-3.5 text-[#085041]" />;
    if (s === 'rejected') return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    return <Clock className="h-3.5 w-3.5 text-[#7A5417]" />;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Godkännanden
          </CardTitle>
          {pending.length > 0 && (
            <Badge variant="destructive" className="text-xs">{pending.length} väntande</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {all.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Inga godkännanden att visa.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {all.slice(0, 8).map((req: any) => (
              <div key={req.id} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {statusIcon(req.status)}
                  <span className="truncate font-medium">{req.entity_type || 'Ärende'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(req.created_at), "d MMM", { locale: sv })}
                  </span>
                  <Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'approved' ? 'default' : 'destructive'} className="text-[10px]">
                    {req.status === 'pending' ? 'Väntande' : req.status === 'approved' ? 'Godkänd' : 'Avvisad'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
