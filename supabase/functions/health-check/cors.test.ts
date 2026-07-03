import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

// List of all edge functions to test CORS on
const EDGE_FUNCTIONS = [
  "health-check",
  "check-subscription",
  "send-contact-form",
  "company-lookup",
  "track-error",
];

/**
 * Test that OPTIONS preflight returns proper CORS headers
 */
for (const fn of EDGE_FUNCTIONS) {
  Deno.test(`CORS preflight: ${fn} returns correct headers`, async () => {
    const url = `${SUPABASE_URL}/functions/v1/${fn}`;
    const response = await fetch(url, {
      method: "OPTIONS",
      headers: {
        "Origin": "https://example.com",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization, content-type",
        "apikey": SUPABASE_ANON_KEY,
      },
    });

    // Consume body to prevent resource leaks
    await response.text();

    // Should return 2xx for preflight
    assertEquals(response.status < 300, true, `${fn} preflight returned ${response.status}`);

    // Must have Access-Control-Allow-Origin
    const allowOrigin = response.headers.get("access-control-allow-origin");
    assertExists(allowOrigin, `${fn} missing Access-Control-Allow-Origin`);
    assertEquals(allowOrigin, "*");

    // Must have Access-Control-Allow-Headers with required headers
    const allowHeaders = response.headers.get("access-control-allow-headers");
    assertExists(allowHeaders, `${fn} missing Access-Control-Allow-Headers`);

    const requiredHeaders = [
      "authorization",
      "apikey",
      "content-type",
      "x-client-info",
      "x-supabase-client-platform",
      "x-supabase-client-runtime",
    ];

    for (const required of requiredHeaders) {
      assertEquals(
        allowHeaders!.toLowerCase().includes(required),
        true,
        `${fn} missing required header '${required}' in Allow-Headers. Got: ${allowHeaders}`
      );
    }
  });
}

/**
 * Test that regular POST responses include CORS headers
 */
Deno.test("CORS: health-check GET response includes CORS headers", async () => {
  const url = `${SUPABASE_URL}/functions/v1/health-check`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });

  await response.text();

  const allowOrigin = response.headers.get("access-control-allow-origin");
  assertExists(allowOrigin, "Response missing Access-Control-Allow-Origin");
  assertEquals(allowOrigin, "*");
});

/**
 * Test shared module contract: corsHeaders object has required keys
 */
Deno.test("Shared CORS module: corsHeaders has all required fields", async () => {
  const { corsHeaders, handleCors, corsError, corsJson } = await import("../_shared/cors.ts");

  // Verify corsHeaders object
  assertExists(corsHeaders["Access-Control-Allow-Origin"]);
  assertExists(corsHeaders["Access-Control-Allow-Headers"]);
  assertExists(corsHeaders["Access-Control-Allow-Methods"]);
  assertExists(corsHeaders["Access-Control-Max-Age"]);
  assertEquals(corsHeaders["Access-Control-Allow-Origin"], "*");

  // Verify handleCors returns Response for OPTIONS
  const optionsReq = new Request("https://example.com", { method: "OPTIONS" });
  const optionsRes = handleCors(optionsReq);
  assertExists(optionsRes, "handleCors should return Response for OPTIONS");
  assertEquals(optionsRes!.status, 204);
  await optionsRes!.text();

  // Verify handleCors returns null for non-OPTIONS
  const postReq = new Request("https://example.com", { method: "POST" });
  const postRes = handleCors(postReq);
  assertEquals(postRes, null, "handleCors should return null for POST");

  // Verify corsError helper
  const errorRes = corsError("test error", 400);
  assertEquals(errorRes.status, 400);
  const errorBody = await errorRes.json();
  assertEquals(errorBody.error, "test error");

  // Verify corsJson helper
  const jsonRes = corsJson({ ok: true });
  assertEquals(jsonRes.status, 200);
  const jsonBody = await jsonRes.json();
  assertEquals(jsonBody.ok, true);
});
