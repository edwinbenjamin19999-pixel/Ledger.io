import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, MessageSquare, ClipboardList, AtSign, FileText, ArrowRight } from "lucide-react";
import { useCollaboration } from "@/hooks/useCollaboration";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export const ActivityFeed = () => { const { useActivity } = useCollaboration();
  const { data: activities = [], isLoading } = useActivity();

  const activityIcon = (type: string) => { switch (type) { case "comment": return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "task_created": return <ClipboardList className="h-4 w-4 text-[#085041]" />;
      case "task_completed": return <ClipboardList className="h-4 w-4 text-[#085041]" />;
      case "mention": return <AtSign className="h-4 w-4 text-purple-500" />;
      case "document_request": return <FileText className="h-4 w-4 text-orange-500" />;
      case "status_change": return <ArrowRight className="h-4 w-4 text-[#7A5417]" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const activityLabel = (type: string) => { switch (type) { case "comment": return "Kommentar";
      case "task_created": return "Uppgift";
      case "task_completed": return "Slutförd";
      case "mention": return "Omnämning";
      case "document_request": return "Dokument";
      case "status_change": return "Statusändring";
      default: return type;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          Aktivitet
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Laddar...</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Ingen aktivitet ännu</p>
        ) : (
          <div className="space-y-1">
            {activities.map((activity, index) => (
              <div key={activity.id} className="flex items-start gap-3 py-2">
                <div className="mt-0.5 flex-shrink-0">
                  {activityIcon(activity.activity_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{activity.title}</span>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {activityLabel(activity.activity_type)}
                    </Badge>
                  </div>
                  {activity.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {activity.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(activity.created_at), "d MMM HH:mm", { locale: sv })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
