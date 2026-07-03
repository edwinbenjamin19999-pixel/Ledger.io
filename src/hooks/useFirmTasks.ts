import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "urgent" | "high" | "medium" | "low";
export type TaskType =
  | "bookkeeping"
  | "vat"
  | "agi"
  | "payroll"
  | "annual_report"
  | "tax_return"
  | "reconciliation"
  | "other";

export interface FirmTask {
  id: string;
  firm_id: string;
  company_id: string;
  client_name: string;
  title: string;
  description: string | null;
  task_type: TaskType | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  assigned_to: string | null;
  assignee_name: string | null;
  created_at: string;
  completed_at: string | null;
}

export function useFirmTasks(firmId: string | null) {
  return useQuery({
    queryKey: ["firm-tasks", firmId],
    enabled: !!firmId,
    queryFn: async (): Promise<FirmTask[]> => {
      const { data, error } = await supabase
        .from("firm_tasks")
        .select(
          `id, firm_id, company_id, title, description, task_type, priority, status, due_date,
           assigned_to, created_at, completed_at,
           companies:company_id (name),
           profiles:assigned_to (full_name, email)`
        )
        .eq("firm_id", firmId!)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        firm_id: row.firm_id,
        company_id: row.company_id,
        client_name: row.companies?.name ?? "Okänd klient",
        title: row.title,
        description: row.description,
        task_type: row.task_type,
        priority: (row.priority ?? "medium") as TaskPriority,
        status: (row.status ?? "todo") as TaskStatus,
        due_date: row.due_date,
        assigned_to: row.assigned_to,
        assignee_name:
          row.profiles?.full_name ?? row.profiles?.email?.split("@")[0] ?? null,
        created_at: row.created_at,
        completed_at: row.completed_at,
      }));
    },
    staleTime: 30_000,
  });
}

export function useUpdateTaskStatus(firmId: string | null) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      taskId,
      status,
    }: {
      taskId: string;
      status: TaskStatus;
    }) => {
      const updates: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (status === "done") {
        updates.completed_at = new Date().toISOString();
        updates.completed_by = user?.id ?? null;
      } else {
        updates.completed_at = null;
      }
      const { error } = await supabase
        .from("firm_tasks")
        .update(updates)
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["firm-tasks", firmId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateTask(firmId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      patch,
    }: {
      taskId: string;
      patch: Partial<{
        title: string;
        priority: TaskPriority;
        due_date: string | null;
        assigned_to: string | null;
        description: string;
      }>;
    }) => {
      const { error } = await supabase
        .from("firm_tasks")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["firm-tasks", firmId] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateTask(firmId: string | null) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      company_id: string;
      title: string;
      description?: string;
      task_type?: TaskType;
      priority?: TaskPriority;
      due_date?: string | null;
      assigned_to?: string | null;
    }) => {
      const { error } = await supabase.from("firm_tasks").insert({
        firm_id: firmId!,
        company_id: input.company_id,
        title: input.title,
        description: input.description ?? null,
        task_type: input.task_type ?? "other",
        priority: input.priority ?? "medium",
        due_date: input.due_date ?? null,
        assigned_to: input.assigned_to ?? null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["firm-tasks", firmId] });
      toast.success("Uppgift skapad");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTask(firmId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("firm_tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["firm-tasks", firmId] });
      toast.success("Uppgift borttagen");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
