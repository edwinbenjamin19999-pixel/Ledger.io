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

    const { fileData, dataType, companyId } = await req.json();
    
    if (!fileData || !dataType || !companyId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get learning data from previous imports
    const { data: learningData } = await supabaseClient
      .from('ai_feedback')
      .select('document_pattern, corrected_data')
      .eq('company_id', companyId)
      .eq('correction_type', 'import_mapping')
      .limit(10);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build system prompt based on data type
    const schemas: Record<string, any> = {
      accounts: {
        required: ['account_number', 'account_name', 'account_type'],
        optional: ['vat_code', 'is_active'],
        types: {
          account_type: ['asset', 'liability', 'equity', 'revenue', 'expense']
        },
        description: 'Chart of accounts with account numbers (typically 1000-9999), names, and types'
      },
      customers: {
        required: ['name'],
        optional: ['org_number', 'email', 'phone', 'address', 'payment_terms'],
        description: 'Customer registry with company/person details'
      },
      suppliers: {
        required: ['name'],
        optional: ['org_number', 'email', 'phone', 'address', 'payment_terms'],
        description: 'Supplier registry with company/person details'
      },
      employees: {
        required: ['first_name', 'last_name', 'personal_number', 'employment_start'],
        optional: ['email', 'phone', 'address', 'monthly_salary', 'hourly_rate', 'tax_table', 'tax_column'],
        description: 'Employee data with personal and employment information'
      }
    };

    const schema = schemas[dataType];
    if (!schema) {
      return new Response(
        JSON.stringify({ error: 'Unknown data type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert at analyzing Excel/CSV data for accounting systems.

Your task is to analyze the provided data and map columns to our schema.

TARGET SCHEMA for ${dataType}:
Required fields: ${schema.required.join(', ')}
Optional fields: ${schema.optional.join(', ')}
${schema.types ? `Valid values: ${JSON.stringify(schema.types)}` : ''}
Description: ${schema.description}

${learningData && learningData.length > 0 ? `
LEARNING FROM PREVIOUS IMPORTS:
${learningData.map(l => `Pattern: ${l.document_pattern}\nMapping: ${JSON.stringify(l.corrected_data)}`).join('\n\n')}
` : ''}

INSTRUCTIONS:
1. Analyze the column headers and sample data
2. Identify which columns map to our required/optional fields
3. Suggest data transformations if needed:
   - parse_date: for date fields in various formats (YYYY-MM-DD, DD/MM/YYYY, etc.)
   - split_name: to split full names into first_name and last_name
   - parse_number: to clean number formats (remove spaces, commas)
   - uppercase/lowercase/trim: for text formatting
4. Flag any issues or missing required data
5. Be flexible with column names:
   - Account: "Konto", "Account", "Kontonr", "Account Number" → account_number
   - Name: "Namn", "Name", "Företagsnamn", "Company Name" → name
   - Email: "E-post", "Email", "Mail" → email
   - Organization: "Orgnr", "Org.nr", "Organization Number", "Organisationsnummer" → org_number
6. ALWAYS mark confidence < 0.6 for uncertain mappings
7. Include example transformations for the user to verify

Respond with a mapping suggestion using the suggest_mapping function.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Analyze this ${dataType} data and suggest column mapping:\n\n${JSON.stringify(fileData.slice(0, 5), null, 2)}\n\nTotal rows: ${fileData.length}` 
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_mapping',
              description: 'Suggest column mapping from source to target schema',
              parameters: {
                type: 'object',
                properties: {
                  mappings: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        sourceColumn: { type: 'string', description: 'Original column name from file' },
                        targetField: { type: 'string', description: 'Target field in our schema' },
                        confidence: { type: 'number', description: 'Confidence 0-1' },
                        transformation: { 
                          type: 'string', 
                          description: 'Optional transformation needed (e.g., "uppercase", "parse_date", "split_name")' 
                        },
                        example: { type: 'string', description: 'Example of transformed data' }
                      },
                      required: ['sourceColumn', 'targetField', 'confidence']
                    }
                  },
                  unmappedColumns: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Columns that could not be mapped'
                  },
                  missingRequired: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Required fields not found in source data'
                  },
                  warnings: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Warnings about data quality or mapping issues'
                  },
                  suggestions: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Suggestions for improving the import'
                  }
                },
                required: ['mappings', 'unmappedColumns', 'missingRequired', 'warnings']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_mapping' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No mapping suggestion received from AI');
    }

    const mapping = JSON.parse(toolCall.function.arguments);
    
    // Log for learning
    await supabaseClient
      .from('ai_feedback')
      .insert({
        company_id: companyId,
        corrected_by: user.id,
        correction_type: 'import_mapping',
        document_pattern: `${dataType}_import`,
        original_suggestion: { fileData: fileData.slice(0, 2) },
        corrected_data: mapping,
        journal_entry_id: null
      });

    return new Response(
      JSON.stringify({
        success: true,
        mapping,
        rowCount: fileData.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error analyzing import file:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
