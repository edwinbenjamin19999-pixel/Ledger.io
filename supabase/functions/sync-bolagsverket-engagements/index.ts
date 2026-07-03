import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Sync engagements + signatories for a company from Bolagsverket.
 *
 * If BOLAGSVERKET_FORETAGSINFO_API_KEY is missing (free tier only),
 * we mark the company with engagements_status='unavailable' and exit
 * cleanly — NO guesses, NO fake data.
 *
 * Called from QuickOnboarding right after company insert (non-blocking).
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId, orgNumber } = await req.json();
    if (!companyId || !orgNumber) {
      return new Response(
        JSON.stringify({ error: "companyId and orgNumber required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Skip if already synced
    const { data: existing } = await supabase
      .from("companies")
      .select("bolagsverket_synced_at, engagements_status")
      .eq("id", companyId)
      .maybeSingle();

    if (existing?.bolagsverket_synced_at) {
      return new Response(
        JSON.stringify({
          skipped: true,
          reason: "already_synced",
          syncedAt: existing.bolagsverket_synced_at,
          engagementsStatus: existing.engagements_status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Call bolagsverket-company action=full
    const fullRes = await fetch(`${supabaseUrl}/functions/v1/bolagsverket-company`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orgNumber, action: "full" }),
    });

    if (!fullRes.ok) {
      const errText = await fullRes.text();
      console.error("bolagsverket-company full failed:", errText);
      return new Response(
        JSON.stringify({ error: "Bolagsverket fetch failed", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const full = await fullRes.json();

    const engagementsAvailable = full.engagementsAvailable === true;
    const engagementsStatus = engagementsAvailable ? "synced" : "unavailable";

    // If paid API not available → mark + create explicit "unavailable" signatory record
    if (!engagementsAvailable) {
      await supabase
        .from("company_signatories")
        .upsert({
          company_id: companyId,
          source: "unavailable",
          signing_rule: full.engagementsMessage ||
            "Ledamöter & firmatecknare kräver Bolagsverkets betalda API – kontakta support för aktivering.",
          persons: [],
        }, { onConflict: "company_id,source" })
        .select();
    } else {
      // Paid API path (engagements payload structure TBD when activated)
      const engagements = Array.isArray(full.engagements) ? full.engagements : [];
      if (engagements.length > 0) {
        await supabase
          .from("company_engagements")
          .insert(
            engagements.map((e: any) => ({
              company_id: companyId,
              person_name: e.name || e.namn || "",
              person_id: e.personalNumber || e.identitetsbeteckning || null,
              role: e.role || e.funktion || "unknown",
              source: "bolagsverket",
              raw_data: e,
            })),
          );
      }
      if (full.signatories) {
        await supabase
          .from("company_signatories")
          .upsert({
            company_id: companyId,
            source: "bolagsverket",
            signing_rule: full.signatories.signingRule || full.signatories.firmateckning || "",
            persons: full.signatories.persons || [],
          }, { onConflict: "company_id,source" });
      }
    }

    // Mark company as synced
    await supabase
      .from("companies")
      .update({
        bolagsverket_synced_at: new Date().toISOString(),
        engagements_status: engagementsStatus,
      })
      .eq("id", companyId);

    return new Response(
      JSON.stringify({
        success: true,
        engagementsAvailable,
        engagementsStatus,
        message: full.engagementsMessage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("sync-bolagsverket-engagements error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
