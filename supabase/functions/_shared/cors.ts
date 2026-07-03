/**
 * Unified CORS configuration for all edge functions.
 * 
 * All edge functions MUST import corsHeaders from this module
 * to ensure consistent CORS policy across the entire API surface.
 * 
 * Usage:
 *   import { corsHeaders, handleCors } from "../_shared/cors.ts";
 * 
 *   serve(async (req) => {
 *     // Quick preflight handling
 *     const preflightResponse = handleCors(req);
 *     if (preflightResponse) return preflightResponse;
 *     
 *     // ... your logic ...
 *     return new Response(JSON.stringify(data), {
 *       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
 *     });
 *   });
 */

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

/**
 * Handle CORS preflight (OPTIONS) requests.
 * Returns a Response for OPTIONS, or null for other methods.
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  return null;
}

/**
 * Create a JSON error response with proper CORS headers.
 */
export function corsError(message: string, status = 500): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status },
  );
}

/**
 * Create a JSON success response with proper CORS headers.
 */
export function corsJson(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status },
  );
}
