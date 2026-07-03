import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { task_id } = await req.json();

    // Get the task
    const { data: task, error: taskError } = await supabase
      .from('automation_tasks')
      .select('*')
      .eq('id', task_id)
      .maybeSingle();

    if (taskError || !task) {
      throw new Error('Task not found');
    }

    if (task.status !== 'ready_for_approval') {
      throw new Error('Task is not ready for approval');
    }

    // Update task status
    await supabase
      .from('automation_tasks')
      .update({
        status: 'processing',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
      })
      .eq('id', task_id);

    let result: any;

    // Execute the appropriate submission based on task type
    switch (task.task_type) {
      case 'agi_submission':
        // Submit AGI to Skatteverket
        const agiResult = await supabase.functions.invoke('skatteverket-agi-submit', {
          body: { payroll_run_id: task.related_entity_id },
          headers: { Authorization: authHeader },
        });
        result = agiResult.data;
        break;

      case 'vat_declaration':
        // Submit VAT declaration
        const vatResult = await supabase.functions.invoke('submit-vat-declaration', {
          body: { declaration_id: task.related_entity_id },
          headers: { Authorization: authHeader },
        });
        result = vatResult.data;
        break;

      case 'annual_report':
        // Submit annual report
        const reportResult = await supabase.functions.invoke('submit-annual-report', {
          body: { report_id: task.related_entity_id, submit_to: 'both' },
          headers: { Authorization: authHeader },
        });
        result = reportResult.data;
        break;

      default:
        throw new Error(`Unknown task type: ${task.task_type}`);
    }

    // Check if submission was successful
    const isSuccess = result && !result.error;

    // Update task with result
    await supabase
      .from('automation_tasks')
      .update({
        status: isSuccess ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        result_data: result,
        error_message: result?.error || null,
      })
      .eq('id', task_id);

    return new Response(JSON.stringify({
      success: isSuccess,
      task_type: task.task_type,
      result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in approve-automation-task:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
