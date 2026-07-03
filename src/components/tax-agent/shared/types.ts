export type CompanyType = "ab" | "ef" | "hb" | "ek";
export type FormStatus = "not_started" | "ai_preparing" | "ready_review" | "submitted";
export type FieldConfidence = "high" | "medium" | "low";

export interface DeclarationField {
  code: string;
  label: string;
  value: number;
  aiValue: number;
  confidence: FieldConfidence;
  explanation?: string;
  type: "amount" | "info" | "calculated";
  editable: boolean;
  comment?: string;
}

export interface DeclarationFormConfig {
  code: string;
  name: string;
  description: string;
  category: string;
  companyTypes: CompanyType[];
  deadline?: string;
  fields: DeclarationField[];
  subForms?: string[];
}

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  ab: "Aktiebolag",
  ef: "Enskild firma",
  hb: "Handelsbolag/KB",
  ek: "Ekonomisk förening",
};

export const STATUS_LABELS: Record<FormStatus, string> = {
  not_started: "Ej påbörjad",
  ai_preparing: "AI förbereder",
  ready_review: "Klar för granskning",
  submitted: "Inlämnad",
};

export const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
