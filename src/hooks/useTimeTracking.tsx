import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";
import { toast } from "sonner";
import { useState, useEffect, useRef, useCallback } from "react";

export interface TimeEntry { id: string;
  company_id: string;
  user_id: string;
  project_id: string | null;
  client_name: string | null;
  description: string | null;
  entry_date: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  is_billable: boolean;
  is_billed: boolean;
  billed_invoice_id: string | null;
  hourly_rate: number;
  rate_id: string | null;
  created_at: string;
}

export interface TimeRate { id: string;
  company_id: string;
  client_name: string | null;
  project_id: string | null;
  rate_label: string;
  hourly_rate: number;
  is_default: boolean;
}

function useCompanyId() { const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => { const stored = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
    if (stored) setCompanyId(stored);
  }, []);
  return companyId;
}

// === Timer hook ===
export function useTimer() { const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => { setStartedAt(new Date());
    setIsRunning(true);
    setSeconds(0);
  }, []);

  const stop = useCallback(() => { setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    const endTime = new Date();
    const duration = Math.round(seconds / 60);
    return { startedAt, endTime, durationMinutes: Math.max(duration, 1) };
  }, [seconds, startedAt]);

  const reset = useCallback(() => { setIsRunning(false);
    setSeconds(0);
    setStartedAt(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  useEffect(() => { if (isRunning) { intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const formatted = [
    Math.floor(seconds / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");

  return { isRunning, seconds, formatted, start, stop, reset, startedAt };
}

// === Time entries ===
export function useTimeEntries(weekStart?: string, weekEnd?: string) { const companyId = useCompanyId();
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({ queryKey: ["time_entries", companyId, weekStart, weekEnd],
    queryFn: async () => { if (!companyId) return [];
      let q = supabase
        .from("time_entries")
        .select("*")
        .eq("company_id", companyId)
        .order("entry_date", { ascending: false })
        .order("start_time", { ascending: false });
      if (weekStart) q = q.gte("entry_date", weekStart);
      if (weekEnd) q = q.lte("entry_date", weekEnd);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as TimeEntry[];
    },
    enabled: !!companyId,
  });

  const createEntry = useMutation({ mutationFn: async (
      entry: Omit<TimeEntry, "id" | "created_at" | "updated_at" | "is_billed" | "billed_invoice_id">
    ) => {
      if (!entry.duration_minutes || entry.duration_minutes <= 0) {
        throw new Error("Ange antal timmar (> 0).");
      }
      if (!entry.description?.trim() && !entry.project_id) {
        throw new Error("Ange beskrivning eller välj projekt.");
      }
      const { error } = await supabase.from("time_entries").insert(entry);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["time_entries"] });
      toast.success("Tid registrerad");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateEntry = useMutation({ mutationFn: async ({ id, ...updates }: Partial<TimeEntry> & { id: string }) => { const { error } = await supabase
        .from("time_entries")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["time_entries"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteEntry = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from("time_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["time_entries"] });
      toast.success("Tid borttagen");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markAsBilled = useMutation({ mutationFn: async (ids: string[]) => { const { error } = await supabase
        .from("time_entries")
        .update({ is_billed: true, updated_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["time_entries"] });
      toast.success("Timmar markerade som fakturerade");
    },
    onError: (error: Error) => toast.error(error.message || "Tidsregistreringen misslyckades"),
  });

  return { entries: query.data || [], isLoading: query.isLoading, createEntry, updateEntry, deleteEntry, markAsBilled };
}

// === Unbilled summary per client ===
export function useUnbilledSummary() { const companyId = useCompanyId();

  const query = useQuery({ queryKey: ["time_entries_unbilled", companyId],
    queryFn: async () => { if (!companyId) return [];
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_billable", true)
        .eq("is_billed", false);
      if (error) throw error;
      const entries = (data || []) as TimeEntry[];

      // Group by client
      const byClient: Record<string, { client: string; hours: number; value: number; entries: TimeEntry[] }> = {};
      entries.forEach((e) => { const key = e.client_name || "Okänd kund";
        if (!byClient[key]) byClient[key] = { client: key, hours: 0, value: 0, entries: [] };
        byClient[key].hours += e.duration_minutes / 60;
        byClient[key].value += (e.duration_minutes / 60) * (e.hourly_rate || 0);
        byClient[key].entries.push(e);
      });
      return Object.values(byClient).filter((g) => g.hours > 0);
    },
    enabled: !!companyId,
  });

  return { unbilled: query.data || [], isLoading: query.isLoading };
}

// === Rates ===
export function useTimeRates() { const companyId = useCompanyId();
  const qc = useQueryClient();

  const query = useQuery({ queryKey: ["time_rates", companyId],
    queryFn: async () => { if (!companyId) return [];
      const { data, error } = await supabase
        .from("time_rates")
        .select("*")
        .eq("company_id", companyId)
        .order("is_default", { ascending: false });
      if (error) throw error;
      return (data || []) as TimeRate[];
    },
    enabled: !!companyId,
  });

  const upsertRate = useMutation({ mutationFn: async (rate: Omit<TimeRate, "id" | "created_at" | "updated_at"> & { id?: string }) => { const { error } = await supabase.from("time_rates").upsert({ ...rate,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["time_rates"] });
      toast.success("Timpris sparat");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { rates: query.data || [], isLoading: query.isLoading, upsertRate };
}

// Helpers
export const formatHours = (minutes: number) => { const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}`;
  return `${h},${Math.round((m / 60) * 10)}`;
};

export const formatKr = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";
