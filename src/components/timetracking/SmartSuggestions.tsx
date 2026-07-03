import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, Sparkles } from "lucide-react";
import { useUnbilledSummary, useTimeEntries } from "@/hooks/useTimeTracking";
import { format, differenceInDays } from "date-fns";

interface Props { onSelect: (clientName: string, projectId?: string) => void;
}

export function SmartSuggestions({ onSelect }: Props) { const { unbilled } = useUnbilledSummary();
  const { entries } = useTimeEntries();

  const suggestions = useMemo(() => { const items: Array<{ label: string;
      client: string;
      projectId?: string;
      detail: string;
      priority: "high" | "medium" | "low";
    }> = [];

    // Unbilled clients needing invoicing
    unbilled
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .forEach((u) => { items.push({ label: u.client,
          client: u.client,
          detail: `${u.hours.toFixed(1).replace(".", ",")}h ofakturerade`,
          priority: u.hours > 15 ? "high" : "medium",
        });
      });

    // Recently active clients not in unbilled
    const recentClients = new Map<string, string>();
    entries.slice(0, 50).forEach((e) => { if (e.client_name && !recentClients.has(e.client_name)) { recentClients.set(e.client_name, e.entry_date);
      }
    });

    recentClients.forEach((lastDate, client) => { if (!items.find((i) => i.client === client)) { const daysAgo = differenceInDays(new Date(), new Date(lastDate));
        if (daysAgo > 0 && daysAgo <= 14) { items.push({ label: client,
            client,
            detail: `senaste logg för ${daysAgo} dagar sedan`,
            priority: "low",
          });
        }
      }
    });

    // Always add internal option
    if (!items.find((i) => i.client === "Internt")) { items.push({ label: "Internt",
        client: "Internt",
        detail: "Administration",
        priority: "low",
      });
    }

    return items.slice(0, 5);
  }, [unbilled, entries]);

  if (suggestions.length === 0) return null;

  return (
    <div className="w-full max-w-sm space-y-2">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
        <p className="text-xs text-muted-foreground font-medium">Vad jobbar du med idag?</p>
      </div>
      <div className="space-y-1.5">
        {suggestions.map((s) => (
          <button
            key={s.client}
            onClick={() => onSelect(s.client, s.projectId)}
            className="w-full flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border hover:border-[hsl(var(--primary))]/40 hover:bg-accent/50 transition-colors text-left group"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{s.label}</p>
              <p className="text-[11px] text-muted-foreground truncate">{s.detail}</p>
            </div>
            {s.priority === "high" && (
              <AlertTriangle className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
