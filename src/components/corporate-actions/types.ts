export type ActionType =
  | "unconditional_contribution"
  | "conditional_contribution"
  | "shareholder_loan_in"
  | "shareholder_loan_out"
  | "loan_repayment"
  | "loan_interest"
  | "dividend_proposal"
  | "dividend_agm"
  | "new_share_issue"
  | "bonus_issue"
  | "board_resolution"
  | "agm"
  | "extra_meeting"
  | "board_change"
  | "signatory_change"
  | "revers"
  | "internal_agreement";

export type ActionStatus =
  | "draft"
  | "needs_input"
  | "pending_review"
  | "pending_approval"
  | "pending_signing"
  | "ready_to_execute"
  | "executed"
  | "archived"
  | "cancelled";

export type ActionCategory = "capital" | "dividend" | "governance" | "documents";

export interface CorporateAction {
  id: string;
  type: ActionType;
  title: string;
  description: string;
  status: ActionStatus;
  category: ActionCategory;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  data: Record<string, unknown>;
  documents: ActionDocument[];
  journal_entry_id?: string;
  signed_by?: SignerRecord[];
  created_by?: string;
  audit_trail: AuditEntry[];
}

export interface SignerRecord {
  name: string;
  role: string;
  signed_at?: string;
  status: "pending" | "signed" | "declined";
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  user: string;
  details?: string;
}

export interface ActionDocument {
  id: string;
  title: string;
  type: "board_minutes" | "agreement" | "protocol" | "resolution" | "revers" | "other";
  content: string;
  created_at: string;
  version: number;
  signed: boolean;
}

export interface ActionTemplate {
  type: ActionType;
  category: ActionCategory;
  label: string;
  description: string;
  simpleLabel: string;
  icon: string;
  fields: ActionField[];
  documents: string[];
  accounts: AccountMapping[];
  requiresSigning: boolean;
  signerRoles: string[];
  riskLevel: "low" | "medium" | "high";
}

export interface ActionField {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "textarea";
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  helpText?: string;
}

export interface AccountMapping {
  description: string;
  debit: string;
  debitName: string;
  credit: string;
  creditName: string;
  amountField: string;
}

export interface WizardStep {
  id: string;
  title: string;
  description: string;
}

export const ACTION_CATEGORIES: { id: ActionCategory; label: string; description: string }[] = [
  { id: "capital", label: "Kapital & ägarinsatser", description: "Tillskott, lån, emissioner och kapitalförändringar" },
  { id: "dividend", label: "Utdelning & resultat", description: "Vinstdisposition, utdelningsbeslut" },
  { id: "governance", label: "Styrelse & bolagsstämma", description: "Beslut, protokoll, förändringar" },
  { id: "documents", label: "Avtal & dokument", description: "Revers, avtal och andra bolagshandlingar" },
];

