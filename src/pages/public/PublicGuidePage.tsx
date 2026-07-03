import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { guideCategories, faqItems } from "@/lib/guide-content";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, HelpCircle, Lightbulb, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function PublicGuidePage() {
  const [query, setQuery] = useState("");
  const q = query.toLowerCase().trim();

  const filteredCategories = useMemo(() => {
    if (!q) return guideCategories;
    return guideCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.keywords.some((k) => k.includes(q))
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [q]);

  const filteredFaq = useMemo(() => {
    if (!q) return faqItems;
    return faqItems.filter(
      (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
    );
  }, [q]);

  const totalResults = filteredCategories.reduce((s, c) => s + c.items.length, 0);

  return (
    <div className="min-h-screen bg-white">
      <Header lightBg />
      <main className="py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-10">
              <h1 className="text-3xl sm:text-4xl font-bold text-[#0f1f35] mb-3">
                Så fungerar Bokfy
              </h1>
              <p className="text-[#475569] text-lg max-w-2xl mx-auto">
                En komplett guide till alla moduler och funktioner — steg för steg.
              </p>
            </div>

            {/* Search */}
            <div className="relative mb-10 max-w-xl mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Sök funktion, t.ex. &quot;moms&quot;, &quot;faktura&quot;, &quot;kvitto&quot;…"
                className="pl-10 h-11 border-slate-200 bg-white"
              />
              {q && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#94a3b8]">
                  {totalResults} träffar
                </span>
              )}
            </div>

            {/* Categories */}
            <Accordion
              type="multiple"
              defaultValue={guideCategories.map((_, i) => `cat-${i}`)}
              className="space-y-4 mb-16"
            >
              {filteredCategories.map((cat, ci) => (
                <AccordionItem
                  key={cat.label}
                  value={`cat-${ci}`}
                  className="border border-slate-200 rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                >
                  <AccordionTrigger className="px-6 py-5 hover:no-underline gap-3">
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <div className="w-10 h-10 rounded-xl bg-[rgba(8,145,178,0.08)] flex items-center justify-center shrink-0">
                        <cat.icon className="w-5 h-5 text-[#3b82f6]" />
                      </div>
                      <div>
                        <span className="font-semibold text-[#0f1f35] text-base">{cat.label}</span>
                        <p className="text-sm text-[#475569] mt-0.5">{cat.description}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 pt-0">
                    <div className="grid gap-1">
                      {cat.items.map((item) => (
                        <Collapsible key={item.title}>
                          <div className="rounded-lg hover:bg-slate-50 transition-colors">
                            <CollapsibleTrigger className="flex items-start gap-3 p-3 w-full text-left group">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#0f1f35] group-hover:text-[#3b82f6] transition-colors">
                                  {item.title}
                                </p>
                                <p className="text-xs text-[#475569] mt-0.5 leading-relaxed">
                                  {item.description}
                                </p>
                              </div>
                              <ChevronDown className="h-4 w-4 text-[#94a3b8] shrink-0 mt-0.5 transition-transform group-data-[state=open]:rotate-180" />
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="px-3 pb-3 space-y-3">
                                {item.steps && item.steps.length > 0 && (
                                  <div className="bg-slate-50 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-[#0f1f35] mb-2">Steg-för-steg</p>
                                    <ol className="space-y-1.5">
                                      {item.steps.map((step, si) => (
                                        <li key={si} className="flex gap-2 text-xs text-[#475569] leading-relaxed">
                                          <span className="w-5 h-5 rounded-full bg-[rgba(8,145,178,0.1)] text-[#3b82f6] flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                                            {si + 1}
                                          </span>
                                          {step}
                                        </li>
                                      ))}
                                    </ol>
                                  </div>
                                )}
                                {item.tips && item.tips.length > 0 && (
                                  <div className="flex gap-2 p-2 rounded-lg bg-[#FAEEDA] border border-amber-200/50">
                                    <Lightbulb className="h-3.5 w-3.5 text-[#7A5417] shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                      {item.tips.map((tip, ti) => (
                                        <p key={ti} className="text-xs text-[#7A5417] leading-relaxed">{tip}</p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {filteredCategories.length === 0 && q && (
              <div className="text-center py-12 text-[#94a3b8] mb-16">
                <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p>Inga funktioner matchade <strong className="text-[#475569]">"{query}"</strong></p>
              </div>
            )}

            {/* FAQ */}
            {filteredFaq.length > 0 && (
              <div className="mb-16">
                <div className="flex items-center gap-2 mb-4">
                  <HelpCircle className="h-5 w-5 text-[#3b82f6]" />
                  <h2 className="text-lg font-semibold text-[#0f1f35]">Vanliga frågor</h2>
                </div>
                <Accordion type="single" collapsible className="space-y-2">
                  {filteredFaq.map((f, i) => (
                    <AccordionItem
                      key={i}
                      value={`faq-${i}`}
                      className="border border-slate-200 rounded-lg bg-white"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline text-left text-sm font-medium text-[#0f1f35]">
                        {f.q}
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-3 pt-0">
                        <p className="text-sm text-[#475569] leading-relaxed">{f.a}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            {/* CTA */}
            <div className="text-center">
              <p className="text-[#0f1f35] font-semibold text-lg mb-4">
                Redo att komma igång?
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  asChild
                  className="h-11 px-6 bg-[#3b82f6] text-white hover:bg-[#3b82f6] rounded-lg shadow-[0_4px_20px_rgba(8,145,178,0.3)]"
                >
                  <a href="/auth">
                    Logga in
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-11 px-6 rounded-lg border-[#C8DDF5] text-[#3b82f6] hover:bg-[#EFF6FF] hover:shadow-[0_0_12px_rgba(6,182,212,0.12)] hover:scale-[1.02] transition-all duration-200"
                >
                  <a href="mailto:kontakt@bokfy.se">Boka demo</a>
                </Button>
              </div>
              <p className="text-xs text-[#94a3b8] mt-3">
                Ingen bindningstid. Kom igång på några minuter.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
