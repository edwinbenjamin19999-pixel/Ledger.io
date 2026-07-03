import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

/**
 * This function initiates a BankID authentication flow for Skatteverket RPA.
 * After successful BankID auth, we store the session for the browser automation service.
 * 
 * Flow:
 * 1. User clicks "Logga in med BankID"
 * 2. We initiate Signicat OIDC flow with purpose="skatteverket_rpa"
 * 3. User authenticates with BankID
 * 4. Callback stores personal number and creates RPA session
 * 5. RPA service uses session to perform actions on Skatteverket
 */

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

    const { action, company_id, task_type, task_data } = await req.json();

    switch (action) {
      case 'initiate_bankid': {
        // Create RPA session record
        const { data: session, error: sessionError } = await supabase
          .from('rpa_sessions')
          .insert({
            user_id: user.id,
            company_id,
            task_type, // 'vat_declaration', 'agi_submission', etc.
            task_data,
            status: 'pending_bankid',
          })
          .select()
          .maybeSingle();

        if (sessionError) throw sessionError;

        // Build Signicat auth URL with RPA purpose
        const signicatClientId = Deno.env.get('SIGNICAT_CLIENT_ID');
        const redirectUri = `${supabaseUrl}/functions/v1/signicat-callback`;
        
        const state = btoa(JSON.stringify({
          purpose: 'skatteverket_rpa',
          session_id: session.id,
          company_id,
          return_url: req.headers.get('origin') || 'https://northledger.se'
        }));

        // Use Signicat sandbox for testing
        const signicatBaseUrl = 'https://preprod.signicat.com';
        const authUrl = new URL(`${signicatBaseUrl}/oidc/authorize`);
        authUrl.searchParams.set('client_id', signicatClientId!);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'openid profile signicat.national_id');
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('acr_values', 'urn:signicat:oidc:method:sbid'); // Swedish BankID

        return new Response(JSON.stringify({
          auth_url: authUrl.toString(),
          session_id: session.id,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'check_session': {
        const { session_id } = await req.json();
        
        const { data: session, error } = await supabase
          .from('rpa_sessions')
          .select('*')
          .eq('id', session_id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        return new Response(JSON.stringify(session), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'execute_rpa': {
        // This would connect to an external RPA service (Browserbase, etc.)
        // For now, we provide instructions for manual submission
        const { session_id } = await req.json();
        
        const { data: session, error } = await supabase
          .from('rpa_sessions')
          .select('*')
          .eq('id', session_id)
          .maybeSingle();

        if (error || !session) throw new Error('Session not found');

        if (session.status !== 'bankid_verified') {
          throw new Error('BankID verification required first');
        }

        // For now, return manual instructions with pre-filled data
        // In production, this would trigger actual browser automation
        const instructions = generateManualInstructions(session.task_type, session.task_data);
        
        return new Response(JSON.stringify({
          mode: 'manual_guided',
          instructions,
          skatteverket_url: 'https://www.skatteverket.se/privat/etjansterochblanketter/alaboredigering/foretagsredovisningloggain.4.18e1b10334ebe8bc80002417.html',
          pre_filled_data: session.task_data,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in skatteverket-rpa-session:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateManualInstructions(taskType: string, taskData: any): string[] {
  switch (taskType) {
    case 'vat_declaration':
      return [
        '1. Logga in på Skatteverket med BankID',
        '2. Gå till "Mina sidor" → "Moms"',
        '3. Välj aktuell period och klicka "Lämna momsdeklaration"',
        `4. Fyll i försäljning: ${taskData?.total_sales || 'Se förifyllt värde'} kr`,
        `5. Fyll i moms att betala: ${taskData?.vat_payable || 'Se förifyllt värde'} kr`,
        '6. Granska och skicka in deklarationen',
        '7. Spara referensnumret och återkom hit',
      ];
    case 'agi_submission':
      return [
        '1. Logga in på Skatteverket med BankID',
        '2. Gå till "Mina sidor" → "Arbetsgivardeklaration"',
        '3. Välj aktuell period',
        '4. Ladda upp AGI-filen som genererats',
        '5. Granska och skicka in',
        '6. Spara referensnumret',
      ];
    default:
      return ['Följ instruktionerna på Skatteverkets webbplats'];
  }
}
