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

    const { company_id, mandate_type, consent_text, consent_ip_address } = await req.json();

    console.log('Registering tax mandate:', { company_id, mandate_type, user_id: user.id });

    // Verify user has owner role for the company
    const { data: roleCheck, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', company_id)
      .eq('role', 'owner')
      .maybeSingle();

    if (roleError || !roleCheck) {
      throw new Error('User must be company owner to register mandates');
    }

    // Get company details
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('org_number, name')
      .eq('id', company_id)
      .maybeSingle();

    if (companyError || !company) {
      throw new Error('Company not found');
    }

    // Get Skatteverket OAuth token (optional - continue if it fails)
    let oauthData = null;
    try {
      const { data, error } = await supabase.functions.invoke(
        'skatteverket-oauth',
        {
          body: { company_id },
          headers: { Authorization: authHeader },
        }
      );

      if (error) {
        console.warn('Skatteverket OAuth failed (will save mandate locally):', error);
      } else {
        oauthData = data;
      }
    } catch (error) {
      console.warn('Skatteverket OAuth error (will save mandate locally):', error);
    }

    let skatteverketMandateId = null;
    let skatteverketStatus = 'pending';
    let registrationNote = 'Fullmakt sparad lokalt';

    // Try to register mandate with Skatteverket (optional)
    if (oauthData?.access_token && oauthData?.base_url) {
      try {
        const mandateResponse = await fetch(`${oauthData.base_url}/ombud/v1/mandates`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${oauthData.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            organization_number: company.org_number,
            mandate_type: mandate_type,
            scope: mandate_type === 'full' ? ['agi:write', 'agi:read', 'vat:write', 'vat:read'] : 
                   mandate_type === 'agi' ? ['agi:write', 'agi:read'] : 
                   ['vat:write', 'vat:read'],
            valid_from: new Date().toISOString(),
          }),
        });

        if (mandateResponse.ok) {
          const mandateData = await mandateResponse.json();
          skatteverketMandateId = mandateData.mandate_id;
          skatteverketStatus = 'active';
          registrationNote = 'Fullmakt registrerad hos Skatteverket';
          console.log('Mandate registered with Skatteverket:', skatteverketMandateId);
        } else {
          const errorText = await mandateResponse.text();
          console.warn('Skatteverket mandate registration failed:', errorText);
          registrationNote = 'Fullmakt sparad lokalt - Skatteverket-registrering misslyckades';
        }
      } catch (error) {
        console.warn('Error calling Skatteverket mandate API:', error);
        registrationNote = 'Fullmakt sparad lokalt - kan inte nå Skatteverket';
      }
    } else {
      console.info('Skipping Skatteverket registration - no OAuth credentials available');
      registrationNote = 'Fullmakt sparad lokalt - kräver manuell konfiguration i Skatteverket';
    }

    // Insert mandate into database
    const { data: mandate, error: mandateError } = await supabase
      .from('tax_mandates')
      .insert({
        company_id,
        user_id: user.id,
        mandate_type,
        status: skatteverketStatus,
        skatteverket_mandate_id: skatteverketMandateId,
        skatteverket_status: skatteverketStatus,
        consent_text,
        consent_ip_address,
        consent_given_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (mandateError) {
      console.error('Failed to insert mandate:', mandateError);
      throw new Error('Failed to save mandate');
    }

    // Update company table to mark mandate as accepted
    await supabase
      .from('companies')
      .update({
        tax_mandate_accepted: true,
        tax_mandate_accepted_at: new Date().toISOString(),
        tax_mandate_accepted_by: user.id,
      })
      .eq('id', company_id);

    console.log('Tax mandate registered successfully:', mandate.id, '-', registrationNote);

    return new Response(JSON.stringify({
      success: true,
      mandate_id: mandate.id,
      skatteverket_mandate_id: skatteverketMandateId,
      status: skatteverketStatus,
      note: registrationNote,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in register-tax-mandate:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
