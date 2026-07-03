export type IndustryType = 
  | "real_estate" 
  | "construction" 
  | "restaurant" 
  | "retail" 
  | "consulting"
  | "manufacturing"
  | "holding"
  | "general";

export interface IndustryTemplate {
  key: IndustryType;
  name: string;
  icon: string;
  description: string;
  vatRequired: boolean;
  vatDefault: boolean;
  focusAreas: string[];
  keyAccounts: {
    number: string;
    name: string;
    importance: "high" | "medium" | "low";
  }[];
  quickActions: {
    title: string;
    description: string;
    accounts: { debit: string; credit: string }[];
  }[];
  dashboardWidgets: string[];
}

export const INDUSTRY_TEMPLATES: Record<IndustryType, IndustryTemplate> = {
  real_estate: {
    key: "real_estate",
    name: "Fastighetsförvaltning",
    icon: "Building2",
    description: "Optimerad för fastighetsbolag och förvaltning",
    vatRequired: false,
    vatDefault: false,
    focusAreas: [
      "Hyresintäkter",
      "Underhåll & reparationer",
      "Värdeökning fastigheter",
      "Kapitalkostnader",
    ],
    keyAccounts: [
      { number: "1210", name: "Byggnader", importance: "high" },
      { number: "3010", name: "Hyresintäkter bostäder", importance: "high" },
      { number: "3020", name: "Hyresintäkter lokaler", importance: "high" },
      { number: "5410", name: "Förbrukningsmaterial", importance: "medium" },
      { number: "5420", name: "Reparation och underhåll", importance: "high" },
      { number: "8310", name: "Avskrivning byggnader", importance: "high" },
    ],
    quickActions: [
      {
        title: "Registrera hyresintäkt",
        description: "Bostadshyra mottagen",
        accounts: [
          { debit: "1930", credit: "3010" },
        ],
      },
      {
        title: "Underhållskostnad",
        description: "Reparation av fastighet",
        accounts: [
          { debit: "5420", credit: "2440" },
        ],
      },
    ],
    dashboardWidgets: ["rental_income", "maintenance_costs", "property_value", "occupancy"],
  },

  construction: {
    key: "construction",
    name: "Bygg & Anläggning",
    icon: "HardHat",
    description: "Anpassad för byggföretag och entreprenader",
    vatRequired: true,
    vatDefault: true,
    focusAreas: [
      "Projektredovisning",
      "Material & underentreprenader",
      "Maskin & verktyg",
      "Personalkostand (hög)",
    ],
    keyAccounts: [
      { number: "3000", name: "Försäljning tjänster", importance: "high" },
      { number: "3530", name: "Fakturerad löpande arbete", importance: "high" },
      { number: "1420", name: "Maskiner och inventarier", importance: "high" },
      { number: "4000", name: "Material", importance: "high" },
      { number: "6000", name: "Underentreprenader", importance: "high" },
      { number: "7010", name: "Löner till kollektivanställda", importance: "high" },
    ],
    quickActions: [
      {
        title: "Materialinköp",
        description: "Inköp av byggmaterial med moms",
        accounts: [
          { debit: "4000", credit: "2440" },
          { debit: "2641", credit: "2440" }, // Ingående moms
        ],
      },
      {
        title: "Fakturera projekt",
        description: "Faktura till kund på löpande arbete",
        accounts: [
          { debit: "1510", credit: "3530" },
          { debit: "1510", credit: "2611" }, // Utgående moms
        ],
      },
    ],
    dashboardWidgets: ["project_margin", "material_costs", "labor_costs", "vat_summary"],
  },

  restaurant: {
    key: "restaurant",
    name: "Restaurang & Café",
    icon: "UtensilsCrossed",
    description: "Specialiserad för restaurang- och livsmedelsbranschen",
    vatRequired: true,
    vatDefault: true,
    focusAreas: [
      "Varuinköp livsmedel",
      "Kassamoms (12%/25%)",
      "Personalkostnader",
      "Lageravstämning",
    ],
    keyAccounts: [
      { number: "3001", name: "Försäljning restaurang", importance: "high" },
      { number: "3002", name: "Försäljning bar", importance: "high" },
      { number: "4010", name: "Inköp varor restaurang", importance: "high" },
      { number: "1430", name: "Lager råvaror", importance: "high" },
      { number: "7010", name: "Löner", importance: "high" },
      { number: "1910", name: "Kassa", importance: "high" },
    ],
    quickActions: [
      {
        title: "Dagskassan",
        description: "Registrera dagens försäljning från kassan",
        accounts: [
          { debit: "1910", credit: "3001" },
          { debit: "1910", credit: "2611" }, // Utgående moms 12%
        ],
      },
      {
        title: "Livsmedelsbeställning",
        description: "Inköp av råvaror",
        accounts: [
          { debit: "4010", credit: "2440" },
          { debit: "2641", credit: "2440" }, // Ingående moms
        ],
      },
    ],
    dashboardWidgets: ["daily_sales", "food_cost_percentage", "labor_percentage", "inventory"],
  },

  retail: {
    key: "retail",
    name: "Detaljhandel",
    icon: "ShoppingCart",
    description: "För butiker och detaljhandel",
    vatRequired: true,
    vatDefault: true,
    focusAreas: [
      "Lagerhantering",
      "Dagskassa",
      "Varumoms",
      "Inköpspriser",
    ],
    keyAccounts: [
      { number: "3000", name: "Försäljning varor", importance: "high" },
      { number: "4000", name: "Inköp varor", importance: "high" },
      { number: "1430", name: "Lager", importance: "high" },
      { number: "1910", name: "Kassa", importance: "high" },
      { number: "2440", name: "Leverantörsskulder", importance: "high" },
    ],
    quickActions: [
      {
        title: "Kassaavstämning",
        description: "Dagens kassaförsäljning",
        accounts: [
          { debit: "1910", credit: "3000" },
          { debit: "1910", credit: "2611" },
        ],
      },
      {
        title: "Varuinköp",
        description: "Inköp till lager",
        accounts: [
          { debit: "1430", credit: "2440" },
          { debit: "2641", credit: "2440" },
        ],
      },
    ],
    dashboardWidgets: ["sales", "inventory_value", "margin", "vat_summary"],
  },

  consulting: {
    key: "consulting",
    name: "Konsult & Tjänster",
    icon: "Briefcase",
    description: "För konsulter och tjänsteföretag",
    vatRequired: true,
    vatDefault: true,
    focusAreas: [
      "Timdebitering",
      "Kundfordringar",
      "Utlägg",
      "Konsultarvoden",
    ],
    keyAccounts: [
      { number: "3000", name: "Försäljning tjänster", importance: "high" },
      { number: "1510", name: "Kundfordringar", importance: "high" },
      { number: "6000", name: "Konsultarvoden", importance: "medium" },
      { number: "7010", name: "Löner", importance: "high" },
      { number: "5800", name: "Resor", importance: "medium" },
    ],
    quickActions: [
      {
        title: "Fakturera kund",
        description: "Skapa kundfaktura för tjänster",
        accounts: [
          { debit: "1510", credit: "3000" },
          { debit: "1510", credit: "2611" },
        ],
      },
      {
        title: "Betald kundfaktura",
        description: "Kund har betalat",
        accounts: [
          { debit: "1930", credit: "1510" },
        ],
      },
    ],
    dashboardWidgets: ["invoiced", "outstanding_receivables", "billable_hours", "expenses"],
  },

  manufacturing: {
    key: "manufacturing",
    name: "Tillverkning & Produktion",
    icon: "Factory",
    description: "För tillverkande företag",
    vatRequired: true,
    vatDefault: true,
    focusAreas: [
      "Produkter i arbete",
      "Råvarulager",
      "Färdigvarulager",
      "Direkt material & arbete",
    ],
    keyAccounts: [
      { number: "3000", name: "Försäljning produkter", importance: "high" },
      { number: "1410", name: "Råvaror och förnödenheter", importance: "high" },
      { number: "1420", name: "Produkter i arbete", importance: "high" },
      { number: "1430", name: "Färdiga varor", importance: "high" },
      { number: "4000", name: "Inköp råvaror", importance: "high" },
    ],
    quickActions: [
      {
        title: "Råvaruinköp",
        description: "Inköp material till lager",
        accounts: [
          { debit: "1410", credit: "2440" },
          { debit: "2641", credit: "2440" },
        ],
      },
      {
        title: "Produktionsfaktura",
        description: "Fakturera färdig produkt",
        accounts: [
          { debit: "1510", credit: "3000" },
          { debit: "1510", credit: "2611" },
        ],
      },
    ],
    dashboardWidgets: ["production_value", "raw_materials", "wip", "finished_goods"],
  },

  holding: {
    key: "holding",
    name: "Holdingbolag",
    icon: "Building2",
    description: "För holdingbolag och koncernmoderbolag",
    vatRequired: false,
    vatDefault: false,
    focusAreas: [
      "Dotterbolagsaktier",
      "Aktieutdelningar",
      "Koncernbidrag",
      "Förvaltningskostnader",
    ],
    keyAccounts: [
      { number: "1310", name: "Andelar i koncernföretag", importance: "high" },
      { number: "1320", name: "Fordringar koncernföretag", importance: "high" },
      { number: "2330", name: "Skulder koncernföretag", importance: "high" },
      { number: "3950", name: "Erhållna koncernbidrag", importance: "high" },
      { number: "8900", name: "Lämnade koncernbidrag", importance: "high" },
      { number: "8310", name: "Nedskrivningar finansiella anläggningstillgångar", importance: "medium" },
    ],
    quickActions: [
      {
        title: "Mottaget koncernbidrag",
        description: "Koncernbidrag från dotterbolag",
        accounts: [
          { debit: "1930", credit: "3950" },
        ],
      },
      {
        title: "Lämnat koncernbidrag",
        description: "Koncernbidrag till dotterbolag",
        accounts: [
          { debit: "8900", credit: "1930" },
        ],
      },
      {
        title: "Aktieutdelning mottagen",
        description: "Utdelning från dotterbolag",
        accounts: [
          { debit: "1930", credit: "8290" },
        ],
      },
    ],
    dashboardWidgets: ["group_equity", "intercompany_receivables", "group_contributions", "dividends"],
  },

  general: {
    key: "general",
    name: "Allmän verksamhet",
    icon: "Building",
    description: "Standard bokföring för alla branscher",
    vatRequired: false,
    vatDefault: true,
    focusAreas: [
      "Intäkter",
      "Kostnader",
      "Leverantörer",
      "Kunder",
    ],
    keyAccounts: [
      { number: "3000", name: "Försäljning", importance: "high" },
      { number: "1510", name: "Kundfordringar", importance: "high" },
      { number: "2440", name: "Leverantörsskulder", importance: "high" },
      { number: "1930", name: "Företagskonto", importance: "high" },
    ],
    quickActions: [
      {
        title: "Skapa kundfaktura",
        description: "Fakturera kund",
        accounts: [
          { debit: "1510", credit: "3000" },
        ],
      },
      {
        title: "Betala leverantör",
        description: "Betalning till leverantör",
        accounts: [
          { debit: "2440", credit: "1930" },
        ],
      },
    ],
    dashboardWidgets: ["revenue", "expenses", "receivables", "payables"],
  },
};

export const getIndustryTemplate = (industry: IndustryType | null): IndustryTemplate => {
  return INDUSTRY_TEMPLATES[industry || "general"];
};

export const getIndustrySpecificAccounts = (industry: IndustryType | null) => {
  const template = getIndustryTemplate(industry);
  return template.keyAccounts.filter(acc => acc.importance === "high");
};
