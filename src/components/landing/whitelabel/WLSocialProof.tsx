export const WLSocialProof = () => {
  const pills = ["Redovisningsbyråer", "Konsultnätverk", "Vertikal-SaaS"];
  return (
    <section className="bg-[#0F1B2D] py-16 border-y border-white/[0.05]">
      <div className="container mx-auto max-w-4xl px-6 text-center">
        <p className="text-white/55 text-sm md:text-base leading-relaxed">
          Byggt för redovisningsbyråer, konsultnätverk och vertikalspecifika SaaS-bolag.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {pills.map((p) => (
            <span
              key={p}
              className="px-4 py-1.5 rounded-full border border-[#3b82f6]/20 bg-[#3b82f6]/[0.06] text-[#3b82f6] text-xs font-medium tracking-wide"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