export const ACTION_TEMPLATES: Record<ActionType, ActionTemplate> = {
  unconditional_contribution: {
    type: "unconditional_contribution",
    category: "capital",
    label: "Ovillkorat aktieägartillskott",
    simpleLabel: "Sätt in pengar permanent",
    description: "Ökar permanent fritt eget kapital. Kan inte återkrävas.",
    icon: "PiggyBank",
    fields: [
      { key: "amount", label: "Belopp (kr)", type: "number", required: true, placeholder: "100000" },
      { key: "contributor_name", label: "Tillskottsgivare", type: "text", required: true, placeholder: "Namn på aktieägaren" },
      { key: "purpose", label: "Syfte", type: "textarea", required: false, placeholder: "T.ex. täcka underskott, finansiera expansion" },
      { key: "date", label: "Datum", type: "date", required: true },
    ],
    documents: ["Styrelseprotokoll", "Tillskottsavtal"],
    accounts: [
      { description: "Ovillkorat aktieägartillskott", debit: "1930", debitName: "Företagskonto", credit: "2083", creditName: "Erhållna aktieägartillskott", amountField: "amount" },
    ],
    requiresSigning: true,
    signerRoles: ["Styrelseordförande", "Tillskottsgivare"],
    riskLevel: "medium",
  },
  conditional_contribution: {
    type: "conditional_contribution",
    category: "capital",
    label: "Villkorat aktieägartillskott",
    simpleLabel: "Sätt in pengar med rätt till återbetalning",
    description: "Ger rätt till återbetalning när fritt eget kapital medger det.",
    icon: "PiggyBank",
    fields: [
      { key: "amount", label: "Belopp (kr)", type: "number", required: true, placeholder: "100000" },
      { key: "contributor_name", label: "Tillskottsgivare", type: "text", required: true, placeholder: "Namn på aktieägaren" },
      { key: "repayment_conditions", label: "Villkor för återbetalning", type: "textarea", required: false, placeholder: "T.ex. när fritt eget kapital överstiger X kr" },
      { key: "purpose", label: "Syfte", type: "textarea", required: false },
      { key: "date", label: "Datum", type: "date", required: true },
    ],
    documents: ["Styrelseprotokoll", "Villkorat tillskottsavtal"],
    accounts: [
      { description: "Villkorat aktieägartillskott", debit: "1930", debitName: "Företagskonto", credit: "2093", creditName: "Erhållet villkorat aktieägartillskott", amountField: "amount" },
    ],
    requiresSigning: true,
    signerRoles: ["Styrelseordförande", "Tillskottsgivare"],
    riskLevel: "medium",
  },
  shareholder_loan_in: {
    type: "shareholder_loan_in",
    category: "capital",
    label: "Lån från aktieägare till bolag",
    simpleLabel: "Låna in pengar till bolaget",
    description: "Aktieägare lånar ut pengar till bolaget. Skapar skuld i balansräkningen.",
    icon: "ArrowLeftRight",
    fields: [
      { key: "amount", label: "Lånebelopp (kr)", type: "number", required: true, placeholder: "200000" },
      { key: "lender_name", label: "Långivare", type: "text", required: true, placeholder: "Namn på aktieägaren" },
      { key: "interest_rate", label: "Ränta (% per år)", type: "number", required: true, placeholder: "3.5" },
      { key: "maturity_date", label: "Förfallodag", type: "date", required: true },
      { key: "amortization", label: "Amortering", type: "select", required: true, options: [
        { value: "none", label: "Ingen amortering (bullet)" },
        { value: "monthly", label: "Månadsvis" },
        { value: "quarterly", label: "Kvartalsvis" },
        { value: "annual", label: "Årsvis" },
      ]},
      { key: "date", label: "Datum", type: "date", required: true },
    ],
    documents: ["Skuldebrev/Revers", "Styrelseprotokoll"],
    accounts: [
      { description: "Lån från aktieägare", debit: "1930", debitName: "Företagskonto", credit: "2393", creditName: "Lån från närstående", amountField: "amount" },
    ],
    requiresSigning: true,
    signerRoles: ["Firmatecknare", "Långivare"],
    riskLevel: "low",
  },
  shareholder_loan_out: {
    type: "shareholder_loan_out",
    category: "capital",
    label: "Lån från bolag till aktieägare",
    simpleLabel: "Låna ut pengar från bolaget",
    description: "Bolaget lånar ut till aktieägare. OBS: Låneförbudet i ABL 21 kap.",
    icon: "ArrowLeftRight",
    fields: [
      { key: "amount", label: "Lånebelopp (kr)", type: "number", required: true },
      { key: "borrower_name", label: "Låntagare", type: "text", required: true },
      { key: "interest_rate", label: "Ränta (% per år)", type: "number", required: true, placeholder: "3.5" },
      { key: "maturity_date", label: "Förfallodag", type: "date", required: true },
      { key: "legal_basis", label: "Laglig grund (undantag från låneförbudet)", type: "textarea", required: true, helpText: "Ange varför detta lån inte omfattas av låneförbudet i ABL 21 kap." },
      { key: "date", label: "Datum", type: "date", required: true },
    ],
    documents: ["Skuldebrev/Revers", "Styrelseprotokoll", "Juridisk bedömning"],
    accounts: [
      { description: "Lån till aktieägare", debit: "1380", debitName: "Andra långfristiga fordringar", credit: "1930", creditName: "Företagskonto", amountField: "amount" },
    ],
    requiresSigning: true,
    signerRoles: ["Firmatecknare", "Låntagare"],
    riskLevel: "high",
  },
  loan_repayment: {
    type: "loan_repayment",
    category: "capital",
    label: "Återbetalning av lån",
    simpleLabel: "Betala tillbaka lån",
    description: "Amortering eller slutbetalning av befintligt aktieägarlån.",
    icon: "ArrowLeftRight",
    fields: [
      { key: "amount", label: "Belopp (kr)", type: "number", required: true },
      { key: "loan_reference", label: "Referens till befintligt lån", type: "text", required: true },
      { key: "repayment_type", label: "Typ", type: "select", required: true, options: [
        { value: "partial", label: "Delamortering" },
        { value: "full", label: "Slutbetalning" },
      ]},
      { key: "date", label: "Datum", type: "date", required: true },
    ],
    documents: ["Kvittens"],
    accounts: [
      { description: "Återbetalning aktieägarlån", debit: "2393", debitName: "Lån från närstående", credit: "1930", creditName: "Företagskonto", amountField: "amount" },
    ],
    requiresSigning: false,
    signerRoles: [],
    riskLevel: "low",
  },
  loan_interest: {
    type: "loan_interest",
    category: "capital",
    label: "Ränta på aktieägarlån",
    simpleLabel: "Bokför ränta på lån",
    description: "Beräkna och bokför upplupen ränta på aktieägarlån.",
    icon: "Calculator",
    fields: [
      { key: "interest_amount", label: "Räntebelopp (kr)", type: "number", required: true },
      { key: "loan_reference", label: "Referens till lån", type: "text", required: true },
      { key: "period_start", label: "Ränteperiod start", type: "date", required: true },
      { key: "period_end", label: "Ränteperiod slut", type: "date", required: true },
      { key: "date", label: "Bokföringsdatum", type: "date", required: true },
    ],
    documents: [],
    accounts: [
      { description: "Räntekostnad aktieägarlån", debit: "8410", debitName: "Räntekostnader", credit: "2960", creditName: "Upplupna räntekostnader", amountField: "interest_amount" },
    ],
    requiresSigning: false,
    signerRoles: [],
    riskLevel: "low",
  },
  dividend_proposal: {
    type: "dividend_proposal",
    category: "dividend",
    label: "Utdelningsförslag",
    simpleLabel: "Föreslå utdelning",
    description: "Styrelsens förslag till vinstdisposition inför bolagsstämma.",
    icon: "Banknote",
    fields: [
      { key: "total_amount", label: "Föreslaget utdelningsbelopp (kr)", type: "number", required: true },
      { key: "per_share", label: "Belopp per aktie (kr)", type: "number", required: true },
      { key: "fiscal_year", label: "Avser räkenskapsår", type: "text", required: true, placeholder: "2025" },
      { key: "date", label: "Datum", type: "date", required: true },
    ],
    documents: ["Styrelsens förslag till vinstdisposition"],
    accounts: [],
    requiresSigning: true,
    signerRoles: ["Styrelseordförande"],
    riskLevel: "medium",
  },
  dividend_agm: {
    type: "dividend_agm",
    category: "dividend",
    label: "Utdelningsbeslut (stämma)",
    simpleLabel: "Besluta om utdelning",
    description: "Formellt stämmobeslut om utdelning till aktieägare.",
    icon: "Banknote",
    fields: [
      { key: "total_amount", label: "Totalt utdelningsbelopp (kr)", type: "number", required: true },
      { key: "per_share", label: "Belopp per aktie (kr)", type: "number", required: true },
      { key: "record_date", label: "Avstämningsdag", type: "date", required: true },
      { key: "payment_date", label: "Utbetalningsdag", type: "date", required: true },
      { key: "fiscal_year", label: "Avser räkenskapsår", type: "text", required: true },
      { key: "date", label: "Stämmodatum", type: "date", required: true },
    ],
    documents: ["Bolagsstämmoprotokoll", "Utdelningsbeslut"],
    accounts: [
      { description: "Utdelningsbeslut", debit: "2091", debitName: "Balanserat resultat", credit: "2898", creditName: "Outtagen utdelning", amountField: "total_amount" },
    ],
    requiresSigning: true,
    signerRoles: ["Stämmoordförande", "Protokolljusterare"],
    riskLevel: "high",
  },
  new_share_issue: {
    type: "new_share_issue",
    category: "capital",
    label: "Nyemission",
    simpleLabel: "Ge ut nya aktier",
    description: "Ökning av aktiekapitalet genom emission av nya aktier.",
    icon: "TrendingUp",
    fields: [
      { key: "num_shares", label: "Antal nya aktier", type: "number", required: true },
      { key: "price_per_share", label: "Teckningskurs per aktie (kr)", type: "number", required: true },
      { key: "quota_value", label: "Kvotvärde per aktie (kr)", type: "number", required: true },
      { key: "subscribers", label: "Tecknare", type: "textarea", required: true, placeholder: "Namn och antal aktier per tecknare" },
      { key: "date", label: "Datum", type: "date", required: true },
    ],
    documents: ["Bolagsstämmoprotokoll", "Teckningslista", "Registrering Bolagsverket"],
    accounts: [
      { description: "Nyemission — aktiekapital", debit: "1930", debitName: "Företagskonto", credit: "2081", creditName: "Aktiekapital", amountField: "quota_total" },
    ],
    requiresSigning: true,
    signerRoles: ["Styrelseordförande", "Samtliga tecknare"],
    riskLevel: "high",
  },
  bonus_issue: {
    type: "bonus_issue",
    category: "capital",
    label: "Fondemission",
    simpleLabel: "Öka aktiekapital utan nya pengar",
    description: "Överföring från fritt eget kapital till bundet eget kapital.",
    icon: "TrendingUp",
    fields: [
      { key: "amount", label: "Belopp (kr)", type: "number", required: true },
      { key: "source", label: "Källa", type: "select", required: true, options: [
        { value: "retained_earnings", label: "Balanserat resultat" },
        { value: "share_premium", label: "Överkursfond" },
      ]},
      { key: "date", label: "Datum", type: "date", required: true },
    ],
    documents: ["Bolagsstämmoprotokoll", "Registrering Bolagsverket"],
    accounts: [
      { description: "Fondemission", debit: "2091", debitName: "Balanserat resultat", credit: "2081", creditName: "Aktiekapital", amountField: "amount" },
    ],
    requiresSigning: true,
    signerRoles: ["Stämmoordförande"],
    riskLevel: "medium",
  },
  board_resolution: {
    type: "board_resolution",
    category: "governance",
    label: "Styrelsebeslut",
    simpleLabel: "Fatta styrelsebeslut",
    description: "Formellt styrelsebeslut med protokoll.",
    icon: "FileText",
    fields: [
      { key: "subject", label: "Ärende", type: "text", required: true, placeholder: "T.ex. Godkännande av budget 2026" },
      { key: "decision", label: "Beslut", type: "textarea", required: true, placeholder: "Formulera beslutet" },
      { key: "attendees", label: "Närvarande ledamöter", type: "textarea", required: true, placeholder: "Namn, separerade med komma" },
      { key: "date", label: "Datum", type: "date", required: true },
    ],
    documents: ["Styrelseprotokoll"],
    accounts: [],
    requiresSigning: true,
    signerRoles: ["Styrelseordförande", "Protokolljusterare"],
    riskLevel: "low",
  },
  agm: {
    type: "agm",
    category: "governance",
    label: "Årsstämma",
    simpleLabel: "Håll ordinarie bolagsstämma",
    description: "Protokoll och beslut från ordinarie bolagsstämma.",
    icon: "Users",
    fields: [
      { key: "fiscal_year", label: "Räkenskapsår", type: "text", required: true, placeholder: "2025" },
      { key: "date", label: "Stämmodatum", type: "date", required: true },
      { key: "chairman", label: "Stämmoordförande", type: "text", required: true },
      { key: "secretary", label: "Protokollförare", type: "text", required: true },
      { key: "dividend_decision", label: "Vinstdisposition", type: "select", required: true, options: [
        { value: "dividend", label: "Utdelning till aktieägarna" },
        { value: "retain", label: "Balanseras i ny räkning" },
        { value: "both", label: "Delvis utdelning, delvis balansering" },
      ]},
      { key: "board_discharge", label: "Ansvarsfrihet", type: "select", required: true, options: [
        { value: "yes", label: "Ja, beviljas" },
        { value: "no", label: "Nej, beviljas ej" },
      ]},
    ],
    documents: ["Bolagsstämmoprotokoll", "Röstlängd"],
    accounts: [],
    requiresSigning: true,
    signerRoles: ["Stämmoordförande", "Protokolljusterare"],
    riskLevel: "medium",
  },
  extra_meeting: {
    type: "extra_meeting",
    category: "governance",
    label: "Extra bolagsstämma",
    simpleLabel: "Kalla till extra stämma",
    description: "Protokoll och beslut från extra bolagsstämma.",
    icon: "Users",
    fields: [
      { key: "purpose", label: "Syfte med extra stämma", type: "textarea", required: true },
      { key: "date", label: "Stämmodatum", type: "date", required: true },
      { key: "chairman", label: "Stämmoordförande", type: "text", required: true },
      { key: "secretary", label: "Protokollförare", type: "text", required: true },
      { key: "decision", label: "Beslut", type: "textarea", required: true },
    ],
    documents: ["Protokoll extra bolagsstämma", "Kallelse"],
    accounts: [],
    requiresSigning: true,
    signerRoles: ["Stämmoordförande", "Protokolljusterare"],
    riskLevel: "medium",
  },
  board_change: {
    type: "board_change",
    category: "governance",
    label: "Ändring av styrelse",
    simpleLabel: "Byt styrelseledamöter",
    description: "Registrera nya eller avgående styrelseledamöter.",
    icon: "UserCog",
    fields: [
      { key: "change_type", label: "Typ av ändring", type: "select", required: true, options: [
        { value: "add", label: "Ny ledamot tillträder" },
        { value: "remove", label: "Ledamot avgår" },
        { value: "replace", label: "Byte av ledamot" },
      ]},
      { key: "person_name", label: "Personens namn", type: "text", required: true },
      { key: "person_id", label: "Personnummer", type: "text", required: false, helpText: "Krävs för registrering hos Bolagsverket" },
      { key: "role", label: "Roll", type: "select", required: true, options: [
        { value: "member", label: "Styrelseledamot" },
        { value: "chairman", label: "Styrelseordförande" },
        { value: "deputy", label: "Styrelsesuppleant" },
      ]},
      { key: "date", label: "Datum", type: "date", required: true },
    ],
    documents: ["Bolagsstämmoprotokoll", "Registrering Bolagsverket"],
    accounts: [],
    requiresSigning: true,
    signerRoles: ["Stämmoordförande"],
    riskLevel: "medium",
  },
  signatory_change: {
    type: "signatory_change",
    category: "governance",
    label: "Ändring av firmateckning",
    simpleLabel: "Ändra vem som tecknar firman",
    description: "Ändra firmateckningsrätt och registrera hos Bolagsverket.",
    icon: "Shield",
    fields: [
      { key: "new_signatory", label: "Ny firmatecknare", type: "text", required: true },
      { key: "signatory_rule", label: "Firmateckningsregel", type: "textarea", required: true, placeholder: "T.ex. Styrelsen i sin helhet, eller VD ensam" },
      { key: "date", label: "Datum", type: "date", required: true },
    ],
    documents: ["Styrelseprotokoll", "Registrering Bolagsverket"],
    accounts: [],
    requiresSigning: true,
    signerRoles: ["Styrelseordförande"],
    riskLevel: "medium",
  },
  revers: {
    type: "revers",
    category: "documents",
    label: "Skuldebrev / Revers",
    simpleLabel: "Skapa ett skuldebrev",
    description: "Formellt skuldebrev mellan parter.",
    icon: "ScrollText",
    fields: [
      { key: "amount", label: "Belopp (kr)", type: "number", required: true },
      { key: "lender_name", label: "Långivare", type: "text", required: true },
      { key: "borrower_name", label: "Låntagare", type: "text", required: true },
      { key: "interest_rate", label: "Ränta (% per år)", type: "number", required: true },
      { key: "maturity_date", label: "Förfallodag", type: "date", required: true },
      { key: "amortization", label: "Amortering", type: "select", required: true, options: [
        { value: "none", label: "Ingen amortering" },
        { value: "monthly", label: "Månadsvis" },
        { value: "quarterly", label: "Kvartalsvis" },
        { value: "annual", label: "Årsvis" },
      ]},
      { key: "date", label: "Datum", type: "date", required: true },
    ],
    documents: ["Skuldebrev/Revers"],
    accounts: [],
    requiresSigning: true,
    signerRoles: ["Långivare", "Låntagare"],
    riskLevel: "low",
  },
  internal_agreement: {
    type: "internal_agreement",
    category: "documents",
    label: "Internt avtal",
    simpleLabel: "Skapa avtal",
    description: "Avtal mellan bolag och ägare/styrelse.",
    icon: "FileCheck",
    fields: [
      { key: "agreement_type", label: "Avtalstyp", type: "select", required: true, options: [
        { value: "management", label: "Managementavtal" },
        { value: "consultancy", label: "Konsultavtal med ägare" },
        { value: "rental", label: "Hyresavtal" },
        { value: "service", label: "Tjänsteavtal" },
        { value: "other", label: "Annat" },
      ]},
      { key: "parties", label: "Parter", type: "textarea", required: true, placeholder: "T.ex. Bolaget AB och Ägare AB" },
      { key: "description", label: "Beskrivning", type: "textarea", required: true },
      { key: "monthly_amount", label: "Månatligt belopp (kr)", type: "number", required: false },
      { key: "start_date", label: "Startdatum", type: "date", required: true },
      { key: "end_date", label: "Slutdatum", type: "date", required: false },
    ],
    documents: ["Avtal", "Styrelseprotokoll"],
    accounts: [],
    requiresSigning: true,
    signerRoles: ["Firmatecknare", "Motpart"],
    riskLevel: "medium",
  },
};

export const STATUS_CONFIG: Record<ActionStatus, { label: string; color: string }> = {
  draft: { label: "Utkast", color: "bg-muted text-muted-foreground" },
  needs_input: { label: "Behöver uppgifter", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-[#C28A2B]" },
  pending_review: { label: "Granskas", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-[#1E3A5F]" },
  pending_approval: { label: "Väntar godkännande", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-[#1E3A5F]" },
  pending_signing: { label: "Väntar signering", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  ready_to_execute: { label: "Redo att verkställa", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400" },
  executed: { label: "Verkställd", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-[#1D9E75]" },
  archived: { label: "Arkiverad", color: "bg-muted text-muted-foreground" },
  cancelled: { label: "Avbruten", color: "bg-destructive/10 text-destructive" },
};
