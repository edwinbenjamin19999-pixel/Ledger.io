import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This function should be called via a cron job
    // For now, it can also be triggered manually by an admin
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all active retention policies
    const { data: policies, error: policiesError } = await supabaseAdmin
      .from('data_retention_policies')
      .select('*')
      .eq('is_active', true);

    if (policiesError) throw policiesError;

    const results: any[] = [];

    for (const policy of policies || []) {
      try {
        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

        // Build dynamic query to delete old data
        const { data, error } = await supabaseAdmin
          .from(policy.table_name)
          .delete()
          .lt(policy.date_column, cutoffDate.toISOString())
          .select('id');

        if (error) {
          results.push({
            table: policy.table_name,
            status: 'error',
            error: error.message
          });
        } else {
          results.push({
            table: policy.table_name,
            status: 'success',
            deleted_count: data?.length || 0,
            cutoff_date: cutoffDate.toISOString()
          });
        }

        // Log the cleanup action
        await supabaseAdmin
          .from('audit_events')
          .insert({
            entity_type: 'data_retention',
            entity_id: policy.id,
            event_type: 'cleanup',
            new_data: {
              table: policy.table_name,
              deleted_count: data?.length || 0,
              cutoff_date: cutoffDate.toISOString()
            },
            processing_purpose: 'Automatic data retention policy enforcement',
            legal_basis: 'legal_obligation'
          });

      } catch (err) {
        results.push({
          table: policy.table_name,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    // Check for pending account deletions past grace period
    const { data: pendingDeletions } = await supabaseAdmin
      .from('account_deletion_requests')
      .select('*')
      .eq('status', 'pending')
      .lt('scheduled_deletion_date', new Date().toISOString());

    for (const deletion of pendingDeletions || []) {
      try {
        // Delete the user account
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(deletion.user_id);
        
        if (deleteError) throw deleteError;

        // Mark as completed
        await supabaseAdmin
          .from('account_deletion_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', deletion.id);

        results.push({
          action: 'account_deletion',
          user_id: deletion.user_id,
          status: 'success'
        });

      } catch (err) {
        results.push({
          action: 'account_deletion',
          user_id: deletion.user_id,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        results,
        executed_at: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cleanup job:', error);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
