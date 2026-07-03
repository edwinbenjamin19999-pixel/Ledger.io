import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const results: Record<string, unknown> = {};

  // Test 1: Check if curl is available
  try {
    const cmd = new Deno.Command("curl", { args: ["--version"], stdout: "piped", stderr: "piped" });
    const out = await cmd.output();
    results['curl_available'] = true;
    results['curl_version'] = new TextDecoder().decode(out.stdout).split('\n')[0];
  } catch (e) {
    results['curl_available'] = false;
    results['curl_error'] = String(e);
  }

  // Test 2: Check if we can write temp files
  try {
    await Deno.writeTextFile("/tmp/test.txt", "hello");
    const content = await Deno.readTextFile("/tmp/test.txt");
    results['tmp_write'] = content === "hello";
    await Deno.remove("/tmp/test.txt");
  } catch (e) {
    results['tmp_write'] = false;
    results['tmp_error'] = String(e);
  }

  // Test 3: Check Deno permissions
  results['permissions'] = {
    run: Deno.permissions ? 'queryable' : 'not_available',
  };
  try {
    const p = await Deno.permissions.query({ name: "run", command: "curl" } as any);
    results['run_curl_perm'] = p.state;
  } catch (e) {
    results['run_curl_perm'] = String(e);
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
