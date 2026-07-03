import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
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

const TxSchema = z.object({
  external_id: z.string().min(1).max(255),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number(),
  currency: z.string().length(3).default("SEK"),
  description: z.string().max(500),
  account_hint: z.string().optional(),
  counterparty: z.string().optional(),
});

const BodySchema = z.object({
  external_client_ref: z.string().min(1),
  transactions: z.array(TxSchema).min(1).max(500),
});

serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
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
    requireScope(ctx, "transactions:write");

    if (!(await checkRateLimit(ctx.partner_id))) {
      statusCode = 429;
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded (100 req/min)",
          error_code: "rate_limit_exceeded",
          request_id: requestId,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      statusCode = 400;
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          error_code: "invalid_body",
          details: parsed.error.flatten(),
          request_id: requestId,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { external_client_ref, transactions } = parsed.data;
    const companyId = await resolveCompanyId(ctx.partner_id, external_client_ref);
    if (!companyId) {
      statusCode = 404;
      return new Response(
        JSON.stringify({
          error: `Unknown client reference: ${external_client_ref}. Contact admin to map this client.`,
          error_code: "client_not_mapped",
          request_id: requestId,
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sandbox keys cannot write to production data
    if (ctx.environment === "sandbox") {
      statusCode = 403;
      return new Response(
        JSON.stringify({
          error: "Sandbox keys cannot write to production data. Use a pk_live_ key.",
          error_code: "env_mismatch",
          request_id: requestId,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = getServiceClient();
    const rows = transactions.map((tx) => ({
      company_id: companyId,
      transaction_id: `partner_${ctx.partner_id}_${tx.external_id}`,
      booking_date: tx.date,
      value_date: tx.date,
      amount: tx.amount,
      currency: tx.currency,
      description: tx.description,
      counterparty_name: tx.counterparty ?? null,
      reference: tx.account_hint ?? null,
      status: "pending",
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("bank_transactions")
      .upsert(rows, { onConflict: "transaction_id", ignoreDuplicates: true })
      .select("id, transaction_id");

    if (insertError) {
      statusCode = 500;
      errorMessage = insertError.message;
      throw insertError;
    }

    const acceptedCount = inserted?.length ?? 0;
    const duplicateCount = transactions.length - acceptedCount;

    return new Response(
      JSON.stringify({
        status: "ok",
        accepted: acceptedCount,
        duplicates: duplicateCount,
        company_id: companyId,
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
        {
          status: err.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    if (statusCode === 200) statusCode = 500;
    errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("partner-api-transactions error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", request_id: requestId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } finally {
    logApiCall({
      partner_id: partnerId,
      api_key_id: apiKeyId,
      endpoint: "/v1/transactions",
      method: req.method,
      status_code: statusCode,
      ip,
      request_id: requestId,
      latency_ms: Date.now() - startTime,
      error_message: errorMessage,
    }).catch(() => {});
  }
});
