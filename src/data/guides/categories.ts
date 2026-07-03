import { Rocket, Receipt, FileText, Truck, Calculator, BookCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface GuideCategory {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  count: number;
}

export const GUIDE_CATEGORIES: GuideCategory[] = [
  { id: "kom-igang", label: "Kom igång med bokföring", description: "Grunderna varje företagare behöver kunna.", icon: Rocket, count: 4 },
  { id: "kvitton", label: "Kvitton & underlag", description: "Hantera kvitton digitalt och korrekt.", icon: Receipt, count: 3 },
  { id: "fakturor", label: "Fakturor", description: "Skapa, skicka och bokför kundfakturor.", icon: FileText, count: 4 },
  { id: "leverantorer", label: "Leverantörsfakturor", description: "Inköp, attest och betalningsflöden.", icon: Truck, count: 3 },
  { id: "moms", label: "Moms", description: "Momskoder, deklaration och avdrag.", icon: Calculator, count: 5 },
  { id: "bokslut", label: "Bokslut & rapportering", description: "Från månadsavstämning till årsredovisning.", icon: BookCheck, count: 4 },
];
