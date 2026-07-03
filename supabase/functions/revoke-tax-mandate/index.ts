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

    const { mandate_id, revocation_reason } = await req.json();

    console.log('Revoking tax mandate:', { mandate_id, user_id: user.id });

    // Get the mandate
    const { data: mandate, error: mandateError } = await supabase
      .from('tax_mandates')
      .select('*, companies(org_number)')
      .eq('id', mandate_id)
      .maybeSingle();

    if (mandateError || !mandate) {
      throw new Error('Mandate not found');
    }

    // Verify user has owner role for the company
    const { data: roleCheck, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', mandate.company_id)
      .eq('role', 'owner')
      .maybeSingle();

    if (roleError || !roleCheck) {
      throw new Error('User must be company owner to revoke mandates');
    }

    // Revoke mandate with Skatteverket if we have a mandate ID
    if (mandate.skatteverket_mandate_id) {
      try {
        const { data: oauthData, error: oauthError } = await supabase.functions.invoke(
          'skatteverket-oauth',
          {
            body: { company_id: mandate.company_id },
            headers: { Authorization: authHeader },
          }
        );

        if (!oauthError && oauthData) {
          const revokeResponse = await fetch(
            `${oauthData.base_url}/ombud/v1/mandates/${mandate.skatteverket_mandate_id}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${oauthData.access_token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (revokeResponse.ok) {
            console.log('Mandate revoked with Skatteverket');
          } else {
            const errorText = await revokeResponse.text();
            console.error('Failed to revoke mandate with Skatteverket:', errorText);
          }
        }
      } catch (error) {
        console.error('Error revoking mandate with Skatteverket:', error);
        // Continue even if Skatteverket revocation fails
      }
    }

    // Update mandate in database
    const { error: updateError } = await supabase
      .from('tax_mandates')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
        revocation_reason,
      })
      .eq('id', mandate_id);

    if (updateError) {
      console.error('Failed to update mandate:', updateError);
      throw new Error('Failed to revoke mandate');
    }

    // Update company table
    await supabase
      .from('companies')
      .update({
        tax_mandate_accepted: false,
      })
      .eq('id', mandate.company_id);

    console.log('Tax mandate revoked successfully');

    return new Response(JSON.stringify({
      success: true,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in revoke-tax-mandate:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
