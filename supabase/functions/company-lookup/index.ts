import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const orgNumber = body.org_number || body.orgNumber
    
    console.log('Received request for org number:', orgNumber);
    
    if (!orgNumber) {
      throw new Error('Organisationsnummer krävs')
    }

    const cleanOrgNr = orgNumber.replace(/[\s-]/g, '')
    console.log('Cleaned org number:', cleanOrgNr);

    if (!/^\d{10}$/.test(cleanOrgNr)) {
      throw new Error('Ogiltigt format på organisationsnummer. Använd 10 siffror.');
    }

    const formattedOrgNr = `${cleanOrgNr.slice(0, 6)}-${cleanOrgNr.slice(6)}`;

    // Helper to return success response
    const successResponse = (data: Record<string, unknown>) =>
      new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    // ── 1. Bolagsverket API (OAuth2) ──
    const bvClientId = Deno.env.get('BOLAGSVERKET_CLIENT_ID');
    const bvClientSecret = Deno.env.get('BOLAGSVERKET_CLIENT_SECRET');

    if (bvClientId && bvClientSecret) {
      try {
        console.log('Trying Bolagsverket API for:', cleanOrgNr);
        const tokenRes = await fetch('https://portal.api.bolagsverket.se/oauth2/token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${bvClientId}:${bvClientSecret}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'NorthLedger/1.0',
            'Accept': 'application/json',
          },
          body: 'grant_type=client_credentials&scope=vardefulla-datamangder:read',
        });

        if (tokenRes.ok) {
          const { access_token } = await tokenRes.json();
          const compRes = await fetch(
            'https://gw.api.bolagsverket.se/vardefulla-datamangder/v1/organisationer',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ identitetsbeteckning: cleanOrgNr }),
            }
          );
          if (compRes.ok) {
            const d = await compRes.json();
            const orgs = d?.organisationer;
            if (orgs && orgs.length > 0) {
              const org = orgs[0];
              // Extract name
              let name = '';
              const namnData = org.organisationsnamn;
              if (namnData?.organisationsnamnLista) {
                for (const nameObj of namnData.organisationsnamnLista) {
                  const n = nameObj.namn || '';
                  const type = nameObj.organisationsnamntyp?.kod || 'FORETAGSNAMN';
                  if (!name || type === 'FORETAGSNAMN') name = n;
                }
              }
              if (name) {
                console.log('Found via Bolagsverket:', name);
                // Registrerad postadress
                const addr = org.postadressOrganisation?.postadress;

                // SNI codes → industry description
                const sniCodes: { code: string; description: string }[] = [];
                const sniData = org.naringsgrenOrganisation?.sni;
                if (Array.isArray(sniData)) {
                  for (const s of sniData) {
                    const code = (s.kod || '').trim();
                    if (code) sniCodes.push({ code, description: s.klartext || '' });
                  }
                }

                // Business description
                let businessDescription = '';
                if (org.verksamhetsbeskrivning?.beskrivning) {
                  businessDescription = org.verksamhetsbeskrivning.beskrivning;
                }
                // Also check name entries for verksamhetsbeskrivning
                if (!businessDescription && namnData?.organisationsnamnLista) {
                  for (const nameObj of namnData.organisationsnamnLista) {
                    if (nameObj.verksamhetsbeskrivningSarskiltForetagsnamn) {
                      businessDescription = nameObj.verksamhetsbeskrivningSarskiltForetagsnamn;
                      break;
                    }
                  }
                }

                // Organization form
                const orgForm = org.organisationsform
                  ? `${org.organisationsform.klartext || ''} (${org.organisationsform.kod || ''})`
                  : null;

                // Legal form
                const legalForm = org.juridiskForm
                  ? { code: org.juridiskForm.kod || '', description: org.juridiskForm.klartext || '' }
                  : null;

                // Organization form (structured)
                const organizationForm = org.organisationsform
                  ? { code: org.organisationsform.kod || '', description: org.organisationsform.klartext || '' }
                  : null;

                // Map organisationsform.kod → companies.company_type
                let companyType: string | null = null;
                const ofCode = org.organisationsform?.kod || '';
                if (ofCode) {
                  // Common Bolagsverket codes: AB=AB, HB=HB, KB=KB, EF=EF/EnskildFirma, EK=EkonomiskFörening
                  if (/^AB/i.test(ofCode)) companyType = 'AB';
                  else if (/^HB/i.test(ofCode)) companyType = 'HB';
                  else if (/^KB/i.test(ofCode)) companyType = 'KB';
                  else if (/^EF|ENSKILD/i.test(ofCode)) companyType = 'EF';
                  else if (/^EK/i.test(ofCode)) companyType = 'EK';
                  else companyType = ofCode;
                }

                const isDeregistered = !!org.avregistreradOrganisation;
                const isActive = org.verksamOrganisation?.kod === 'JA' && !isDeregistered;
                const registrationDate = org.organisationsdatum?.registreringsdatum || null;

                const allNames: { name: string; type: string }[] = [];
                if (namnData?.organisationsnamnLista) {
                  for (const nameObj of namnData.organisationsnamnLista) {
                    allNames.push({
                      name: nameObj.namn || '',
                      type: nameObj.organisationsnamntyp?.kod || 'FORETAGSNAMN',
                    });
                  }
                }

                return successResponse({
                  name,
                  orgNumber: cleanOrgNr,
                  address: addr?.utdelningsadress || addr?.gatuadress || null,
                  city: addr?.postort || null,
                  postalCode: addr?.postnummer || null,
                  vatNumber: `SE${cleanOrgNr}01`,
                  status: isDeregistered ? 'inactive' : 'active',
                  isActive,
                  isDeregistered,
                  source: 'bolagsverket',
                  requiresManualEntry: false,
                  sniCodes,
                  businessDescription: businessDescription || null,
                  organizationForm,
                  organizationFormLabel: orgForm,
                  legalForm,
                  companyType,
                  registrationDate,
                  allNames,
                  rawBolagsverket: org,
                });
              }
            }
          } else { console.log('Bolagsverket company:', compRes.status); }
        } else { console.log('Bolagsverket token:', tokenRes.status); }
      } catch (e) { console.log('Bolagsverket error:', e); }
    }

    // Bolagsverket är primär källa. När det är nere returnerar vi manuell entry
    // istället för att gissa via scrapers — annars riskerar vi att visa fel företagsnamn.
    console.log('Bolagsverket unavailable — returning manual entry fallback for:', cleanOrgNr);
    return successResponse({
      orgNumber: cleanOrgNr,
      name: null,
      address: null,
      city: null,
      postalCode: null,
      vatNumber: `SE${cleanOrgNr}01`,
      requiresManualEntry: true,
      source: 'manual',
      bolagsverketUnavailable: true,
      message: 'Bolagsverket är tillfälligt otillgängligt. Fyll i företagsnamn manuellt så verifierar vi det när tjänsten är uppe igen.',
    });

    // ── (inaktiverat) Firecrawl fallback ──
    // Behålls som död kod nedan ifall vi i framtiden vill aktivera explicit verifierad scraping.
    // ── 2. Firecrawl (handles Cloudflare + JS rendering) ──
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (firecrawlKey) {
      try {
        const urls = [
          `https://www.allabolag.se/${cleanOrgNr}`,
          `https://www.allabolag.se/${formattedOrgNr}`,
        ];
        
        for (const url of urls) {
          console.log('Trying Firecrawl:', url);
          const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${firecrawlKey}` },
            body: JSON.stringify({ url, formats: ['markdown'] }),
          });

          if (res.ok) {
            const data = await res.json();
            const md = data?.data?.markdown || '';
            const metaTitle = data?.data?.metadata?.title || '';
            const metaOgTitle = data?.data?.metadata?.ogTitle || data?.data?.metadata?.['og:title'] || '';
            console.log('Firecrawl md:', md.length, 'chars, title:', metaTitle.substring(0, 80));
            
            if (md.length < 500 || md.includes('Å nej!') || md.includes('hittade inte')) {
              console.log('Firecrawl: page too short or error page, trying next URL');
              continue;
            }

            // Extract company name from metadata title (most reliable)
            // Title format: "LMQ Invest AB - Org.nr 559105-3235 - Stockholm - ..."
            let companyName: string | null = null;
            const sourceTitle = metaTitle || metaOgTitle;
            if (sourceTitle && sourceTitle.includes('Org.nr')) {
              companyName = sourceTitle.split(' - Org.nr')[0]?.trim() || null;
            }
            
            // Fallback: try markdown H1
            if (!companyName) {
              const h1Match = md.match(/^#\s+([^\n]+)/);
              if (h1Match) {
                companyName = h1Match[1].trim()
                  .replace(/\s*-\s*Företagsinformation.*$/i, '').trim()
                  .replace(/\s*\|.*$/, '').trim()
                  .replace(/\s*-\s*Org\.nr.*$/i, '').trim();
              }
            }

            if (companyName && (companyName as string).length > 2 && (companyName as string).length < 200) {
              console.log('Found via Firecrawl:', companyName);
              const cityMatch = sourceTitle.match(/Org\.nr\s+[\d-]+\s+-\s+([A-ZÅÄÖ][a-zåäö]+)/);
              return successResponse({
                name: companyName, orgNumber: cleanOrgNr,
                address: null, city: cityMatch?.[1] || null, postalCode: null,
                vatNumber: `SE${cleanOrgNr}01`, status: 'active',
                source: 'firecrawl', requiresManualEntry: false,
              });
            }
          } else {
            const err = await res.text();
            console.log('Firecrawl failed:', res.status, err.substring(0, 200));
          }
        }
      } catch (e) { console.log('Firecrawl error:', e); }
    }

    // ── 3. Direct allabolag.se HTML (works when not blocked by Cloudflare) ──
    for (const path of [cleanOrgNr, formattedOrgNr]) {
      try {
        console.log('Trying allabolag.se direct:', path);
        const res = await fetch(`https://www.allabolag.se/${path}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'sv-SE,sv;q=0.9',
          },
          redirect: 'follow',
        });
        
        if (res.ok) {
          const html = await res.text();
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch) {
            const title = titleMatch![1];
            if (!title.includes('Å nej') && !title.includes('hittade inte') && !title.includes('Sök företag') && title.includes('Org.nr')) {
              const nameFromTitle = title.split(' - Org.nr')[0]?.trim();
              if (nameFromTitle && nameFromTitle.length > 1) {
                const cityMatch = title.match(/Org\.nr\s+[\d-]+\s+-\s+([A-ZÅÄÖ][a-zåäö]+)/);
                console.log('Found via allabolag.se:', nameFromTitle);
                return successResponse({
                  name: nameFromTitle, orgNumber: cleanOrgNr,
                  address: null, city: cityMatch?.[1] || null, postalCode: null,
                  vatNumber: `SE${cleanOrgNr}01`, status: 'active',
                  source: 'allabolag', requiresManualEntry: false,
                });
              }
            }
          }
        } else {
          console.log('allabolag.se response:', res.status);
        }
      } catch (e) { console.log('allabolag.se error:', e); }
    }

    // ── Final fallback ──
    console.log('Manual entry fallback for:', cleanOrgNr);
    return successResponse({
      orgNumber: cleanOrgNr, name: null, address: null, city: null, postalCode: null,
      vatNumber: `SE${cleanOrgNr}01`, requiresManualEntry: true,
      message: 'Kunde inte hitta företaget automatiskt. Fyll i företagsnamn manuellt.',
    });

  } catch (error) {
    console.error('Error in company lookup:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Ett fel uppstod vid företagsuppslag',
        requiresManualEntry: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
})
