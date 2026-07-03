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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create export request
    const { data: exportRequest, error: insertError } = await supabaseClient
      .from('data_export_requests')
      .insert({
        user_id: user.id,
        status: 'processing'
      })
      .select()
      .maybeSingle();

    if (insertError) throw insertError;
    if (!exportRequest) throw new Error('Failed to create export request');

    // Collect all user data
    const userData: any = {
      profile: null,
      companies: [],
      roles: [],
      audit_logs: [],
      consents: [],
      export_generated_at: new Date().toISOString(),
      user_id: user.id,
      email: user.email
    };

    // Get profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    userData.profile = profile;

    // Get user roles
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id);
    userData.roles = roles;

    // Get companies user has access to
    const { data: companies } = await supabaseClient
      .from('companies')
      .select('*')
      .in('id', roles?.map(r => r.company_id).filter(Boolean) || []);
    userData.companies = companies;

    // Get audit logs related to user
    const { data: auditLogs } = await supabaseClient
      .from('audit_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1000);
    userData.audit_logs = auditLogs;

    // Get consents
    const { data: consents } = await supabaseClient
      .from('user_consents')
      .select('*')
      .eq('user_id', user.id);
    userData.consents = consents;

    // For each company, get related data (if user is owner/accountant)
    for (const company of companies || []) {
      const companyData: any = {
        company_id: company.id,
        company_name: company.name
      };

      // Check if user has permission to export company data
      const userRole = roles?.find(r => r.company_id === company.id);
      if (userRole && ['owner', 'accountant'].includes(userRole.role)) {
        // Get employees
        const { data: employees } = await supabaseClient
          .from('employees')
          .select('*')
          .eq('company_id', company.id);
        companyData.employees = employees;

        // Get invoices
        const { data: invoices } = await supabaseClient
          .from('invoices')
          .select('*, invoice_lines(*)')
          .eq('company_id', company.id);
        companyData.invoices = invoices;

        // Get journal entries
        const { data: journalEntries } = await supabaseClient
          .from('journal_entries')
          .select('*, journal_entry_lines(*)')
          .eq('company_id', company.id);
        companyData.journal_entries = journalEntries;

        // Get bank accounts (anonymized account numbers)
        const { data: bankAccounts } = await supabaseClient
          .from('bank_accounts')
          .select('id, company_id, account_name, bank_name, currency, balance, is_active')
          .eq('company_id', company.id);
        companyData.bank_accounts = bankAccounts;
      }

      userData.companies.push(companyData);
    }

    // Convert to JSON
    const jsonData = JSON.stringify(userData, null, 2);
    
    // In a production environment, you would upload this to storage
    // and return a signed URL. For now, we return inline
    
    // Update export request as completed
    await supabaseClient
      .from('data_export_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .eq('id', exportRequest.id);

    // Log the export for GDPR compliance
    await supabaseClient
      .from('audit_events')
      .insert({
        user_id: user.id,
        entity_type: 'data_export',
        entity_id: exportRequest.id,
        event_type: 'export',
        data_subject_id: user.id,
        data_categories: ['all_user_data'],
        processing_purpose: 'GDPR data portability request',
        legal_basis: 'legal_obligation'
      });

    return new Response(
      jsonData,
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="user-data-export-${user.id}.json"`
        }
      }
    );

  } catch (error) {
    console.error('Error exporting user data:', error);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
