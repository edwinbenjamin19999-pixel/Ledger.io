import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";

export type Industry =
  | "restaurant"
  | "hotel"
  | "retail"
  | "ecommerce"
  | "construction"
  | "real_estate"
  | "consulting"
  | "services"
  | "saas"
  | "manufacturing"
  | "healthcare"
  | "education"
  | "holding"
  | "general"
  | "other";

interface IndustryContextValue {
  industry: Industry;
  companyId: string | null;
  isLoading: boolean;
  refresh: () => void;
  // convenience flags
  isHospitality: boolean; // restaurant or hotel
  isRestaurant: boolean;
  isHotel: boolean;
  isRetail: boolean;
  isConstruction: boolean;
  isRealEstate: boolean;
  isConsulting: boolean;
}

const IndustryContext = createContext<IndustryContextValue>({
  industry: "general",
  companyId: null,
  isLoading: true,
  refresh: () => {},
  isHospitality: false,
  isRestaurant: false,
  isHotel: false,
  isRetail: false,
  isConstruction: false,
  isRealEstate: false,
  isConsulting: false,
});

export const IndustryProvider = ({ children }: { children: ReactNode }) => {
  const [industry, setIndustry] = useState<Industry>("general");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const load = async () => {
      const stored =
        typeof window !== "undefined"
          ? localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY)
          : null;
      if (!stored) {
        setIsLoading(false);
        return;
      }
      setCompanyId(stored);
      try {
        const { data, error } = await supabase
          .from("companies")
          .select("industry")
          .eq("id", stored)
          .maybeSingle();
        if (!error && data?.industry) {
          setIndustry(data.industry as Industry);
        }
      } catch (e) {
        // silent — fall back to general
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [tick]);

  // Listen to storage changes (company switch)
  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const value: IndustryContextValue = {
    industry,
    companyId,
    isLoading,
    refresh: () => setTick((t) => t + 1),
    isHospitality: industry === "restaurant" || industry === "hotel",
    isRestaurant: industry === "restaurant",
    isHotel: industry === "hotel",
    isRetail: industry === "retail" || industry === "ecommerce",
    isConstruction: industry === "construction",
    isRealEstate: industry === "real_estate",
    isConsulting: industry === "consulting" || industry === "services",
  };

  return (
    <IndustryContext.Provider value={value}>{children}</IndustryContext.Provider>
  );
};

export const useIndustry = () => useContext(IndustryContext);
