import { useEffect, useState } from "react";

interface TocItem { id: string; label: string }

export const StickyTOC = ({ items }: { items: TocItem[] }) => {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    items.forEach((i) => {
      const el = document.getElementById(i.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="sticky top-24 hidden lg:block">
      <div className="text-[11px] uppercase tracking-wider text-[#94a3b8] mb-3 font-medium">Innehåll</div>
      <ul className="space-y-2 border-l border-slate-200">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              className={`block pl-4 -ml-px border-l-2 text-sm py-1 transition-colors ${
                active === i.id
                  ? "border-[#3b82f6] text-[#3b82f6] font-medium"
                  : "border-transparent text-[#64748b] hover:text-[#0f1f35]"
              }`}
            >
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};
