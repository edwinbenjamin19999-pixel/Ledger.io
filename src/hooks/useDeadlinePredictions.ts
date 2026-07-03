import { useMemo } from "react";
import { useFirmDeadlineRadar, type FirmDeadlineItem } from "@/hooks/useFirmDeadlineRadar";
import { useFirmTasks, type FirmTask } from "@/hooks/useFirmTasks";
import { useFirmApprovalQueue } from "@/hooks/useFirmApprovalQueue";

export interface DeadlinePrediction {
  deadline: FirmDeadlineItem;
  riskScore: number; // 0-100
  reason: string;
  suggestedAction: "send_reminder" | "request_documents" | "assign_task" | "review_now";
  hasTask: boolean;
  hasApproval: boolean;
}

/**
 * Cross-references deadlines with existing tasks + approval queue to detect
 * "at-risk" deadlines: those without an assigned task, missing client docs,
 * or sitting in approval limbo close to due date.
 */
export function useDeadlinePredictions(firmId: string | null) {
  const { items: deadlines } = useFirmDeadlineRadar();
  const { data: tasks = [] } = useFirmTasks(firmId);
  const { data: approvals = [] } = useFirmApprovalQueue();

  return useMemo<DeadlinePrediction[]>(() => {
    const taskByKey = new Map<string, FirmTask>();
    for (const t of tasks) {
      if (!t.due_date) continue;
      const k = `${t.company_id}|${t.task_type}|${t.due_date.slice(0, 10)}`;
      taskByKey.set(k, t);
    }
    const approvalByCompany = new Map<string, number>();
    for (const a of approvals) {
      approvalByCompany.set(a.company_id, (approvalByCompany.get(a.company_id) ?? 0) + 1);
    }

    return deadlines
      .map((d): DeadlinePrediction => {
        const taskKey = `${d.client_id}|${mapKindToTaskType(d.kind)}|${d.due_date.toISOString().slice(0, 10)}`;
        const task = taskByKey.get(taskKey);
        const hasTask = !!task;
        const hasApproval = (approvalByCompany.get(d.client_id) ?? 0) > 0;

        let risk = 0;
        const reasons: string[] = [];

        // Time pressure
        if (d.daysLeft <= 2) { risk += 45; reasons.push("Mindre än 2 dagar kvar"); }
        else if (d.daysLeft <= 5) { risk += 25; reasons.push("Mindre än 5 dagar kvar"); }
        else if (d.daysLeft <= 10) { risk += 10; }

        // Missing task
        if (!hasTask) { risk += 25; reasons.push("Ingen uppgift tilldelad"); }
        else if (task && task.status === "todo" && d.daysLeft <= 5) {
          risk += 20; reasons.push("Uppgift ej påbörjad");
        } else if (task && task.status === "in_progress" && d.daysLeft <= 2) {
          risk += 15; reasons.push("Pågår fortfarande");
        }

        // Approval bottleneck
        if (hasApproval && d.kind === "vat") {
          risk += 10; reasons.push("Inväntar klientgodkännande");
        }

        risk = Math.min(100, risk);

        const suggestedAction: DeadlinePrediction["suggestedAction"] =
          !hasTask ? "assign_task"
          : hasApproval ? "send_reminder"
          : d.daysLeft <= 2 ? "review_now"
          : "request_documents";

        return {
          deadline: d,
          riskScore: risk,
          reason: reasons.join(" · ") || "På schema",
          suggestedAction,
          hasTask,
          hasApproval,
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [deadlines, tasks, approvals]);
}

function mapKindToTaskType(kind: string): string {
  switch (kind) {
    case "vat": return "vat";
    case "agi": return "agi";
    case "ink2": return "tax_return";
    case "annual": return "annual_report";
    default: return "other";
  }
}
