import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export interface ClosingPeriod { id: string;
  company_id: string;
  period_type: string;
  period_year: number;
  period_month: number | null;
  status: string;
  soft_closed_at: string | null;
  soft_closed_by: string | null;
  review_started_at: string | null;
  hard_closed_at: string | null;
  hard_closed_by: string | null;
  notes: string | null;
  progress_percent: number;
  created_at: string;
}

export interface ClosingChecklistItem { id: string;
  closing_period_id: string;
  company_id: string;
  category: string;
  title: string;
  description: string | null;
  status: string;
  assigned_to: string | null;
  completed_at: string | null;
  completed_by: string | null;
  sort_order: number;
  is_required: boolean;
  auto_check_type: string | null;
  auto_check_result: boolean | null;
  notes: string | null;
  created_at: string;
}

export interface PeriodLock { id: string;
  company_id: string;
  locked_from: string;
  locked_to: string;
  locked_by: string;
  locked_at: string;
  is_active: boolean;
  closing_period_id: string | null;
}

const DEFAULT_MONTH_CHECKLIST = [
  { category: "reconciliation", title: "Bankavstämning", description: "Stäm av alla bankkonton mot bokföringen", sort_order: 1, is_required: true, auto_check_type: "bank_reconciled" },
  { category: "reconciliation", title: "Kundfordringar", description: "Granska öppna kundfordringar och skicka påminnelser", sort_order: 2, is_required: true },
  { category: "reconciliation", title: "Leverantörsskulder", description: "Kontrollera att alla leverantörsfakturor är bokförda", sort_order: 3, is_required: true },
  { category: "accrual", title: "Periodiseringar", description: "Boka förutbetalda kostnader och upplupna intäkter", sort_order: 4, is_required: true },
  { category: "depreciation", title: "Avskrivningar", description: "Kör månadens avskrivningar på anläggningstillgångar", sort_order: 5, is_required: true, auto_check_type: "depreciation_booked" },
  { category: "vat", title: "Momsavstämning", description: "Stäm av momskonton och förbered momsdeklaration", sort_order: 6, is_required: true, auto_check_type: "vat_filed" },
  { category: "payroll", title: "Löneavstämning", description: "Kontrollera att lönekörningen är komplett och bokförd", sort_order: 7, is_required: true, auto_check_type: "payroll_approved" },
  { category: "review", title: "Resultatrapport", description: "Granska resultaträkning och jämför med budget", sort_order: 8, is_required: false },
  { category: "review", title: "Balansrapport", description: "Granska balansräkning och kontrollera rimlighetskontroll", sort_order: 9, is_required: false },
  { category: "review", title: "Avvikelser", description: "Undersök och kommentera väsentliga avvikelser", sort_order: 10, is_required: false },
];

const YEAR_END_EXTRAS = [
  { category: "review", title: "Lagerinventering", description: "Kontrollera att lagervärdet är korrekt", sort_order: 11, is_required: true },
  { category: "accrual", title: "Årsperiodiseringar", description: "Boka årliga periodiseringar", sort_order: 12, is_required: true },
  { category: "review", title: "Bolagsskatt", description: "Beräkna och boka bolagsskatt", sort_order: 13, is_required: true },
  { category: "review", title: "Årets resultat", description: "Boka årets resultat till balanserat resultat", sort_order: 14, is_required: true },
  { category: "review", title: "Årsredovisning", description: "Förbered och granska årsredovisning", sort_order: 15, is_required: true },
];

