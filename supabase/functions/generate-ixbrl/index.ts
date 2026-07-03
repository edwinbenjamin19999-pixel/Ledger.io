import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

// Comprehensive BAS → XBRL taxonomy mapping
const XBRL_TAXONOMY_MAP: Record<string, string> = {
  // Assets - Immateriella anläggningstillgångar
  '1010': 'se-gen-base:BalanseradeUtgifterUtvecklingsarbeten',
  '1020': 'se-gen-base:KoncessionerPatentLicenser',
  '1030': 'se-gen-base:Hyresratter',
  '1050': 'se-gen-base:Goodwill',
  '1070': 'se-gen-base:PagaendeUtvecklingsarbeten',
  // Assets - Materiella anläggningstillgångar
  '1110': 'se-gen-base:ByggnaderMark',
  '1120': 'se-gen-base:MaskinerAndraTekniskaAnlaggningar',
  '1130': 'se-gen-base:InventarierVerktygInstallationer',
  '1150': 'se-gen-base:OverigaMateriellaAnlaggningstillgangar',
  '1180': 'se-gen-base:PagaendeNyanlaggningarForskott',
  // Assets - Finansiella anläggningstillgångar
  '1310': 'se-gen-base:AndelarKoncernforetag',
  '1320': 'se-gen-base:FordringarKoncernforetag',
  '1330': 'se-gen-base:AndelarIntresseforetag',
  '1350': 'se-gen-base:AndraLangfristigaVardepappersinnehav',
  '1380': 'se-gen-base:AndraLangfristigaFordringar',
  // Assets - Omsättningstillgångar
  '1410': 'se-gen-base:RavarorFornodenheter',
  '1440': 'se-gen-base:VarorUnderTillverkning',
  '1460': 'se-gen-base:FardigaVarorHandelsvaror',
  '1470': 'se-gen-base:PagaendeArbeteAnnanRakning',
  '1510': 'se-gen-base:KundfordringarKort',
  '1560': 'se-gen-base:FordringarKoncernforetagKort',
  '1580': 'se-gen-base:OvrigaFordringarKort',
  '1610': 'se-gen-base:OvrigaFordringarKort',
  '1630': 'se-gen-base:Skattefordringar',
  '1710': 'se-gen-base:ForutbetaldaKostnaderUpplupnaIntakter',
  '1810': 'se-gen-base:KortfristigaPlaceringar',
  '1910': 'se-gen-base:KassaBank',
  '1920': 'se-gen-base:KassaBank',
  '1930': 'se-gen-base:KassaBank',
  '1940': 'se-gen-base:KassaBank',
  '1950': 'se-gen-base:KassaBank',
  // Equity
  '2010': 'se-gen-base:Aktiekapital',
  '2020': 'se-gen-base:Overkursfond',
  '2030': 'se-gen-base:Uppskrivningsfond',
  '2050': 'se-gen-base:ReservfondBundet',
  '2060': 'se-gen-base:BalanseratResultat',
  '2070': 'se-gen-base:BalanseratResultat',
  '2080': 'se-gen-base:FondUtvecklingsutgifter',
  '2090': 'se-gen-base:AretsResultat',
  '2099': 'se-gen-base:AretsResultat',
  // Provisions
  '2210': 'se-gen-base:Avsattningar',
  '2220': 'se-gen-base:AvsattningarPensioner',
  '2250': 'se-gen-base:OvrigaAvsattningar',
  // Liabilities - Long-term
  '2310': 'se-gen-base:Obligationslan',
  '2330': 'se-gen-base:SkulderKreditinstitut',
  '2340': 'se-gen-base:SkulderKreditinstitutLang',
  '2350': 'se-gen-base:LangfristigaSkulder',
  '2360': 'se-gen-base:SkulderKoncernforetagLang',
  // Liabilities - Short-term
  '2410': 'se-gen-base:SkulderKreditinstitutKort',
  '2420': 'se-gen-base:ForskottFranKunder',
  '2440': 'se-gen-base:Leverantorsskulder',
  '2510': 'se-gen-base:Skatteskulder',
  '2610': 'se-gen-base:OutputVAT',
  '2710': 'se-gen-base:OvrigaKortfristigaSkulder',
  '2730': 'se-gen-base:OvrigaKortfristigaSkulder',
  '2790': 'se-gen-base:OvrigaKortfristigaSkulder',
  '2910': 'se-gen-base:UpplupnaKostnaderForutbetaldaIntakter',
  '2920': 'se-gen-base:UpplupnaKostnaderForutbetaldaIntakter',
  // Revenue
  '3010': 'se-gen-base:Nettoomsattning',
  '3040': 'se-gen-base:Nettoomsattning',
  '3050': 'se-gen-base:Nettoomsattning',
  '3100': 'se-gen-base:Nettoomsattning',
  '3200': 'se-gen-base:Nettoomsattning',
  '3300': 'se-gen-base:Nettoomsattning',
  '3400': 'se-gen-base:Nettoomsattning',
  '3500': 'se-gen-base:Nettoomsattning',
  '3600': 'se-gen-base:OvrigaRorelseintakter',
  '3700': 'se-gen-base:OvrigaRorelseintakter',
  '3900': 'se-gen-base:OvrigaRorelseintakter',
  // Cost of goods sold
  '4010': 'se-gen-base:HandelsvarorKostnad',
  '4100': 'se-gen-base:RamaterialKostnad',
  '4500': 'se-gen-base:OvrigaExternaKostnader',
  '4990': 'se-gen-base:HandelsvarorKostnad',
  // Operating expenses
  '5010': 'se-gen-base:LokalkostnaderKostnad',
  '5090': 'se-gen-base:LokalkostnaderKostnad',
  '5100': 'se-gen-base:FastighetskostnaderKostnad',
  '5200': 'se-gen-base:HyrdTransportmedel',
  '5400': 'se-gen-base:ForbrukningsinventarierKostnad',
  '5500': 'se-gen-base:ReparationUnderhall',
  '5600': 'se-gen-base:Transportkostnader',
  '5700': 'se-gen-base:Resekostnader',
  '5800': 'se-gen-base:Resekostnader',
  '5900': 'se-gen-base:ReklamPR',
  '6010': 'se-gen-base:OvrigaExternaKostnader',
  '6100': 'se-gen-base:KontorsmaterielTrycksaker',
  '6200': 'se-gen-base:TeleKommunikation',
  '6300': 'se-gen-base:ForsakringskostnaderKostnad',
  '6400': 'se-gen-base:ForvaltningskostnaderKostnad',
  '6500': 'se-gen-base:OvrigaExternaKostnader',
  '6800': 'se-gen-base:InkopsOmkostnader',
  '6990': 'se-gen-base:OvrigaExternaKostnader',
  // Personnel costs
  '7010': 'se-gen-base:LonerAndraErsattningar',
  '7090': 'se-gen-base:LonerAndraErsattningar',
  '7200': 'se-gen-base:LonerAndraErsattningar',
  '7300': 'se-gen-base:LonerAndraErsattningar',
  '7400': 'se-gen-base:Pensionskostnader',
  '7510': 'se-gen-base:SocialaAvgifter',
  '7520': 'se-gen-base:SocialaAvgifter',
  '7530': 'se-gen-base:SocialaAvgifter',
  '7570': 'se-gen-base:OvrigaPersonalkostnader',
  '7600': 'se-gen-base:OvrigaPersonalkostnader',
  '7690': 'se-gen-base:OvrigaPersonalkostnader',
  '7810': 'se-gen-base:AvskrivningarMateriellaAnlaggningstillgangar',
  '7820': 'se-gen-base:AvskrivningarImmateriella',
  '7830': 'se-gen-base:NedskrivningarAnlaggningstillgangar',
  '7970': 'se-gen-base:ForandringLagerPagaende',
  // Financial items
  '8010': 'se-gen-base:ResultatAndelarKoncernforetag',
  '8100': 'se-gen-base:OvrigaFinansiellaIntakter',
  '8310': 'se-gen-base:RanteintakterLiknande',
  '8410': 'se-gen-base:RantekostnaderLiknande',
  '8500': 'se-gen-base:OvrigaFinansiellaKostnader',
  '8800': 'se-gen-base:BokslutsdispositionerKostnad',
  '8910': 'se-gen-base:SkattPaAretsResultat',
  '8990': 'se-gen-base:OvrigaSkatter',
};

