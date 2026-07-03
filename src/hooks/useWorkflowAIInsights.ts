import { useMemo } from "react";
import type { FirmTask } from "@/hooks/useFirmTasks";

export interface WorkflowInsight {
  id: string;
  kind: "overload" | "bottleneck" | "deadline_cluster" | "stale" | "balanced";
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  suggestedAction?: string;
}

/**
 * AI-style heuristics over the task pool. No backend call — pure derivation
 * so the panel is instant. Identifies overload, deadline clusters and stale
 * tasks. v1: deterministic; later iteration plugs into Lovable AI.
 */
export function useWorkflowAIInsights(tasks: FirmTask[]): WorkflowInsight[] {
  return useMemo(() => {
    if (!tasks.length) return [];
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const out: WorkflowInsight[] = [];

    // 1) Per-assignee load this week
    const loadByUser = new Map<string, { name: string; count: number }>();
    let unassigned = 0;
    for (const t of tasks) {
      if (t.status === "done") continue;
      if (!t.due_date) continue;
      const due = new Date(t.due_date).getTime();
      if (due - now > weekMs) continue;
      if (!t.assigned_to) {
        unassigned += 1;
        continue;
      }
      const cur = loadByUser.get(t.assigned_to) ?? {
        name: t.assignee_name ?? "Okänd",
        count: 0,
      };
      cur.count += 1;
      loadByUser.set(t.assigned_to, cur);
    }

    const heaviest = [...loadByUser.values()].sort((a, b) => b.count - a.count)[0];
    const lightest = [...loadByUser.values()].sort((a, b) => a.count - b.count)[0];

    if (heaviest && heaviest.count >= 6) {
      out.push({
        id: "overload",
        kind: "overload",
        severity: heaviest.count >= 10 ? "critical" : "warning",
        title: `${heaviest.name} har ${heaviest.count} deadlines denna vecka`,
        detail: lightest && lightest.count + 2 < heaviest.count
          ? `${lightest.name} har bara ${lightest.count}. Föreslå omfördelning av 2 uppgifter.`
          : "Risk för att deadlines missas.",
        suggestedAction: lightest && lightest.count + 2 < heaviest.count
          ? `Flytta 2 uppgifter till ${lightest.name}`
          : undefined,
      });
    }

    // 2) Unassigned cluster
    if (unassigned >= 3) {
      out.push({
        id: "unassigned",
        kind: "bottleneck",
        severity: "warning",
        title: `${unassigned} uppgifter utan ansvarig`,
        detail: "Tilldela för att undvika att de glöms bort.",
        suggestedAction: "Tilldela uppgifter",
      });
    }

    // 3) Deadline cluster — same day with ≥4 tasks
    const byDay = new Map<string, number>();
    for (const t of tasks) {
      if (t.status === "done" || !t.due_date) continue;
      const day = t.due_date.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    const cluster = [...byDay.entries()]
      .filter(([d, n]) => {
        const ts = new Date(d).getTime();
        return n >= 4 && ts >= now && ts - now < weekMs;
      })
      .sort((a, b) => b[1] - a[1])[0];
    if (cluster) {
      const [day, n] = cluster;
      out.push({
        id: `cluster-${day}`,
        kind: "deadline_cluster",
        severity: n >= 8 ? "critical" : "warning",
        title: `${n} uppgifter förfaller ${new Date(day).toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" })}`,
        detail: "Sprid ut uppgifter över veckan för att minska risken.",
      });
    }

    // 4) Stale in_progress (> 7d)
    const stale = tasks.filter(
      (t) => t.status === "in_progress" && now - new Date(t.created_at).getTime() > weekMs,
    ).length;
    if (stale >= 3) {
      out.push({
        id: "stale",
        kind: "stale",
        severity: "info",
        title: `${stale} uppgifter har pågått > 7 dagar`,
        detail: "Stäng av eller eskalera fastnade uppgifter.",
      });
    }

    if (!out.length) {
      out.push({
        id: "balanced",
        kind: "balanced",
        severity: "info",
        title: "Arbetsbelastningen ser balanserad ut",
        detail: "Inga akuta flaskhalsar identifierade just nu.",
      });
    }

    return out;
  }, [tasks]);
}
