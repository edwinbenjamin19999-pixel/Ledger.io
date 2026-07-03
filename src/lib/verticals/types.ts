import type { Industry } from "@/contexts/IndustryContext";

export interface VerticalKPI {
  key: string;
  label: string;
  format: "currency" | "percent" | "number";
  target?: { min?: number; max?: number };
}

export interface VerticalModule {
  id: string;
  label: string;
  path: string;
  icon?: string;
  description?: string;
}

export interface VerticalProfile {
  id: string;
  name: string;
  industries: Industry[];
  workspacePath: string;
  modules: VerticalModule[];
  kpis: VerticalKPI[];
  insightGenerator: string; // edge function name
}
