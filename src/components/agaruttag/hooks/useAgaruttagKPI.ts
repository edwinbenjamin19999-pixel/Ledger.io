import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AgaruttagKPIData {
  loading: boolean;
  egetKapital: number;
  periodiseringsfond: number;
  cashBalance: number;
}

export function useAgaruttagKPI(): AgaruttagKPIData {
  const [loading, setLoading] = useState(true);
  const [egetKapital, setEgetKapital] = useState(0);
  const [periodiseringsfond, setPeriodiseringsfond] = useState(0);
  const [cashBalance, setCashBalance] = useState(0);

  useEffect(() => {
    const companyId = localStorage.getItem("selectedCompanyId");
    if (!companyId) { setLoading(false); return; }

    (async () => {
      try {
        const { data: lines } = await supabase
          .from("journal_entry_lines")
          .select("debit, credit, account_id, journal_entries!inner(company_id, status)")
          .eq("journal_entries.company_id", companyId)
          .eq("journal_entries.status", "approved");

        if (!lines?.length) { setLoading(false); return; }

        const { data: accounts } = await supabase
          .from("chart_of_accounts")
          .select("id, account_number")
          .eq("company_id", companyId);

        const acctMap = new Map<string, string>();
        accounts?.forEach(a => acctMap.set(a.id, a.account_number));

        let ek = 0, pf = 0, cash = 0;
        for (const line of lines) {
          const num = acctMap.get(line.account_id) || "";
          const n = parseInt(num, 10);
          const d = Number(line.debit) || 0;
          const c = Number(line.credit) || 0;
          if (n >= 2081 && n <= 2099) ek += c - d;
          if (n >= 2100 && n <= 2119) pf += c - d;
          if (n >= 1910 && n <= 1949) cash += d - c;
        }
        setEgetKapital(ek);
        setPeriodiseringsfond(pf);
        setCashBalance(cash);
      } catch (err) {
        console.error("KPI fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { loading, egetKapital, periodiseringsfond, cashBalance };
}
