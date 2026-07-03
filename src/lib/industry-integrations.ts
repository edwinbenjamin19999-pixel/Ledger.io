/**
 * Industry-specific integration recommendations.
 * Guides users to connect the right POS, HR, and booking systems for their business.
 */

export interface IntegrationRecommendation {
  id: string;
  name: string;
  category: "pos" | "hr" | "booking" | "ecommerce" | "industry" | "payment";
  description: string;
  setupSteps: string[];
  apiKeyName?: string; // secret name if required
  docsUrl?: string;
  priority: "critical" | "recommended" | "optional";
  logoInitials: string;
}

export const INTEGRATIONS_BY_INDUSTRY: Record<string, IntegrationRecommendation[]> = {
  restaurant: [
    {
      id: "caspeco",
      name: "Caspeco",
      category: "pos",
      description: "Kassasystem + personalschema för restauranger. Synkar försäljning och timrapporter.",
      setupSteps: [
        "Logga in på admin.caspeco.se",
        "Gå till Inställningar → API-nycklar",
        "Skapa en ny nyckel med läs-behörighet",
        "Klistra in nyckeln här — vi synkar dagligen",
      ],
      apiKeyName: "CASPECO_API_KEY",
      docsUrl: "https://caspeco.se/integrationer",
      priority: "critical",
      logoInitials: "CA",
    },
    {
      id: "personalkollen",
      name: "Personalkollen",
      category: "hr",
      description: "Schema + tidrapportering. Ger oss lönekostnad % av omsättning i realtid.",
      setupSteps: [
        "Gå till app.personalkollen.se → Inställningar → Integrationer",
        "Aktivera API-åtkomst",
        "Kopiera access-token",
        "Klistra in här så importeras timkostnader automatiskt",
      ],
      apiKeyName: "PERSONALKOLLEN_API_KEY",
      docsUrl: "https://personalkollen.se/api",
      priority: "critical",
      logoInitials: "PK",
    },
    {
      id: "trivec",
      name: "Trivec",
      category: "pos",
      description: "POS för hotell och restaurang — bokföring av dagskassor.",
      setupSteps: [
        "Kontakta Trivec support för API-nyckel",
        "Klistra in nyckeln här",
      ],
      apiKeyName: "TRIVEC_API_KEY",
      priority: "recommended",
      logoInitials: "TR",
    },
    {
      id: "winpos",
      name: "Winpos",
      category: "pos",
      description: "Kassasystem med export av Z-rapporter.",
      setupSteps: [
        "I Winpos → Admin → Integrationer",
        "Aktivera Bokfy-export",
        "Kopiera API-nyckel och klistra in här",
      ],
      apiKeyName: "WINPOS_API_KEY",
      priority: "optional",
      logoInitials: "WI",
    },
    {
      id: "zettle",
      name: "Zettle (PayPal)",
      category: "pos",
      description: "Mobila kortterminaler — vanligt för food trucks och små caféer.",
      setupSteps: [
        "Gå till developer.zettle.com",
        "Skapa en app → få Client ID + Secret",
        "Klistra in båda här",
      ],
      apiKeyName: "ZETTLE_API_KEY",
      docsUrl: "https://developer.zettle.com",
      priority: "recommended",
      logoInitials: "ZE",
    },
    {
      id: "fortnox",
      name: "Fortnox",
      category: "booking",
      description: "Migrera från Fortnox till Bokfy — all historik följer med.",
      setupSteps: [
        "Gå till /migration i Bokfy",
        "Välj Fortnox → OAuth",
        "Godkänn åtkomst",
      ],
      priority: "optional",
      logoInitials: "FX",
    },
  ],

  hotel: [
    {
      id: "sitewize",
      name: "Sitewize PMS",
      category: "booking",
      description: "Property Management System — synka bokningar, RevPAR och beläggning.",
      setupSteps: [
        "Kontakta Sitewize support",
        "Begär API-åtkomst till Bokfy",
        "Klistra in nyckeln här",
      ],
      apiKeyName: "SITEWIZE_API_KEY",
      priority: "critical",
      logoInitials: "SW",
    },
    {
      id: "caspeco",
      name: "Caspeco",
      category: "pos",
      description: "Kassa för hotellets restaurang och bar.",
      setupSteps: ["Se Caspecos admin → API-nycklar"],
      apiKeyName: "CASPECO_API_KEY",
      priority: "critical",
      logoInitials: "CA",
    },
    {
      id: "personalkollen",
      name: "Personalkollen",
      category: "hr",
      description: "Schema för receptions-, städ- och restaurangpersonal.",
      setupSteps: ["app.personalkollen.se → Integrationer"],
      apiKeyName: "PERSONALKOLLEN_API_KEY",
      priority: "critical",
      logoInitials: "PK",
    },
  ],

  retail: [
    {
      id: "sitoo",
      name: "Sitoo",
      category: "pos",
      description: "Omnichannel POS — lager, butik och e-handel i en plattform.",
      setupSteps: [
        "Sitoo Backoffice → API → Generera nyckel",
        "Klistra in här",
      ],
      apiKeyName: "SITOO_API_KEY",
      priority: "critical",
      logoInitials: "SI",
    },
    {
      id: "zettle",
      name: "Zettle",
      category: "pos",
      description: "Mobila kortterminaler.",
      setupSteps: ["developer.zettle.com → skapa app"],
      apiKeyName: "ZETTLE_API_KEY",
      priority: "recommended",
      logoInitials: "ZE",
    },
    {
      id: "shopify",
      name: "Shopify",
      category: "ecommerce",
      description: "E-handel — ordrar bokförs automatiskt.",
      setupSteps: [
        "Shopify Admin → Apps → Private app",
        "Skapa Admin API access token",
        "Klistra in här",
      ],
      apiKeyName: "SHOPIFY_API_KEY",
      priority: "critical",
      logoInitials: "SH",
    },
  ],

  construction: [
    {
      id: "next",
      name: "Next (tidrapportering)",
      category: "hr",
      description: "Tidsrapportering per projekt — kopplar timmar till projektbokföring.",
      setupSteps: ["Next-admin → API → generera nyckel"],
      apiKeyName: "NEXT_API_KEY",
      priority: "critical",
      logoInitials: "NE",
    },
    {
      id: "tidrapportering",
      name: "Bokfy Tidrapportering",
      category: "industry",
      description: "Inbyggd tid + projektredovisning.",
      setupSteps: ["Aktiveras automatiskt — gå till /tidrapportering"],
      priority: "recommended",
      logoInitials: "TR",
    },
  ],

  real_estate: [
    {
      id: "vitec",
      name: "Vitec",
      category: "industry",
      description: "Fastighetssystem — hyresavier, vakanser, OH.",
      setupSteps: ["Kontakta Vitec för API-nyckel"],
      apiKeyName: "VITEC_API_KEY",
      priority: "recommended",
      logoInitials: "VI",
    },
  ],

  consulting: [
    {
      id: "harvest",
      name: "Harvest",
      category: "industry",
      description: "Tidrapportering och fakturering per projekt/kund.",
      setupSteps: ["Harvest → Developers → Personal Access Token"],
      apiKeyName: "HARVEST_API_KEY",
      priority: "recommended",
      logoInitials: "HA",
    },
  ],

  services: [
    {
      id: "fortnox",
      name: "Fortnox",
      category: "booking",
      description: "Migrera från Fortnox.",
      setupSteps: ["/migration → Fortnox"],
      priority: "optional",
      logoInitials: "FX",
    },
  ],

  general: [],
};

export const getIndustryIntegrations = (industry: string): IntegrationRecommendation[] => {
  return INTEGRATIONS_BY_INDUSTRY[industry] || INTEGRATIONS_BY_INDUSTRY.general;
};
