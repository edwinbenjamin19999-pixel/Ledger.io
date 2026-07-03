import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";

/**
 * Skatteverket Connect - initiates OAuth2 authorization flow
 * LOCKED TO PRODUCTION — always uses production URLs and credentials.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { company_id } = await req.json();
    const environment = 'production';

    // Get credentials - company-specific production first, then platform defaults
    const { data: credentials } = await supabase
      .from('skatteverket_credentials')
      .select('client_id')
      .eq('company_id', company_id)
      .eq('environment', 'production')
      .eq('is_active', true)
      .maybeSingle();

    let clientId: string;

    if (credentials?.client_id) {
      clientId = credentials.client_id;
    } else {
      const prodClientId = Deno.env.get('SKV_PROD_OAUTH2_CLIENT_ID');
      if (!prodClientId) {
        throw new Error('No Skatteverket production credentials configured');
      }
      clientId = prodClientId;
    }

    // Use canonical live redirect URI
    const redirectUri = 'https://northledger.se/auth/skatteverket/callback';

    // Create state with company_id
    const state = btoa(JSON.stringify({
      company_id,
      environment,
      user_id: user.id,
    }));

    const baseUrl = 'https://sysorgoauth2.skatteverket.se';

    // Build authorization URL with correct scopes
    const authUrl = new URL(`${baseUrl}/oauth2/v1/sysorg/authorize`);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'agd agdredovisningperiod');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'sysorg');

    return new Response(JSON.stringify({
      authorization_url: authUrl.toString(),
      redirect_uri: redirectUri,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in skatteverket-connect:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isAuth = message === 'Unauthorized' || message === 'No authorization header';
    return new Response(JSON.stringify({
      ok: false,
      error: message,
      error_code: isAuth ? 'AUTH_ERROR' : 'CONNECTION_ERROR',
    }), {
      status: isAuth ? 401 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
