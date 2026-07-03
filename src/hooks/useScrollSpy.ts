import { useEffect, useState } from "react";

/**
 * Observe a list of section IDs and report the one currently in view.
 * Highlights the topmost section whose top is within the upper third of the viewport.
 */
export function useScrollSpy(ids: string[], rootMargin = "-25% 0px -65% 0px"): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!ids.length) return;
    const els = ids
      .map(id => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (!els.length) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) visible.set(e.target.id, e.intersectionRatio);
          else visible.delete(e.target.id);
        }
        if (visible.size > 0) {
          // Pick the topmost visible section by document order
          const ordered = ids.filter(id => visible.has(id));
          if (ordered.length) setActiveId(ordered[0]);
        }
      },
      { rootMargin, threshold: [0, 0.25, 0.5, 1] }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [ids.join("|"), rootMargin]);

  return activeId;
}

export function scrollToSection(id: string, offset = 80) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: "smooth" });
}
