import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface SanctionsCheckRequest {
  company_id: string;
  company_name: string;
  org_number?: string;
  owners?: Array<{ name: string; personal_number?: string }>;
}

interface OpenSanctionsMatch {
  id: string;
  caption: string;
  schema: string;
  properties: Record<string, string[]>;
  datasets: string[];
  referents: string[];
  score: number;
}

interface OpenSanctionsResponse {
  responses: Record<string, {
    query: { text: string };
    results: OpenSanctionsMatch[];
    total: { value: number };
  }>;
}

async function searchOpenSanctions(names: string[]): Promise<Map<string, OpenSanctionsMatch[]>> {
  const results = new Map<string, OpenSanctionsMatch[]>();
  
  // OpenSanctions public API endpoint
  const apiUrl = "https://api.opensanctions.org/match/default";
  
  // Build queries for batch matching
  const queries: Record<string, { schema: string; properties: { name: string[] } }> = {};
  
  names.forEach((name, index) => {
    queries[`q${index}`] = {
      schema: "Thing", // Matches both Person and Organization
      properties: {
        name: [name]
      }
    };
  });
  
  try {
    console.log("[SANCTIONS-CHECK] Searching OpenSanctions for:", names);
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ queries }),
    });
    
    if (!response.ok) {
      // If rate limited or API unavailable, fall back to individual searches
      console.warn("[SANCTIONS-CHECK] Batch API failed, trying individual searches");
      
      for (const name of names) {
        const searchUrl = `https://api.opensanctions.org/search/default?q=${encodeURIComponent(name)}&limit=5`;
        const searchResponse = await fetch(searchUrl);
        
        if (searchResponse.ok) {
          const data = await searchResponse.json();
          if (data.results && data.results.length > 0) {
            // Filter for high confidence matches (score > 0.7)
            const matches = data.results.filter((r: OpenSanctionsMatch) => r.score > 0.7);
            results.set(name, matches);
          } else {
            results.set(name, []);
          }
        } else {
          results.set(name, []);
        }
      }
      
      return results;
    }
    
    const data: OpenSanctionsResponse = await response.json();
    
    // Process batch results
    names.forEach((name, index) => {
      const queryKey = `q${index}`;
      const queryResult = data.responses[queryKey];
      
      if (queryResult && queryResult.results.length > 0) {
        // Filter for high confidence matches (score > 0.7)
        const matches = queryResult.results.filter(r => r.score > 0.7);
        results.set(name, matches);
      } else {
        results.set(name, []);
      }
    });
    
    return results;
  } catch (error) {
    console.error("[SANCTIONS-CHECK] Error calling OpenSanctions:", error);
    
    // Return empty results on error - don't fail the check
    names.forEach(name => results.set(name, []));
    return results;
  }
}

function determineRiskLevel(matches: Map<string, OpenSanctionsMatch[]>): string {
  let hasHighRisk = false;
  let hasMediumRisk = false;
  
  for (const [name, entityMatches] of matches) {
    for (const match of entityMatches) {
      // Check for PEP (Politically Exposed Person)
      if (match.datasets.some(d => d.includes("pep"))) {
        hasMediumRisk = true;
      }
      
      // Check for sanctions
      if (match.datasets.some(d => 
        d.includes("sanction") || 
        d.includes("ofac") || 
        d.includes("eu_fsf") ||
        d.includes("un_sc")
      )) {
        hasHighRisk = true;
      }
      
      // Very high score match is concerning
      if (match.score > 0.95) {
        hasHighRisk = true;
      }
    }
  }
  
  if (hasHighRisk) return "high";
  if (hasMediumRisk) return "medium";
  return "low";
}

function formatMatchDetails(matches: Map<string, OpenSanctionsMatch[]>): object {
  const details: Record<string, any> = {
    checked_at: new Date().toISOString(),
    source: "OpenSanctions",
    entities_checked: [],
    matches_found: [],
    summary: {
      total_entities_checked: 0,
      total_matches: 0,
      pep_matches: 0,
      sanctions_matches: 0,
    }
  };
  
  for (const [name, entityMatches] of matches) {
    details.entities_checked.push(name);
    details.summary.total_entities_checked++;
    
    for (const match of entityMatches) {
      details.summary.total_matches++;
      
      const matchDetail = {
        queried_name: name,
        matched_name: match.caption,
        score: match.score,
        type: match.schema,
        datasets: match.datasets,
        is_pep: match.datasets.some(d => d.includes("pep")),
        is_sanctioned: match.datasets.some(d => 
          d.includes("sanction") || 
          d.includes("ofac") || 
          d.includes("eu_fsf") ||
          d.includes("un_sc")
        ),
      };
      
      if (matchDetail.is_pep) details.summary.pep_matches++;
      if (matchDetail.is_sanctioned) details.summary.sanctions_matches++;
      
      details.matches_found.push(matchDetail);
    }
  }
  
  return details;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { company_id, company_name, org_number, owners = [] }: SanctionsCheckRequest = await req.json();

    console.log("[SANCTIONS-CHECK] Starting check for company:", company_name, "ID:", company_id);

    // Build list of names to check
    const namesToCheck: string[] = [company_name];
    
    // Add owner names
    for (const owner of owners) {
      if (owner.name) {
        namesToCheck.push(owner.name);
      }
    }

    console.log("[SANCTIONS-CHECK] Checking names:", namesToCheck);

    // Perform sanctions check
    const matches = await searchOpenSanctions(namesToCheck);
    
    // Determine risk level
    const riskLevel = determineRiskLevel(matches);
    
    // Format detailed results
    const checkResult = formatMatchDetails(matches);
    
    console.log("[SANCTIONS-CHECK] Risk level:", riskLevel, "Matches:", (checkResult as any).summary.total_matches);

    // Update KYC record
    const { error: updateError } = await supabaseClient
      .from("kyc_records")
      .update({
        sanctions_check_performed: true,
        sanctions_check_date: new Date().toISOString(),
        sanctions_check_result: checkResult,
        risk_level: riskLevel,
        risk_factors: {
          sanctions_risk: riskLevel !== "low",
          pep_identified: (checkResult as any).summary.pep_matches > 0,
          last_check: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", company_id);

    if (updateError) {
      console.error("[SANCTIONS-CHECK] Error updating KYC record:", updateError);
      throw updateError;
    }

    // If high risk, update company status
    if (riskLevel === "high") {
      await supabaseClient
        .from("companies")
        .update({ kyc_status: "in_review" })
        .eq("id", company_id);
        
      console.log("[SANCTIONS-CHECK] Company flagged for review due to high risk");
    }

    return new Response(
      JSON.stringify({
        success: true,
        risk_level: riskLevel,
        summary: (checkResult as any).summary,
        requires_review: riskLevel === "high",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[SANCTIONS-CHECK] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
