import { useState, useEffect } from "react";

export function useChartTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === "undefined") return false;
    const root = document.documentElement;
    return (
      root.getAttribute("data-theme") === "dark" ||
      root.classList.contains("dark")
    );
  });

  useEffect(() => {
    const root = document.documentElement;
    const check = () => {
      setIsDark(
        root.getAttribute("data-theme") === "dark" ||
        root.classList.contains("dark")
      );
    };
    const observer = new MutationObserver(check);
    observer.observe(root, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => observer.disconnect();
  }, []);

  return {
    isDark,

    // Grid and axis
    gridColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
    axisColor: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)",
    textColor: isDark ? "#94a3b8" : "#64748b",

    // Tooltip
    tooltipBg: isDark ? "#1e293b" : "#ffffff",
    tooltipBorder: isDark ? "#334155" : "#e2e8f0",
    tooltipText: isDark ? "#f1f5f9" : "#0f172a",
    tooltipLabelColor: isDark ? "#94a3b8" : "#64748b",

    // Standard recharts tooltip contentStyle
    tooltipStyle: {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
      borderRadius: "12px",
      boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
      color: isDark ? "#f1f5f9" : "#0f172a",
      fontSize: "13px",
    } as React.CSSProperties,

    // Brand-safe chart colors (works in both modes)
    colors: {
      violet: "#8b5cf6",
      emerald: "#10b981",
      blue: "#3b82f6",
      amber: "#f59e0b",
      rose: "#f43f5e",
      indigo: "#6366f1",
      teal: "#14b8a6",
      orange: "#f97316",
      cyan: "#3b82f6",
      red: "#ef4444",
      green: "#22c55e",
    },

    // Area fill opacities
    areaOpacity: isDark ? 0.15 : 0.1,
    areaOpacityStrong: isDark ? 0.3 : 0.15,

    // Cursor/crosshair
    cursorFill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",

    // Reference lines
    referenceLineColor: isDark ? "#475569" : "#cbd5e1",

    // Pie/donut stroke between segments
    pieStroke: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)",

    // SVG ring backgrounds
    ringBg: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    ringText: isDark ? "#f1f5f9" : "#0f172a",
    ringSubText: isDark ? "#94a3b8" : "#64748b",
  };
}

export type ChartTheme = ReturnType<typeof useChartTheme>;
