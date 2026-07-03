import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { ArticleFAQ } from "@/data/guides/articles/types";

export const ArticleFAQList = ({ items }: { items: ArticleFAQ[] }) => (
  <section className="not-prose my-12">
    <h2 className="text-2xl font-bold text-[#0f1f35] tracking-tight">Vanliga frågor</h2>
    <Accordion type="single" collapsible className="mt-4 rounded-2xl border border-slate-100 bg-white divide-y divide-slate-100">
      {items.map((f, i) => (
        <AccordionItem key={i} value={`faq-${i}`} className="border-0 px-6">
          <AccordionTrigger className="text-left font-semibold text-[#0f1f35] hover:no-underline">
            {f.q}
          </AccordionTrigger>
          <AccordionContent className="text-[#475569] leading-relaxed">
            {f.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </section>
);
