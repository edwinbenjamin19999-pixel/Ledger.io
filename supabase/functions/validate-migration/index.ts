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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const { companyId, platform, apiKey } = body;

    console.log(`Validating migration from ${platform} for company ${companyId}`);

    const validation = {
      isValid: true,
      warnings: [] as string[],
      errors: [] as string[],
      accountMapping: [] as Array<{
        sourceAccount: string;
        sourceName: string;
        targetAccount: string;
        targetName: string;
        needsReview: boolean;
      }>,
    };

    // Fetch existing chart of accounts
    const { data: existingAccounts } = await supabaseClient
      .from('chart_of_accounts')
      .select('account_number, account_name')
      .eq('company_id', companyId);

    const existingAccountMap = new Map(
      (existingAccounts || []).map(acc => [acc.account_number, acc.account_name])
    );

    // Fetch accounts from source platform
    let sourceAccounts: any[] = [];
    if (platform === "fortnox") {
      const response = await fetch("https://api.fortnox.se/3/accounts", {
        headers: {
          "Access-Token": apiKey,
          "Client-Secret": Deno.env.get("FORTNOX_CLIENT_SECRET") || "",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        validation.errors.push(`Kunde inte hämta konton från Fortnox: ${response.statusText}`);
        validation.isValid = false;
      } else {
        const data = await response.json();
        sourceAccounts = data.Accounts || [];
      }
    }

    // Create account mapping
    for (const sourceAcc of sourceAccounts) {
      const accountNumber = sourceAcc.Number.toString();
      const existingAccountName = existingAccountMap.get(accountNumber);
      
      const mapping = {
        sourceAccount: accountNumber,
        sourceName: sourceAcc.Description,
        targetAccount: accountNumber,
        targetName: existingAccountName || sourceAcc.Description,
        needsReview: !existingAccountName,
      };

      validation.accountMapping.push(mapping);

      if (!existingAccountName) {
        validation.warnings.push(
          `Konto ${accountNumber} (${sourceAcc.Description}) finns inte i NorthLedger och kommer skapas automatiskt`
        );
      }
    }

    // Validate data integrity
    if (validation.accountMapping.length === 0) {
      validation.warnings.push("Inga konton hittades att migrera");
    }

    // Check for potential issues
    const needsReviewCount = validation.accountMapping.filter(m => m.needsReview).length;
    if (needsReviewCount > 0) {
      validation.warnings.push(
        `${needsReviewCount} konton kommer att skapas automatiskt. Granska mappningen innan du fortsätter.`
      );
    }

    return new Response(
      JSON.stringify({ success: true, validation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Validation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
