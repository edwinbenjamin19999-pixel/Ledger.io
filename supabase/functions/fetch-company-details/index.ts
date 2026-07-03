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
  type: 'direct' | 'indirect';
}

interface CompanyDetails {
  name: string;
  orgNumber: string;
  address?: string;
  city?: string;
  postalCode?: string;
  vatNumber?: string;
  status?: string;
  representatives: Representative[];
  beneficialOwners: BeneficialOwner[];
  source: 'roaring' | 'opencorporates' | 'scraping' | 'manual';
  dataCompleteness: 'full' | 'partial' | 'basic';
  missingData?: string[];
}

// Roaring API integration (premium - requires API key)
async function fetchFromRoaring(orgNumber: string): Promise<CompanyDetails | null> {
  const roaringApiKey = Deno.env.get('ROARING_API_KEY');
  
  if (!roaringApiKey) {
    console.log('[COMPANY-DETAILS] Roaring API key not configured, skipping');
    return null;
  }

  try {
    console.log('[COMPANY-DETAILS] Fetching from Roaring API...');
    
    const response = await fetch(
      `https://api.roaring.io/se/company/extended/${orgNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${roaringApiKey}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.log('[COMPANY-DETAILS] Roaring API error:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('[COMPANY-DETAILS] Roaring data received');

    const representatives: Representative[] = [];
    const beneficialOwners: BeneficialOwner[] = [];

    if (data.boardMembers) {
      for (const member of data.boardMembers) {
        representatives.push({
          name: member.name || `${member.firstName} ${member.lastName}`,
          role: member.role || 'Styrelseledamot',
          personalNumber: member.personalNumber,
        });
      }
    }

    if (data.signatories) {
      for (const signatory of data.signatories) {
        if (!representatives.find(r => r.name === signatory.name)) {
          representatives.push({
            name: signatory.name,
            role: 'Firmatecknare',
            personalNumber: signatory.personalNumber,
          });
        }
      }
    }

    if (data.beneficialOwners) {
      for (const owner of data.beneficialOwners) {
        beneficialOwners.push({
          name: owner.name,
          ownership_percentage: owner.ownershipPercentage,
          type: owner.isDirect ? 'direct' : 'indirect',
        });
      }
    }

    return {
      name: data.companyName,
      orgNumber: orgNumber,
      address: data.address?.streetAddress,
      city: data.address?.city,
      postalCode: data.address?.postalCode,
      vatNumber: `SE${orgNumber}01`,
      status: data.status || 'active',
      representatives,
      beneficialOwners,
      source: 'roaring',
      dataCompleteness: 'full',
    };
  } catch (error) {
    console.error('[COMPANY-DETAILS] Roaring API error:', error);
    return null;
  }
}

// OpenCorporates API (free tier - open data)
async function fetchFromOpenCorporates(orgNumber: string): Promise<CompanyDetails | null> {
  try {
    console.log('[COMPANY-DETAILS] Fetching from OpenCorporates...');
    
    // Format Swedish org number for OpenCorporates (SE jurisdiction)
    const cleanOrgNr = orgNumber.replace(/\D/g, '');
    
    // OpenCorporates uses jurisdiction_code/company_number format
    const response = await fetch(
      `https://api.opencorporates.com/v0.4/companies/se/${cleanOrgNr}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.log('[COMPANY-DETAILS] OpenCorporates not found or error:', response.status);
      return null;
    }

    const data = await response.json();
    const company = data.results?.company;
    
    if (!company) {
      console.log('[COMPANY-DETAILS] OpenCorporates: No company data');
      return null;
    }

    console.log('[COMPANY-DETAILS] OpenCorporates data received:', company.name);

    const representatives: Representative[] = [];
    const beneficialOwners: BeneficialOwner[] = [];

    // OpenCorporates provides officers (board members, directors)
    if (company.officers) {
      for (const officer of company.officers) {
        const officerData = officer.officer;
        if (officerData) {
          representatives.push({
            name: officerData.name,
            role: officerData.position || 'Styrelseledamot',
          });
        }
      }
    }

    // Check for additional data via officers endpoint
    if (company.officers_url) {
      try {
        const officersResponse = await fetch(company.officers_url, {
          headers: { 'Accept': 'application/json' },
        });
        
        if (officersResponse.ok) {
          const officersData = await officersResponse.json();
          const officers = officersData.results?.officers || [];
          
          for (const officer of officers) {
            const officerData = officer.officer;
            if (officerData && !representatives.find(r => r.name === officerData.name)) {
              representatives.push({
                name: officerData.name,
                role: officerData.position || translateRole(officerData.occupation) || 'Styrelseledamot',
              });
            }
          }
          console.log('[COMPANY-DETAILS] OpenCorporates officers:', representatives.length);
        }
      } catch (e) {
        console.log('[COMPANY-DETAILS] Could not fetch officers details');
      }
    }

    // Parse address
    const regAddress = company.registered_address;
    
    return {
      name: company.name,
      orgNumber: cleanOrgNr,
      address: regAddress?.street_address || '',
      city: regAddress?.locality || '',
      postalCode: regAddress?.postal_code || '',
      vatNumber: `SE${cleanOrgNr}01`,
      status: company.current_status || 'active',
      representatives,
      beneficialOwners, // OpenCorporates free tier doesn't include UBOs
      source: 'opencorporates',
      dataCompleteness: representatives.length > 0 ? 'partial' : 'basic',
      missingData: ['beneficial_owners'],
    };
  } catch (error) {
    console.error('[COMPANY-DETAILS] OpenCorporates error:', error);
    return null;
  }
}

