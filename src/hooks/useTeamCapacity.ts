import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFirmTasks, type FirmTask } from "@/hooks/useFirmTasks";

export interface FirmMember {
  user_id: string;
  role: string;
  title: string | null;
  email: string;
  display_name: string;
}

export interface MemberCapacity {
  member: FirmMember;
  openTasks: FirmTask[];
  deadlinesThisWeek: number;
  loadPercent: number; // 100% baseline = TARGET_LOAD tasks
  overloadDelta: number; // tasks above 100%
  weeklyHeat: number[]; // 7 days, count of due tasks per day
}

export const TARGET_LOAD = 10; // 100% workload baseline

export function useFirmMembers(firmId: string | null) {
  return useQuery({
    queryKey: ["firm-members", firmId],
    enabled: !!firmId,
    queryFn: async (): Promise<FirmMember[]> => {
      const { data: rows, error } = await supabase
        .from("firm_members")
        .select("user_id, role, title")
        .eq("firm_id", firmId!)
        .eq("is_active", true);
      if (error) throw error;
      const ids = (rows ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", ids);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p.email] as const));
      return (rows ?? []).map((r) => {
        const email = byId.get(r.user_id) ?? "—";
        const display_name = email !== "—" ? email.split("@")[0] : "Medlem";
        return { user_id: r.user_id, role: r.role, title: r.title, email, display_name };
      });
    },
  });
}

export function useTeamCapacity(firmId: string | null) {
  const { data: members = [], isLoading: loadingMembers } = useFirmMembers(firmId);
  const { data: tasks = [], isLoading: loadingTasks } = useFirmTasks(firmId);

  const capacity = useMemo<MemberCapacity[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return members.map((m): MemberCapacity => {
      const open = tasks.filter(
        (t) => t.assigned_to === m.user_id && t.status !== "done",
      );
      const deadlinesThisWeek = open.filter((t) => {
        if (!t.due_date) return false;
        const d = new Date(t.due_date);
        return d >= today && d <= weekEnd;
      }).length;

      const weeklyHeat = Array(7).fill(0) as number[];
      for (const t of open) {
        if (!t.due_date) continue;
        const d = new Date(t.due_date);
        d.setHours(0, 0, 0, 0);
        const diff = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff < 7) weeklyHeat[diff] += 1;
      }

      const loadPercent = Math.round((open.length / TARGET_LOAD) * 100);
      const overloadDelta = Math.max(0, open.length - TARGET_LOAD);

      return { member: m, openTasks: open, deadlinesThisWeek, loadPercent, overloadDelta, weeklyHeat };
    });
  }, [members, tasks]);

  // Unassigned tasks
  const unassigned = useMemo(
    () => tasks.filter((t) => !t.assigned_to && t.status !== "done"),
    [tasks],
  );

  return { capacity, unassigned, isLoading: loadingMembers || loadingTasks };
}

export interface RebalanceSuggestion {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  taskCount: number;
  reason: string;
}

export function useRebalanceSuggestions(capacity: MemberCapacity[]): RebalanceSuggestion[] {
  return useMemo(() => {
    if (capacity.length < 2) return [];
    const overloaded = capacity.filter((c) => c.loadPercent > 110).sort((a, b) => b.loadPercent - a.loadPercent);
    const available = capacity.filter((c) => c.loadPercent < 80).sort((a, b) => a.loadPercent - b.loadPercent);
    const out: RebalanceSuggestion[] = [];
    for (const over of overloaded) {
      for (const free of available) {
        const moveCount = Math.min(over.overloadDelta, Math.max(1, TARGET_LOAD - free.openTasks.length));
        if (moveCount <= 0) continue;
        out.push({
          fromUserId: over.member.user_id,
          fromName: over.member.display_name,
          toUserId: free.member.user_id,
          toName: free.member.display_name,
          taskCount: moveCount,
          reason: `${over.member.display_name} ligger på ${over.loadPercent}%, ${free.member.display_name} på ${free.loadPercent}%`,
        });
        if (out.length >= 4) break;
      }
      if (out.length >= 4) break;
    }
    return out;
  }, [capacity]);
}
