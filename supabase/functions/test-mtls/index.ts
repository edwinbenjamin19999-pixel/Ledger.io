import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createMtlsHttpClient } from "../_shared/mtls.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = '4b43c546646c3b8b9371d97690e43a4beb2189e169770069';
    const testSecret = 'd70f147fea15edc68cb6b6a08f023337d1171eec26bc3a4beb2189e169770069';
    const results: Record<string, unknown> = {};

    // === TEST 1: sys endpoint (NO mTLS) ===
    const sysTestUrl = 'https://sysoauth2.test.skatteverket.se/oauth2/v1/sys/token';
    const sysProdUrl = 'https://sysoauth2.skatteverket.se/oauth2/v1/sys/token';

    for (const [label, url] of [['sys_test', sysTestUrl], ['sys_prod', sysProdUrl]]) {
      for (const scope of ['agd agdredovisningperiod', 'momsdeklaration', '']) {
        const scopeLabel = scope || 'no_scope';
        try {
          const body: Record<string, string> = {
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: testSecret,
          };
          if (scope) body.scope = scope;

          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            body: new URLSearchParams(body),
          });
          results[`${label}_${scopeLabel}`] = { status: resp.status, body: await resp.text() };
        } catch (e) {
          results[`${label}_${scopeLabel}`] = { error: String(e) };
        }
      }
    }

    // === TEST 2: sysorg endpoint (WITH mTLS) ===
    let mtlsSource = 'not_loaded';
    try {
      const mtls = await createMtlsHttpClient();
      mtlsSource = mtls.credentials.source;

      const sysorgTestUrl = 'https://sysorgoauth2.test.skatteverket.se/oauth2/v1/sysorg/token';
      const sysorgProdUrl = 'https://sysorgoauth2.skatteverket.se/oauth2/v1/sysorg/token';

      for (const [label, url] of [['sysorg_test', sysorgTestUrl], ['sysorg_prod', sysorgProdUrl]]) {
        for (const scope of ['agd agdredovisningperiod', 'momsdeklaration', '']) {
          const scopeLabel = scope || 'no_scope';
          try {
            const body: Record<string, string> = {
              grant_type: 'client_credentials',
              client_id: clientId,
              client_secret: testSecret,
            };
            if (scope) body.scope = scope;

            const resp = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
              body: new URLSearchParams(body),
              client: mtls.client,
            } as RequestInit);
            results[`${label}_${scopeLabel}`] = { status: resp.status, body: await resp.text() };
          } catch (e) {
            results[`${label}_${scopeLabel}`] = { error: String(e) };
          }
        }
      }

      mtls.client.close();
    } catch (e) {
      results['mtls_error'] = String(e);
    }

    return new Response(JSON.stringify({ mtls_source: mtlsSource, results }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test error:', error);
    return new Response(JSON.stringify({
      success: false, error: error instanceof Error ? error.message : 'Unknown error'
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