// XBRL note category → taxonomy tag mapping
const NOTE_XBRL_TAGS: Record<string, { textTag: string; numericTags?: Record<string, string> }> = {
  accounting_principles: {
    textTag: 'se-gen-base:Redovisningsprinciper',
  },
  balance_sheet: {
    textTag: 'se-gen-base:NotAnlaggningstillgangar',
    numericTags: {
      acquisition_cost: 'se-gen-base:AnlaggningstillgangarAnskaffningsvarde',
      accumulated_depreciation: 'se-gen-base:AnlaggningstillgangarAckAvskrivningar',
      book_value: 'se-gen-base:AnlaggningstillgangarRedovisatVarde',
    },
  },
  income_statement: {
    textTag: 'se-gen-base:NotResultatrakning',
  },
  personnel: {
    textTag: 'se-gen-base:NotAnstallda',
    numericTags: {
      average_employees: 'se-gen-base:MedelantalAnstallda',
      salaries_board: 'se-gen-base:LonerErsattningarStyrelse',
      salaries_employees: 'se-gen-base:LonerErsattningarOvriga',
      social_costs: 'se-gen-base:SocialaKostnaderInklPension',
      pension_costs: 'se-gen-base:PensionskostnaderSumma',
    },
  },
  tax: {
    textTag: 'se-gen-base:NotSkatt',
    numericTags: {
      current_tax: 'se-gen-base:AktuellSkatt',
      deferred_tax: 'se-gen-base:UppskjutenSkatt',
    },
  },
  events_after_fy: {
    textTag: 'se-gen-base:VasentligaHandelserEfterRakenskapsaret',
  },
  other: {
    textTag: 'se-gen-base:OvrigaNoter',
  },
};

