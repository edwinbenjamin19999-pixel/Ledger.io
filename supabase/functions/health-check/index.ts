import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

  try {
    // Check database connection
    const dbStart = Date.now();
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );

      const { error } = await supabaseClient
        .from('companies')
        .select('id')
        .limit(1);

      if (error && !error.message.includes('permission')) {
        throw error;
      }

      checks.database = {
        status: 'healthy',
        latency: Date.now() - dbStart,
      };
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Check environment variables
    const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
    const missingEnvVars = requiredEnvVars.filter(varName => !Deno.env.get(varName));
    
    checks.environment = {
      status: missingEnvVars.length === 0 ? 'healthy' : 'unhealthy',
      error: missingEnvVars.length > 0 
        ? `Missing: ${missingEnvVars.join(', ')}` 
        : undefined,
    };

    // Overall health
    const isHealthy = Object.values(checks).every(check => check.status === 'healthy');
    const totalLatency = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        totalLatency,
        checks,
        version: '1.0.0',
      }),
      {
        status: isHealthy ? 200 : 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
