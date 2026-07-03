import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Use service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action } = await req.json();

    if (action === 'request') {
      // Create deletion request with 30-day grace period
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 30);

      const { data: deletionRequest, error: insertError } = await supabaseClient
        .from('account_deletion_requests')
        .insert({
          user_id: user.id,
          status: 'pending',
          scheduled_deletion_date: scheduledDate.toISOString()
        })
        .select()
        .maybeSingle();

      if (insertError) throw insertError;
      if (!deletionRequest) throw new Error('Failed to create deletion request');

      // Log the deletion request
      await supabaseClient
        .from('audit_events')
        .insert({
          user_id: user.id,
          entity_type: 'account_deletion',
          entity_id: deletionRequest.id,
          event_type: 'deletion_requested',
          data_subject_id: user.id,
          data_categories: ['account_data'],
          processing_purpose: 'GDPR right to be forgotten',
          legal_basis: 'legal_obligation'
        });

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Kontot är schemalagt för radering efter 30 dagar. Du kan avbryta inom denna period.',
          scheduled_date: scheduledDate.toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'cancel') {
      // Cancel deletion request
      const { error: updateError } = await supabaseClient
        .from('account_deletion_requests')
        .update({
          status: 'cancelled',
          cancellation_reason: 'User cancelled the request'
        })
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, message: 'Raderingen har avbrutits' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'execute') {
      // Verify there's a pending deletion request past the grace period
      const { data: deletionRequest } = await supabaseClient
        .from('account_deletion_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (!deletionRequest) {
        return new Response(
          JSON.stringify({ error: 'Ingen väntande raderingsbegäran hittades' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const scheduledDate = new Date(deletionRequest.scheduled_deletion_date);
      if (scheduledDate > new Date()) {
        return new Response(
          JSON.stringify({ 
            error: 'Kontot kan inte raderas ännu. Vänligen vänta tills grace period är över.',
            scheduled_date: scheduledDate.toISOString()
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update status to processing
      await supabaseClient
        .from('account_deletion_requests')
        .update({ status: 'processing' })
        .eq('id', deletionRequest.id);

      // Log the deletion
      await supabaseClient
        .from('audit_events')
        .insert({
          user_id: user.id,
          entity_type: 'account_deletion',
          entity_id: deletionRequest.id,
          event_type: 'deletion_executed',
          data_subject_id: user.id,
          data_categories: ['all_user_data'],
          processing_purpose: 'GDPR right to be forgotten',
          legal_basis: 'legal_obligation'
        });

      // Delete user account (cascade will handle related data)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      
      if (deleteError) throw deleteError;

      // Mark as completed
      await supabaseClient
        .from('account_deletion_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', deletionRequest.id);

      return new Response(
        JSON.stringify({ success: true, message: 'Kontot har raderats' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ogiltig åtgärd' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing account deletion:', error);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
