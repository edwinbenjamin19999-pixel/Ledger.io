import { useContext } from "react";
import { TechSupportContext } from "@/components/tech-support/TechSupportProvider";

export function useTechSupport() {
  const ctx = useContext(TechSupportContext);
  if (!ctx) {
    // Safe no-op fallback when used outside the provider (e.g. in iframe preview)
    return {
      report: () => {},
      registerSnapshot: () => {},
      monitorValidation: () => {},
    };
  }
  return ctx;
}
