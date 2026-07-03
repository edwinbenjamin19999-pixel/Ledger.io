import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Check, Clock, XCircle, MoreHorizontal, PenTool, Search, Filter, Plus } from "lucide-react";
import { ACTION_TEMPLATES, ActionStatus, ActionType, STATUS_CONFIG } from "./types";
import { useState } from "react";

export interface CorporateActionEntry { id: string;
  type: ActionType;
  title: string;
  status: ActionStatus;
  created_at: string;
  amount?: string;
  documents: number;
}

const statusIcons: Record<string, React.ElementType> = { draft: Clock,
  needs_input: Clock,
  pending_review: Clock,
  pending_approval: Clock,
  pending_signing: PenTool,
  ready_to_execute: Check,
  executed: Check,
  archived: FileText,
  cancelled: XCircle,
};

interface ActionHistoryProps { onSelectEvent?: (id: string) => void;
  events?: CorporateActionEntry[];
}

export const ActionHistory = ({ onSelectEvent, events = [] }: ActionHistoryProps) => { const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = events.filter(item => { const matchesSearch = !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (events.length === 0) { return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-foreground">Inga bolagshändelser registrerade ännu</p>
          <p className="text-sm mt-1">Skapa din första händelse under fliken "Ny händelse".</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök bland händelser..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-3.5 w-3.5 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla statusar</SelectItem>
            <SelectItem value="draft">Utkast</SelectItem>
            <SelectItem value="pending_approval">Väntar godkännande</SelectItem>
            <SelectItem value="pending_signing">Väntar signering</SelectItem>
            <SelectItem value="executed">Verkställda</SelectItem>
            <SelectItem value="archived">Arkiverade</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.map(item => { const template = ACTION_TEMPLATES[item.type];
          const statusConf = STATUS_CONFIG[item.status];
          const StatusIcon = statusIcons[item.status] || Clock;

          return (
            <Card
              key={item.id}
              className="hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => onSelectEvent?.(item.id)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.title}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConf.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConf.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{template?.label || item.type}</span>
                      <span>{item.created_at}</span>
                      {item.amount && <span>{Number(item.amount).toLocaleString("sv-SE")} kr</span>}
                      {item.documents > 0 && <span>{item.documents} dokument</span>}
                    </div>
                  </div>
                </div>
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && events.length > 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Inga händelser matchar din sökning.
        </div>
      )}
    </div>
  );
};
