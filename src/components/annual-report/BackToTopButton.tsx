import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export function BackToTopButton({ threshold = 600 }: { threshold?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > threshold);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  if (!show) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-30 flex items-center gap-1.5 text-[11px] bg-[#0052FF] hover:bg-[#0040CC] text-white px-3 py-2 rounded-full shadow-lg"
      aria-label="Tillbaka till toppen"
    >
      <ArrowUp className="w-3 h-3" /> Tillbaka till toppen
    </button>
  );
}