// Translate English roles to Swedish
function translateRole(role: string): string {
  const translations: Record<string, string> = {
    'director': 'Styrelseledamot',
    'chairman': 'Ordförande',
    'ceo': 'VD',
    'chief executive officer': 'VD',
    'board member': 'Styrelseledamot',
    'secretary': 'Sekreterare',
    'treasurer': 'Kassör',
    'auditor': 'Revisor',
    'deputy': 'Suppleant',
    'alternate': 'Suppleant',
  };
  
  const lowerRole = (role || '').toLowerCase();
  return translations[lowerRole] || role;
}

// Scraping fallback using public Swedish data sources
async function fetchFromScraping(orgNumber: string): Promise<CompanyDetails | null> {
  const representatives: Representative[] = [];
  const beneficialOwners: BeneficialOwner[] = [];
  let companyName = '';
  let address = '';
  let city = '';
  let postalCode = '';

  const cleanOrgNr = orgNumber.replace(/\D/g, '');

  // Try Allabolag first
  try {
    console.log('[COMPANY-DETAILS] Trying Allabolag scraping...');
    
    const allabolagUrl = `https://www.allabolag.se/${cleanOrgNr}`;
    const response = await fetch(allabolagUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
      },
    });

    if (response.ok) {
      const html = await response.text();
      
      // Extract company name - multiple patterns
      let nameMatch = html.match(/<h1[^>]*class="[^"]*heading[^"]*"[^>]*>([^<]+)<\/h1>/i);
      if (!nameMatch) {
        nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
      }
      if (nameMatch) {
        companyName = nameMatch[1].trim().replace(/\s+/g, ' ');
      }

      // Extract address from structured data
      const addressMatch = html.match(/itemprop="streetAddress"[^>]*>([^<]+)</i);
      if (addressMatch) {
        address = addressMatch[1].trim();
      }

      const cityMatch = html.match(/itemprop="addressLocality"[^>]*>([^<]+)</i);
      if (cityMatch) {
        city = cityMatch[1].trim();
      }

      const postalMatch = html.match(/itemprop="postalCode"[^>]*>([^<]+)</i);
      if (postalMatch) {
        postalCode = postalMatch[1].trim();
      }

      // Extract board members - look for person cards/lists
      // Pattern 1: Person cards with name and role
      const personCardPattern = /<div[^>]*class="[^"]*person[^"]*"[^>]*>[\s\S]*?<[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<[\s\S]*?<[^>]*class="[^"]*role[^"]*"[^>]*>([^<]+)</gi;
      let personMatches = html.matchAll(personCardPattern);
      for (const match of personMatches) {
        const name = match[1].trim();
        const role = match[2].trim();
        if (name && name.length > 2 && !representatives.find(r => r.name === name)) {
          representatives.push({ name, role });
        }
      }

      // Pattern 2: Table rows with name and position
      const tableRowPattern = /<tr[^>]*>[\s\S]*?<td[^>]*>([A-ZÅÄÖ][a-zåäö]+(?:\s+[A-ZÅÄÖ][a-zåäö]+)+)<\/td>[\s\S]*?<td[^>]*>((?:Styrelseledamot|Ordförande|VD|Suppleant|Revisor)[^<]*)<\/td>/gi;
      let tableMatches = html.matchAll(tableRowPattern);
      for (const match of tableMatches) {
        const name = match[1].trim();
        const role = match[2].trim();
        if (name && !representatives.find(r => r.name === name)) {
          representatives.push({ name, role });
        }
      }

      // Pattern 3: JSON-LD structured data
      const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
      if (jsonLdMatch) {
        try {
          const jsonLd = JSON.parse(jsonLdMatch[1]);
          if (jsonLd.employee) {
            const employees = Array.isArray(jsonLd.employee) ? jsonLd.employee : [jsonLd.employee];
            for (const emp of employees) {
              if (emp.name && !representatives.find(r => r.name === emp.name)) {
                representatives.push({
                  name: emp.name,
                  role: emp.jobTitle || 'Anställd',
                });
              }
            }
          }
        } catch (e) {
          // JSON parse error, continue
        }
      }

      console.log('[COMPANY-DETAILS] Allabolag: Found', representatives.length, 'representatives');
    }
  } catch (error) {
    console.error('[COMPANY-DETAILS] Allabolag scraping error:', error);
  }

  // Try Proff.se as additional source
  try {
    console.log('[COMPANY-DETAILS] Trying Proff.se...');
    
    // Proff uses a different URL structure
    const proffUrl = `https://www.proff.se/foretag/${cleanOrgNr}`;
    const response = await fetch(proffUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (response.ok) {
      const html = await response.text();
      
      // Extract company name if not found
      if (!companyName) {
        const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
        if (nameMatch) {
          companyName = nameMatch[1].trim();
        }
      }

      // Look for roles/positions - Proff.se patterns
      const rolePatterns = [
        /<div[^>]*class="[^"]*role[^"]*"[^>]*>[\s\S]*?([A-ZÅÄÖ][a-zåäö]+(?:\s+[A-ZÅÄÖ][a-zåäö]+)+)[\s\S]*?<[^>]*>([^<]*(?:Styrelseledamot|Ordförande|VD|Suppleant|Revisor|CEO|Chairman)[^<]*)</gi,
        /<span[^>]*data-role="([^"]+)"[^>]*>[\s\S]*?<span[^>]*data-name="([^"]+)"/gi,
      ];

      for (const pattern of rolePatterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          const name = match[1]?.trim() || match[2]?.trim();
          const role = match[2]?.trim() || match[1]?.trim();
          
          if (name && name.length > 2 && !representatives.find(r => r.name === name)) {
            representatives.push({ name, role: translateRole(role) });
          }
        }
      }

      console.log('[COMPANY-DETAILS] Proff.se: Total representatives now', representatives.length);
    }
  } catch (error) {
    console.error('[COMPANY-DETAILS] Proff.se scraping error:', error);
  }

  // Try Skatteverket/Bolagsverket open data for basic info
  try {
    if (!companyName) {
      console.log('[COMPANY-DETAILS] Trying Skatteverket open data...');
      
      const scbResponse = await fetch(
        `https://skatteverket.entryscape.net/rowstore/dataset/b4de7df7-63c0-4e7e-bb59-1f156a591763/json?organisationsnummer=${cleanOrgNr}`,
        {
          headers: { 'Accept': 'application/json' },
        }
      );

      if (scbResponse.ok) {
        const scbData = await scbResponse.json();
        if (scbData?.results?.length > 0) {
          const company = scbData.results[0];
          companyName = company.organisationsnamn || company.namn || '';
          address = address || company.gatuadress || '';
          city = city || company.postort || '';
          postalCode = postalCode || company.postnummer || '';
        }
      }
    }
  } catch (error) {
    console.error('[COMPANY-DETAILS] Skatteverket API error:', error);
  }

  if (!companyName) {
    console.log('[COMPANY-DETAILS] Could not find company data');
    return null;
  }

  // Determine data completeness
  const missingData: string[] = [];
  if (representatives.length === 0) missingData.push('representatives');
  if (beneficialOwners.length === 0) missingData.push('beneficial_owners');
  
  let dataCompleteness: 'full' | 'partial' | 'basic' = 'basic';
  if (representatives.length > 0 && beneficialOwners.length > 0) {
    dataCompleteness = 'full';
  } else if (representatives.length > 0 || beneficialOwners.length > 0) {
    dataCompleteness = 'partial';
  }

  return {
    name: companyName,
    orgNumber: cleanOrgNr,
    address,
    city,
    postalCode,
    vatNumber: `SE${cleanOrgNr}01`,
    status: 'active',
    representatives,
    beneficialOwners,
    source: 'scraping',
    dataCompleteness,
    missingData: missingData.length > 0 ? missingData : undefined,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { org_number } = await req.json();

    if (!org_number) {
      return new Response(
        JSON.stringify({ success: false, error: 'Organisationsnummer krävs' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanOrgNr = org_number.replace(/\D/g, '');
    console.log('[COMPANY-DETAILS] Looking up:', cleanOrgNr);

    // Priority order: Roaring (paid) > OpenCorporates (free) > Scraping (fallback)
    let companyDetails = await fetchFromRoaring(cleanOrgNr);

    if (!companyDetails) {
      companyDetails = await fetchFromOpenCorporates(cleanOrgNr);
    }

    // Always try scraping to supplement data if we have incomplete data
    if (!companyDetails || companyDetails.dataCompleteness !== 'full') {
      const scrapedData = await fetchFromScraping(cleanOrgNr);
      
      if (scrapedData) {
        if (!companyDetails) {
          companyDetails = scrapedData;
        } else {
          // Merge scraped data with existing
          if (scrapedData.representatives.length > companyDetails.representatives.length) {
            companyDetails.representatives = scrapedData.representatives;
          }
          if (scrapedData.beneficialOwners.length > companyDetails.beneficialOwners.length) {
            companyDetails.beneficialOwners = scrapedData.beneficialOwners;
          }
          if (!companyDetails.address && scrapedData.address) {
            companyDetails.address = scrapedData.address;
            companyDetails.city = scrapedData.city;
            companyDetails.postalCode = scrapedData.postalCode;
          }
          
          // Update completeness
          const hasReps = companyDetails.representatives.length > 0;
          const hasUbos = companyDetails.beneficialOwners.length > 0;
          companyDetails.dataCompleteness = hasReps && hasUbos ? 'full' : hasReps || hasUbos ? 'partial' : 'basic';
          
          const missingData: string[] = [];
          if (!hasReps) missingData.push('representatives');
          if (!hasUbos) missingData.push('beneficial_owners');
          companyDetails.missingData = missingData.length > 0 ? missingData : undefined;
        }
      }
    }

    if (!companyDetails) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Kunde inte hitta företagsuppgifter',
          requiresManualEntry: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[COMPANY-DETAILS] Result:', {
      name: companyDetails.name,
      representatives: companyDetails.representatives.length,
      beneficialOwners: companyDetails.beneficialOwners.length,
      source: companyDetails.source,
      dataCompleteness: companyDetails.dataCompleteness,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: companyDetails,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[COMPANY-DETAILS] Error:', errorMessage);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