export const useClosingWorkspace = () => { const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => { const stored = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
    if (stored) setCompanyId(stored);
  }, []);
  const queryClient = useQueryClient();

  const usePeriods = () =>
    useQuery({ queryKey: ["closing-periods", companyId],
      queryFn: async () => { const { data, error } = await supabase
          .from("closing_periods")
          .select("*")
          .eq("company_id", companyId!)
          .order("period_year", { ascending: false })
          .order("period_month", { ascending: false });
        if (error) throw error;
        return (data || []) as ClosingPeriod[];
      },
      enabled: !!companyId,
    });

  const useChecklist = (periodId?: string) =>
    useQuery({ queryKey: ["closing-checklist", periodId],
      queryFn: async () => { const { data, error } = await supabase
          .from("closing_checklist_items")
          .select("*")
          .eq("closing_period_id", periodId!)
          .order("sort_order", { ascending: true });
        if (error) throw error;
        return (data || []) as ClosingChecklistItem[];
      },
      enabled: !!periodId,
    });

  const useLocks = () =>
    useQuery({ queryKey: ["closing-locks", companyId],
      queryFn: async () => { const { data, error } = await supabase
          .from("closing_period_locks")
          .select("*")
          .eq("company_id", companyId!)
          .eq("is_active", true)
          .order("locked_to", { ascending: false });
        if (error) throw error;
        return (data || []) as PeriodLock[];
      },
      enabled: !!companyId,
    });

  const createPeriod = useMutation({ mutationFn: async (params: { period_type: string; period_year: number; period_month?: number }) => { const { data: { user } } = await supabase.auth.getUser();
      if (!user || !companyId) throw new Error("Ej inloggad");

      const { data: period, error } = await supabase
        .from("closing_periods")
        .insert({ company_id: companyId,
          period_type: params.period_type,
          period_year: params.period_year,
          period_month: params.period_month ?? null,
        })
        .select()
        .maybeSingle();
      if (error) throw error;

      // Create default checklist
      const items = [...DEFAULT_MONTH_CHECKLIST];
      if (params.period_type === "year") items.push(...YEAR_END_EXTRAS);

      const checklistItems = items.map((item) => ({ closing_period_id: period.id,
        company_id: companyId,
        ...item,
        auto_check_type: item.auto_check_type || null,
      }));

      const { error: checkError } = await supabase
        .from("closing_checklist_items")
        .insert(checklistItems);
      if (checkError) throw checkError;

      return period;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["closing-periods"] });
      toast.success("Stängningsperiod skapad");
    },
    onError: (e: any) => toast.error(e.message || "Kunde inte skapa period"),
  });

  const updateChecklistItem = useMutation({ mutationFn: async ({ itemId, status, notes }: { itemId: string; status: string; notes?: string }) => { const { data: { user } } = await supabase.auth.getUser();
      const update: any = { status };
      if (status === "completed") { update.completed_at = new Date().toISOString();
        update.completed_by = user?.id;
      } else { update.completed_at = null;
        update.completed_by = null;
      }
      if (notes !== undefined) update.notes = notes;

      const { error } = await supabase
        .from("closing_checklist_items")
        .update(update)
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["closing-checklist"] });
    },
    onError: (error: Error) => toast.error(error.message || "Periodstängning misslyckades"),
  });

  const advancePeriodStatus = useMutation({ mutationFn: async ({ periodId, newStatus }: { periodId: string; newStatus: string }) => { const { data: { user } } = await supabase.auth.getUser();
      if (!user || !companyId) throw new Error("Ej inloggad");

      const update: any = { status: newStatus };
      if (newStatus === "soft_closed") { update.soft_closed_at = new Date().toISOString();
        update.soft_closed_by = user.id;
      } else if (newStatus === "in_review") { update.review_started_at = new Date().toISOString();
        update.review_started_by = user.id;
      } else if (newStatus === "hard_closed") { update.hard_closed_at = new Date().toISOString();
        update.hard_closed_by = user.id;
      }

      const { data: period, error } = await supabase
        .from("closing_periods")
        .update(update)
        .eq("id", periodId)
        .select()
        .maybeSingle();
      if (error) throw error;

      // Lock period on hard close
      if (newStatus === "hard_closed" && period) { const year = period.period_year;
        const month = period.period_month || 12;
        const from = new Date(year, (period.period_month || 1) - 1, 1);
        const to = new Date(year, month, 0);

        await supabase.from("closing_period_locks").insert({ company_id: companyId,
          locked_from: from.toISOString().split("T")[0],
          locked_to: to.toISOString().split("T")[0],
          locked_by: user.id,
          closing_period_id: periodId,
        });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["closing-periods"] });
      queryClient.invalidateQueries({ queryKey: ["closing-locks"] });
      toast.success("Periodstatus uppdaterad");
    },
    onError: (error: Error) => toast.error(error.message || "Periodstängning misslyckades"),
  });

  const updateProgress = useMutation({ mutationFn: async ({ periodId, progress }: { periodId: string; progress: number }) => { const { error } = await supabase
        .from("closing_periods")
        .update({ progress_percent: progress })
        .eq("id", periodId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["closing-periods"] });
    },
    onError: (error: Error) => toast.error(error.message || "Periodstängning misslyckades"),
  });

  return { companyId,
    usePeriods,
    useChecklist,
    useLocks,
    createPeriod,
    updateChecklistItem,
    advancePeriodStatus,
    updateProgress,
  };
};
