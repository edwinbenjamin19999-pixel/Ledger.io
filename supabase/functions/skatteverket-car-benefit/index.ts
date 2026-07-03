import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Skatteverket Bilförmån API 2.0 (Partner-API) + Öppna data fallback
 * Beräknar bilförmånsvärde baserat på:
 * - Nybilspris (från Skatteverkets nybilsprisregister)
 * - Prisbasbelopp
 * - Eventuella tillägg för drivmedel
 * 
 * Beräkningsformel 2026:
 * Förmånsvärde = 0.317 × prisbasbelopp + 0.09 × nybilspris (för bilar ≤ 7.5 × pbb)
 * Extra tillägg för bilar > 7.5 × pbb: + 0.20 × (nybilspris - 7.5 × pbb)
 */

const PRISBASBELOPP: Record<number, number> = {
  2024: 57300,
  2025: 58800,
  2026: 59700, // Förväntad
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'calculate';

    if (action === 'lookup') {
      // Look up car by brand/model from Skatteverket's open data
      const brand = url.searchParams.get('brand') || '';
      const model = url.searchParams.get('model') || '';
      const year = url.searchParams.get('year') || new Date().getFullYear().toString();

      const params = new URLSearchParams({
        _limit: '20',
        tillverkningsar: year,
      });
      if (brand) params.set('marke', brand);

      const apiUrl = `https://skatteverket.entryscape.net/rowstore/dataset/fad86bf9-67e3-4d68-829c-7b9a23bc5e42?${params.toString()}`;
      
      const response = await fetch(apiUrl, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();

      const results = (data.results || [])
        .filter((r: any) => !model || (r.modell || '').toLowerCase().includes(model.toLowerCase()))
        .map((r: any) => ({
          brand: r.marke,
          model: r.modell,
          year: r.tillverkningsar,
          new_car_price: parseInt((r.nybilspris || '0').replace(/\s/g, '')),
          fuel_type: r.bransletyp,
          code: r.kod,
        }));

      return new Response(JSON.stringify({
        success: true,
        results,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'calculate') {
      const body = await req.json();
      const { 
        new_car_price,
        tax_year = new Date().getFullYear(),
        is_electric = false,
        is_diesel = false,
        extra_equipment_value = 0,
        employer_pays_fuel = false,
      } = body;

      if (!new_car_price) throw new Error('new_car_price is required');

      const pbb = PRISBASBELOPP[tax_year] || PRISBASBELOPP[2026];
      const adjustedPrice = new_car_price + extra_equipment_value;
      const threshold = 7.5 * pbb;

      // Base benefit calculation
      let benefitValue = 0;

      // Fixed component: 31.7% of prisbasbelopp
      benefitValue += 0.317 * pbb;

      // Price component: 9% of nybilspris up to 7.5 × pbb
      if (adjustedPrice <= threshold) {
        benefitValue += 0.09 * adjustedPrice;
      } else {
        benefitValue += 0.09 * threshold;
        benefitValue += 0.20 * (adjustedPrice - threshold);
      }

      // Environmental adjustments
      if (is_electric) {
        // Electric cars: reduced by 40% (max 10 pbb)
        const reduction = Math.min(benefitValue * 0.40, 10 * pbb);
        benefitValue -= reduction;
      }

      // Diesel supplement
      if (is_diesel) {
        // Additional environmental charge for diesel
        benefitValue *= 1.02; // Approximate
      }

      // Fuel benefit (if employer pays private fuel)
      let fuelBenefit = 0;
      if (employer_pays_fuel) {
        // 120% of 0.12 × pbb per year for fuel benefit
        fuelBenefit = 1.2 * 0.12 * pbb;
      }

      const monthlyBenefit = Math.round(benefitValue / 12);
      const monthlyFuelBenefit = Math.round(fuelBenefit / 12);
      const totalMonthly = monthlyBenefit + monthlyFuelBenefit;

      // Employer cost (arbetsgivaravgift 31.42%)
      const monthlyEmployerCost = Math.round(totalMonthly * 0.3142);

      return new Response(JSON.stringify({
        success: true,
        calculation: {
          new_car_price: adjustedPrice,
          prisbasbelopp: pbb,
          tax_year,
          is_electric,
          annual_benefit: Math.round(benefitValue),
          monthly_benefit: monthlyBenefit,
          fuel_benefit_monthly: monthlyFuelBenefit,
          total_monthly_benefit: totalMonthly,
          employer_cost_monthly: monthlyEmployerCost,
          total_monthly_cost: totalMonthly + monthlyEmployerCost,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in skatteverket-car-benefit:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
