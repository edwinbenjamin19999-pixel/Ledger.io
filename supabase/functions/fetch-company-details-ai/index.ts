import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface Representative {
  name: string;
  role: string;
  personalNumber?: string;
}

interface BeneficialOwner {
  name: string;
  ownership_percentage?: number;
  type: string;
}

interface CompanyDetails {
  name: string;
  org_number: string;
  address?: string;
  postal_code?: string;
  city?: string;
  business_description?: string;
  registration_date?: string;
  company_type?: string;
  representatives: Representative[];
  beneficial_owners: BeneficialOwner[];
  dataSource: string;
  dataCompleteness: 'full' | 'partial' | 'basic';
  missingData: string[];
  scrapedAt?: string;
}

// Role translation from Swedish to standardized format
const ROLE_TRANSLATIONS: Record<string, string> = {
  'verkställande direktör': 'VD',
  'vd': 'VD',
  'styrelseordförande': 'Ordförande',
  'ordförande': 'Ordförande',
  'styrelseledamot': 'Styrelseledamot',
  'ledamot': 'Styrelseledamot',
  'suppleant': 'Styrelsesuppleant',
  'styrelsesuppleant': 'Styrelsesuppleant',
  'revisor': 'Revisor',
  'firmatecknare': 'Firmatecknare',
  'vice verkställande direktör': 'Vice VD',
  'vice vd': 'Vice VD',
};

function normalizeRole(role: string): string {
  const lower = role.toLowerCase().trim();
  return ROLE_TRANSLATIONS[lower] || role;
}

// AI-powered extraction of company data from scraped HTML/markdown
async function extractWithAI(scrapedContent: string, orgNumber: string): Promise<Partial<CompanyDetails> | null> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.log('LOVABLE_API_KEY not configured, skipping AI extraction');
    return null;
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: `Du är en expert på att extrahera företagsinformation från webbsidor. 
Extrahera strukturerad data om svenska företag från den givna texten.
Returnera ENDAST JSON utan någon annan text.`
          },
          {
            role: 'user',
            content: `Extrahera följande information om företaget med org.nr ${orgNumber} från denna text:

${scrapedContent.substring(0, 15000)}

Returnera JSON med denna struktur:
{
  "name": "Företagsnamn",
  "address": "Gatuadress",
  "postal_code": "Postnummer",
  "city": "Stad",
  "business_description": "Verksamhetsbeskrivning",
  "registration_date": "YYYY-MM-DD",
  "company_type": "Aktiebolag/Handelsbolag/etc",
  "representatives": [
    {"name": "Förnamn Efternamn", "role": "VD/Styrelseledamot/etc"}
  ],
  "beneficial_owners": [
    {"name": "Förnamn Efternamn", "ownership_percentage": 50, "type": "Direkt ägande"}
  ]
}

Om information saknas, utelämna fältet. Gissa INTE.`
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.log('No content from AI');
      return null;
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    const parsed = JSON.parse(jsonStr.trim());
    
    // Normalize roles
    if (parsed.representatives) {
      parsed.representatives = parsed.representatives.map((rep: Representative) => ({
        ...rep,
        role: normalizeRole(rep.role)
      }));
    }
    
    console.log('AI extracted data:', JSON.stringify(parsed, null, 2));
    return parsed;
  } catch (error) {
    console.error('AI extraction error:', error);
    return null;
  }
}

// Scrape company data using Firecrawl
async function scrapeWithFirecrawl(orgNumber: string): Promise<{ content: string; url: string } | null> {
  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  
  if (!FIRECRAWL_API_KEY) {
    console.log('FIRECRAWL_API_KEY not configured');
    return null;
  }

  const urls = [
    `https://www.allabolag.se/${orgNumber}`,
    `https://www.proff.se/foretag/${orgNumber}`,
  ];

  for (const url of urls) {
    try {
      console.log(`Scraping ${url} with Firecrawl...`);
      
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['markdown'],
          onlyMainContent: true,
          waitFor: 3000,
        }),
      });

      if (!response.ok) {
        console.error(`Firecrawl error for ${url}:`, response.status);
        continue;
      }

      const data = await response.json();
      const markdown = data.data?.markdown || data.markdown;
      
      if (markdown && markdown.length > 500) {
        console.log(`Successfully scraped ${url}, got ${markdown.length} chars`);
        return { content: markdown, url };
      }
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
    }
  }

  return null;
}

