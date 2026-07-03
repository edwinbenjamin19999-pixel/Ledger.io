import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import {
  verifyPartnerKey,
  PartnerAuthError,
  logApiCall,
  getRequestId,
  getClientIp,
} from "../_shared/partnerAuth.ts";

serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  const startTime = Date.now();
  const requestId = getRequestId(req);
  const ip = getClientIp(req);
  let partnerId: string | null = null;
  let apiKeyId: string | null = null;
  let statusCode = 200;
  let errorMessage: string | undefined;

  try {
    const ctx = await verifyPartnerKey(req);
    partnerId = ctx.partner_id;
    apiKeyId = ctx.api_key_id;

    return new Response(
      JSON.stringify({
        status: "ok",
        partner: ctx.partner_name,
        environment: ctx.environment,
        scopes: ctx.scopes,
        request_id: requestId,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json", "x-request-id": requestId },
      }
    );
  } catch (err) {
    if (err instanceof PartnerAuthError) {
      statusCode = err.status;
      errorMessage = err.message;
      return new Response(
        JSON.stringify({ error: err.message, error_code: err.errorCode, request_id: requestId }),
        {
          status: err.status,
          headers: { ...corsHeaders, "Content-Type": "application/json", "x-request-id": requestId },
        }
      );
    }
    statusCode = 500;
    errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal error", request_id: requestId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } finally {
    logApiCall({
      partner_id: partnerId,
      api_key_id: apiKeyId,
      endpoint: "/v1/health",
      method: req.method,
      status_code: statusCode,
      ip,
      request_id: requestId,
      latency_ms: Date.now() - startTime,
      error_message: errorMessage,
    }).catch(() => {});
  }
});
