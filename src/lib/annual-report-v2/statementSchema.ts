/**
 * Statement schema — declarative legal structure for K2 / K3 RR and BR.
 *
 * Each row references either an account range (BAS) or a synthetic computed
 * key (e.g. "result.net" for "Årets resultat"). The renderer in
 * FinancialStatementsView consumes this schema together with the raw account
 * movements from useFinancialStatements (which still holds the real numbers).
 *
 * IMPORTANT: This module owns *structure only* — no fetching, no formatting.
 */

export type Framework = "K2" | "K3";
export type RRFormat = "kostnadsslag" | "funktion";

/** A single value source for a row. */
export type RowSource =
  | { kind: "range"; from: number; to: number; sign: "credit_positive" | "debit_positive" }
  /** Sum of multiple ranges (display values combined). */
  | {
      kind: "ranges";
      parts: Array<{ from: number; to: number; sign: "credit_positive" | "debit_positive" }>;
    }
  /** Pull from one of the precomputed totals exposed by the renderer. */
  | { kind: "computed"; key: ComputedKey }
  /** Constant zero — purely structural placeholder (e.g. OCI lines). */
  | { kind: "zero" };

export type ComputedKey =
  | "rr.operatingResult"
  | "rr.resultAfterFinancial"
  | "rr.resultBeforeTax"
  | "rr.netResult"
  | "br.totalAssets"
  | "br.totalEquityLiabilities"
  | "br.equity";

export type RowStyle =
  | "data"            // normal row
  | "subSection"      // "Bundet eget kapital" etc.
  | "subtotal"        // "Summa anläggningstillgångar"
  | "total"           // "RÖRELSERESULTAT"
  | "grandTotal";     // "ÅRETS RESULTAT", "SUMMA TILLGÅNGAR"

export interface SchemaRow {
  id: string;
  label: string;
  style: RowStyle;
  source: RowSource;
  /** Note key — resolved to a number/anchor at render time. */
  noteKey?: string;
  /** Hide row entirely if this predicate matches the framework. */
  hiddenIn?: Framework[];
}

export interface SchemaSection {
  id: string;
  /** UPPERCASE small caps section header. */
  header?: string;
  rows: SchemaRow[];
  hiddenIn?: Framework[];
}

