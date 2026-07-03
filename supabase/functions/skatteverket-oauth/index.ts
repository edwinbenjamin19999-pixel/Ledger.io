import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";
import { requestMtlsToken } from "../_shared/mtls.ts";

/**
 * Skatteverket OAuth2 Client Credentials with mTLS
 * LOCKED TO PRODUCTION — test environment is not allowed.
 * 
 * Credential resolution priority:
 * 1. Company-specific production credentials from skatteverket_credentials table
 * 2. Platform-level production secrets (SKV_PROD_OAUTH2_CLIENT_ID/SECRET)
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

    const { company_id, scope } = await req.json();
    // Environment is ALWAYS production — ignore any requested environment
    const environment = 'production';

    // 1. Try company-specific PRODUCTION credentials
    const { data: credentials } = await supabase
      .from('skatteverket_credentials')
      .select('client_id, client_secret_encrypted')
      .eq('company_id', company_id)
      .eq('environment', 'production')
      .eq('is_active', true)
      .maybeSingle();

    let clientId: string;
    let clientSecret: string;

    if (credentials?.client_id && credentials?.client_secret_encrypted) {
      clientId = credentials.client_id;
      clientSecret = credentials.client_secret_encrypted;
      console.log('Using company-specific SKV production credentials');
    } else {
      // 2. Fallback to platform-level production secrets
      const prodClientId = Deno.env.get('SKV_PROD_OAUTH2_CLIENT_ID');
      const prodClientSecret = Deno.env.get('SKV_PROD_OAUTH2_CLIENT_SECRET');

      if (!prodClientId || !prodClientSecret) {
        throw new Error('No Skatteverket production credentials found. Configure API keys in Settings or contact support.');
      }

      clientId = prodClientId;
      clientSecret = prodClientSecret;
      console.log('Using platform-level SKV production credentials');
    }

    // Use provided scope or default to agd + agdredovisningperiod
    const requestScope = scope || 'agd agdredovisningperiod';

    // Request token via mTLS proxy
    const tokenData = await requestMtlsToken({
      client_id: clientId,
      client_secret: clientSecret,
      scope: requestScope,
      environment,
    });

    // APIgw token for API Gateway calls
    let apigwToken: string | null = null;
    const apigwClientId = Deno.env.get('SKV_PROD_APIGW_CLIENT_ID');
    const apigwClientSecret = Deno.env.get('SKV_PROD_APIGW_CLIENT_SECRET');
    const apigwUrl = 'https://apigw.skatteverket.se/token';

    if (apigwClientId && apigwClientSecret) {
      const proxyUrl = Deno.env.get('MTLS_PROXY_URL');
      const proxySecret = Deno.env.get('MTLS_PROXY_SECRET');

      if (proxyUrl && proxySecret) {
        try {
          const proxyResponse = await fetch(`${proxyUrl}/skv/apigw/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-proxy-secret': proxySecret,
            },
            body: JSON.stringify({
              client_id: apigwClientId,
              client_secret: apigwClientSecret,
              token_url: apigwUrl,
            }),
          });

          if (proxyResponse.ok) {
            const apigwData = await proxyResponse.json();
            apigwToken = apigwData.access_token;
            console.log('APIgw token obtained via proxy');
          } else {
            const errText = await proxyResponse.text();
            console.warn('APIgw proxy token failed:', proxyResponse.status, errText);
            await tryDirectApigw();
          }
        } catch (e) {
          console.warn('APIgw proxy error, trying direct:', e);
          await tryDirectApigw();
        }
      } else {
        await tryDirectApigw();
      }
    }

    async function tryDirectApigw() {
      try {
        const resp = await fetch(apigwUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${apigwClientId}:${apigwClientSecret}`)}`,
          },
          body: new URLSearchParams({ grant_type: 'client_credentials' }),
        });
        if (resp.ok) {
          const data = await resp.json();
          apigwToken = data.access_token;
        } else {
          console.warn('Direct APIgw token failed:', resp.status);
        }
      } catch (e) {
        console.warn('Direct APIgw token error:', e);
      }
    }

    const apiBaseUrl = 'https://api.skatteverket.se';

    return new Response(JSON.stringify({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      base_url: apiBaseUrl,
      apigw_token: apigwToken,
      environment,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in skatteverket-oauth:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isAuth = message === 'Unauthorized' || message === 'No authorization header';
    return new Response(JSON.stringify({
      ok: false,
      error: message,
      error_code: isAuth ? 'AUTH_ERROR' : 'TOKEN_ERROR',
    }), {
      status: isAuth ? 401 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
