import { supabase } from "@/integrations/supabase/client";

const SCOPES = ["ea:api", "ea:accounting", "ea:purchase", "ea:sales", "offline_access"];

export interface VismaConnectionInfo {
  connected: boolean;
  vismaCompanyId?: string;
  expiresAt?: string;
}

export async function startVismaOAuth(companyId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("visma-oauth-start", {
    body: {
      companyId,
      redirectUri: `${window.location.origin}/migration/visma/callback`,
      scopes: SCOPES,
    },
  });
  if (error) throw error;
  if (!data?.authUrl) throw new Error("Kunde inte starta Visma-anslutning");
  return data.authUrl as string;
}

export async function completeVismaOAuth(params: {
  code: string;
  state: string;
}): Promise<{ companyId: string; vismaCompanyId?: string }> {
  const { data, error } = await supabase.functions.invoke("visma-oauth-callback", {
    body: {
      code: params.code,
      state: params.state,
      redirectUri: `${window.location.origin}/migration/visma/callback`,
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function getVismaConnection(companyId: string): Promise<VismaConnectionInfo> {
  const { data, error } = await (supabase as any)
    .from("visma_connections")
    .select("visma_company_id, expires_at")
    .eq("company_id", companyId)
    .maybeSingle();
  if (error || !data) return { connected: false };
  return {
    connected: true,
    vismaCompanyId: data.visma_company_id ?? undefined,
    expiresAt: data.expires_at,
  };
}

export async function disconnectVisma(companyId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("visma_connections")
    .delete()
    .eq("company_id", companyId);
  if (error) throw error;
}
