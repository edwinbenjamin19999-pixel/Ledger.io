/**
 * Partner API authentication middleware.
 * Verifies Bearer tokens against SHA-256 hashed keys in `partner_api_keys`.
 * Returns partner context or throws 401/403.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface PartnerContext {
  partner_id: string;
  api_key_id: string;
  partner_name: string;
  environment: "sandbox" | "production";
  scopes: string[];
  status: string;
  ip_allowlist: string[] | null;
}

export class PartnerAuthError extends Error {
  constructor(public status: number, public errorCode: string, message: string) {
    super(message);
  }
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
}

export function getRequestId(req: Request): string {
  return req.headers.get("x-request-id") || crypto.randomUUID();
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

export async function verifyPartnerKey(req: Request): Promise<PartnerContext> {
  const auth = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    throw new PartnerAuthError(401, "missing_credentials", "Missing Bearer token");
  }
  const rawKey = auth.slice(7).trim();
  if (!rawKey.startsWith("pk_live_") && !rawKey.startsWith("pk_test_")) {
    throw new PartnerAuthError(401, "invalid_key_format", "Invalid API key format");
  }

  const keyHash = await sha256Hex(rawKey);
  const supabase = getServiceClient();

  const { data: keyRow, error } = await supabase
    .from("partner_api_keys")
    .select("id, partner_id, environment, scopes, expires_at, revoked_at, partners!inner(id, name, status, ip_allowlist)")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !keyRow) {
    throw new PartnerAuthError(401, "invalid_key", "Invalid API key");
  }
  if (keyRow.revoked_at) {
    throw new PartnerAuthError(401, "key_revoked", "API key has been revoked");
  }
  if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
    throw new PartnerAuthError(401, "key_expired", "API key has expired");
  }

  const partner = (keyRow as any).partners;
  if (partner.status === "suspended") {
    throw new PartnerAuthError(403, "partner_suspended", "Partner account suspended");
  }

  // IP allowlist check (optional)
  if (partner.ip_allowlist && partner.ip_allowlist.length > 0) {
    const ip = getClientIp(req);
    if (!partner.ip_allowlist.includes(ip)) {
      throw new PartnerAuthError(403, "ip_not_allowed", "IP address not allowed");
    }
  }

  // Update last_used_at (fire-and-forget)
  supabase
    .from("partner_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRow.id)
    .then(() => {});

  return {
    partner_id: keyRow.partner_id,
    api_key_id: keyRow.id,
    partner_name: partner.name,
    environment: keyRow.environment as "sandbox" | "production",
    scopes: Array.isArray(keyRow.scopes) ? keyRow.scopes : [],
    status: partner.status,
    ip_allowlist: partner.ip_allowlist,
  };
}

export function requireScope(ctx: PartnerContext, scope: string) {
  if (!ctx.scopes.includes(scope)) {
    throw new PartnerAuthError(403, "missing_scope", `Required scope: ${scope}`);
  }
}

/** Rate limit: 100 req/min per partner. */
export async function checkRateLimit(partnerId: string): Promise<boolean> {
  const supabase = getServiceClient();
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase
    .from("partner_api_logs")
    .select("id", { count: "exact", head: true })
    .eq("partner_id", partnerId)
    .gte("created_at", since);
  return (count ?? 0) < 100;
}

export async function logApiCall(params: {
  partner_id: string | null;
  api_key_id: string | null;
  endpoint: string;
  method: string;
  status_code: number;
  ip: string;
  request_id: string;
  latency_ms: number;
  error_message?: string;
}) {
  const supabase = getServiceClient();
  await supabase.from("partner_api_logs").insert(params);
}

export async function resolveCompanyId(
  partnerId: string,
  externalClientRef: string
): Promise<string | null> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("partner_clients")
    .select("company_id")
    .eq("partner_id", partnerId)
    .eq("external_client_ref", externalClientRef)
    .maybeSingle();
  return data?.company_id ?? null;
}
