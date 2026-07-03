import { useMemo } from "react";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";

export type DeadlineKind = "vat" | "agi" | "ink2" | "annual";

export interface FirmDeadlineItem {
  client_id: string;
  client_name: string;
  kind: DeadlineKind;
  label: string;
  due_date: Date;
  daysLeft: number;
  severity: "critical" | "warning" | "info";
}

/**
 * v1 implementation: derives upcoming Swedish tax/AGI deadlines for the next
 * 30 days for every client in the firm. We compute deterministically from the
 * calendar (monthly VAT + AGI on the 12th, INK2 on July 1) — this mirrors the
 * existing platform deadline conventions without requiring new tables.
 */
export function useFirmDeadlineRadar() {
  const { clients, isLoading } = useAdvisorContext();

  const items = useMemo<FirmDeadlineItem[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 30);

    const out: FirmDeadlineItem[] = [];

    for (const client of clients) {
      // Monthly VAT + AGI: 12th of every month
      for (let m = 0; m < 2; m++) {
        const d = new Date(today.getFullYear(), today.getMonth() + m, 12);
        if (d >= today && d <= horizon) {
          out.push(makeItem(client.id, client.name, "vat", "Momsdeklaration", d));
          out.push(makeItem(client.id, client.name, "agi", "Arbetsgivardeklaration (AGI)", d));
        }
      }
      // INK2 — Jul 1
      const ink = new Date(today.getFullYear(), 6, 1);
      if (ink >= today && ink <= horizon) {
        out.push(makeItem(client.id, client.name, "ink2", "Inkomstdeklaration (INK2)", ink));
      }
    }
    return out.sort((a, b) => a.due_date.getTime() - b.due_date.getTime());
  }, [clients]);

  return { items, isLoading };
}

function makeItem(
  client_id: string,
  client_name: string,
  kind: DeadlineKind,
  label: string,
  due_date: Date,
): FirmDeadlineItem {
  const daysLeft = Math.ceil(
    (due_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const severity: FirmDeadlineItem["severity"] =
    daysLeft <= 3 ? "critical" : daysLeft <= 10 ? "warning" : "info";
  return { client_id, client_name, kind, label, due_date, daysLeft, severity };
}
