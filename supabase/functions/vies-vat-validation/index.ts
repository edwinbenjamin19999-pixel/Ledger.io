import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * EU VIES VAT Number Validation — Free, no API key required
 * Validates VAT numbers against the European Commission's VIES database.
 * 
 * SOAP endpoint: https://ec.europa.eu/taxation_customs/vies/services/checkVatService
 * REST alternative: https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number
 * 
 * Use cases:
 *   - Verify customer/supplier EU VAT numbers
 *   - Required for reverse charge (omvänd skattskyldighet) invoicing
 *   - B2B cross-border trade compliance
 */

const VIES_REST_URL = "https://ec.europa.eu/taxation_customs/vies/rest-api//check-vat-number";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vat_number, country_code } = await req.json();

    if (!vat_number) {
      throw new Error("Missing required field: vat_number");
    }

    // Extract country code from VAT number if not provided separately
    let cc = country_code?.toUpperCase();
    let vatNum = vat_number.replace(/[\s.-]/g, "").toUpperCase();

    if (!cc) {
      // First two chars should be country code
      cc = vatNum.substring(0, 2);
      vatNum = vatNum.substring(2);
    } else {
      // Remove country code prefix if present in vat_number
      if (vatNum.startsWith(cc)) {
        vatNum = vatNum.substring(cc.length);
      }
    }

    // Validate country code is a valid EU member state
    const euCountries = [
      "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES",
      "FI", "FR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT",
      "NL", "PL", "PT", "RO", "SE", "SI", "SK", "XI" // XI = Northern Ireland
    ];

    if (!euCountries.includes(cc)) {
      throw new Error(`Invalid EU country code: ${cc}. Must be one of: ${euCountries.join(", ")}`);
    }

    // Call VIES REST API
    const response = await fetch(VIES_REST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        countryCode: cc,
        vatNumber: vatNum,
      }),
    });

    if (!response.ok) {
      // VIES can be unavailable — handle gracefully
      if (response.status === 503 || response.status === 500) {
        return new Response(JSON.stringify({
          success: false,
          error: "VIES-tjänsten är tillfälligt otillgänglig. Försök igen senare.",
          vies_unavailable: true,
          vat_number: `${cc}${vatNum}`,
        }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`VIES API error: ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify({
      success: true,
      data: {
        valid: data.valid === true,
        vat_number: `${cc}${vatNum}`,
        country_code: cc,
        name: data.name || null,
        address: data.address || null,
        request_date: data.requestDate || new Date().toISOString().split("T")[0],
        // Swedish-specific: needed for omvänd skattskyldighet
        reverse_charge_applicable: data.valid === true && cc !== "SE",
        source: "EU VIES (European Commission)",
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in vies-vat-validation:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