// Fallback: Fetch from Roaring API if available
async function fetchFromRoaring(orgNumber: string): Promise<CompanyDetails | null> {
  const ROARING_API_KEY = Deno.env.get('ROARING_API_KEY');
  
  if (!ROARING_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.roaring.io/se/company/overview/2.0/${orgNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${ROARING_API_KEY}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    return {
      name: data.companyName || '',
      org_number: orgNumber,
      address: data.address?.street,
      postal_code: data.address?.zipCode,
      city: data.address?.city,
      business_description: data.operations?.description,
      registration_date: data.registrationDate,
      company_type: data.companyType,
      representatives: (data.boardMembers || []).map((member: any) => ({
        name: member.name,
        role: normalizeRole(member.role || 'Styrelseledamot'),
        personalNumber: member.personalNumber,
      })),
      beneficial_owners: (data.beneficialOwners || []).map((owner: any) => ({
        name: owner.name,
        ownership_percentage: owner.ownershipPercentage,
        type: owner.ownershipType || 'Direkt ägande',
      })),
      dataSource: 'roaring',
      dataCompleteness: 'full',
      missingData: [],
    };
  } catch (error) {
    console.error('Roaring API error:', error);
    return null;
  }
}

// Future: Bolagsverket API (Fall 2025)
async function fetchFromBolagsverket(orgNumber: string): Promise<CompanyDetails | null> {
  // TODO: Implement when Bolagsverket API becomes available (Fall 2025)
  // Expected endpoint: https://api.bolagsverket.se/v1/company/{orgNumber}
  // Will require OAuth2 authentication
  
  const BOLAGSVERKET_API_KEY = Deno.env.get('BOLAGSVERKET_API_KEY');
  const BOLAGSVERKET_CLIENT_ID = Deno.env.get('BOLAGSVERKET_CLIENT_ID');
  
  if (!BOLAGSVERKET_API_KEY || !BOLAGSVERKET_CLIENT_ID) {
    console.log('Bolagsverket API not yet configured (expected Fall 2025)');
    return null;
  }

  // Placeholder for future implementation
  try {
    // const response = await fetch(
    //   `https://api.bolagsverket.se/v1/company/${orgNumber}`,
    //   {
    //     headers: {
    //       'Authorization': `Bearer ${BOLAGSVERKET_API_KEY}`,
    //       'X-Client-ID': BOLAGSVERKET_CLIENT_ID,
    //     },
    //   }
    // );
    // ...process response...
    return null;
  } catch (error) {
    console.error('Bolagsverket API error:', error);
    return null;
  }
}

// Skatteverket open data for basic company info
async function fetchFromSkatteverket(orgNumber: string): Promise<Partial<CompanyDetails> | null> {
  try {
    const response = await fetch(
      `https://www.skatteverket.se/foretagochorganisationer/myndigheter/stodforutvecklingavetjanster/oppnadata/sokorganisationsnummer.4.5b47dbe31595fec79c29b90.html?orgnr=${orgNumber}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (response.ok) {
      const text = await response.text();
      // Parse if JSON, otherwise try to extract from HTML
      try {
        const data = JSON.parse(text);
        return {
          name: data.name,
          org_number: orgNumber,
          address: data.address,
        };
      } catch {
        // Not JSON, skip
      }
    }
  } catch (error) {
    console.error('Skatteverket lookup error:', error);
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { org_number } = await req.json();
    
    if (!org_number) {
      return new Response(
        JSON.stringify({ error: 'Organisationsnummer krävs' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean org number
    const cleanOrgNumber = org_number.replace(/\D/g, '');
    console.log(`Fetching company details for: ${cleanOrgNumber}`);

    // Priority 1: Roaring API (best quality, paid)
    let result = await fetchFromRoaring(cleanOrgNumber);
    if (result && result.representatives.length > 0) {
      console.log('Got full data from Roaring API');
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Priority 2: Bolagsverket API (future, Fall 2025)
    result = await fetchFromBolagsverket(cleanOrgNumber);
    if (result && result.representatives.length > 0) {
      console.log('Got full data from Bolagsverket API');
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Priority 3: Firecrawl + AI extraction
    const scraped = await scrapeWithFirecrawl(cleanOrgNumber);
    if (scraped) {
      const aiData = await extractWithAI(scraped.content, cleanOrgNumber);
      
      if (aiData) {
        const missingData: string[] = [];
        if (!aiData.representatives?.length) missingData.push('styrelse');
        if (!aiData.beneficial_owners?.length) missingData.push('verkliga_huvudmän');
        if (!aiData.address) missingData.push('adress');
        
        result = {
          name: aiData.name || '',
          org_number: cleanOrgNumber,
          address: aiData.address,
          postal_code: aiData.postal_code,
          city: aiData.city,
          business_description: aiData.business_description,
          registration_date: aiData.registration_date,
          company_type: aiData.company_type,
          representatives: aiData.representatives || [],
          beneficial_owners: aiData.beneficial_owners || [],
          dataSource: `firecrawl+ai (${scraped.url})`,
          dataCompleteness: missingData.length === 0 ? 'full' : missingData.length <= 1 ? 'partial' : 'basic',
          missingData,
          scrapedAt: new Date().toISOString(),
        };

        console.log(`Got ${result.dataCompleteness} data from Firecrawl+AI`);
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Priority 4: Skatteverket basic data
    const skatteverketData = await fetchFromSkatteverket(cleanOrgNumber);
    
    result = {
      name: skatteverketData?.name || '',
      org_number: cleanOrgNumber,
      address: skatteverketData?.address,
      representatives: [],
      beneficial_owners: [],
      dataSource: 'skatteverket',
      dataCompleteness: 'basic',
      missingData: ['styrelse', 'verkliga_huvudmän', 'fullständig_adress'],
    };

    console.log('Returning basic data, manual entry required');
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching company details:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Kunde inte hämta företagsuppgifter',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
