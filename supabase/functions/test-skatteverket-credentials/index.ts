import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { corsHeaders } from "../_shared/cors.ts";
import { requestMtlsToken } from "../_shared/mtls.ts";

type Environment = "test" | "production";

function getCredentials(environment: Environment) {
  const isTest = environment === "test";

  return {
    clientId: isTest
      ? Deno.env.get("SKV_TEST_OAUTH2_CLIENT_ID") || ""
      : Deno.env.get("SKV_PROD_OAUTH2_CLIENT_ID") || "",
    clientSecret: isTest
      ? Deno.env.get("SKV_TEST_OAUTH2_CLIENT_SECRET") || ""
      : Deno.env.get("SKV_PROD_OAUTH2_CLIENT_SECRET") || "",
  };
}

function parseProxyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/mTLS proxy error \((\d+)\):\s*([\s\S]+)$/);
  const proxyStatus = match ? Number(match[1]) : null;
  const rawProxyResponse = match ? match[2].trim() : null;

  let proxyResponse: unknown = null;
  if (rawProxyResponse) {
    try {
      proxyResponse = JSON.parse(rawProxyResponse);
    } catch {
      proxyResponse = rawProxyResponse;
    }
  }

  const proxyError =
    proxyResponse && typeof proxyResponse === "object" && "error" in proxyResponse
      ? String((proxyResponse as Record<string, unknown>).error)
      : null;

  const hint = proxyError === "access_denied"
    ? "Skatteverket nekade åtkomst för appen, certifikatet eller scope-konfigurationen. Proxyn fungerar."
    : proxyError === "invalid_client"
      ? "Klientuppgifterna är inte giltiga för vald miljö."
      : null;

  return {
    message,
    proxyStatus,
    proxyResponse,
    hint,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let environment: Environment = "production";
  let clientIdPrefix: string | null = null;
  let tokenUrl = "https://sysorgoauth2.skatteverket.se/oauth2/v1/sysorg/token";

  try {
    const body = await req.json().catch(() => ({}));
    environment = body.environment === "test" ? "test" : "production";
    const scope = typeof body.scope === "string" && body.scope.trim()
      ? body.scope.trim()
      : "agd agdredovisningperiod";

    const { clientId, clientSecret } = getCredentials(environment);
    clientIdPrefix = clientId ? clientId.substring(0, 12) : null;
    tokenUrl = environment === "production"
      ? "https://sysorgoauth2.skatteverket.se/oauth2/v1/sysorg/token"
      : "https://sysorgoauth2.test.skatteverket.se/oauth2/v1/sysorg/token";

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({
        success: false,
        method: "proxy_mtls",
        environment,
        error: `${environment} credentials not configured`,
        details: `SKV_${environment === "test" ? "TEST" : "PROD"}_OAUTH2_CLIENT_ID or SECRET missing`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Testing Skatteverket credentials via mTLS proxy", {
      environment,
      client_id: `${clientIdPrefix}...`,
      scope,
    });

    const tokenData = await requestMtlsToken({
      client_id: clientId,
      client_secret: clientSecret,
      scope,
      environment,
    });

    return new Response(JSON.stringify({
      success: true,
      method: "proxy_mtls",
      environment,
      token_url: tokenUrl,
      client_id_prefix: clientIdPrefix,
      expires_in: tokenData.expires_in,
      scope: typeof tokenData.scope === "string" ? tokenData.scope : scope,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error testing credentials via proxy:", error);
    const parsedError = parseProxyError(error);

    return new Response(JSON.stringify({
      success: false,
      method: "proxy_mtls",
      environment,
      token_url: tokenUrl,
      client_id_prefix: clientIdPrefix,
      error: parsedError.message,
      proxy_status: parsedError.proxyStatus,
      proxy_response: parsedError.proxyResponse,
      hint: parsedError.hint,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
