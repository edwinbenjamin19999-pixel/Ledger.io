import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import forge from "https://esm.sh/node-forge@1.3.1";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Reads SKATTEVERKET_CERT_P12_BASE64 + SKATTEVERKET_CERT_PASSWORD,
 * converts to PEM cert chain + private key, and returns them.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const p12B64 = Deno.env.get('SKATTEVERKET_CERT_P12_BASE64');
    const password = Deno.env.get('SKATTEVERKET_CERT_PASSWORD');

    if (!p12B64) {
      throw new Error('SKATTEVERKET_CERT_P12_BASE64 not set');
    }
    if (!password) {
      throw new Error('SKATTEVERKET_CERT_PASSWORD not set');
    }

    console.log('P12 base64 length:', p12B64.length);
    console.log('Password length:', password.length);

    // Decode base64 to binary
    const p12Der = forge.util.decode64(p12B64);
    console.log('P12 DER bytes:', p12Der.length);

    // Parse PKCS12
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    // Extract certificates
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certs = certBags[forge.pki.oids.certBag] || [];
    console.log('Found certificates:', certs.length);

    // Extract private key
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keys = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] || [];
    console.log('Found keys:', keys.length);

    if (certs.length === 0) {
      throw new Error('No certificates found in P12');
    }
    if (keys.length === 0) {
      throw new Error('No private keys found in P12');
    }

    // Convert to PEM
    const certPemParts: string[] = [];
    for (const bag of certs) {
      if (bag.cert) {
        certPemParts.push(forge.pki.certificateToPem(bag.cert));
      }
    }
    const certPem = certPemParts.join('\n');
    const keyPem = forge.pki.privateKeyToPem(keys[0].key);

    // Base64 encode for storage
    const certPemB64 = btoa(certPem);
    const keyPemB64 = btoa(keyPem);

    console.log('Cert PEM length:', certPem.length);
    console.log('Key PEM length:', keyPem.length);
    console.log('Cert starts with:', certPem.substring(0, 40));
    console.log('Key starts with:', keyPem.substring(0, 40));

    return new Response(JSON.stringify({
      success: true,
      cert_pem_b64: certPemB64,
      key_pem_b64: keyPemB64,
      cert_pem_length: certPem.length,
      key_pem_length: keyPem.length,
      certs_found: certs.length,
      cert_preview: certPem.substring(0, 60) + '...',
      key_preview: keyPem.substring(0, 60) + '...',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('P12 conversion error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
