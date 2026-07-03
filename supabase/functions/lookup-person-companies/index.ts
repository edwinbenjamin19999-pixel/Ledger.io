import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";

interface CompanyInfo {
  orgNumber: string;
  name: string;
  role: string;
  status: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { personalNumber, name, userId } = await req.json();
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    console.log('[LOOKUP] Request:', { name, hasPersonalNumber: !!personalNumber, userId });

    const companies: CompanyInfo[] = [];
    let searchMethod = 'none';

    // 1. Check existing linked companies in our database first
    if (userId) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Check linked_companies table
        const { data: linkedData } = await supabase
          .from('linked_companies')
          .select('company_id')
          .eq('user_id', userId);

        const companyIds: string[] = linkedData?.map(l => l.company_id) || [];

        // Also check companies created by this user
        const { data: createdData } = await supabase
          .from('companies')
          .select('id, org_number, name')
          .eq('created_by', userId);

        if (createdData) {
          for (const c of createdData) {
            if (!companyIds.includes(c.id)) {
              companyIds.push(c.id);
            }
            if (c.org_number && !c.org_number.startsWith('TEMP-')) {
              companies.push({
                orgNumber: c.org_number,
                name: c.name,
                role: 'Ägare/Skapare',
                status: 'Aktivt',
              });
            }
          }
        }

        // Fetch names for linked companies not already added
        if (linkedData && linkedData.length > 0) {
          const linkedIds = linkedData.map(l => l.company_id).filter(id => 
            !createdData?.some(c => c.id === id)
          );
          if (linkedIds.length > 0) {
            const { data: companyData } = await supabase
              .from('companies')
              .select('org_number, name')
              .in('id', linkedIds);
            if (companyData) {
              for (const c of companyData) {
                if (c.org_number && !c.org_number.startsWith('TEMP-')) {
                  companies.push({
                    orgNumber: c.org_number,
                    name: c.name,
                    role: 'Kopplat företag',
                    status: 'Aktivt',
                  });
                }
              }
            }
          }
        }

        if (companies.length > 0) {
          searchMethod = 'database';
          console.log('[LOOKUP] Found', companies.length, 'companies in DB');
        }
      } catch (dbError) {
        console.log('[LOOKUP] DB lookup error:', dbError);
      }
    }

    // 2. Try Firecrawl to scrape Allabolag if we have a name and need more results
    if (firecrawlApiKey && name) {
      try {
        console.log('[LOOKUP] Trying Firecrawl for:', name);
        
        const searchUrl = `https://www.allabolag.se/what/${encodeURIComponent(name)}`;
        
        const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: searchUrl,
            formats: ['markdown'],
          }),
        });

        if (firecrawlResponse.ok) {
          const firecrawlData = await firecrawlResponse.json();
          
          if (firecrawlData.success && firecrawlData.data?.markdown) {
            const markdown = firecrawlData.data.markdown;
            const orgNumberPattern = /(\d{6}-\d{4})/g;
            
            const lines = markdown.split('\n');
            for (const line of lines) {
              const orgMatch = line.match(/(\d{6}-\d{4})/);
              if (orgMatch) {
                const cleanLine = line.replace(/\[|\]|\(|\)/g, ' ').trim();
                const parts = cleanLine.split(orgMatch[0]);
                let companyName = parts[0]?.trim() || 'Okänt företag';
                companyName = companyName.replace(/^[#\-\*\s]+/, '').trim();
                if (companyName.length > 3 && companyName.length < 100) {
                  companies.push({
                    orgNumber: orgMatch[0],
                    name: companyName,
                    role: 'Kopplad person',
                    status: 'Aktiv',
                  });
                }
              }
            }
            
            if (companies.length > 0 && searchMethod === 'none') {
              searchMethod = 'firecrawl';
              console.log('[LOOKUP] Firecrawl found', companies.length, 'companies');
            }
          } else {
            console.log('[LOOKUP] Firecrawl returned no data:', firecrawlData.success);
          }
        } else {
          const errText = await firecrawlResponse.text();
          console.log('[LOOKUP] Firecrawl response:', firecrawlResponse.status, errText.substring(0, 200));
        }
      } catch (firecrawlError) {
        console.log('[LOOKUP] Firecrawl error:', firecrawlError);
      }
    }

    // 3. Fallback: Try direct allabolag.se HTML scrape for the person name
    if (companies.length === 0 && name) {
      try {
        console.log('[LOOKUP] Trying allabolag.se direct for:', name);
        const searchUrl = `https://www.allabolag.se/what/${encodeURIComponent(name)}`;
        
        const abResponse = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html',
          },
          redirect: 'follow',
        });

        if (abResponse.ok) {
          const html = await abResponse.text();
          // Extract org numbers and company names from title/meta
          const orgMatches = [...html.matchAll(/(\d{6}-\d{4})/g)];
          const titleMatch = html.match(/<title[^>]*>(\d+)\s+leverantörer/i);
          
          if (orgMatches.length > 0) {
            // Try to find company names near org numbers
            for (const match of orgMatches) {
              const orgNr = match[0];
              // Check if it's already added
              if (companies.some(c => c.orgNumber === orgNr)) continue;
              
              // Try to find the company name in context around the org number
              const idx = html.indexOf(orgNr);
              if (idx > -1) {
                const context = html.substring(Math.max(0, idx - 200), idx);
                // Look for company name in links or text nearby
                const nameMatch = context.match(/>([A-ZÅÄÖ][^<]{2,60})<\/[ah]/);
                if (nameMatch) {
                  companies.push({
                    orgNumber: orgNr,
                    name: nameMatch[1].trim(),
                    role: 'Kopplad person',
                    status: 'Aktiv',
                  });
                }
              }
            }
            if (companies.length > 0) {
              searchMethod = 'allabolag';
              console.log('[LOOKUP] allabolag.se found', companies.length, 'companies');
            }
          }
        }
      } catch (abError) {
        console.log('[LOOKUP] allabolag.se error:', abError);
      }
    }

    // Remove duplicates based on org number
    const uniqueCompanies = companies.filter((company, index, self) =>
      index === self.findIndex(c => c.orgNumber === company.orgNumber) &&
      company.orgNumber && company.orgNumber.length >= 10
    );

    console.log('[LOOKUP] Final result:', uniqueCompanies.length, 'companies via', searchMethod);

    let message = null;
    if (uniqueCompanies.length === 0) {
      if (!name && !personalNumber) {
        message = 'Ange ditt namn för att söka efter företag. För bäst resultat, verifiera dig med BankID först.';
      } else if (name) {
        message = `Inga företag hittades för "${name}". Du kan lägga till företag manuellt med organisationsnummer.`;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        companies: uniqueCompanies,
        source: searchMethod,
        message,
        hasBankIdVerification: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[LOOKUP] Error:', errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        companies: [], 
        error: errorMessage,
        message: 'Sökningen misslyckades. Du kan lägga till företag manuellt med organisationsnummer.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
