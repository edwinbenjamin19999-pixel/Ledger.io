import { useCallback, useEffect, useRef, useState } from "react";

export interface WidgetAnalytics {
  views: number;
  clicks: number;
  lastViewed: number; // ms timestamp
}

export type AnalyticsMap = Record<string, WidgetAnalytics>;

const STORAGE_KEY = "dashboard:analytics:v1";

function load(): AnalyticsMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function save(data: AnalyticsMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota
  }
}

export function useDashboardAnalytics() {
  const [data, setData] = useState<AnalyticsMap>(() => load());
  const dataRef = useRef(data);
  dataRef.current = data;

  // Persist debounced
  useEffect(() => {
    const t = setTimeout(() => save(data), 400);
    return () => clearTimeout(t);
  }, [data]);

  const recordView = useCallback((id: string) => {
    setData(prev => {
      const cur = prev[id] || { views: 0, clicks: 0, lastViewed: 0 };
      return { ...prev, [id]: { ...cur, views: cur.views + 1, lastViewed: Date.now() } };
    });
  }, []);

  const recordClick = useCallback((id: string) => {
    setData(prev => {
      const cur = prev[id] || { views: 0, clicks: 0, lastViewed: 0 };
      return { ...prev, [id]: { ...cur, clicks: cur.clicks + 1 } };
    });
  }, []);

  /** Attach IntersectionObserver to a node; logs one view per session per widget. */
  const observeRef = useCallback(
    (id: string) => {
      const seen = { current: false };
      return (node: HTMLElement | null) => {
        if (!node || seen.current) return;
        const io = new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (e.isIntersecting && e.intersectionRatio > 0.4 && !seen.current) {
                seen.current = true;
                recordView(id);
                io.disconnect();
              }
            }
          },
          { threshold: [0, 0.4, 1] }
        );
        io.observe(node);
      };
    },
    [recordView]
  );

  return { data, recordView, recordClick, observeRef };
}
