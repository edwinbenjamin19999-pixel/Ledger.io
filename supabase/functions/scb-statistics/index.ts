import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * SCB (Statistiska Centralbyrån) Open Data API — Free, no API key required
 * Fetches industry statistics, price indices, and salary data.
 * 
 * Base URL: https://api.scb.se/OV0104/v1/doris/sv/ssd/
 * Documentation: https://www.scb.se/vara-tjanster/oppna-data/api-for-statistikdatabasen/
 * 
 * Actions:
 *   - industry_stats: Revenue/profit data by SNI code (industry)
 *   - salary_stats: Average salary by industry
 *   - price_index: KPI (Consumer Price Index) for contract adjustments
 *   - bankruptcy_stats: Bankruptcy statistics by industry
 */

const SCB_API = "https://api.scb.se/OV0104/v1/doris/sv/ssd";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action = "price_index", sni_code, year } = await req.json();

    if (action === "price_index") {
      // KPI — Konsumentprisindex, table PR0101/PR0101A/KPI
      const url = `${SCB_API}/PR/PR0101/PR0101A/KPItotM`;
      
      const currentYear = year || new Date().getFullYear();
      const queryBody = {
        query: [
          {
            code: "Tid",
            selection: {
              filter: "top",
              values: ["12"], // Last 12 months
            },
          },
        ],
        response: { format: "json" },
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queryBody),
      });

      if (!response.ok) {
        throw new Error(`SCB KPI API error: ${response.status}`);
      }

      const data = await response.json();

      const observations = (data.data || []).map((d: any) => ({
        period: d.key?.[0] || "",
        kpi: parseFloat(d.values?.[0] || "0"),
      }));

      return new Response(JSON.stringify({
        success: true,
        action: "price_index",
        data: {
          index_name: "KPI (Konsumentprisindex)",
          base_year: "1980=100",
          observations,
          source: "SCB - Statistiska Centralbyrån",
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "salary_stats") {
      // Average salary by industry — table AM0103
      const url = `${SCB_API}/AM/AM0103/AM0103B/LoneijamnSNI`;
      
      const queryBody = {
        query: [
          ...(sni_code ? [{
            code: "SNI2007",
            selection: {
              filter: "item",
              values: [sni_code],
            },
          }] : []),
          {
            code: "Tid",
            selection: {
              filter: "top",
              values: ["1"], // Latest year
            },
          },
        ],
        response: { format: "json" },
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queryBody),
      });

      if (!response.ok) {
        // Return helpful message if specific table not found
        return new Response(JSON.stringify({
          success: true,
          action: "salary_stats",
          data: {
            message: "Lönestatistik hämtas från SCB AM0103. Ange SNI-kod för branschspecifik data.",
            sni_code: sni_code || "ej angiven",
            source: "SCB - Statistiska Centralbyrån",
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();

      return new Response(JSON.stringify({
        success: true,
        action: "salary_stats",
        data: {
          sni_code: sni_code || "alla",
          columns: data.columns?.map((c: any) => c.text) || [],
          entries: (data.data || []).map((d: any) => ({
            industry: d.key?.join(" - ") || "",
            average_salary: parseFloat(d.values?.[0] || "0"),
          })),
          source: "SCB - Statistiska Centralbyrån",
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "industry_stats") {
      // Company statistics by SNI code
      const url = `${SCB_API}/NV/NV0109/NV0109T01`;
      
      const queryBody = {
        query: [
          ...(sni_code ? [{
            code: "SNI2007",
            selection: {
              filter: "item",
              values: [sni_code],
            },
          }] : []),
          {
            code: "Tid",
            selection: {
              filter: "top",
              values: ["1"],
            },
          },
        ],
        response: { format: "json" },
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queryBody),
      });

      if (!response.ok) {
        return new Response(JSON.stringify({
          success: true,
          action: "industry_stats",
          data: {
            message: "Branschstatistik hämtas från SCB NV0109. Ange SNI-kod för specifik bransch.",
            sni_code: sni_code || "ej angiven",
            source: "SCB - Statistiska Centralbyrån",
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();

      return new Response(JSON.stringify({
        success: true,
        action: "industry_stats",
        data: {
          sni_code: sni_code || "alla",
          entries: (data.data || []).map((d: any) => ({
            category: d.key?.join(" - ") || "",
            values: d.values || [],
          })),
          source: "SCB - Statistiska Centralbyrån",
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "bankruptcy_stats") {
      // Bankruptcy statistics
      const url = `${SCB_API}/NV/NV1401/NV1401T01`;

      const queryBody = {
        query: [
          {
            code: "Tid",
            selection: {
              filter: "top",
              values: ["12"],
            },
          },
        ],
        response: { format: "json" },
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queryBody),
      });

      if (!response.ok) {
        throw new Error(`SCB bankruptcy API error: ${response.status}`);
      }

      const data = await response.json();

      return new Response(JSON.stringify({
        success: true,
        action: "bankruptcy_stats",
        data: {
          entries: (data.data || []).map((d: any) => ({
            period: d.key?.[0] || "",
            count: parseInt(d.values?.[0] || "0"),
          })),
          source: "SCB - Statistiska Centralbyrån",
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      throw new Error('Invalid action. Use "price_index", "salary_stats", "industry_stats", or "bankruptcy_stats"');
    }

  } catch (error) {
    console.error("Error in scb-statistics:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
