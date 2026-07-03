import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Skatteverket Tax Tables API
 * Proxies requests to Skatteverket's open data APIs for:
 * - Monthly salary tax tables (skattetabeller månadslön)
 * - Municipal tax rates (skattesatser per kommun)
 * - Travel allowances (traktamenten utland)
 * - Car benefit values (bilförmån)
 * - Food benefit values (kostförmån)
 */

const DATASETS = {
  // Skattetabeller för månadslön (kolumn-baserade, alla tabellnr 29-42)
  salary_tax_monthly: '805f5a46-dbca-4a72-aeea-dbdda1bf791b',
  // Skattetabeller dagpenning (engångsbelopp)
  salary_tax_daily: '0d3eae5d-99c5-4fd3-b954-9ab3bc705671',
  // Skatteavdrag på årsinkomster (procent-tabell)
  annual_income_tax: 'cd52cab1-5925-4471-8fe2-7824f8ba7c46',
  // Skattesatser per kommun (kommunalskatt, regionskatt, kyrkoavgift, begravningsavgift)
  municipal_tax_rates: 'c67b320b-ffee-4876-b073-dd9236cd2a99',
  // Nybilspriser (bilförmån)
  car_benefit: 'fad86bf9-67e3-4d68-829c-7b9a23bc5e42',
} as const;

const BASE_URL = 'https://skatteverket.entryscape.net/rowstore/dataset';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const dataset = url.searchParams.get('dataset') || 'municipal_tax_rates';
    const year = url.searchParams.get('year') || new Date().getFullYear().toString();
    const municipality = url.searchParams.get('municipality');
    const tableNumber = url.searchParams.get('table_number');
    const salary = url.searchParams.get('salary');
    const limit = url.searchParams.get('limit') || '100';
    const offset = url.searchParams.get('offset') || '0';

    const datasetId = DATASETS[dataset as keyof typeof DATASETS];
    if (!datasetId) {
      return new Response(JSON.stringify({
        error: 'Invalid dataset',
        available: Object.keys(DATASETS),
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build query params for Skatteverket's EntryScape API
    const params = new URLSearchParams();
    params.set('_limit', limit);
    params.set('_offset', offset);

    if (dataset === 'municipal_tax_rates') {
      params.set('år', year);
      if (municipality) {
        params.set('kommun', municipality.toUpperCase());
      }
    } else if (dataset === 'salary_tax_monthly') {
      params.set('år', year);
      if (tableNumber) {
        params.set('tabellnr', tableNumber);
      }
      // If salary is specified, find the right bracket
      if (salary) {
        params.set('antal dgr', '30B'); // Monthly (30 days)
      }
    } else if (dataset === 'salary_tax_daily') {
      params.set('år', year);
      if (tableNumber) {
        params.set('tabellnr', tableNumber);
      }
    } else if (dataset === 'annual_income_tax') {
      params.set('år', year);
    } else if (dataset === 'car_benefit') {
      if (year) {
        params.set('tillverkningsar', year);
      }
    }

    const apiUrl = `${BASE_URL}/${datasetId}?${params.toString()}`;
    console.log('Fetching from Skatteverket:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Skatteverket API error: ${response.status}`);
    }

    const data = await response.json();

    // Post-process based on dataset type
    let processedResults = data.results || [];

    if (dataset === 'municipal_tax_rates') {
      processedResults = processedResults.map((r: any) => ({
        municipality: r['kommun'],
        parish: r['församling'],
        parish_code: r['församlings-kod'],
        municipal_tax: parseFloat(r['kommunal-skatt'] || '0'),
        regional_tax: parseFloat(r['landstings-skatt'] || '0'),
        burial_fee: parseFloat(r['begravnings-avgift'] || '0'),
        church_fee: parseFloat(r['kyrkoavgift'] || '0'),
        total_incl_church: parseFloat(r['summa, inkl. kyrkoavgift'] || '0'),
        total_excl_church: parseFloat(r['summa, exkl. kyrkoavgift'] || '0'),
        year: r['år'],
      }));
    } else if (dataset === 'salary_tax_monthly') {
      processedResults = processedResults.map((r: any) => ({
        table_number: r['tabellnr'],
        period_type: r['antal dgr'],
        income_from: parseInt(r['inkomst fr.o.m.'] || '0'),
        income_to: parseInt(r['inkomst t.o.m.'] || '0'),
        column_1: parseInt(r['kolumn 1'] || '0'),
        column_2: parseInt(r['kolumn 2'] || '0'),
        column_3: parseInt(r['kolumn 3'] || '0'),
        column_4: parseInt(r['kolumn 4'] || '0'),
        column_5: parseInt(r['kolumn 5'] || '0'),
        column_6: parseInt(r['kolumn 6'] || '0'),
        year: r['år'],
      }));

      // If salary specified, find matching bracket
      if (salary) {
        const salaryNum = parseInt(salary);
        processedResults = processedResults.filter((r: any) =>
          salaryNum >= r.income_from && salaryNum <= r.income_to
        );
      }
    } else if (dataset === 'car_benefit') {
      processedResults = processedResults.map((r: any) => ({
        vehicle_type: r['fordonstyp'],
        code: r['kod'],
        year: r['tillverkningsar'],
        brand: r['marke'],
        model: r['modell'],
        new_car_price: parseInt((r['nybilspris'] || '0').replace(/\s/g, '')),
        fuel_type: r['bransletyp'],
        value_after_standard: r['vardeefterschablon'],
        adjustment: r['justering'],
      }));
    }

    return new Response(JSON.stringify({
      success: true,
      dataset,
      total_results: data.resultCount,
      offset: data.offset,
      limit: data.limit,
      results: processedResults,
      source: 'Skatteverket öppna data',
      cached_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in tax-tables:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
