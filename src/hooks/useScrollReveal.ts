import { useEffect, useRef, useState } from "react";

/**
 * Reveal-on-scroll hook. Returns a ref + className to apply.
 * Element starts faded and translated down; transitions in once when intersecting.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.15
) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        });
      },
      { threshold }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);

  const className = `transition-all duration-700 ease-out will-change-transform ${
    visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
  }`;

  return { ref, visible, className };
}

export default useScrollReveal;
