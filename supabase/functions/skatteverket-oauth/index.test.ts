import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("skatteverket-oauth health check - rejects unauthenticated", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/skatteverket-oauth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ company_id: "test", scope: "agd", environment: "test" }),
  });

  const body = await response.text();
  // Should reject unauthenticated requests (401 or 500)
  assertEquals(response.ok, false, `Should not succeed without auth, got ${response.status}`);
});

Deno.test("export-test-cert-pem - verifies P12 extraction works", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/export-test-cert-pem`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({}),
  });

  const body = await response.text();
  assertEquals(response.status, 200, `Expected 200, got ${response.status}: ${body}`);

  const data = JSON.parse(body);
  assertExists(data.certPem, "Should have certPem");
  assertExists(data.keyPem, "Should have keyPem");
  assertEquals(data.certPem.includes("BEGIN CERTIFICATE"), true, "Cert should be PEM format");
  assertEquals(data.keyPem.includes("BEGIN"), true, "Key should be PEM format");
});

Deno.test("health-check endpoint works", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/health-check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({}),
  });

  const body = await response.text();
  assertEquals(response.status, 200, `Health check failed: ${body}`);
});
