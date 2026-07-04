import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";

export interface BureauBranding {
  firmId: string | null;
  primaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  bureauName: string;
  bureauSubtitle: string;
  showPoweredBy: boolean;
  customDomain: string | null;
  customDomainStatus: "none" | "pending" | "verified" | "failed";
  portalName: string;
  portalLogoUrl: string | null;
  portalWelcomeMessage: string;
  isLoading: boolean;
}

const DEFAULT_PRIMARY = "#3b82f6";
const DEFAULT_ACCENT = "#3b82f6";

// hex (#RRGGBB) → "h s% l%" string for CSS HSL var
function hexToHslString(hex: string): string | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function useBureauBranding(): BureauBranding {
  const { firmId } = useAdvisorContext();

  const { data, isLoading } = useQuery({
    queryKey: ["bureau-branding", firmId],
    enabled: !!firmId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_firms")
        .select(
          "id, name, logo_url, brand_primary_color, brand_accent_color, subtitle, show_powered_by, custom_domain, custom_domain_status, portal_name, portal_logo_url, portal_welcome_message",
        )
        .eq("id", firmId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const primary = data?.brand_primary_color || DEFAULT_PRIMARY;

  // Apply primary color as CSS var so all `hsl(var(--brand-primary))` consumers update.
  useEffect(() => {
    const hsl = hexToHslString(primary);
    if (hsl) {
      document.documentElement.style.setProperty("--brand-primary", hsl);
    }
  }, [primary]);

  return {
    firmId: firmId,
    primaryColor: primary,
    accentColor: data?.brand_accent_color || DEFAULT_ACCENT,
    logoUrl: data?.logo_url ?? null,
    bureauName: data?.name || "Byrå",
    bureauSubtitle: data?.subtitle || "",
    showPoweredBy: data?.show_powered_by ?? true,
    customDomain: data?.custom_domain ?? null,
    customDomainStatus: (data?.custom_domain_status as BureauBranding["customDomainStatus"]) || "none",
    portalName: data?.portal_name || data?.name || "Klientportal",
    portalLogoUrl: data?.portal_logo_url ?? data?.logo_url ?? null,
    portalWelcomeMessage: data?.portal_welcome_message || "",
    isLoading,
  };
}

export { hexToHslString };

// WCAG contrast ratio between two hex colors
export function contrastRatio(hex1: string, hex2: string): number {
  const lum = (hex: string) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
    if (!m) return 0;
    const [r, g, b] = [m[1], m[2], m[3]].map((h) => {
      const v = parseInt(h, 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const l1 = lum(hex1), l2 = lum(hex2);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
