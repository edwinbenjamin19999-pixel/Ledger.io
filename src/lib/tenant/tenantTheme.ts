/**
 * Tenant Theme Engine
 * ───────────────────
 * Single source of truth for white-label theming.
 * Derives a complete premium theme from a primary brand color (+ optional accent),
 * applies premium guards (saturation/lightness/contrast clamps), and writes ~20 CSS
 * variables to `:root` so the entire app re-themes instantly.
 *
 * Read these vars from any component:
 *   - var(--brand-primary)             // hsl triplet "H S% L%"  → use hsl(var(--brand-primary))
 *   - var(--brand-on-primary)          // safe text color (#fff or #0F172A)
 *   - var(--brand-grad-revenue)        // full gradient string
 *   - var(--brand-grad-cash)
 *   - var(--brand-grad-result)
 *   - var(--brand-grad-cost)           // semantic red — never brand
 *   - var(--brand-surface-dark)        // dark UI surfaces (QuickActions, Automation)
 *   - var(--brand-tint-soft)           // hover/active tint
 *   - var(--brand-ring)
 */

export interface TenantTheme {
  primaryHsl: string;     // "192 75% 36%"
  accentHsl: string;
  onPrimary: string;      // "#ffffff" | "#0F172A"
  scale: Record<number, string>; // 50..950 as HSL triplets
  gradients: {
    revenue: string;
    cash: string;
    result: string;
    cost: string;
    surfaceDark: string;
  };
  ringHsl: string;
  tintSoftHsl: string;
  meta: {
    primaryWasClamped: boolean;
    originalPrimary: string;
    finalPrimaryHex: string;
    contrastRatio: number;
  };
}

