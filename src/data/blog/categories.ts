import type { Category } from "./types";

export const CATEGORIES: Category[] = [
  { id: "ai-bokforing", label: "AI & bokföring", tint: "bg-blue-50", text: "text-blue-700" },
  { id: "moms", label: "Moms", tint: "bg-amber-50", text: "text-amber-700" },
  { id: "guider", label: "Guider", tint: "bg-blue-50", text: "text-blue-700" },
  { id: "tillvaxt", label: "Tillväxt", tint: "bg-indigo-50", text: "text-indigo-700" },
  { id: "byra-wl", label: "Byrå & White Label", tint: "bg-purple-50", text: "text-purple-700" },
  { id: "produktnyheter", label: "Produktnyheter", tint: "bg-slate-100", text: "text-slate-700" },
];

export const getCategory = (id: string) =>
  CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
