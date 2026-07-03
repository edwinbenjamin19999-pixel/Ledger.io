import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, corsJson, corsError } from "../_shared/cors.ts";

interface BreadcrumbEvent {
  type?: string;
  description?: string;
  timestamp?: string;
}

interface ErrorPayload {
  errorId?: string;
  message?: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  timestamp?: string;
  userAgent?: string;
  breadcrumbs?: BreadcrumbEvent[];
  userId?: string;
  companyId?: string;
}

serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  if (req.method !== "POST") {
    return corsError("Method not allowed", 405);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let payload: ErrorPayload;
    try {
      payload = await req.json();
    } catch {
      return corsError("Invalid JSON body", 400);
    }

    if (!payload?.message) {
      return corsError("Missing required field: message", 400);
    }

    // Truncate large fields to avoid runaway storage
    const trim = (s: string | undefined, max: number) =>
      typeof s === "string" ? s.slice(0, max) : null;

    const errorId =
      payload.errorId ||
      `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Try to attach user_id from JWT if present (best-effort, fail-silent)
    let userId: string | null = payload.userId ?? null;
    const authHeader = req.headers.get("Authorization");
    if (!userId && authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.slice(7);
        const { data } = await supabase.auth.getUser(token);
        if (data?.user?.id) userId = data.user.id;
      } catch {
        /* ignore */
      }
    }

    const breadcrumbs = Array.isArray(payload.breadcrumbs)
      ? payload.breadcrumbs.slice(-20)
      : [];

    const { error } = await supabase.from("error_logs").upsert(
      {
        error_id: errorId,
        message: trim(payload.message, 4000),
        stack: trim(payload.stack, 12000),
        component_stack: trim(payload.componentStack, 8000),
        url: trim(payload.url, 1000),
        user_agent: trim(payload.userAgent, 500),
        occurred_at: payload.timestamp || new Date().toISOString(),
        breadcrumbs,
        user_id: userId,
        company_id: payload.companyId ?? null,
        fix_status: "pending",
      },
      { onConflict: "error_id" },
    );

    if (error) {
      console.error("[log-error] insert failed:", error);
      return corsError(error.message, 500);
    }

    return corsJson({ success: true, errorId });
  } catch (err) {
    console.error("[log-error] unexpected:", err);
    return corsError(err instanceof Error ? err.message : String(err), 500);
  }
});
