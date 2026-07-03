import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Skatteverket Kundhändelser API 4.0 (Partner-API)
 * Hämtar notifieringar och händelser från Skatteverket, t.ex:
 * - Beslut om skatt
 * - Momsbesked
 * - Påminnelser
 * - Ändrade uppgifter
 * 
 * Skatteverket Ombudshantering API 2.0 (Partner-API)
 * Hanterar digitala fullmakter/ombud
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
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    const { company_id, action = 'events', from_date, mandate_type } = await req.json();

    // Get OAuth token
    const { data: authData } = await supabase.functions.invoke('skatteverket-oauth', {
      body: { company_id },
      headers: { Authorization: authHeader },
    });

    if (!authData?.access_token) {
      throw new Error('Skatteverket API-anslutning krävs. Konfigurera under Inställningar → Skatteverket.');
    }

    const { access_token, base_url } = authData;

    // Get company org number
    const { data: company } = await supabase
      .from('companies')
      .select('org_number')
      .eq('id', company_id)
      .maybeSingle();

    if (!company) throw new Error('Company not found');

    const orgNr = company.org_number.replace('-', '');

    if (action === 'events') {
      // Fetch customer events (Kundhändelser)
      const params = new URLSearchParams();
      if (from_date) params.set('fran', from_date);

      const response = await fetch(
        `${base_url}/api/kundhandelser/v4/${orgNr}?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Kundhändelser error:', errorText);
        throw new Error(`Failed to fetch events: ${response.status}`);
      }

      const events = await response.json();

      // Store relevant events as notifications
      if (Array.isArray(events?.handelser)) {
        for (const event of events.handelser) {
          await supabase
            .from('bank_notifications')
            .upsert({
              company_id,
              notification_type: 'skatteverket_event',
              title: event.rubrik || 'Händelse från Skatteverket',
              message: event.beskrivning || event.meddelande || JSON.stringify(event),
              severity: event.prioritet === 'hög' ? 'warning' : 'info',
              is_read: false,
            });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        action: 'events',
        data: events,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'list_mandates') {
      // List current mandates (Ombudshantering)
      const response = await fetch(
        `${base_url}/api/ombudshantering/v2/${orgNr}/fullmakter`,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch mandates: ${response.status}`);
      }

      const mandates = await response.json();

      return new Response(JSON.stringify({
        success: true,
        action: 'list_mandates',
        data: mandates,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'register_mandate') {
      // Register new mandate (digital fullmakt)
      const response = await fetch(
        `${base_url}/api/ombudshantering/v2/${orgNr}/fullmakt`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            fullmaktstyp: mandate_type || 'deklarationsombud',
            // Additional mandate fields as needed
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to register mandate: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      return new Response(JSON.stringify({
        success: true,
        action: 'register_mandate',
        data: result,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action. Use "events", "list_mandates", or "register_mandate"');

  } catch (error) {
    console.error('Error in skatteverket-events:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
