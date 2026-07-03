import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

// Signicat OIDC endpoints (EID Hub) — switchable test ↔ prod via SIGNICAT_ENV
const SIGNICAT_ENV = (Deno.env.get("SIGNICAT_ENV") || "production").toLowerCase();
const SIGNICAT_BASE = SIGNICAT_ENV === "test"
  ? "https://api.signicat.com/auth/open/test"
  : "https://api.signicat.com/auth/open";
const SIGNICAT_AUTH_URL = `${SIGNICAT_BASE}/connect/authorize`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, companyId, redirectUri, returnUrl, purpose, agreementId, method } = body;
    
    const clientId = Deno.env.get('SIGNICAT_CLIENT_ID');
    const clientSecret = Deno.env.get('SIGNICAT_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!clientId || !clientSecret) {
      throw new Error('Signicat credentials not configured');
    }

    // Determine the purpose and build appropriate state
    const signingPurpose = purpose || 'kyc_verification';
    const targetCompanyId = companyId || '';
    const targetAgreementId = agreementId || '';

    // Determine eID method - default to BankID
    const eidMethod = method === 'freja' ? 'idp:freja' : 'idp:sbid';

    // Generate state for CSRF protection - encode purpose and IDs
    const state = crypto.randomUUID();
    const stateData = JSON.stringify({
      token: state,
      purpose: signingPurpose,
      companyId: targetCompanyId,
      agreementId: targetAgreementId,
      returnUrl: returnUrl || redirectUri || '',
      method: method || 'bankid'
    });
    const encodedState = btoa(stateData);
    
    // Build callback URL - always use the edge function callback
    const callbackUrl = `${supabaseUrl}/functions/v1/signicat-callback`;
    
    // Build authorization URL with selected eID method
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'openid profile',
      state: encodedState,
      acr_values: eidMethod,
      ui_locales: 'sv',
    });

    const authUrl = `${SIGNICAT_AUTH_URL}?${params.toString()}`;

    console.log('Generated Signicat auth URL for purpose:', signingPurpose, 'company:', targetCompanyId, 'agreement:', targetAgreementId);

    return new Response(
      JSON.stringify({ 
        authUrl,
        state 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Signicat auth error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
