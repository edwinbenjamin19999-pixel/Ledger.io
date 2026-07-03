import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

async function loadTestCert() {
  const password = Deno.env.get('SKV_TEST_CERT_PASSWORD') || '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await supabase.storage.from('certificates').download('skatteverket/test-cert.p12');
  if (error || !data) throw new Error(`Download: ${error?.message}`);
  const forge = (await import("https://esm.sh/node-forge@1.3.1")).default;
  const bytes = new Uint8Array(await data.arrayBuffer());
  let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(bin), password);
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || [];
  const pems = certBags.filter((b: any) => b.cert).map((b: any) => forge.pki.certificateToPem(b.cert));
  return { certPem: pems.join('\n'), keyPem: forge.pki.privateKeyToPem(keyBags[0].key) };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const results: Record<string, unknown> = {};

  try {
    const cert = await loadTestCert();
    results['cert'] = 'loaded';

    // Test: Write PEM to /tmp and use Deno.connectTls
    await Deno.writeTextFile("/tmp/skv-cert.pem", cert.certPem);
    await Deno.writeTextFile("/tmp/skv-key.pem", cert.keyPem);
    results['files_written'] = true;

    // Approach 1: Deno.createHttpClient with PEM files
    try {
      const client = Deno.createHttpClient({
        certChain: cert.certPem,
        privateKey: cert.keyPem,
      });

      // Make the actual mTLS call
      const resp = await fetch('https://sysorgoauth2.test.skatteverket.se/oauth2/v1/sysorg/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: Deno.env.get('SKV_TEST_OAUTH2_CLIENT_ID') || '',
          client_secret: Deno.env.get('SKV_TEST_OAUTH2_CLIENT_SECRET') || '',
        }),
        client,
      } as RequestInit);
      
      const text = await resp.text();
      results['deno_http_client'] = { status: resp.status, body: text.substring(0, 500) };
      client.close();
    } catch (e) {
      results['deno_http_client'] = { error: String(e) };
    }

    // Approach 2: Low-level Deno.connectTls with cert/key
    try {
      const conn = await Deno.connectTls({
        hostname: "sysorgoauth2.test.skatteverket.se",
        port: 443,
        certChain: cert.certPem,
        privateKey: cert.keyPem,
      });
      
      // Manually construct HTTP request
      const body = 'grant_type=client_credentials&client_id=' + 
        (Deno.env.get('SKV_TEST_OAUTH2_CLIENT_ID') || '') + 
        '&client_secret=' + (Deno.env.get('SKV_TEST_OAUTH2_CLIENT_SECRET') || '');
      
      const httpReq = `POST /oauth2/v1/sysorg/token HTTP/1.1\r\nHost: sysorgoauth2.test.skatteverket.se\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: ${body.length}\r\nConnection: close\r\n\r\n${body}`;
      
      await conn.write(new TextEncoder().encode(httpReq));
      
      const buf = new Uint8Array(4096);
      const n = await conn.read(buf);
      const response = new TextDecoder().decode(buf.subarray(0, n || 0));
      
      results['deno_connect_tls'] = { response: response.substring(0, 500) };
      conn.close();
    } catch (e) {
      results['deno_connect_tls'] = { error: String(e) };
    }

  } catch (e) {
    results['error'] = String(e);
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
