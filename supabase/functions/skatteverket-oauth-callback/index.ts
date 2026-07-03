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

    const { code, state } = await req.json();

    if (!code) {
      throw new Error('No authorization code provided');
    }

    // Parse state to get company_id and environment
    // State should be base64 encoded JSON: { company_id, environment }
    let stateData;
    try {
      const decodedState = atob(state);
      stateData = JSON.parse(decodedState);
    } catch (e) {
      throw new Error('Invalid state parameter');
    }

    const { company_id, environment } = stateData;

    // Get credentials
    const { data: credentials, error: credError } = await supabase
      .from('skatteverket_credentials')
      .select('client_id, client_secret_encrypted')
      .eq('company_id', company_id)
      .eq('environment', environment)
      .eq('is_active', true)
      .maybeSingle();

    if (credError || !credentials) {
      throw new Error('No credentials found');
    }

    const baseUrl = environment === 'production' 
      ? 'https://api.skatteverket.se'
      : 'https://api-test.skatteverket.se';

    const callbackUrl = (Deno.env.get('SUPABASE_URL') || '').replace('supabase.co', 'lovableproject.com');
    const redirectUri = `${callbackUrl}/auth/skatteverket/callback`;

    // Exchange authorization code for access token
    const tokenResponse = await fetch(`${baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${credentials.client_id}:${credentials.client_secret_encrypted}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange error:', error);
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();

    // Store or use the access token
    // For now, we'll just return success
    // In production, you might want to store the refresh token securely

    console.log('OAuth callback successful for company:', company_id);

    return new Response(JSON.stringify({
      success: true,
      message: 'Successfully connected to Skatteverket'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in skatteverket-oauth-callback:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});