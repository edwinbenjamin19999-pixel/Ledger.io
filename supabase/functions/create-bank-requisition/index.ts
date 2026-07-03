import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { startAuth } from "../_shared/enable-banking.ts";

serve(async (req) => {
  const preflightResponse = handleCors(req);
  if (preflightResponse) return preflightResponse;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { company_id, institution_id, return_to, auth_method } = await req.json();

    if (!company_id || !institution_id) {
      throw new Error('Missing required parameters: company_id and institution_id');
    }

    // Hard guard: reject Enable Banking sandbox/mock ASPSPs. These return fake
    // IBANs (SE00 0000 …) and balance=0 which looks like a bug to end users.
    const idLower = String(institution_id).toLowerCase();
    if (
      idLower.includes('mock') ||
      idLower.includes('sandbox') ||
      idLower.includes('test aspsp') ||
      idLower === 'mock aspsp'
    ) {
      console.warn('[create-bank-requisition] Rejected sandbox ASPSP:', institution_id);
      return new Response(
        JSON.stringify({
          error: 'Den valda banken är en testbank (sandbox). Välj en riktig bank för att se korrekta kontonummer och saldo.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Encode return_to in state so callback knows where to redirect.
    // State format: "<companyId>" (legacy) or "<companyId>|<return_to>"
    const safeReturnTo = return_to === 'onboarding' ? 'onboarding' : 'bank';
    const state = `${company_id}|${safeReturnTo}`;

    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/handle-bank-callback`;

    console.log('Starting Enable Banking auth:', { company_id, institution_id, auth_method, return_to: safeReturnTo, callbackUrl });

    const authResult = await startAuth({
      aspspId: institution_id,
      aspspCountry: "SE",
      redirectUrl: callbackUrl,
      companyId: state,
      psuType: "business",
      authMethod: typeof auth_method === 'string' && auth_method.trim() ? auth_method : undefined,
    });

    console.log('Auth session created, redirect URL received');

    return new Response(
      JSON.stringify({
        link: authResult.url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-bank-requisition:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: 'Check function logs for more information',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
