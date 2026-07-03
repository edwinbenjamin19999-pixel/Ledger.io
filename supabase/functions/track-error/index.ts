import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { errorType, errorMessage, errorStack, pageUrl, sessionId } = await req.json();

    console.log('[TRACK-ERROR] Tracking error for user:', user.id, 'Type:', errorType);

    // Check if similar error exists for this user in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: existing } = await supabase
      .from('user_error_tracking')
      .select('*')
      .eq('user_id', user.id)
      .eq('error_type', errorType)
      .gte('last_seen_at', oneHourAgo)
      .maybeSingle();

    if (existing) {
      // Update existing error count
      const { error: updateError } = await supabase
        .from('user_error_tracking')
        .update({
          error_count: existing.error_count + 1,
          last_seen_at: new Date().toISOString(),
          error_message: errorMessage,
          page_url: pageUrl,
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('[TRACK-ERROR] Update error:', updateError);
      }
    } else {
      // Insert new error
      const { error: insertError } = await supabase
        .from('user_error_tracking')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          error_type: errorType,
          error_message: errorMessage,
          error_stack: errorStack,
          page_url: pageUrl,
          user_agent: req.headers.get('user-agent'),
        });

      if (insertError) {
        console.error('[TRACK-ERROR] Insert error:', insertError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[TRACK-ERROR] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
