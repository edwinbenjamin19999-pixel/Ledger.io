import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ApprovalFlow { id: string;
  company_id: string;
  name: string;
  module: string;
  action_type: string;
  conditions: Record<string, any> | null;
  steps_count: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalFlowStep { id: string;
  flow_id: string;
  step_order: number;
  required_role: string | null;
  can_be_any_of_roles: string[];
  required_count: number;
  description: string | null;
}

export interface ApprovalRequest { id: string;
  company_id: string;
  flow_id: string | null;
  entity_type: string;
  entity_id: string;
  requested_by: string;
  status: string;
  current_step: number;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ApprovalDecision { id: string;
  request_id: string;
  step_order: number;
  decided_by: string;
  decision: string;
  comment: string | null;
  decided_at: string;
}

export const useApprovalFlows = (companyId?: string) => { const { user } = useAuth();
  const [flows, setFlows] = useState<ApprovalFlow[]>([]);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [myPendingApprovals, setMyPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFlows = useCallback(async () => { if (!companyId) return;
    try { const { data, error } = await supabase
        .from("approval_flows")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setFlows((data || []) as unknown as ApprovalFlow[]);
    } catch (e) { console.error("Error loading approval flows:", e);
    }
  }, [companyId]);

  const loadRequests = useCallback(async () => { if (!companyId) return;
    try { const { data, error } = await supabase
        .from("approval_requests")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRequests((data || []) as unknown as ApprovalRequest[]);
      setMyPendingApprovals(
        ((data || []) as unknown as ApprovalRequest[]).filter((r) => r.status === "pending")
      );
    } catch (e) { console.error("Error loading approval requests:", e);
    }
  }, [companyId]);

  useEffect(() => { if (!user || !companyId) { setLoading(false);
      return;
    }
    Promise.all([loadFlows(), loadRequests()]).finally(() => setLoading(false));
  }, [user, companyId, loadFlows, loadRequests]);

  const createFlow = async (flow: Omit<ApprovalFlow, "id" | "created_at">) => { const { data, error } = await supabase
      .from("approval_flows")
      .insert([flow as any])
      .select()
      .maybeSingle();
    if (error) throw error;
    await loadFlows();
    return data;
  };

  const createRequest = async (request: { company_id: string;
    flow_id?: string;
    entity_type: string;
    entity_id: string;
    requested_by: string;
    metadata?: Record<string, any>;
  }) => { const { data, error } = await supabase
      .from("approval_requests")
      .insert([request as any])
      .select()
      .maybeSingle();
    if (error) throw error;
    await loadRequests();
    return data;
  };

  const submitDecision = async (
    requestId: string,
    stepOrder: number,
    decision: "approved" | "rejected",
    comment?: string
  ) => { if (!user) throw new Error("Not authenticated");

    const { error: decisionError } = await supabase
      .from("approval_decisions")
      .insert({ request_id: requestId,
        step_order: stepOrder,
        decided_by: user.id,
        decision,
        comment: comment || null,
      });
    if (decisionError) throw decisionError;

    // Update request status
    const newStatus = decision === "rejected" ? "rejected" : "approved";
    const { error: updateError } = await supabase
      .from("approval_requests")
      .update({ status: newStatus,
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("id", requestId);
    if (updateError) throw updateError;

    await loadRequests();
  };

  return { flows,
    requests,
    myPendingApprovals,
    loading,
    createFlow,
    createRequest,
    submitDecision,
    refreshFlows: loadFlows,
    refreshRequests: loadRequests,
  };
};
