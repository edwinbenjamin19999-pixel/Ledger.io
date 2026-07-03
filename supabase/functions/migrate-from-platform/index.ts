import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface MigrationRequest {
  companyId: string;
  platform: "fortnox" | "visma";
  apiKey: string;
  migrationData: {
    employees: boolean;
    customers: boolean;
    suppliers: boolean;
    accounts: boolean;
    transactions: boolean;
    invoices: boolean;
    documents: boolean;
  };
  accountMapping?: Array<{
    sourceAccount: string;
    targetAccount: string;
  }>;
}

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

    const body: MigrationRequest = await req.json();
    const { companyId, platform, apiKey, migrationData, accountMapping } = body;

    console.log(`Starting migration from ${platform} for company ${companyId}`);

    const summary = {
      employees: 0,
      customers: 0,
      suppliers: 0,
      accounts: 0,
      transactions: 0,
      invoices: 0,
      documents: 0,
    };

    // Create account mapping for quick lookup
    const accountMap = new Map(
      (accountMapping || []).map(m => [m.sourceAccount, m.targetAccount])
    );

    // Migrate employees
    if (migrationData.employees) {
      const employees = await fetchEmployees(platform, apiKey);
      console.log(`Fetched ${employees.length} employees from ${platform}`);
      
      for (const emp of employees) {
        const { error } = await supabaseClient
          .from('employees')
          .insert({
            company_id: companyId,
            personal_number: emp.personalNumber,
            first_name: emp.firstName,
            last_name: emp.lastName,
            employment_start: emp.employmentStart,
            monthly_salary: emp.monthlySalary,
            employment_type: emp.employmentType || 'full_time',
            created_by: user.id,
          });
        
        if (!error) summary.employees++;
      }
    }

    // Migrate customers
    if (migrationData.customers) {
      const customers = await fetchCustomers(platform, apiKey);
      console.log(`Fetched ${customers.length} customers from ${platform}`);
      summary.customers = customers.length;
    }

    // Migrate suppliers
    if (migrationData.suppliers) {
      const suppliers = await fetchSuppliers(platform, apiKey);
      console.log(`Fetched ${suppliers.length} suppliers from ${platform}`);
      summary.suppliers = suppliers.length;
    }

    // Migrate chart of accounts
    if (migrationData.accounts) {
      const accounts = await fetchAccounts(platform, apiKey);
      console.log(`Fetched ${accounts.length} accounts from ${platform}`);
      
      for (const acc of accounts) {
        const { error } = await supabaseClient
          .from('chart_of_accounts')
          .insert({
            company_id: companyId,
            account_number: acc.number,
            account_name: acc.name,
            account_type: acc.type,
            vat_code: acc.vatCode,
          });
        
        if (!error) summary.accounts++;
      }
    }

    // Migrate transactions/vouchers
    if (migrationData.transactions) {
      const transactions = await fetchTransactions(platform, apiKey);
      console.log(`Fetched ${transactions.length} transactions from ${platform}`);
      summary.transactions = transactions.length;
    }

    // Migrate invoices
    if (migrationData.invoices) {
      const invoices = await fetchInvoices(platform, apiKey);
      console.log(`Fetched ${invoices.length} invoices from ${platform}`);
      summary.invoices = invoices.length;
    }

    // Migrate documents and attachments
    if (migrationData.documents) {
      const documents = await fetchDocuments(platform, apiKey);
      console.log(`Fetched ${documents.length} documents from ${platform}`);
      
      for (const doc of documents) {
        try {
          // Download document from source
          const docResponse = await fetch(doc.url, {
            headers: platform === "fortnox" ? {
              "Access-Token": apiKey,
              "Client-Secret": Deno.env.get("FORTNOX_CLIENT_SECRET") || "",
            } : {
              "Authorization": `Bearer ${apiKey}`,
            },
          });

          if (!docResponse.ok) continue;

          const docBlob = await docResponse.blob();
          const fileName = doc.name || `document_${Date.now()}.pdf`;
          
          // Upload to Supabase storage
          const { data: uploadData, error: uploadError } = await supabaseClient
            .storage
            .from('documents')
            .upload(`${companyId}/${fileName}`, docBlob, {
              contentType: doc.mimeType || 'application/pdf',
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }

          // Create document record
          const { error: docError } = await supabaseClient
            .from('documents')
            .insert({
              company_id: companyId,
              file_name: fileName,
              file_url: uploadData.path,
              mime_type: doc.mimeType,
              document_type: doc.type || 'other',
              uploaded_by: user.id,
            });

          if (!docError) summary.documents++;
        } catch (docError) {
          console.error('Document migration error:', docError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Migration error:', error);
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

async function fetchEmployees(platform: string, apiKey: string) {
  if (platform === "fortnox") {
    const response = await fetch("https://api.fortnox.se/3/employees", {
      headers: {
        "Access-Token": apiKey,
        "Client-Secret": Deno.env.get("FORTNOX_CLIENT_SECRET") || "",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Fortnox API error: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.Employees || []).map((emp: any) => ({
      personalNumber: emp.PersonalIdentityNumber,
      firstName: emp.FirstName,
      lastName: emp.LastName,
      employmentStart: emp.EmploymentDate,
      monthlySalary: emp.MonthlySalary,
      employmentType: 'full_time',
    }));
  } else if (platform === "visma") {
    const response = await fetch("https://api.vismaspcs.se/v1/employees", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Visma API error: ${response.statusText}`);
    }

    const data = await response.json();
    return (data || []).map((emp: any) => ({
      personalNumber: emp.socialSecurityNumber,
      firstName: emp.firstName,
      lastName: emp.lastName,
      employmentStart: emp.employmentDate,
      monthlySalary: emp.salary,
      employmentType: 'full_time',
    }));
  }
  return [];
}

async function fetchCustomers(platform: string, apiKey: string) {
  if (platform === "fortnox") {
    const response = await fetch("https://api.fortnox.se/3/customers", {
      headers: {
        "Access-Token": apiKey,
        "Client-Secret": Deno.env.get("FORTNOX_CLIENT_SECRET") || "",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error(`Fortnox API error: ${response.statusText}`);
    const data = await response.json();
    return data.Customers || [];
  }
  return [];
}

async function fetchSuppliers(platform: string, apiKey: string) {
  if (platform === "fortnox") {
    const response = await fetch("https://api.fortnox.se/3/suppliers", {
      headers: {
        "Access-Token": apiKey,
        "Client-Secret": Deno.env.get("FORTNOX_CLIENT_SECRET") || "",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error(`Fortnox API error: ${response.statusText}`);
    const data = await response.json();
    return data.Suppliers || [];
  }
  return [];
}

async function fetchAccounts(platform: string, apiKey: string) {
  if (platform === "fortnox") {
    const response = await fetch("https://api.fortnox.se/3/accounts", {
      headers: {
        "Access-Token": apiKey,
        "Client-Secret": Deno.env.get("FORTNOX_CLIENT_SECRET") || "",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error(`Fortnox API error: ${response.statusText}`);
    const data = await response.json();
    return (data.Accounts || []).map((acc: any) => ({
      number: acc.Number.toString(),
      name: acc.Description,
      type: mapAccountType(acc.Number),
      vatCode: acc.VATCode,
    }));
  } else if (platform === "visma") {
    const response = await fetch("https://api.vismaspcs.se/v1/accounts", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error(`Visma API error: ${response.statusText}`);
    const data = await response.json();
    return (data || []).map((acc: any) => ({
      number: acc.number.toString(),
      name: acc.name,
      type: mapAccountType(parseInt(acc.number)),
      vatCode: acc.vatCode,
    }));
  }
  return [];
}

async function fetchTransactions(platform: string, apiKey: string) {
  if (platform === "fortnox") {
    const response = await fetch("https://api.fortnox.se/3/vouchers", {
      headers: {
        "Access-Token": apiKey,
        "Client-Secret": Deno.env.get("FORTNOX_CLIENT_SECRET") || "",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error(`Fortnox API error: ${response.statusText}`);
    const data = await response.json();
    return data.Vouchers || [];
  }
  return [];
}

async function fetchInvoices(platform: string, apiKey: string) {
  if (platform === "fortnox") {
    const response = await fetch("https://api.fortnox.se/3/invoices", {
      headers: {
        "Access-Token": apiKey,
        "Client-Secret": Deno.env.get("FORTNOX_CLIENT_SECRET") || "",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error(`Fortnox API error: ${response.statusText}`);
    const data = await response.json();
    return data.Invoices || [];
  }
  return [];
}

async function fetchDocuments(platform: string, apiKey: string) {
  if (platform === "fortnox") {
    const response = await fetch("https://api.fortnox.se/3/archive", {
      headers: {
        "Access-Token": apiKey,
        "Client-Secret": Deno.env.get("FORTNOX_CLIENT_SECRET") || "",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error(`Fortnox API error: ${response.statusText}`);
    const data = await response.json();
    return (data.Folders || []).flatMap((folder: any) => 
      (folder.Files || []).map((file: any) => ({
        name: file.Name,
        url: `https://api.fortnox.se/3/archive/${file.Id}`,
        mimeType: file.ContentType,
        type: determineDocumentType(file.Name),
      }))
    );
  }
  return [];
}

function determineDocumentType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes('invoice') || lower.includes('faktura')) return 'invoice';
  if (lower.includes('receipt') || lower.includes('kvitto')) return 'receipt';
  if (lower.includes('contract') || lower.includes('avtal')) return 'contract';
  return 'other';
}

function mapAccountType(accountNumber: number): string {
  if (accountNumber >= 1000 && accountNumber <= 1999) return "asset";
  if (accountNumber >= 2000 && accountNumber <= 2999) return "liability";
  if (accountNumber >= 3000 && accountNumber <= 3999) return "income";
  if (accountNumber >= 4000 && accountNumber <= 8999) return "expense";
  return "other";
}
