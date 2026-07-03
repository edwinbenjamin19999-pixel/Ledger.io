import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStoredActiveCompanyId } from "@/lib/company-selection";
import { toast } from "sonner";

export interface SavedView {
  id: string;
  company_id: string;
  owner_id: string;
  name: string;
  icon: string | null;
  scope: "private" | "team";
  is_default: boolean;
  route: string;
  payload: Record<string, unknown>;
  pinned: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface SavedViewInput {
  name: string;
  icon?: string;
  scope?: "private" | "team";
  is_default?: boolean;
  route: string;
  payload: Record<string, unknown>;
  pinned?: boolean;
}

export function useSavedViews(route?: string) {
  const companyId = getStoredActiveCompanyId();
  return useQuery({
    queryKey: ["saved-views", companyId, route ?? "all"],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("saved_views")
        .select("*")
        .eq("company_id", companyId!)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (route) q = q.eq("route", route);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as SavedView[];
    },
  });
}

export function useCreateSavedView() {
  const qc = useQueryClient();
  const companyId = getStoredActiveCompanyId();
  return useMutation({
    mutationFn: async (input: SavedViewInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !companyId) throw new Error("Saknar bolag eller användare");
      const { data, error } = await supabase
        .from("saved_views")
        .insert({
          company_id: companyId,
          owner_id: user.id,
          created_by: user.id,
          name: input.name,
          icon: input.icon ?? "Star",
          scope: input.scope ?? "private",
          is_default: input.is_default ?? false,
          route: input.route,
          payload: input.payload as never,
          pinned: input.pinned ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as SavedView;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-views"] });
      toast.success("Vyn sparad");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SavedViewInput> & { position?: number } }) => {
      const { error } = await supabase
        .from("saved_views")
        .update({
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.icon !== undefined && { icon: patch.icon }),
          ...(patch.scope !== undefined && { scope: patch.scope }),
          ...(patch.is_default !== undefined && { is_default: patch.is_default }),
          ...(patch.payload !== undefined && { payload: patch.payload as never }),
          ...(patch.pinned !== undefined && { pinned: patch.pinned }),
          ...(patch.position !== undefined && { position: patch.position }),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-views"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_views").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-views"] });
      toast.success("Vyn borttagen");
    },
  });
}

export function useViewUsageLog(days = 30) {
  const companyId = getStoredActiveCompanyId();
  return useQuery({
    queryKey: ["view-usage-log", companyId, days],
    enabled: !!companyId,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("view_usage_log")
        .select("route,payload,opened_at")
        .eq("company_id", companyId!)
        .gte("opened_at", since)
        .order("opened_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Array<{ route: string; payload: Record<string, unknown>; opened_at: string }>;
    },
  });
}
