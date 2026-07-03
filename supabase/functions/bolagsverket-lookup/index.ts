import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface LookupResponse {
  available: boolean;
  name?: string;
  vat_number?: string;
  street?: string;
  postal_code?: string;
  city?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const orgRaw = String(body?.org_number || '').trim();
    const orgDigits = orgRaw.replace(/\D/g, '');
    if (orgDigits.length !== 10) {
      return new Response(JSON.stringify({ available: false, error: 'invalid_org_number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('BOLAGSVERKET_API_KEY');
    if (!apiKey) {
      // Graceful fallback — feature is optional
      const resp: LookupResponse = { available: false };
      return new Response(JSON.stringify(resp), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Real Bolagsverket API integration would go here. For now return unavailable.
    const resp: LookupResponse = { available: false };
    return new Response(JSON.stringify(resp), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return new Response(JSON.stringify({ available: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
