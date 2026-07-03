import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

// Test 1: CORS preflight
Deno.test("create-bank-requisition: CORS preflight", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-bank-requisition`, {
    method: "OPTIONS",
    headers: { "Origin": "https://example.com" },
  });
  const ok = res.status === 200 || res.status === 204;
  assertEquals(ok, true);
  const acah = res.headers.get("access-control-allow-headers") || "";
  assertEquals(acah.includes("authorization"), true);
});

// Test 2: Unauthenticated request returns 401
Deno.test("create-bank-requisition: unauth returns 401", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-bank-requisition`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ company_id: "test", institution_id: "Mock ASPSP" }),
  });
  const body = await res.json();
  assertEquals(res.status, 401);
  assertEquals(body.error, "Unauthorized");
});

// Test 3: handle-bank-callback missing params
Deno.test("handle-bank-callback: missing params redirects with error", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-bank-callback`, {
    redirect: "manual",
  });
  assertEquals(res.status, 302);
  const location = res.headers.get("location") || "";
  assertEquals(location.includes("error="), true);
  await res.text();
});

// Test 4: handle-bank-callback invalid code
Deno.test("handle-bank-callback: invalid code redirects with error", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-bank-callback?code=invalid_test&state=test-company`, {
    redirect: "manual",
  });
  assertEquals(res.status, 302);
  const location = res.headers.get("location") || "";
  assertEquals(location.includes("error="), true);
  await res.text();
});

// Test 5: fetch-bank-transactions CORS
Deno.test("fetch-bank-transactions: CORS preflight", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/fetch-bank-transactions`, {
    method: "OPTIONS",
    headers: { "Origin": "https://example.com" },
  });
  const ok = res.status === 200 || res.status === 204;
  assertEquals(ok, true);
});
