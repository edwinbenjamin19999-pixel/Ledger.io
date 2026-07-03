import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify service role - only system/backend should call this
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the caller is either service_role or an authenticated admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    // Check if this is a service_role call (token matches service role key)
    const isServiceRole = token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!isServiceRole) {
      // If not service role, must be an authenticated platform admin
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check platform admin status
      const { data: adminCheck } = await supabase
        .from('platform_admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!adminCheck) {
        return new Response(JSON.stringify({ error: 'Forbidden: admin access required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { type, severity, title, message, userId, companyId, metadata } = await req.json();

    // Input validation
    if (!type || !title || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields: type, title, message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allowedSeverities = ['info', 'warning', 'error', 'critical'];
    const safeSeverity = allowedSeverities.includes(severity) ? severity : 'warning';

    console.log('[ADMIN-ALERT] Creating alert:', type, safeSeverity, title);

    const { data, error } = await supabase
      .from('admin_notifications')
      .insert({
        notification_type: type,
        severity: safeSeverity,
        title: String(title).slice(0, 500),
        message: String(message).slice(0, 5000),
        user_id: userId || null,
        company_id: companyId || null,
        metadata: metadata || {},
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('[ADMIN-ALERT] Insert error:', error);
      throw error;
    }

    // Send email notification for critical alerts
    if (safeSeverity === 'critical' || safeSeverity === 'error') {
      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (resendKey) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'NorthLedger Alerts <alerts@northledger.se>',
              to: ['admin@northledger.se'],
              subject: `[${safeSeverity.toUpperCase()}] ${String(title).slice(0, 100)}`,
              html: `
                <h2>${String(title).slice(0, 500)}</h2>
                <p>${String(message).slice(0, 5000)}</p>
                <p><strong>Type:</strong> ${String(type).slice(0, 100)}</p>
                <p><strong>Severity:</strong> ${safeSeverity}</p>
                <p><small>Sent from NorthLedger Admin Alerts</small></p>
              `,
            }),
          });
          console.log('[ADMIN-ALERT] Email sent for critical alert');
        } catch (emailError) {
          console.error('[ADMIN-ALERT] Email error:', emailError);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    console.error('[ADMIN-ALERT] Error:', errorMessage);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