function getXbrlTag(accountNumber: string): string {
  if (XBRL_TAXONOMY_MAP[accountNumber]) {
    return XBRL_TAXONOMY_MAP[accountNumber];
  }
  const num = parseInt(accountNumber);
  let bestMatch = '';
  let bestNum = 0;
  for (const [key, value] of Object.entries(XBRL_TAXONOMY_MAP)) {
    const keyNum = parseInt(key);
    if (keyNum <= num && keyNum > bestNum && Math.floor(keyNum / 1000) === Math.floor(num / 1000)) {
      bestNum = keyNum;
      bestMatch = value;
    }
  }
  return bestMatch || `se-gen-base:UnmappedAccount_${accountNumber}`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

// Build tagged balance sheet rows with auto-fill iXBRL
function buildTaggedRows(items: Record<string, number>, accountMap: Record<string, string>, contextRef: string, sign: number = 1): string {
  const rows: string[] = [];
  for (const [name, amount] of Object.entries(items)) {
    if (typeof amount !== 'number') continue;
    const val = amount * sign;
    // Try to find the XBRL tag from the account map (account_name -> account_number -> xbrl tag)
    const accountNum = accountMap[name] || '';
    const xbrlTag = accountNum ? getXbrlTag(accountNum) : null;

    if (xbrlTag && !xbrlTag.includes('UnmappedAccount')) {
      rows.push(`      <tr><td>${escapeXml(name)}</td><td class="amount"><ix:nonFraction name="${xbrlTag}" contextRef="${contextRef}" unitRef="SEK" decimals="0" format="ixt:num-dot-decimal">${formatAmount(val)}</ix:nonFraction></td></tr>`);
    } else {
      rows.push(`      <tr><td>${escapeXml(name)}</td><td class="amount">${formatAmount(val)}</td></tr>`);
    }
  }
  return rows.join('\n');
}

// Generate tagged notes section from AI notes
function buildNotesSection(notes: any, contextRef: string): string {
  // Handle AI-generated notes array format
  if (notes?.notes && Array.isArray(notes.notes)) {
    return notes.notes.map((note: any) => {
      const catConfig = NOTE_XBRL_TAGS[note.category] || NOTE_XBRL_TAGS.other;
      const textTag = catConfig.textTag;

      let noteHtml = `  <div class="note">\n    <h3>Not ${note.note_number} – ${escapeXml(note.title)}</h3>\n`;

      // Wrap note content in iXBRL nonNumeric tag
      noteHtml += `    <p><ix:nonNumeric name="${textTag}" contextRef="${contextRef}">${escapeXml(note.content)}</ix:nonNumeric></p>\n`;

      // Add legal reference as comment
      if (note.legal_reference) {
        noteHtml += `    <p class="legal-ref"><em>Ref: ${escapeXml(note.legal_reference)}</em></p>\n`;
      }

      noteHtml += `  </div>`;
      return noteHtml;
    }).join('\n');
  }

  // Fallback: legacy object format
  const fallbackNotes = [
    { key: 'accounting_principles', title: 'Redovisningsprinciper', tag: 'se-gen-base:Redovisningsprinciper' },
    { key: 'fixed_assets', title: 'Anläggningstillgångar', tag: 'se-gen-base:NotAnlaggningstillgangar' },
    { key: 'revenue_recognition', title: 'Intäktsredovisning', tag: 'se-gen-base:NotResultatrakning' },
  ];

  return fallbackNotes.map((n, i) => {
    const content = notes?.[n.key] || '';
    if (!content) return '';
    return `  <div class="note">
    <h3>Not ${i + 1} – ${n.title}</h3>
    <p><ix:nonNumeric name="${n.tag}" contextRef="CurrentYearEnd">${escapeXml(content)}</ix:nonNumeric></p>
  </div>`;
  }).filter(Boolean).join('\n');
}

function generateIxbrlDocument(report: any, company: any, accountNumberMap: Record<string, string>): string {
  const now = new Date().toISOString().split('T')[0];
  const balanceSheet = report.balance_sheet || {};
  const incomeStatement = report.income_statement || {};
  const notes = report.notes || {};

  // Build income statement rows with tags
  const revenueRows = buildTaggedRows(incomeStatement.revenue || {}, accountNumberMap, 'CurrentYear', 1);
  const cogsRows = buildTaggedRows(incomeStatement.cost_of_goods || {}, accountNumberMap, 'CurrentYear', -1);
  const opexRows = buildTaggedRows(incomeStatement.operating_expenses || {}, accountNumberMap, 'CurrentYear', -1);
  const finRows = buildTaggedRows(incomeStatement.financial_items || {}, accountNumberMap, 'CurrentYear', -1);

  // Build balance sheet rows with tags
  const fixedAssetRows = buildTaggedRows(balanceSheet.assets?.fixed_assets || {}, accountNumberMap, 'CurrentYearEnd');
  const currentAssetRows = buildTaggedRows(balanceSheet.assets?.current_assets || {}, accountNumberMap, 'CurrentYearEnd');
  const equityRows = buildTaggedRows(balanceSheet.equity_liabilities?.equity || {}, accountNumberMap, 'CurrentYearEnd');
  const liabilityRows = buildTaggedRows(balanceSheet.equity_liabilities?.liabilities || {}, accountNumberMap, 'CurrentYearEnd');

  // Build notes section
  const notesHtml = buildNotesSection(notes, 'CurrentYearEnd');

  const totalCogs = Object.values(incomeStatement.cost_of_goods || {}).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0);
  const totalOpex = Object.values(incomeStatement.operating_expenses || {}).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0);
  const totalFin = Object.values(incomeStatement.financial_items || {}).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0);

  const ixbrl = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:ix="http://www.xbrl.org/2013/inlineXBRL"
      xmlns:ixt="http://www.xbrl.org/inlineXBRL/transformation/2020-02-12"
      xmlns:xbrli="http://www.xbrl.org/2003/instance"
      xmlns:se-gen-base="http://xbrl.bolagsverket.se/taxonomy/se-gen-base"
      xmlns:link="http://www.xbrl.org/2003/linkbase"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      xml:lang="sv">
