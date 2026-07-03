import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

// Generate VAT XML according to Skatteverket format
function generateVATXML(declaration: any, company: any): string {
  const periodStr = declaration.period_type === 'monthly' 
    ? `${declaration.period_year}${String(declaration.period_month).padStart(2, '0')}`
    : declaration.period_type === 'quarterly'
    ? `${declaration.period_year}Q${declaration.period_quarter}`
    : String(declaration.period_year);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Skattedeklaration xmlns="http://xmls.skatteverket.se/se/skatteverket/moms/instans/v1">
  <Avsandare>
    <Organisationsnummer>${company.org_number.replace('-', '')}</Organisationsnummer>
    <Namn>${company.name}</Namn>
  </Avsandare>
  <Redovisningsperiod>
    <Period>${periodStr}</Period>
    <Periodtyp>${declaration.period_type}</Periodtyp>
  </Redovisningsperiod>
  <Momsdeklaration>
    <Forsaljning25>${Math.round(declaration.sales_25_percent)}</Forsaljning25>
    <Forsaljning12>${Math.round(declaration.sales_12_percent)}</Forsaljning12>
    <Forsaljning6>${Math.round(declaration.sales_6_percent)}</Forsaljning6>
    <MomsFri>${Math.round(declaration.sales_0_percent)}</MomsFri>
    <EUForsaljning>${Math.round(declaration.eu_sales || 0)}</EUForsaljning>
    <EUInkop>${Math.round(declaration.eu_purchases || 0)}</EUInkop>
    <UtgaendeMoms25>${Math.round(declaration.output_vat_25)}</UtgaendeMoms25>
    <UtgaendeMoms12>${Math.round(declaration.output_vat_12)}</UtgaendeMoms12>
    <UtgaendeMoms6>${Math.round(declaration.output_vat_6)}</UtgaendeMoms6>
    <IngaendeMoms>${Math.round(declaration.input_vat)}</IngaendeMoms>
    <MomsAttBetala>${Math.round(declaration.vat_to_pay)}</MomsAttBetala>
  </Momsdeklaration>
</Skattedeklaration>`;
}

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

    const { declaration_id } = await req.json();
    // Environment is ALWAYS production
    const environment = 'production';

    // CRITICAL: Run database validation before proceeding
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_vat_declaration', { p_declaration_id: declaration_id });

    if (validationError) {
      console.error('VAT validation query failed:', validationError);
      throw new Error('Kunde inte validera momsdeklaration');
    }

    const validation = validationResult?.[0];
    if (!validation?.is_valid) {
      console.error('VAT validation failed:', validation?.validation_errors);
      throw new Error(`Momsvalidering misslyckades: ${validation?.validation_errors?.join(', ') || 'Okänt fel'}`);
    }

    console.log('VAT validation passed:', {
      calculated_output_vat: validation.calculated_output_vat,
      calculated_input_vat: validation.calculated_input_vat,
      calculated_vat_to_pay: validation.calculated_vat_to_pay
    });

    // Get declaration with company info
    const { data: declaration, error: declError } = await supabase
      .from('vat_declarations')
      .select('*, company:companies(*)')
      .eq('id', declaration_id)
      .maybeSingle();

    if (declError || !declaration) {
      throw new Error('VAT declaration not found');
    }

    // Additional validation: verify amounts match
    const expectedVat25 = Math.round(declaration.sales_25_percent * 0.25);
    const expectedVat12 = Math.round(declaration.sales_12_percent * 0.12);
    const expectedVat6 = Math.round(declaration.sales_6_percent * 0.06);

    if (Math.abs(expectedVat25 - declaration.output_vat_25) > 1) {
      throw new Error(`Utgående moms 25% stämmer inte: ${expectedVat25} vs ${declaration.output_vat_25}`);
    }
    if (Math.abs(expectedVat12 - declaration.output_vat_12) > 1) {
      throw new Error(`Utgående moms 12% stämmer inte: ${expectedVat12} vs ${declaration.output_vat_12}`);
    }
    if (Math.abs(expectedVat6 - declaration.output_vat_6) > 1) {
      throw new Error(`Utgående moms 6% stämmer inte: ${expectedVat6} vs ${declaration.output_vat_6}`);
    }

    // Get OAuth token
    const { data: authData, error: authError } = await supabase.functions.invoke('skatteverket-oauth', {
      body: { company_id: declaration.company_id, environment },
      headers: { Authorization: authHeader },
    });

    if (authError || !authData) {
      throw new Error('Failed to get OAuth token for Skatteverket');
    }

    const { access_token, base_url } = authData;

    // Generate VAT XML
    const vatXml = generateVATXML(declaration, declaration.company);
    console.log('Generated VAT XML:', vatXml.substring(0, 500));

    // Submit to Skatteverket
    const submitResponse = await fetch(`${base_url}/api/v1/moms/deklaration`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/xml',
      },
      body: vatXml,
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('Skatteverket VAT submission error:', errorText);
      throw new Error(`Failed to submit VAT declaration: ${submitResponse.status}`);
    }

    const responseData = await submitResponse.json();

    // Update declaration status
    await supabase
      .from('vat_declarations')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        submitted_by: user.id,
        skatteverket_reference: responseData.reference || responseData.submission_id,
        skatteverket_response: responseData,
      })
      .eq('id', declaration_id);

    // Update automation task
    await supabase
      .from('automation_tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_data: responseData,
      })
      .eq('related_entity_id', declaration_id)
      .eq('task_type', 'vat_declaration');

    return new Response(JSON.stringify({
      success: true,
      reference: responseData.reference || responseData.submission_id,
      message: 'Momsdeklaration inskickad till Skatteverket'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in submit-vat-declaration:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isAuth = message === 'Unauthorized' || message === 'No authorization header';
    const isValidation = message.includes('validering') || message.includes('stämmer inte');
    return new Response(JSON.stringify({ 
      ok: false,
      error: message,
      error_code: isAuth ? 'AUTH_ERROR' : isValidation ? 'VALIDATION_ERROR' : 'SUBMISSION_ERROR',
    }), {
      status: isAuth ? 401 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
