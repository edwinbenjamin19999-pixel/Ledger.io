import type { VerticalProfile } from "./types";

export const hospitalityProfile: VerticalProfile = {
  id: "hospitality",
  name: "Restaurang & Hotell",
  industries: ["restaurant", "hotel"],
  workspacePath: "/workspace/hospitality",
  modules: [
    { id: "overview", label: "Översikt", path: "/workspace/hospitality" },
    { id: "reconciliation", label: "Avstämning", path: "/workspace/hospitality/reconciliation" },
    { id: "suppliers", label: "Leverantörer", path: "/workspace/hospitality/suppliers" },
    { id: "onboarding", label: "Kom igång", path: "/workspace/hospitality/onboarding" },
    { id: "pos", label: "Kassaregister", path: "/kassaregister" },
    { id: "payroll", label: "Löner", path: "/hr" },
    { id: "vat", label: "Moms & AGI", path: "/calendar" },
  ],
  kpis: [
    { key: "food_cost_pct", label: "Food cost %", format: "percent", target: { min: 28, max: 32 } },
    { key: "drink_cost_pct", label: "Dryck %", format: "percent", target: { min: 18, max: 22 } },
    { key: "staff_cost_pct", label: "Personalkostnad %", format: "percent", target: { min: 28, max: 32 } },
    { key: "prime_cost_pct", label: "Prime cost %", format: "percent", target: { max: 65 } },
  ],
  insightGenerator: "hospitality-ai-insights",
};
