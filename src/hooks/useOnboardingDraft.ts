import { useCallback, useState } from "react";

export interface OnboardingDraft {
  // Identity
  name: string;
  slug: string;
  // Branding
  logo_url: string | null;
  logo_file: File | null;
  primary_color: string;
  accent_color: string | null;
  // AI
  ai_name: string;
  // Modules
  modules: Record<string, boolean>;
}

export const DEFAULT_MODULES: Record<string, boolean> = {
  bookkeeping: true,
  invoicing: true,
  ai_assistant: true,
  reporting: true,
  white_label: true,
  payroll: false,
};

const INITIAL: OnboardingDraft = {
  name: "",
  slug: "",
  logo_url: null,
  logo_file: null,
  primary_color: "#3b82f6",
  accent_color: null,
  ai_name: "AI Ekonom",
  modules: DEFAULT_MODULES,
};

/** RFC 1035-ish, mirrors the DB CHECK constraint slug_format. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug);
}

export function useOnboardingDraft() {
  const [draft, setDraft] = useState<OnboardingDraft>(INITIAL);

  const update = useCallback(<K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      // Auto-derive slug from name if user hasn't typed a custom slug
      if (key === "name" && (!d.slug || d.slug === slugify(d.name))) {
        next.slug = slugify(value as string);
      }
      return next;
    });
  }, []);

  const toggleModule = useCallback((id: string) => {
    setDraft((d) => ({ ...d, modules: { ...d.modules, [id]: !d.modules[id] } }));
  }, []);

  return { draft, update, toggleModule, setDraft };
}
