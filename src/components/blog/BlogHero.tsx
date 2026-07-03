import { Sparkles } from "lucide-react";

interface Props {
  eyebrow?: string;
  title: string;
  subtitle: string;
}

export const BlogHero = ({ eyebrow = "Insikter", title, subtitle }: Props) => (
  <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white pt-32 pb-16">
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3b82f6]/30 to-transparent" />
    <div className="container mx-auto max-w-4xl px-6 text-center">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/60 bg-blue-50 px-3 py-1 text-xs font-medium text-[#3b82f6]">
        <Sparkles className="w-3 h-3" />
        {eyebrow}
      </div>
      <h1 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight text-[#0F1B2D]">{title}</h1>
      <p className="mt-5 text-lg text-[#475569] leading-relaxed max-w-2xl mx-auto">{subtitle}</p>
    </div>
  </section>
);
