// DEPRECATED: Use src/components/tax-agent/forms/AGIForm.tsx instead
// Kept for reference — do not import this component
export interface IndividualRecord {
  id: string;
  name: string;
  personal_number: string;
  spec_number: number;
  status: "complete" | "incomplete" | "warning";
  // AGI field codes
  field_001: number; // Avdragen preliminär skatt
  field_011: number; // Kontant bruttolön m.m.
  field_012: number; // Övriga skattepliktiga förmåner
  field_013: number; // Bilförmån
  field_014: number; // Kostförmån
  field_015: number; // Bostadsförmån
  field_016: number; // Övriga förmåner
  field_020: number; // Sjuklön
  field_035: number; // Pensionsförsäkringspremie
  showAllFields: boolean;
  expanded: boolean;
  // Försäkringskassan
  fk_expanded: boolean;
  fk_date: string;
  fk_type: string;
  fk_spec: string;
  fk_records: FKRecord[];
  fk_multiday: boolean;
}

export interface FKRecord {
  date: string;
  type: string;
  spec: string;
}

export interface EmployerFields {
  // Skatteavdrag
  field_492: number;
  field_496: number;
  field_491: number;
  field_495: number;
  // Avdrag arbetsgivaravgifter
  field_471: number;
  field_476: number;
  field_463: number;
  field_470: number;
  field_475: number;
  field_472: number;
  field_477: number;
  // SLF
  field_481: number;
  field_486: number;
  // Fast driftställe
  field_302: boolean;
}

export interface AGIState {
  step: number;
  completedSteps: number[];
  individuals: IndividualRecord[];
  employer: EmployerFields;
  reviewed: boolean;
  receiptNumber: string;
  submittedAt: string;
  companyName: string;
  orgNumber: string;
  period: string;
  periodMonth: number;
  periodYear: number;
}

export const defaultEmployerFields: EmployerFields = {
  field_492: 0, field_496: 0, field_491: 0, field_495: 0,
  field_471: 0, field_476: 0, field_463: 0,
  field_470: 0, field_475: 0, field_472: 0, field_477: 0,
  field_481: 0, field_486: 0, field_302: false,
};

export const AGI_FIELD_TOOLTIPS: Record<string, string> = {
  "001": "Avdragen preliminär skatt – det belopp som dragits av från ersättningen enligt skattetabell eller beslut.",
  "011": "Kontant bruttolön och annan kontant ersättning för arbete, före skatteavdrag.",
  "012": "Värdet av övriga skattepliktiga förmåner som inte redovisas i fält 013–016.",
  "013": "Värdet av bilförmån beräknat enligt Skatteverkets regler.",
  "014": "Värdet av fri kost (fria måltider) beräknat enligt schablon.",
  "015": "Värdet av fri bostad beräknat enligt schablon eller marknadsvärde.",
  "016": "Värdet av övriga skattepliktiga förmåner.",
  "020": "Sjuklön som arbetsgivaren betalar under sjuklöneperioden (dag 2–14).",
  "035": "Pensionsförsäkringspremie betald av arbetsgivaren.",
  "492": "Underlag för skatteavdrag på ränta och utdelning.",
  "496": "Avdragen skatt på ränta och utdelning.",
  "491": "Underlag för skatteavdrag på pensionsförsäkring.",
  "495": "Avdragen skatt på pensionsförsäkring.",
  "471": "Underlag för regionalt stöd – avdrag från arbetsgivaravgifter.",
  "476": "Avdrag regionalt stöd från arbetsgivaravgifter.",
  "463": "Annat driftsstöd som påverkar avdraget.",
  "470": "Underlag för avdrag forskning och utveckling.",
  "475": "Avdrag forskning och utveckling från arbetsgivaravgifter.",
  "472": "Underlag för avdrag vid regress för rederier.",
  "477": "Avdrag för rederier vid regress.",
  "481": "Underlag för särskild löneskatt (SLF) på vinstandel och sjukpension.",
  "486": "Särskild löneskatt på vinstandel och sjukpension.",
  "302": "Markera om det saknas fast driftställe i Sverige.",
  "487": "Summa arbetsgivaravgifter och särskild löneskatt. Beräknas automatiskt.",
  "497": "Summa skatteavdrag. Beräknas automatiskt från individuppgifterna.",
};