export interface StatementSchema {
  rr: SchemaSection[];
  br: SchemaSection[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const credit = (from: number, to: number): RowSource => ({ kind: "range", from, to, sign: "credit_positive" });
const debit = (from: number, to: number): RowSource => ({ kind: "range", from, to, sign: "debit_positive" });

// ──────────────────────────────────────────────────────────────────────────────
// RR — K2 / K3 Kostnadsslagsindelad
// ──────────────────────────────────────────────────────────────────────────────

function buildRR(framework: Framework, format: RRFormat): SchemaSection[] {
  const oci: SchemaSection = {
    id: "oci",
    header: "ÖVRIGT TOTALRESULTAT",
    hiddenIn: ["K2"],
    rows: [
      { id: "oci.h1", label: "Poster som inte kan omföras till resultaträkningen", style: "subSection", source: { kind: "zero" } },
      { id: "oci.pension",  label: "Omvärdering av förmånsbestämda pensionsplaner", style: "data", source: { kind: "zero" } },
      { id: "oci.pension.tax", label: "Skatt hänförlig till poster ovan", style: "data", source: { kind: "zero" } },
      { id: "oci.h2", label: "Poster som senare kan omföras till resultaträkningen", style: "subSection", source: { kind: "zero" } },
      { id: "oci.fx",   label: "Omräkningsdifferenser vid omräkning av utländsk verksamhet", style: "data", source: { kind: "zero" } },
      { id: "oci.hedge", label: "Förändringar i verkligt värde på säkringsinstrument", style: "data", source: { kind: "zero" } },
      { id: "oci.hedge.tax", label: "Skatt hänförlig till poster ovan", style: "data", source: { kind: "zero" } },
      { id: "oci.sum", label: "SUMMA ÖVRIGT TOTALRESULTAT", style: "subtotal", source: { kind: "zero" } },
      { id: "oci.total", label: "TOTALRESULTAT", style: "grandTotal", source: { kind: "computed", key: "rr.netResult" } },
    ],
  };

  if (format === "funktion" && framework === "K3") {
    return [
      {
        id: "rr.gross",
        rows: [
          { id: "rr.fn.netrev",  label: "Nettoomsättning",        style: "data", source: credit(3000, 3799), noteKey: "net_revenue" },
          { id: "rr.fn.cogs",    label: "Kostnad för sålda varor", style: "data", source: debit(4000, 4999), noteKey: "cogs" },
          { id: "rr.fn.gross",   label: "BRUTTORESULTAT", style: "total", source: { kind: "computed", key: "rr.operatingResult" } },
          { id: "rr.fn.sales",   label: "Försäljningskostnader",  style: "data", source: { kind: "zero" } },
          { id: "rr.fn.admin",   label: "Administrationskostnader", style: "data", source: { kind: "zero" } },
          { id: "rr.fn.rd",      label: "Forsknings- och utvecklingskostnader", style: "data", source: { kind: "zero" } },
          { id: "rr.fn.othinc",  label: "Övriga rörelseintäkter", style: "data", source: credit(3800, 3999), noteKey: "other_operating_income" },
          { id: "rr.fn.othcost", label: "Övriga rörelsekostnader", style: "data", source: debit(7900, 7999) },
          { id: "rr.fn.op", label: "RÖRELSERESULTAT", style: "total", source: { kind: "computed", key: "rr.operatingResult" } },
        ],
      },
      ...financialAndAfter(framework),
      oci,
    ];
  }

  // Kostnadsslagsindelad (K2 + K3 default)
  const sections: SchemaSection[] = [
    {
      id: "rr.income",
      header: "RÖRELSENS INTÄKTER OCH LAGERFÖRÄNDRINGAR",
      rows: [
        { id: "rr.netrev",       label: "Nettoomsättning",                                                style: "data", source: credit(3000, 3799), noteKey: "net_revenue" },
        { id: "rr.invchange",    label: "Förändring av lager av produkter i arbete, färdiga varor",       style: "data", source: { kind: "ranges", parts: [{ from: 4900, to: 4999, sign: "credit_positive" }] } },
        { id: "rr.ownwork",      label: "Aktiverat arbete för egen räkning",                              style: "data", source: { kind: "zero" } },
        { id: "rr.othinc",       label: "Övriga rörelseintäkter",                                         style: "data", source: credit(3800, 3999), noteKey: "other_operating_income" },
        { id: "rr.income.sum",   label: "Summa rörelseintäkter",                                          style: "subtotal", source: { kind: "computed", key: "rr.operatingResult" } /* renderer overrides via cached subtotal */ },
      ],
    },
    {
      id: "rr.costs",
      header: "RÖRELSENS KOSTNADER",
      rows: [
        { id: "rr.raw",        label: "Råvaror och förnödenheter",                                                                  style: "data", source: debit(4000, 4499), noteKey: "raw_materials" },
        { id: "rr.goods",      label: "Handelsvaror",                                                                                style: "data", source: debit(4500, 4799) },
        { id: "rr.external",   label: "Övriga externa kostnader",                                                                    style: "data", source: { kind: "ranges", parts: [{ from: 5000, to: 5999, sign: "debit_positive" }, { from: 6000, to: 6999, sign: "debit_positive" }] }, noteKey: "external_costs" },
        { id: "rr.personnel",  label: "Personalkostnader",                                                                           style: "data", source: debit(7000, 7699), noteKey: "personnel_costs" },
        { id: "rr.depr",       label: "Av- och nedskrivningar av materiella och immateriella anläggningstillgångar",                style: "data", source: debit(7700, 7899), noteKey: "depreciation" },
        { id: "rr.writedown",  label: "Nedskrivningar av omsättningstillgångar",                                                     style: "data", source: { kind: "zero" } },
        { id: "rr.othcost",    label: "Övriga rörelsekostnader",                                                                     style: "data", source: debit(7900, 7999) },
        { id: "rr.costs.sum",  label: "Summa rörelsekostnader",                                                                      style: "subtotal", source: { kind: "zero" } /* sum of above */ },
      ],
    },
    {
      id: "rr.op",
      rows: [{ id: "rr.op.total", label: "RÖRELSERESULTAT", style: "total", source: { kind: "computed", key: "rr.operatingResult" } }],
    },
    ...financialAndAfter(framework),
  ];

  if (framework === "K3") sections.push(oci);
  return sections;
}

function financialAndAfter(framework: Framework): SchemaSection[] {
  return [
    {
      id: "rr.fin",
      header: "FINANSIELLA POSTER",
      rows: [
        { id: "rr.fin.koncern",   label: "Resultat från andelar i koncernföretag",                              style: "data", source: { kind: "zero" } },
        { id: "rr.fin.intresse",  label: "Resultat från andelar i intresseföretag",                             style: "data", source: { kind: "zero" } },
        { id: "rr.fin.others",    label: "Resultat från övriga värdepapper och fordringar (anläggningstillgångar)", style: "data", source: { kind: "zero" } },
        { id: "rr.fin.intinc",    label: "Övriga ränteintäkter och liknande resultatposter",                    style: "data", source: credit(8000, 8199), noteKey: "financial_income" },
        { id: "rr.fin.intcost",   label: "Räntekostnader och liknande resultatposter",                          style: "data", source: debit(8200, 8799),  noteKey: "financial_costs" },
        { id: "rr.fin.sum",       label: "Summa finansiella poster",                                            style: "subtotal", source: { kind: "zero" } },
      ],
    },
    {
      id: "rr.afterfin",
      rows: [{ id: "rr.afterfin.total", label: "RESULTAT EFTER FINANSIELLA POSTER", style: "total", source: { kind: "computed", key: "rr.resultAfterFinancial" } }],
    },
    {
      id: "rr.appr",
      header: "BOKSLUTSDISPOSITIONER",
      rows: [
        { id: "rr.appr.recv",   label: "Erhållna koncernbidrag",        style: "data", source: { kind: "zero" } },
        { id: "rr.appr.given",  label: "Lämnade koncernbidrag",         style: "data", source: { kind: "zero" } },
        { id: "rr.appr.perfond", label: "Förändring av periodiseringsfonder", style: "data", source: debit(8810, 8819), noteKey: "appropriations" },
        { id: "rr.appr.depr",   label: "Förändring av överavskrivningar", style: "data", source: debit(8850, 8859) },
        { id: "rr.appr.sum",    label: "Summa bokslutsdispositioner",   style: "subtotal", source: { kind: "zero" } },
      ],
    },
    {
      id: "rr.beforetax",
      rows: [{ id: "rr.beforetax.total", label: "RESULTAT FÖRE SKATT", style: "total", source: { kind: "computed", key: "rr.resultBeforeTax" } }],
    },
    {
      id: "rr.tax",
      header: "SKATTER",
      rows: [
        { id: "rr.tax.year", label: "Skatt på årets resultat", style: "data", source: debit(8900, 8999), noteKey: "taxes" },
      ],
    },
    {
      id: "rr.net",
      rows: [{ id: "rr.net.total", label: "ÅRETS RESULTAT", style: "grandTotal", source: { kind: "computed", key: "rr.netResult" } }],
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// BR — Assets
// ──────────────────────────────────────────────────────────────────────────────

function buildBRAssets(framework: Framework): SchemaSection[] {
  return [
    {
      id: "br.fixed",
      header: "ANLÄGGNINGSTILLGÅNGAR",
      rows: [
        { id: "br.intang.h",   label: "Immateriella anläggningstillgångar", style: "subSection", source: { kind: "zero" } },
        { id: "br.intang.dev", label: "Balanserade utgifter för utvecklingsarbeten", style: "data", source: debit(1010, 1019), noteKey: "intangible_dev" },
        { id: "br.intang.lic", label: "Koncessioner, patent, licenser, varumärken", style: "data", source: debit(1020, 1049), noteKey: "intangible_lic" },
        { id: "br.intang.gw",  label: "Goodwill", style: "data", source: debit(1050, 1059), noteKey: "goodwill" },
        { id: "br.intang.oth", label: "Övriga immateriella anläggningstillgångar", style: "data", source: debit(1060, 1099) },
        { id: "br.intang.sum", label: "Summa immateriella anläggningstillgångar", style: "subtotal", source: debit(1000, 1099) },

        { id: "br.tangible.h",     label: "Materiella anläggningstillgångar", style: "subSection", source: { kind: "zero" } },
        { id: "br.tangible.bldg",  label: "Byggnader och mark", style: "data", source: debit(1100, 1199), noteKey: "buildings_land" },
        { id: "br.tangible.mach",  label: "Maskiner och andra tekniska anläggningar", style: "data", source: debit(1200, 1219), noteKey: "machinery" },
        { id: "br.tangible.equip", label: "Inventarier, verktyg och installationer", style: "data", source: debit(1220, 1259), noteKey: "equipment" },
        { id: "br.tangible.lease", label: "Nyttjanderättstillgångar", style: "data", source: debit(1260, 1269), hiddenIn: ["K2"] },
        { id: "br.tangible.wip",   label: "Pågående nyanläggningar och förskott", style: "data", source: debit(1280, 1289), noteKey: "wip_assets" },
        { id: "br.tangible.sum",   label: "Summa materiella anläggningstillgångar", style: "subtotal", source: debit(1100, 1299) },

        { id: "br.fin.h",         label: "Finansiella anläggningstillgångar", style: "subSection", source: { kind: "zero" } },
        { id: "br.fin.koncern",   label: "Andelar i koncernföretag", style: "data", source: debit(1310, 1319), noteKey: "shares_group" },
        { id: "br.fin.koncernr",  label: "Fordringar hos koncernföretag", style: "data", source: debit(1320, 1329), noteKey: "rec_group" },
        { id: "br.fin.intresse",  label: "Andelar i intresseföretag", style: "data", source: debit(1330, 1339), noteKey: "shares_assoc" },
        { id: "br.fin.other_int", label: "Ägarintressen i övriga företag", style: "data", source: debit(1340, 1349) },
        { id: "br.fin.lt_sec",    label: "Andra långfristiga värdepappersinnehav", style: "data", source: debit(1350, 1359) },
        { id: "br.fin.related",   label: "Lån till närstående", style: "data", source: debit(1360, 1369), noteKey: "loans_related" },
        { id: "br.fin.lt_rec",    label: "Andra långfristiga fordringar", style: "data", source: debit(1380, 1389) },
        { id: "br.fin.deftax",    label: "Uppskjutna skattefordringar", style: "data", source: debit(1370, 1379), hiddenIn: ["K2"] },
        { id: "br.fin.sum",       label: "Summa finansiella anläggningstillgångar", style: "subtotal", source: debit(1300, 1399) },

        { id: "br.fixed.sum", label: "Summa anläggningstillgångar", style: "subtotal", source: debit(1000, 1399) },
      ],
    },
    {
      id: "br.current",
      header: "OMSÄTTNINGSTILLGÅNGAR",
      rows: [
        { id: "br.inv.h",       label: "Varulager m.m.", style: "subSection", source: { kind: "zero" } },
        { id: "br.inv.raw",     label: "Råvaror och förnödenheter", style: "data", source: debit(1410, 1419) },
        { id: "br.inv.wip",     label: "Varor under tillverkning",  style: "data", source: debit(1430, 1449) },
        { id: "br.inv.fin",     label: "Färdiga varor och handelsvaror", style: "data", source: debit(1450, 1469), noteKey: "inventory_finished" },
        { id: "br.inv.contract",label: "Pågående arbete för annans räkning", style: "data", source: debit(1470, 1479), noteKey: "wip_external" },
        { id: "br.inv.adv",     label: "Förskott till leverantörer", style: "data", source: debit(1480, 1489) },
        { id: "br.inv.sum",     label: "Summa varulager", style: "subtotal", source: debit(1400, 1499) },

        { id: "br.rec.h",       label: "Kortfristiga fordringar", style: "subSection", source: { kind: "zero" } },
        { id: "br.rec.cust",    label: "Kundfordringar", style: "data", source: debit(1500, 1599), noteKey: "trade_receivables" },
        { id: "br.rec.group",   label: "Fordringar hos koncernföretag", style: "data", source: debit(1660, 1669) },
        { id: "br.rec.assoc",   label: "Fordringar hos intresseföretag", style: "data", source: debit(1670, 1679) },
        { id: "br.rec.tax",     label: "Skattefordringar", style: "data", source: debit(1640, 1649) },
        { id: "br.rec.other",   label: "Övriga fordringar", style: "data", source: { kind: "ranges", parts: [{ from: 1600, to: 1639, sign: "debit_positive" }, { from: 1680, to: 1699, sign: "debit_positive" }] }, noteKey: "other_receivables" },
        { id: "br.rec.prepaid", label: "Förutbetalda kostnader och upplupna intäkter", style: "data", source: debit(1700, 1799), noteKey: "prepaid_costs" },
        { id: "br.rec.sum",     label: "Summa kortfristiga fordringar", style: "subtotal", source: debit(1500, 1799) },

        { id: "br.invest.h",    label: "Kortfristiga placeringar", style: "subSection", source: { kind: "zero" } },
        { id: "br.invest.group",label: "Andelar i koncernföretag", style: "data", source: { kind: "zero" } },
        { id: "br.invest.other",label: "Övriga kortfristiga placeringar", style: "data", source: debit(1800, 1899) },
        { id: "br.invest.sum",  label: "Summa kortfristiga placeringar", style: "subtotal", source: debit(1800, 1899) },

        { id: "br.cash.h",      label: "Kassa och bank", style: "subSection", source: { kind: "zero" } },
        { id: "br.cash.row",    label: "Kassa och bank", style: "data", source: debit(1900, 1999) },
        { id: "br.cash.sum",    label: "Summa kassa och bank", style: "subtotal", source: debit(1900, 1999) },

        { id: "br.current.sum", label: "Summa omsättningstillgångar", style: "subtotal", source: debit(1400, 1999) },
      ],
    },
    {
      id: "br.assets.total",
      rows: [{ id: "br.assets.row", label: "SUMMA TILLGÅNGAR", style: "grandTotal", source: { kind: "computed", key: "br.totalAssets" } }],
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// BR — Equity & liabilities
// ──────────────────────────────────────────────────────────────────────────────

function buildBREquityLiab(framework: Framework): SchemaSection[] {
  return [
    {
      id: "br.eq",
      header: "EGET KAPITAL",
      rows: [
        { id: "br.eq.bound.h",   label: "Bundet eget kapital", style: "subSection", source: { kind: "zero" } },
        { id: "br.eq.share",     label: "Aktiekapital", style: "data", source: credit(2081, 2081) },
        { id: "br.eq.share_unreg", label: "Ej registrerat aktiekapital", style: "data", source: credit(2082, 2082) },
        { id: "br.eq.reval",     label: "Uppskrivningsfond", style: "data", source: credit(2085, 2085) },
        { id: "br.eq.reserve",   label: "Reservfond", style: "data", source: credit(2086, 2086) },
        { id: "br.eq.bound.sum", label: "Summa bundet eget kapital", style: "subtotal", source: { kind: "ranges", parts: [
          { from: 2081, to: 2082, sign: "credit_positive" },
          { from: 2085, to: 2086, sign: "credit_positive" },
        ] } },

        { id: "br.eq.free.h",    label: "Fritt eget kapital", style: "subSection", source: { kind: "zero" } },
        { id: "br.eq.premium",   label: "Överkursfond", style: "data", source: credit(2084, 2084) },
        { id: "br.eq.fairvalue", label: "Fond för verkligt värde", style: "data", source: credit(2087, 2087) },
        { id: "br.eq.retained",  label: "Balanserat resultat", style: "data", source: { kind: "ranges", parts: [
          { from: 2091, to: 2098, sign: "credit_positive" },
        ] } },
        { id: "br.eq.year",      label: "Årets resultat", style: "data", source: { kind: "computed", key: "rr.netResult" } },
        { id: "br.eq.free.sum",  label: "Summa fritt eget kapital", style: "subtotal", source: { kind: "zero" } /* renderer summarizes children */ },

        { id: "br.eq.sum", label: "Summa eget kapital", style: "subtotal", source: { kind: "computed", key: "br.equity" } },
      ],
    },
    {
      id: "br.untaxed",
      header: "OBESKATTADE RESERVER",
      hiddenIn: ["K3"],
      rows: [
        { id: "br.untaxed.perfond", label: "Periodiseringsfonder", style: "data", source: credit(2120, 2129) },
        { id: "br.untaxed.depr",    label: "Ackumulerade överavskrivningar", style: "data", source: credit(2150, 2159) },
        { id: "br.untaxed.sum",     label: "Summa obeskattade reserver", style: "subtotal", source: credit(2100, 2199) },
      ],
    },
    {
      id: "br.prov",
      header: "AVSÄTTNINGAR",
      rows: [
        { id: "br.prov.pension", label: "Avsättningar för pensioner och liknande förpliktelser", style: "data", source: credit(2210, 2219) },
        { id: "br.prov.deftax",  label: "Uppskjutna skatteskulder", style: "data", source: credit(2240, 2249), hiddenIn: ["K2"] },
        { id: "br.prov.other",   label: "Övriga avsättningar", style: "data", source: credit(2230, 2239) },
        { id: "br.prov.sum",     label: "Summa avsättningar", style: "subtotal", source: credit(2200, 2299) },
      ],
    },
    {
      id: "br.lt",
      header: "LÅNGFRISTIGA SKULDER",
      rows: [
        { id: "br.lt.bonds",   label: "Obligationslån", style: "data", source: { kind: "zero" } },
        { id: "br.lt.credit",  label: "Skulder till kreditinstitut", style: "data", source: credit(2350, 2359) },
        { id: "br.lt.lease",   label: "Leasingskulder", style: "data", source: credit(2370, 2379), hiddenIn: ["K2"] },
        { id: "br.lt.group",   label: "Skulder till koncernföretag", style: "data", source: credit(2360, 2369) },
        { id: "br.lt.assoc",   label: "Skulder till intresseföretag", style: "data", source: credit(2380, 2389) },
        { id: "br.lt.other",   label: "Övriga skulder", style: "data", source: credit(2390, 2399) },
        { id: "br.lt.sum",     label: "Summa långfristiga skulder", style: "subtotal", source: credit(2300, 2399) },
      ],
    },
    {
      id: "br.st",
      header: "KORTFRISTIGA SKULDER",
      rows: [
        { id: "br.st.credit",  label: "Skulder till kreditinstitut", style: "data", source: credit(2400, 2499) },
        { id: "br.st.advance", label: "Förskott från kunder", style: "data", source: credit(2420, 2429) },
        { id: "br.st.suppliers", label: "Leverantörsskulder", style: "data", source: credit(2440, 2449), noteKey: "trade_payables" },
        { id: "br.st.lease",   label: "Leasingskulder", style: "data", source: credit(2480, 2489), hiddenIn: ["K2"] },
        { id: "br.st.group",   label: "Skulder till koncernföretag", style: "data", source: credit(2460, 2469) },
        { id: "br.st.assoc",   label: "Skulder till intresseföretag", style: "data", source: credit(2470, 2479) },
        { id: "br.st.tax",     label: "Skatteskulder", style: "data", source: credit(2510, 2519) },
        { id: "br.st.other",   label: "Övriga skulder", style: "data", source: credit(2700, 2899), noteKey: "other_short_liab" },
        { id: "br.st.accrued", label: "Upplupna kostnader och förutbetalda intäkter", style: "data", source: credit(2900, 2999), noteKey: "accrued_costs" },
        { id: "br.st.sum",     label: "Summa kortfristiga skulder", style: "subtotal", source: credit(2400, 2999) },
      ],
    },
    {
      id: "br.eqliab.total",
      rows: [{ id: "br.eqliab.row", label: "SUMMA EGET KAPITAL OCH SKULDER", style: "grandTotal", source: { kind: "computed", key: "br.totalEquityLiabilities" } }],
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// Public builder
// ──────────────────────────────────────────────────────────────────────────────

export function buildStatementSchema(framework: Framework, rrFormat: RRFormat = "kostnadsslag"): StatementSchema {
  return {
    rr: buildRR(framework, rrFormat),
    br: [...buildBRAssets(framework), ...buildBREquityLiab(framework)],
  };
}
