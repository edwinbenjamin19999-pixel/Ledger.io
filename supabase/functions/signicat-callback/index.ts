import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Signicat OIDC endpoints (EID Hub) — switchable test ↔ prod via SIGNICAT_ENV
const SIGNICAT_ENV = (Deno.env.get("SIGNICAT_ENV") || "production").toLowerCase();
const SIGNICAT_BASE = SIGNICAT_ENV === "test"
  ? "https://api.signicat.com/auth/open/test"
  : "https://api.signicat.com/auth/open";
const SIGNICAT_TOKEN_URL = `${SIGNICAT_BASE}/connect/token`;
const SIGNICAT_USERINFO_URL = `${SIGNICAT_BASE}/connect/userinfo`;

interface StateData {
  token: string;
  purpose: string;
  companyId: string;
  agreementId: string;
  returnUrl: string;
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const encodedState = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    // Get environment variables
    const clientId = Deno.env.get('SIGNICAT_CLIENT_ID');
    const clientSecret = Deno.env.get('SIGNICAT_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!clientId || !clientSecret || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Parse state to get purpose and IDs
    let stateData: StateData = {
      token: '',
      purpose: 'kyc_verification',
      companyId: '',
      agreementId: '',
      returnUrl: ''
    };

    if (encodedState) {
      try {
        stateData = JSON.parse(atob(encodedState));
      } catch (e) {
        // Fallback for old-style state format (token:companyId)
        const [token, companyId] = encodedState.split(':');
        stateData = {
          token: token || '',
          purpose: 'kyc_verification',
          companyId: companyId || '',
          agreementId: '',
          returnUrl: ''
        };
      }
    }

    const { purpose, companyId, agreementId, returnUrl } = stateData;

    // Handle error from Signicat
    if (error) {
      console.error('Signicat error:', error, errorDescription);
      return redirectToApp(purpose, companyId, agreementId, returnUrl, false, errorDescription || error);
    }

    if (!code) {
      throw new Error('No authorization code received');
    }

    // Exchange code for tokens
    const callbackUrl = `${supabaseUrl}/functions/v1/signicat-callback`;
    
    const tokenResponse = await fetch(SIGNICAT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error('Failed to exchange authorization code');
    }

    const tokens = await tokenResponse.json();
    console.log('Token exchange successful');

    // Get user info
    const userInfoResponse = await fetch(SIGNICAT_USERINFO_URL, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const userInfo = await userInfoResponse.json();
    console.log('User info retrieved:', {
      sub: userInfo.sub,
      name: userInfo.name,
      hasNationalId: !!userInfo.signicat?.national_id,
    });

    // Extract personal number from Signicat response
    const personalNumber = userInfo.signicat?.national_id || 
                          userInfo['signicat.national_id'] ||
                          userInfo.sub;

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle based on purpose
    if (purpose === 'agreement_signing' && agreementId) {
      // Update user agreement with BankID signing
      console.log('Processing agreement signing for agreement:', agreementId);
      
      // We need to find the user agreement and update it
      // The user context is lost in the callback, so we use the personal number to match
      const { data: agreements, error: findError } = await supabase
        .from('user_agreements')
        .select('*')
        .eq('agreement_id', agreementId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      if (findError) {
        console.error('Failed to find pending agreement:', findError);
      } else if (agreements && agreements.length > 0) {
        // Update the most recent pending agreement
        const pendingAgreement = agreements[0];
        const { error: updateError } = await supabase
          .from('user_agreements')
          .update({
            signed_at: new Date().toISOString(),
            signature_method: 'bankid',
            bankid_personal_number: personalNumber,
            bankid_transaction_id: stateData.token,
            status: 'signed',
            user_agent: 'BankID via Signicat',
            updated_at: new Date().toISOString()
          })
          .eq('id', pendingAgreement.id);

        if (updateError) {
          console.error('Failed to update user agreement:', updateError);
        } else {
          console.log('User agreement signed successfully:', pendingAgreement.id);
        }
      }
    } else if (companyId) {
      // KYC verification flow
      const { error: updateError } = await supabase
        .from('kyc_records')
        .update({
          bankid_verified: true,
          bankid_verification_date: new Date().toISOString(),
          bankid_personal_number: personalNumber,
          verification_status: 'verified',
          verification_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('company_id', companyId);

      if (updateError) {
        console.error('Failed to update KYC record:', updateError);
      } else {
        console.log('KYC record updated successfully for company:', companyId);
      }

      // Also update company KYC status
      await supabase
        .from('companies')
        .update({
          kyc_status: 'verified',
          updated_at: new Date().toISOString(),
        })
        .eq('id', companyId);
    }

    // Redirect back to app with success
    return redirectToApp(purpose, companyId, agreementId, returnUrl, true);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Signicat callback error:', error);
    return redirectToApp(
      'unknown',
      '',
      '',
      '',
      false,
      errorMessage
    );
  }
});

function redirectToApp(
  purpose: string,
  companyId: string,
  agreementId: string,
  returnUrl: string,
  success: boolean,
  errorMessage?: string
): Response {
  // Use APP_URL env var (set to https://northledger.se in production), fallback to live domain
  const baseUrl = Deno.env.get("APP_URL") || "https://northledger.se";
  
  // Determine redirect path based on purpose
  let redirectUrl: string;
  
  if (returnUrl) {
    // Use provided return URL
    redirectUrl = returnUrl.startsWith('http') ? returnUrl : `${baseUrl}${returnUrl}`;
  } else if (purpose === 'agreement_signing') {
    redirectUrl = `${baseUrl}/agreement-callback`;
  } else {
    redirectUrl = `${baseUrl}/kyc`;
  }

  // Add query parameters
  const urlObj = new URL(redirectUrl);
  
  if (success) {
    urlObj.searchParams.set('bankid', 'success');
    if (companyId) urlObj.searchParams.set('company', companyId);
    if (agreementId) urlObj.searchParams.set('agreement', agreementId);
  } else {
    urlObj.searchParams.set('bankid', 'error');
    urlObj.searchParams.set('message', errorMessage || 'Verification failed');
  }

  console.log('Redirecting to:', urlObj.toString());

  return new Response(null, {
    status: 302,
    headers: {
      'Location': urlObj.toString(),
    },
  });
}
