import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Skatteverket Skattekonto API 2.1 (Partner-API - kräver avtal)
 *
 * Actions:
 *  - balance      → /api/skattekonto/v2/{orgnr}/saldo
 *  - transactions → /api/skattekonto/v2/{orgnr}/transaktioner
 *  - upcoming     → /api/skattekonto/v2/{orgnr}/kontohandelser?from=today
 *                   Returnerar normaliserad payload:
 *                   { nextDueDate, nextDueAmount, ocr, paymentReference, history[] }
 */

interface UpcomingEvent {
  forfallodatum?: string;
  belopp?: number;
  ocr?: string;
  betalningsreferens?: string;
  typ?: string;
  beskrivning?: string;
}

function normalizeUpcoming(raw: any) {
  const events: UpcomingEvent[] = Array.isArray(raw?.kontohandelser)
    ? raw.kontohandelser
    : Array.isArray(raw)
      ? raw
      : [];

  // Filter to F-skatt / preliminärskatt entries with future due date
  const today = new Date().toISOString().slice(0, 10);
  const ftax = events
    .filter((e) => {
      const t = (e.typ || e.beskrivning || "").toLowerCase();
      return (
        (t.includes("f-skatt") ||
          t.includes("preliminär") ||
          t.includes("preliminar")) &&
        (e.forfallodatum ?? "") >= today
      );
    })
    .sort((a, b) => (a.forfallodatum ?? "").localeCompare(b.forfallodatum ?? ""));

  const next = ftax[0];

  return {
    nextDueDate: next?.forfallodatum ?? null,
    nextDueAmount: next?.belopp ? Math.abs(Number(next.belopp)) : 0,
    ocr: next?.ocr ?? null,
    paymentReference: next?.betalningsreferens ?? next?.ocr ?? null,
    history: events,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { company_id, action = "balance" } = await req.json();

    // OAuth token
    const { data: authData, error: authError } = await supabase.functions.invoke(
      "skatteverket-oauth",
      {
        body: { company_id },
        headers: { Authorization: authHeader },
      },
    );
    if (authError || !authData?.access_token) {
      throw new Error("Failed to get Skatteverket OAuth token");
    }
    const { access_token, base_url } = authData;

    // Org number
    const { data: company } = await supabase
      .from("companies")
      .select("org_number")
      .eq("id", company_id)
      .maybeSingle();
    if (!company) throw new Error("Company not found");
    const orgNr = company.org_number.replace("-", "");

    let endpoint: string;
    let result: unknown;

    if (action === "balance") {
      endpoint = `${base_url}/api/skattekonto/v2/${orgNr}/saldo`;
    } else if (action === "transactions") {
      endpoint = `${base_url}/api/skattekonto/v2/${orgNr}/transaktioner`;
    } else if (action === "upcoming") {
      endpoint = `${base_url}/api/skattekonto/v2/${orgNr}/kontohandelser`;
    } else {
      throw new Error('Invalid action. Use "balance" | "transactions" | "upcoming"');
    }

    const response = await fetch(endpoint, {
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Skattekonto ${action} error:`, errorText);
      throw new Error(`Failed to fetch ${action}: ${response.status}`);
    }

    const raw = await response.json();
    result = action === "upcoming" ? normalizeUpcoming(raw) : raw;

    return new Response(
      JSON.stringify({ success: true, action, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in skatteverket-skattekonto:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
