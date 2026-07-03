import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export interface CollaborationComment { id: string;
  company_id: string;
  entity_type: string;
  entity_id: string;
  parent_comment_id: string | null;
  user_id: string;
  content: string;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  profile?: { full_name: string | null; avatar_url: string | null };
  replies?: CollaborationComment[];
}

export interface CollaborationTask { id: string;
  company_id: string;
  title: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  assigned_to: string | null;
  assigned_by: string;
  priority: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assignee_profile?: { full_name: string | null };
  assigner_profile?: { full_name: string | null };
}

export interface CollaborationActivity { id: string;
  company_id: string;
  user_id: string;
  activity_type: string;
  entity_type: string | null;
  entity_id: string | null;
  title: string;
  description: string | null;
  metadata: any;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null };
}

export interface CollaborationMention { id: string;
  company_id: string;
  comment_id: string | null;
  task_id: string | null;
  mentioned_user_id: string;
  mentioned_by: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export const useCollaboration = () => { const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  useEffect(() => { const stored = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
    if (stored) setSelectedCompanyId(stored);
  }, []);
  const queryClient = useQueryClient();

  // Comments
  const useComments = (entityType?: string, entityId?: string) =>
    useQuery({ queryKey: ["collaboration-comments", selectedCompanyId, entityType, entityId],
      queryFn: async () => { let query = supabase
          .from("collaboration_comments")
          .select("*")
          .eq("company_id", selectedCompanyId!)
          .is("parent_comment_id", null)
          .order("created_at", { ascending: false });

        if (entityType) query = query.eq("entity_type", entityType);
        if (entityId) query = query.eq("entity_id", entityId);

        const { data, error } = await query;
        if (error) throw error;

        // Fetch replies
        if (data && data.length > 0) { const parentIds = data.map((c: any) => c.id);
          const { data: replies } = await supabase
            .from("collaboration_comments")
            .select("*")
            .in("parent_comment_id", parentIds)
            .order("created_at", { ascending: true });

          return data.map((comment: any) => ({ ...comment,
            replies: (replies || []).filter((r: any) => r.parent_comment_id === comment.id),
          })) as CollaborationComment[];
        }

        return (data || []) as CollaborationComment[];
      },
      enabled: !!selectedCompanyId,
    });

  const addComment = useMutation({ mutationFn: async (params: { entity_type: string;
      entity_id: string;
      content: string;
      parent_comment_id?: string;
    }) => { const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedCompanyId) throw new Error("Ej inloggad");

      const { error } = await supabase.from("collaboration_comments").insert({ company_id: selectedCompanyId,
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        content: params.content,
        parent_comment_id: params.parent_comment_id || null,
        user_id: user.id,
      });
      if (error) throw error;

      // Log activity
      await supabase.from("collaboration_activity").insert({ company_id: selectedCompanyId,
        user_id: user.id,
        activity_type: "comment",
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        title: "Ny kommentar",
        description: params.content.substring(0, 100),
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collaboration-comments"] });
      queryClient.invalidateQueries({ queryKey: ["collaboration-activity"] });
      toast.success("Kommentar tillagd");
    },
    onError: () => toast.error("Kunde inte lägga till kommentar"),
  });

  const resolveComment = useMutation({ mutationFn: async (commentId: string) => { const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("collaboration_comments")
        .update({ is_resolved: true, resolved_at: new Date().toISOString(), resolved_by: user?.id })
        .eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collaboration-comments"] });
      toast.success("Kommentar markerad som löst");
    },
    onError: (error: Error) => toast.error(error.message || "Åtgärden misslyckades"),
  });

  // Tasks
  const useTasks = (statusFilter?: string) =>
    useQuery({ queryKey: ["collaboration-tasks", selectedCompanyId, statusFilter],
      queryFn: async () => { let query = supabase
          .from("collaboration_tasks")
          .select("*")
          .eq("company_id", selectedCompanyId!)
          .order("created_at", { ascending: false });

        if (statusFilter && statusFilter !== "all") { query = query.eq("status", statusFilter);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as CollaborationTask[];
      },
      enabled: !!selectedCompanyId,
    });

  const addTask = useMutation({ mutationFn: async (params: { title: string;
      description?: string;
      assigned_to?: string;
      priority?: string;
      due_date?: string;
      entity_type?: string;
      entity_id?: string;
      status?: string;
    }) => { const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedCompanyId) throw new Error("Ej inloggad");

      const { error } = await supabase.from("collaboration_tasks").insert({ company_id: selectedCompanyId,
        title: params.title,
        description: params.description || null,
        assigned_to: params.assigned_to || null,
        assigned_by: user.id,
        priority: params.priority || "medium",
        status: params.status || "todo",
        due_date: params.due_date || null,
        entity_type: params.entity_type || null,
        entity_id: params.entity_id || null,
      });
      if (error) throw error;

      await supabase.from("collaboration_activity").insert({ company_id: selectedCompanyId,
        user_id: user.id,
        activity_type: "task_created",
        entity_type: params.entity_type || null,
        entity_id: params.entity_id || null,
        title: "Ny uppgift skapad",
        description: params.title,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collaboration-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["collaboration-activity"] });
      toast.success("Uppgift skapad");
    },
    onError: () => toast.error("Kunde inte skapa uppgift"),
  });

  const updateTaskStatus = useMutation({ mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => { const update: any = { status };
      if (status === "done") update.completed_at = new Date().toISOString();
      if (status === "todo" || status === "in_progress") update.completed_at = null;

      const { error } = await supabase
        .from("collaboration_tasks")
        .update(update)
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collaboration-tasks"] });
      toast.success("Status uppdaterad");
    },
    onError: (error: Error) => toast.error(error.message || "Åtgärden misslyckades"),
  });

  const deleteTask = useMutation({ mutationFn: async (taskId: string) => { const { error } = await supabase
        .from("collaboration_tasks")
        .delete()
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collaboration-tasks"] });
      toast.success("Uppgift borttagen");
    },
    onError: (error: Error) => toast.error(error.message || "Åtgärden misslyckades"),
  });

  // Activity feed
  const useActivity = () =>
    useQuery({ queryKey: ["collaboration-activity", selectedCompanyId],
      queryFn: async () => { const { data, error } = await supabase
          .from("collaboration_activity")
          .select("*")
          .eq("company_id", selectedCompanyId!)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return (data || []) as CollaborationActivity[];
      },
      enabled: !!selectedCompanyId,
    });

  // Mentions
  const useMentions = () =>
    useQuery({ queryKey: ["collaboration-mentions", selectedCompanyId],
      queryFn: async () => { const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
          .from("collaboration_mentions")
          .select("*")
          .eq("mentioned_user_id", user.id)
          .eq("is_read", false)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []) as CollaborationMention[];
      },
      enabled: !!selectedCompanyId,
    });

  const markMentionRead = useMutation({ mutationFn: async (mentionId: string) => { const { error } = await supabase
        .from("collaboration_mentions")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", mentionId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collaboration-mentions"] });
    },
    onError: (error: Error) => toast.error(error.message || "Åtgärden misslyckades"),
  });

  return { useComments,
    addComment,
    resolveComment,
    useTasks,
    addTask,
    updateTaskStatus,
    deleteTask,
    useActivity,
    useMentions,
    markMentionRead,
  };
};
