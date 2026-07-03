import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_WIDGETS, WidgetId, WIDGET_LIBRARY } from "./types";

const KEY = "kpi-widgets:v1";

interface Stored {
  widgets: WidgetId[];
}

export function useKPIConfig() {
  const { user } = useAuth();
  const storageKey = `${KEY}:${user?.id ?? "anon"}`;
  const [widgets, setWidgets] = useState<WidgetId[]>(DEFAULT_WIDGETS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Stored;
        const valid = parsed.widgets.filter((w) => WIDGET_LIBRARY.some((m) => m.id === w));
        if (valid.length) setWidgets(valid);
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  const save = (next: WidgetId[]) => {
    setWidgets(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify({ widgets: next }));
    } catch {
      // ignore
    }
  };

  return {
    widgets,
    setWidgets: save,
    add: (id: WidgetId) => !widgets.includes(id) && save([...widgets, id]),
    remove: (id: WidgetId) => save(widgets.filter((w) => w !== id)),
    reorder: (ids: WidgetId[]) => save(ids),
    reset: () => save(DEFAULT_WIDGETS),
  };
}
