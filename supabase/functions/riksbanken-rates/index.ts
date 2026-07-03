import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Riksbanken SWEA API v1 — Free, no API key required
 * Fetches daily exchange rates published by Sveriges Riksbank.
 * 
 * Endpoint: https://api.riksbank.se/swea/v1/CrossRates
 * Documentation: https://developer.riksbank.se/
 * 
 * Actions:
 *   - rates: Get latest exchange rates for common currencies
 *   - convert: Convert amount between currencies via SEK cross-rate
 *   - history: Get historical rates for a date range
 */

const RIKSBANK_API = "https://api.riksbank.se/swea/v1";

// Common currencies for Swedish businesses
const DEFAULT_CURRENCIES = ["EUR", "USD", "GBP", "NOK", "DKK", "CHF", "PLN", "JPY", "CAD", "AUD"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action = "rates", currencies, from_currency, to_currency, amount, date_from, date_to } = await req.json();

    if (action === "rates") {
      // Fetch latest cross rates for specified or default currencies
      const currencyList = currencies || DEFAULT_CURRENCIES;
      const rates: Record<string, { rate: number; date: string }> = {};

      // Riksbanken uses series IDs like "SEK{CCY}PMI" for daily rates
      const seriesIds = currencyList.map((c: string) => `SEK${c}PMI`);

      const url = `${RIKSBANK_API}/CrossRates/${seriesIds.join(",")}`;
      const response = await fetch(url, {
        headers: { "Accept": "application/json" },
      });

      if (!response.ok) {
        // Fallback: try the observations endpoint
        const fallbackRates = await fetchRatesFallback(currencyList);
        return new Response(JSON.stringify({ success: true, action: "rates", data: fallbackRates }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();

      // Parse response - format varies, handle both array and object
      if (Array.isArray(data)) {
        for (const entry of data) {
          const currency = entry.seriesId?.replace("SEK", "").replace("PMI", "") || entry.currency;
          if (currency) {
            rates[currency] = {
              rate: parseFloat(entry.value || entry.rate || "0"),
              date: entry.date || entry.period || new Date().toISOString().split("T")[0],
            };
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        action: "rates",
        data: {
          base: "SEK",
          rates,
          fetched_at: new Date().toISOString(),
          source: "Sveriges Riksbank",
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "convert") {
      if (!from_currency || !to_currency || !amount) {
        throw new Error("Missing required fields: from_currency, to_currency, amount");
      }

      // Get rates for both currencies
      const ratesData = await fetchRatesFallback([from_currency, to_currency].filter((c: string) => c !== "SEK"));
      
      let amountInSEK: number;
      if (from_currency === "SEK") {
        amountInSEK = amount;
      } else {
        const fromRate = ratesData[from_currency]?.rate;
        if (!fromRate) throw new Error(`No rate found for ${from_currency}`);
        amountInSEK = amount * fromRate;
      }

      let result: number;
      if (to_currency === "SEK") {
        result = amountInSEK;
      } else {
        const toRate = ratesData[to_currency]?.rate;
        if (!toRate) throw new Error(`No rate found for ${to_currency}`);
        result = amountInSEK / toRate;
      }

      return new Response(JSON.stringify({
        success: true,
        action: "convert",
        data: {
          from: { currency: from_currency, amount },
          to: { currency: to_currency, amount: Math.round(result * 100) / 100 },
          rate_date: Object.values(ratesData)[0]?.date || new Date().toISOString().split("T")[0],
          source: "Sveriges Riksbank",
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "history") {
      if (!from_currency || !date_from || !date_to) {
        throw new Error("Missing required fields: from_currency, date_from, date_to");
      }

      const seriesId = from_currency === "SEK" ? "SEKEURPMI" : `SEK${from_currency}PMI`;
      const url = `${RIKSBANK_API}/Observations/${seriesId}/${date_from}/${date_to}`;
      
      const response = await fetch(url, {
        headers: { "Accept": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.status}`);
      }

      const data = await response.json();

      return new Response(JSON.stringify({
        success: true,
        action: "history",
        data: {
          currency: from_currency,
          period: { from: date_from, to: date_to },
          observations: Array.isArray(data) ? data.map((d: any) => ({
            date: d.date || d.period,
            rate: parseFloat(d.value || d.rate || "0"),
          })) : [],
          source: "Sveriges Riksbank",
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      throw new Error('Invalid action. Use "rates", "convert", or "history"');
    }

  } catch (error) {
    console.error("Error in riksbanken-rates:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Fallback: fetch rates from the Observations endpoint (more reliable)
 */
async function fetchRatesFallback(currencies: string[]): Promise<Record<string, { rate: number; date: string }>> {
  const rates: Record<string, { rate: number; date: string }> = {};
  const today = new Date().toISOString().split("T")[0];
  // Go back 7 days to handle weekends/holidays
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const fetches = currencies.map(async (currency) => {
    try {
      const seriesId = `SEK${currency}PMI`;
      const url = `${RIKSBANK_API}/Observations/${seriesId}/${weekAgo}/${today}`;
      const res = await fetch(url, { headers: { "Accept": "application/json" } });
      
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const latest = data[data.length - 1];
          rates[currency] = {
            rate: parseFloat(latest.value || latest.rate || "0"),
            date: latest.date || latest.period || today,
          };
        }
      }
    } catch (e) {
      console.error(`Failed to fetch rate for ${currency}:`, e);
    }
  });

  await Promise.all(fetches);
  return rates;
}