<head>
  <meta charset="UTF-8" />
  <title>Årsredovisning ${report.fiscal_year} - ${escapeXml(company.name)}</title>
  <style>
    body { font-family: 'Times New Roman', serif; max-width: 210mm; margin: 0 auto; padding: 20mm; }
    h1 { font-size: 18pt; text-align: center; margin-bottom: 2em; }
    h2 { font-size: 14pt; border-bottom: 1px solid #000; padding-bottom: 4px; margin-top: 2em; }
    h3 { font-size: 12pt; margin-top: 1.5em; }
    table { width: 100%; border-collapse: collapse; margin: 1em 0; }
    th, td { padding: 4px 8px; text-align: left; border-bottom: 1px solid #ccc; }
    td.amount { text-align: right; font-variant-numeric: tabular-nums; }
    .total-row { font-weight: bold; border-top: 2px solid #000; }
    .sub-total { font-weight: bold; border-top: 1px solid #666; }
    .note { font-size: 10pt; margin: 1em 0; padding: 0.5em 0; }
    .legal-ref { font-size: 9pt; color: #666; }
    .footer { margin-top: 4em; font-size: 10pt; text-align: center; color: #666; }
    .category-header { font-style: italic; color: #333; }
  </style>
</head>
<body>
  <ix:header>
    <ix:hidden>
      <ix:references>
        <link:schemaRef xlink:type="simple" xlink:href="http://xbrl.bolagsverket.se/taxonomy/se-gen-base/2023-09-30/se-gen-base.xsd"/>
      </ix:references>
    </ix:hidden>
    <ix:resources>
      <xbrli:context id="CurrentYearEnd">
        <xbrli:entity>
          <xbrli:identifier scheme="http://www.bolagsverket.se">${escapeXml((company.org_number || '').replace('-', ''))}</xbrli:identifier>
        </xbrli:entity>
        <xbrli:period>
          <xbrli:instant>${report.fiscal_year_end}</xbrli:instant>
        </xbrli:period>
      </xbrli:context>
      <xbrli:context id="CurrentYear">
        <xbrli:entity>
          <xbrli:identifier scheme="http://www.bolagsverket.se">${escapeXml((company.org_number || '').replace('-', ''))}</xbrli:identifier>
        </xbrli:entity>
        <xbrli:period>
          <xbrli:startDate>${report.fiscal_year_start}</xbrli:startDate>
          <xbrli:endDate>${report.fiscal_year_end}</xbrli:endDate>
        </xbrli:period>
      </xbrli:context>
      <xbrli:unit id="SEK">
        <xbrli:measure>iso4217:SEK</xbrli:measure>
      </xbrli:unit>
      <xbrli:unit id="pure">
        <xbrli:measure>xbrli:pure</xbrli:measure>
      </xbrli:unit>
    </ix:resources>
  </ix:header>

  <h1>ÅRSREDOVISNING</h1>
  <p style="text-align:center">
    <ix:nonNumeric name="se-gen-base:Foretagsnamn" contextRef="CurrentYearEnd">${escapeXml(company.name)}</ix:nonNumeric><br/>
    Org.nr: <ix:nonNumeric name="se-gen-base:Organisationsnummer" contextRef="CurrentYearEnd">${escapeXml(company.org_number || '')}</ix:nonNumeric><br/>
    Räkenskapsår: ${report.fiscal_year_start} – ${report.fiscal_year_end}
  </p>

  <!-- Förvaltningsberättelse -->
  <h2>Förvaltningsberättelse</h2>
  <p><ix:nonNumeric name="se-gen-base:Forvaltningsberattelse" contextRef="CurrentYear">Styrelsen och verkställande direktören avger härmed årsredovisning för räkenskapsåret ${report.fiscal_year}.</ix:nonNumeric></p>
  <h3>Verksamheten</h3>
  <p><ix:nonNumeric name="se-gen-base:AllmantOmVerksamheten" contextRef="CurrentYear">${escapeXml(company.business_description || 'Bolaget bedriver verksamhet i enlighet med bolagsordningen.')}</ix:nonNumeric></p>
  <h3>Väsentliga händelser under räkenskapsåret</h3>
  <p><ix:nonNumeric name="se-gen-base:VasentligaHandelserUnderRakenskapsaret" contextRef="CurrentYear">Inga väsentliga händelser att rapportera utöver den löpande verksamheten.</ix:nonNumeric></p>

  <!-- Resultaträkning -->
  <h2>Resultaträkning</h2>
  <table>
    <thead><tr><th>Post</th><th class="amount">Belopp (SEK)</th></tr></thead>
    <tbody>
      <tr><td class="category-header">Rörelsens intäkter</td><td></td></tr>
${revenueRows}
      <tr class="sub-total"><td>Nettoomsättning</td><td class="amount">
        <ix:nonFraction name="se-gen-base:Nettoomsattning" contextRef="CurrentYear" unitRef="SEK" decimals="0" format="ixt:num-dot-decimal">${formatAmount(incomeStatement.total_revenue || 0)}</ix:nonFraction>
      </td></tr>
      <tr><td class="category-header">Rörelsens kostnader</td><td></td></tr>
${cogsRows}
      <tr class="sub-total"><td>Bruttovinst</td><td class="amount">
        <ix:nonFraction name="se-gen-base:Bruttovinst" contextRef="CurrentYear" unitRef="SEK" decimals="0" format="ixt:num-dot-decimal">${formatAmount(incomeStatement.gross_profit || 0)}</ix:nonFraction>
      </td></tr>
${opexRows}
      <tr class="total-row"><td>Rörelseresultat</td><td class="amount">
        <ix:nonFraction name="se-gen-base:Rorelseresultat" contextRef="CurrentYear" unitRef="SEK" decimals="0" format="ixt:num-dot-decimal">${formatAmount(incomeStatement.operating_profit || 0)}</ix:nonFraction>
      </td></tr>
      <tr><td class="category-header">Finansiella poster</td><td></td></tr>
${finRows}
      <tr class="total-row"><td>Resultat efter finansiella poster</td><td class="amount">
        <ix:nonFraction name="se-gen-base:ResultatEfterFinansiellaPoster" contextRef="CurrentYear" unitRef="SEK" decimals="0" format="ixt:num-dot-decimal">${formatAmount(incomeStatement.profit_before_tax || 0)}</ix:nonFraction>
      </td></tr>
      <tr class="total-row"><td><strong>Årets resultat</strong></td><td class="amount">
        <ix:nonFraction name="se-gen-base:AretsResultat" contextRef="CurrentYear" unitRef="SEK" decimals="0" format="ixt:num-dot-decimal">${formatAmount(incomeStatement.net_profit || 0)}</ix:nonFraction>
      </td></tr>
    </tbody>
  </table>

  <!-- Balansräkning -->
  <h2>Balansräkning</h2>
  <h3>TILLGÅNGAR</h3>
  <table>
    <thead><tr><th>Post</th><th class="amount">Belopp (SEK)</th></tr></thead>
    <tbody>
      <tr><td class="category-header">Anläggningstillgångar</td><td></td></tr>
${fixedAssetRows}
      <tr class="sub-total"><td>Summa anläggningstillgångar</td><td class="amount">
        <ix:nonFraction name="se-gen-base:SummaAnlaggningstillgangar" contextRef="CurrentYearEnd" unitRef="SEK" decimals="0" format="ixt:num-dot-decimal">${formatAmount(balanceSheet.assets?.total_fixed_assets || 0)}</ix:nonFraction>
      </td></tr>
      <tr><td class="category-header">Omsättningstillgångar</td><td></td></tr>
${currentAssetRows}
      <tr class="sub-total"><td>Summa omsättningstillgångar</td><td class="amount">
        <ix:nonFraction name="se-gen-base:SummaOmsattningstillgangar" contextRef="CurrentYearEnd" unitRef="SEK" decimals="0" format="ixt:num-dot-decimal">${formatAmount(balanceSheet.assets?.total_current_assets || 0)}</ix:nonFraction>
      </td></tr>
      <tr class="total-row"><td><strong>SUMMA TILLGÅNGAR</strong></td><td class="amount">
        <ix:nonFraction name="se-gen-base:SummaTillgangar" contextRef="CurrentYearEnd" unitRef="SEK" decimals="0" format="ixt:num-dot-decimal">${formatAmount(balanceSheet.assets?.total_assets || 0)}</ix:nonFraction>
      </td></tr>
    </tbody>
  </table>

  <h3>EGET KAPITAL OCH SKULDER</h3>
  <table>
    <thead><tr><th>Post</th><th class="amount">Belopp (SEK)</th></tr></thead>
    <tbody>
      <tr><td class="category-header">Eget kapital</td><td></td></tr>
${equityRows}
      <tr class="sub-total"><td>Summa eget kapital</td><td class="amount">
        <ix:nonFraction name="se-gen-base:SummaEgetKapital" contextRef="CurrentYearEnd" unitRef="SEK" decimals="0" format="ixt:num-dot-decimal">${formatAmount(balanceSheet.equity_liabilities?.total_equity || 0)}</ix:nonFraction>
      </td></tr>
      <tr><td class="category-header">Skulder</td><td></td></tr>
${liabilityRows}
      <tr class="sub-total"><td>Summa skulder</td><td class="amount">
        <ix:nonFraction name="se-gen-base:SummaSkulder" contextRef="CurrentYearEnd" unitRef="SEK" decimals="0" format="ixt:num-dot-decimal">${formatAmount(balanceSheet.equity_liabilities?.total_liabilities || 0)}</ix:nonFraction>
      </td></tr>
      <tr class="total-row"><td><strong>SUMMA EGET KAPITAL OCH SKULDER</strong></td><td class="amount">
        <ix:nonFraction name="se-gen-base:SummaEgetKapitalOchSkulder" contextRef="CurrentYearEnd" unitRef="SEK" decimals="0" format="ixt:num-dot-decimal">${formatAmount(balanceSheet.equity_liabilities?.total_equity_liabilities || 0)}</ix:nonFraction>
      </td></tr>
    </tbody>
  </table>

  <!-- Noter -->
  <h2>Noter</h2>
${notesHtml}

  <!-- Underskrifter -->
  <h2>Underskrifter</h2>
  <p><ix:nonNumeric name="se-gen-base:UnderskriftOrt" contextRef="CurrentYearEnd">${escapeXml(company.address || 'Ort')}</ix:nonNumeric>, ${now}</p>
  <p style="margin-top:3em; border-top: 1px solid #000; width: 250px; padding-top: 4px;">
    Styrelseledamot / Verkställande direktör
  </p>

  <div class="footer">
    <p>Genererad automatiskt av NorthLedger – Inline XBRL (iXBRL) för Bolagsverket</p>
    <p>Taxonomi: se-gen-base 2023-09-30 | Dokument skapat: ${now}</p>
  </div>
</body>
</html>`;

  return ixbrl;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    const { report_id } = await req.json();

    // Fetch the annual report with company data
    const { data: report, error: reportError } = await supabase
      .from('annual_reports')
      .select('*, company:companies(*)')
      .eq('id', report_id)
      .maybeSingle();

    if (reportError || !report) throw new Error('Annual report not found');

    const company = report.company;

    // Build account_name → account_number map for auto-tagging line items
    const { data: chartAccounts } = await supabase
      .from('chart_of_accounts')
      .select('account_number, account_name')
      .eq('company_id', company.id)
      .eq('is_active', true);

    const accountNumberMap: Record<string, string> = {};
    for (const acc of chartAccounts || []) {
      accountNumberMap[acc.account_name] = acc.account_number;
    }

    const ixbrlContent = generateIxbrlDocument(report, company, accountNumberMap);

    // Store the iXBRL document
    const fileName = `annual-reports/${company.id}/${report.fiscal_year}/arsredovisning_${report.fiscal_year}.xhtml`;
    const encoder = new TextEncoder();
    const fileData = encoder.encode(ixbrlContent);

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, fileData, {
        contentType: 'application/xhtml+xml',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
    }

    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    // Count tagged elements for reporting
    const tagCount = (ixbrlContent.match(/<ix:(nonFraction|nonNumeric)/g) || []).length;

    // Update report with iXBRL info
    const previousNotes = report.notes || {};
    const updatedNotes = {
      ...previousNotes,
      ixbrl_generated_at: new Date().toISOString(),
      ixbrl_generated_by: user.id,
      ixbrl_format: 'inline-xbrl-k2',
      ixbrl_taxonomy: 'se-gen-base-2023-09-30',
      ixbrl_tag_count: tagCount,
      ixbrl_auto_tagged: true,
    };

    await supabase
      .from('annual_reports')
      .update({
        pdf_url: urlData?.publicUrl || null,
        notes: updatedNotes,
      })
      .eq('id', report_id);

    // Audit log: iXBRL generation
    await supabase.from('audit_events').insert({
      user_id: user.id,
      company_id: company.id,
      entity_type: 'annual_report',
      entity_id: report_id,
      event_type: 'ixbrl_generated',
      old_data: { notes: previousNotes, pdf_url: report.pdf_url },
      new_data: {
        notes: updatedNotes,
        pdf_url: urlData?.publicUrl || null,
        ixbrl_tag_count: tagCount,
        ixbrl_size_bytes: fileData.length,
        taxonomy: 'se-gen-base-2023-09-30',
        storage_path: fileName,
      },
      processing_purpose: 'iXBRL document generation for Bolagsverket filing',
      legal_basis: 'legal_obligation',
    });

    return new Response(JSON.stringify({
      success: true,
      ixbrl_url: urlData?.publicUrl || null,
      ixbrl_size: fileData.length,
      taxonomy: 'se-gen-base-2023-09-30',
      format: 'iXBRL (Inline XBRL)',
      report_id: report.id,
      tag_count: tagCount,
      auto_tagged: true,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-ixbrl:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