/* ── Color math ─────────────────────────────────────────────────── */
function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "").trim();
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  return [0, 2, 4].map((i) => parseInt(full.substring(i, i + 2), 16)) as [number, number, number];
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
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
  return [h * 360, s * 100, l * 100];
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360 / 360; s /= 100; l /= 100;
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1 / 3) * 255];
}
function hslToHex(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}
function hslTriplet(h: number, s: number, l: number): string {
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
}
function relativeLuminance(r: number, g: number, b: number): number {
  const f = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrastWithWhite(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const l = relativeLuminance(r, g, b);
  return 1.05 / (l + 0.05);
}

/* ── Premium clamp ─────────────────────────────────────────────── */
function clampPremium(h: number, s: number, l: number) {
  // Saturation cap: 75% (neon → premium)
  const cs = Math.min(s, 75);
  // Lightness window: 25–55% (avoid washed out / too dark for surfaces)
  const cl = Math.max(25, Math.min(55, l));
  return { h, s: cs, l: cl, clamped: cs !== s || cl !== l };
}

/* ── Public: assess color quality (for admin preview warnings) ──── */
export function assessColorQuality(hex: string): {
  ok: boolean;
  warnings: string[];
  adjustedHex: string;
} {
  if (!/^#?[0-9a-f]{6}$/i.test(hex.replace("#", ""))) {
    return { ok: false, warnings: ["Ogiltig färgkod"], adjustedHex: hex };
  }
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const { h: ch, s: cs, l: cl, clamped } = clampPremium(h, s, l);
  const adjustedHex = hslToHex(ch, cs, cl);
  const warnings: string[] = [];
  if (s > 75) warnings.push(`Mättnad sänktes från ${Math.round(s)}% → 75% för att hålla premium-känsla.`);
  if (l < 25) warnings.push(`Ljushet höjdes från ${Math.round(l)}% → 25% (för mörk för UI-ytor).`);
  if (l > 55) warnings.push(`Ljushet sänktes från ${Math.round(l)}% → 55% (för ljus för text-på-färg).`);
  return { ok: !clamped, warnings, adjustedHex };
}

/* ── Build full theme object ───────────────────────────────────── */
export function deriveTenantTheme(primaryHex: string, accentHex?: string | null): TenantTheme {
  const safePrimary = /^#?[0-9a-f]{6}$/i.test((primaryHex || "").replace("#", ""))
    ? primaryHex : "#3b82f6";
  const [pr, pg, pb] = hexToRgb(safePrimary);
  const [ph, ps, pl] = rgbToHsl(pr, pg, pb);
  const { h, s, l, clamped } = clampPremium(ph, ps, pl);
  const finalPrimaryHex = hslToHex(h, s, l);

  // Accent: explicit or analogous (+30°)
  let aH: number, aS: number, aL: number;
  if (accentHex && /^#?[0-9a-f]{6}$/i.test(accentHex.replace("#", ""))) {
    const [ar, ag, ab] = hexToRgb(accentHex);
    const [aH0, aS0, aL0] = rgbToHsl(ar, ag, ab);
    const c = clampPremium(aH0, aS0, aL0);
    aH = c.h; aS = c.s; aL = c.l;
  } else {
    aH = (h + 30) % 360; aS = Math.min(s, 65); aL = Math.min(55, l + 5);
  }

  // 50..950 scale (lightness curve around primary)
  const scale: Record<number, string> = {
    50:  hslTriplet(h, Math.max(s - 20, 15), 96),
    100: hslTriplet(h, Math.max(s - 15, 20), 92),
    200: hslTriplet(h, Math.max(s - 10, 25), 85),
    300: hslTriplet(h, s, 72),
    400: hslTriplet(h, s, 58),
    500: hslTriplet(h, s, 46),
    600: hslTriplet(h, s, l),                      // primary anchor
    700: hslTriplet(h, Math.min(s + 5, 80), Math.max(l - 8, 20)),
    800: hslTriplet(h, Math.min(s + 5, 80), Math.max(l - 16, 14)),
    900: hslTriplet(h, Math.min(s + 5, 80), Math.max(l - 22, 10)),
    950: hslTriplet(h, Math.min(s + 5, 80), Math.max(l - 28, 6)),
  };

  // Contrast — vit text mot finalPrimary?
  const contrast = contrastWithWhite(finalPrimaryHex);
  const onPrimary = contrast >= 4.5 ? "#ffffff" : "#0F172A";

  // Gradients (135deg)
  const grad = (a: string, b: string) => `linear-gradient(135deg, hsl(${a}) 0%, hsl(${b}) 100%)`;
  const gradients = {
    revenue: grad(scale[700], scale[900]),
    cash:    grad(scale[600], scale[800]),
    result:  grad(hslTriplet(aH, aS, Math.max(aL - 8, 20)), hslTriplet(aH, aS, Math.max(aL - 18, 12))),
    cost:    "linear-gradient(135deg, #7F1D1D 0%, #991B1B 100%)", // semantic — never brand
    surfaceDark: `linear-gradient(135deg, hsl(${hslTriplet(h, Math.min(s, 35), 8)}) 0%, hsl(222 47% 9%) 50%, hsl(${hslTriplet(aH, Math.min(aS, 35), 12)}) 100%)`,
  };

  return {
    primaryHsl: hslTriplet(h, s, l),
    accentHsl:  hslTriplet(aH, aS, aL),
    onPrimary,
    scale,
    gradients,
    ringHsl:     hslTriplet(h, s, Math.min(l + 8, 60)),
    tintSoftHsl: hslTriplet(h, s, l),
    meta: {
      primaryWasClamped: clamped,
      originalPrimary: safePrimary,
      finalPrimaryHex,
      contrastRatio: Math.round(contrast * 100) / 100,
    },
  };
}

/* ── Apply theme to <html> ─────────────────────────────────────── */
export function applyTenantTheme(theme: TenantTheme, opts?: { tenantSlug?: string; logoUrl?: string | null; faviconUrl?: string | null }) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // Core brand
  root.style.setProperty("--brand-primary", theme.primaryHsl);
  root.style.setProperty("--brand-accent", theme.accentHsl);
  root.style.setProperty("--brand-on-primary", theme.onPrimary);
  root.style.setProperty("--brand-ring", theme.ringHsl);
  root.style.setProperty("--brand-tint-soft", theme.tintSoftHsl);

  // Semantic accent shortcuts (chat bubbles, hover tints, focus rings, soft text)
  root.style.setProperty("--brand-bubble", theme.primaryHsl);
  root.style.setProperty("--brand-tint-bg", theme.primaryHsl);
  root.style.setProperty("--brand-tint-border", theme.primaryHsl);
  root.style.setProperty("--brand-text-soft", theme.primaryHsl);

  // Scale
  Object.entries(theme.scale).forEach(([k, v]) => {
    root.style.setProperty(`--brand-${k}`, v);
  });

  // Gradients (full strings)
  root.style.setProperty("--brand-grad-revenue", theme.gradients.revenue);
  root.style.setProperty("--brand-grad-cash", theme.gradients.cash);
  root.style.setProperty("--brand-grad-result", theme.gradients.result);
  root.style.setProperty("--brand-grad-cost", theme.gradients.cost);
  root.style.setProperty("--brand-surface-dark", theme.gradients.surfaceDark);

  // Sync legacy tokens so existing components using --primary/--ring still work
  root.style.setProperty("--primary", theme.primaryHsl);
  root.style.setProperty("--ring", theme.ringHsl);
  root.style.setProperty("--accent", theme.accentHsl);
  root.style.setProperty("--focus-color", theme.primaryHsl);

  // Tenant marker (for conditional CSS hooks)
  if (opts?.tenantSlug) {
    root.setAttribute("data-tenant", opts.tenantSlug);
  } else {
    root.removeAttribute("data-tenant");
  }

  // Logo + favicon
  if (opts?.logoUrl) {
    root.style.setProperty("--brand-logo-url", `url(${opts.logoUrl})`);
  } else {
    root.style.removeProperty("--brand-logo-url");
  }
  if (opts?.faviconUrl) {
    const link = (document.querySelector("link[rel='icon']") as HTMLLinkElement) ?? document.createElement("link");
    link.rel = "icon";
    link.href = opts.faviconUrl;
    if (!link.parentNode) document.head.appendChild(link);
  }
}

/* ── NorthLedger default fallback ──────────────────────────────────── */
export function getDefaultTheme(): TenantTheme {
  return deriveTenantTheme("#3b82f6", null);
}

export function applyDefaultTheme() {
  applyTenantTheme(getDefaultTheme(), { tenantSlug: undefined, logoUrl: null });
}
