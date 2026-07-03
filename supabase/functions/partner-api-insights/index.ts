import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import {
  verifyPartnerKey,
  requireScope,
  resolveCompanyId,
  checkRateLimit,
  PartnerAuthError,
  logApiCall,
  getRequestId,
  getClientIp,
  getServiceClient,
} from "../_shared/partnerAuth.ts";

type InsightType = "anomalies" | "suggestions" | "cfo";

serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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
    requireScope(ctx, "insights:read");

    if (!(await checkRateLimit(ctx.partner_id))) {
      statusCode = 429;
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          error_code: "rate_limit_exceeded",
          request_id: requestId,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const clientRef = url.searchParams.get("client_ref");
    const type = (url.searchParams.get("type") || "anomalies") as InsightType;

    if (!clientRef) {
      statusCode = 400;
      return new Response(
        JSON.stringify({
          error: "Missing required query param: client_ref",
          error_code: "missing_param",
          request_id: requestId,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["anomalies", "suggestions", "cfo"].includes(type)) {
      statusCode = 400;
      return new Response(
        JSON.stringify({
          error: "Invalid type. Must be: anomalies | suggestions | cfo",
          error_code: "invalid_type",
          request_id: requestId,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const companyId = await resolveCompanyId(ctx.partner_id, clientRef);
    if (!companyId) {
      statusCode = 404;
      return new Response(
        JSON.stringify({
          error: `Unknown client reference: ${clientRef}`,
          error_code: "client_not_mapped",
          request_id: requestId,
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = getServiceClient();
    let insights: unknown[] = [];

    if (type === "anomalies") {
      const { data } = await supabase
        .from("ai_cashflow_insights")
        .select("id, insight_type, severity, title, summary, confidence_score, created_at")
        .eq("company_id", companyId)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(50);
      insights = data ?? [];
    } else if (type === "suggestions") {
      const { data } = await supabase
        .from("agent_bookings")
        .select("id, account_number, account_name, amount, confidence, explanation, status, created_at")
        .eq("company_id", companyId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(50);
      insights = data ?? [];
    } else if (type === "cfo") {
      const { data } = await supabase
        .from("ai_economist_actions")
        .select("id, action_type, title, financial_impact, confidence, status, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(50);
      insights = data ?? [];
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        type,
        company_id: companyId,
        count: insights.length,
        insights,
        generated_at: new Date().toISOString(),
        request_id: requestId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json", "x-request-id": requestId },
      }
    );
  } catch (err) {
    if (err instanceof PartnerAuthError) {
      statusCode = err.status;
      errorMessage = err.message;
      return new Response(
        JSON.stringify({ error: err.message, error_code: err.errorCode, request_id: requestId }),
        { status: err.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (statusCode === 200) statusCode = 500;
    errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("partner-api-insights error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", request_id: requestId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } finally {
    logApiCall({
      partner_id: partnerId,
      api_key_id: apiKeyId,
      endpoint: "/v1/insights",
      method: req.method,
      status_code: statusCode,
      ip,
      request_id: requestId,
      latency_ms: Date.now() - startTime,
      error_message: errorMessage,
    }).catch(() => {});
  }
});
