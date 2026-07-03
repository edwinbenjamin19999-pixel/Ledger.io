import { supabase } from "@/integrations/supabase/client";

const FORTNOX_AUTH_URL = "https://apps.fortnox.se/oauth-v1/auth";

const SCOPES = [
  "companyinformation",
  "customer",
  "supplier",
  "invoice",
  "supplierinvoice",
  "bookkeeping",
  "article",
];

export interface FortnoxConnectionInfo {
  connected: boolean;
  fortnoxCompanyId?: string;
  expiresAt?: string;
}

/**
 * Begin Fortnox OAuth flow.
 * Calls edge function `fortnox-oauth-start` which:
 *  - generates and persists a CSRF state in fortnox_oauth_states
 *  - returns the authorization URL the user should be redirected to.
 */
/**
 * Extract a human-readable error message from a Supabase Edge Function error.
 * supabase-js wraps non-2xx responses in FunctionsHttpError whose default message
 * is the unhelpful "Edge Function returned a non-2xx status code". The actual
 * JSON body lives on `error.context` (a Response). We read it here so callers
 * can show the real Swedish message returned by the function.
 */
async function readEdgeError(error: any, fallback: string): Promise<Error> {
  try {
    const res: Response | undefined = error?.context;
    if (res && typeof res.json === "function") {
      const body = await res.clone().json().catch(() => null);
      if (body?.error) return new Error(body.error);
      if (body?.message) return new Error(body.message);
    }
  } catch {
    /* ignore */
  }
  return new Error(error?.message || fallback);
}

export async function startFortnoxOAuth(companyId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("fortnox-oauth-start", {
    body: {
      companyId,
      redirectUri: `${window.location.origin}/migration/fortnox/callback`,
      scopes: SCOPES,
    },
  });
  if (error) throw await readEdgeError(error, "Kunde inte starta Fortnox-anslutning");
  if (data?.error) throw new Error(data.error);
  if (!data?.authUrl) throw new Error("Kunde inte starta Fortnox-anslutning");
  return data.authUrl as string;
}

/** Manually build URL fallback (not normally used — prefer startFortnoxOAuth). */
export function buildFortnoxAuthUrlClientFallback(
  clientId: string,
  state: string,
  redirectUri: string,
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    state,
    response_type: "code",
    access_type: "offline",
  });
  return `${FORTNOX_AUTH_URL}?${params.toString()}`;
}

/** Exchange the authorization code for tokens via edge function. */
export async function completeFortnoxOAuth(params: {
  code: string;
  state: string;
}): Promise<{ companyId: string; fortnoxCompanyId?: string }> {
  const { data, error } = await supabase.functions.invoke("fortnox-oauth-callback", {
    body: {
      code: params.code,
      state: params.state,
      redirectUri: `${window.location.origin}/migration/fortnox/callback`,
    },
  });
  if (error) throw await readEdgeError(error, "Kunde inte slutföra anslutningen");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function getFortnoxConnection(companyId: string): Promise<FortnoxConnectionInfo> {
  const { data, error } = await supabase
    .from("fortnox_connections")
    .select("fortnox_company_id, expires_at")
    .eq("company_id", companyId)
    .maybeSingle();
  if (error || !data) return { connected: false };
  return {
    connected: true,
    fortnoxCompanyId: data.fortnox_company_id ?? undefined,
    expiresAt: data.expires_at,
  };
}

export async function disconnectFortnox(companyId: string): Promise<void> {
  const { error } = await supabase
    .from("fortnox_connections")
    .delete()
    .eq("company_id", companyId);
  if (error) throw error;
}
