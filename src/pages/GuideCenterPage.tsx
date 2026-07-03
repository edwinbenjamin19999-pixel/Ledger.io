import { useMemo, useState } from "react";
import { Search, ArrowRight, HelpCircle, ChevronDown, Lightbulb } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { guideCategories, faqItems } from "@/lib/guide-content";
import { useNavigate } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function GuideCenterPage() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Hjälp & Guide
        </h1>
        <p className="text-muted-foreground">
          Sök bland alla funktioner eller bläddra per kategori. Varje funktion har steg-för-steg-instruktioner.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Sök funktion, t.ex. &quot;moms&quot;, &quot;faktura&quot;, &quot;kvitto&quot;…"
          className="pl-10 h-11"
        />
        {q && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {totalResults} träffar
          </span>
        )}
      </div>

      {/* Categories */}
      <Accordion type="multiple" defaultValue={guideCategories.map((_, i) => `cat-${i}`)} className="space-y-3">
        {filteredCategories.map((cat, ci) => (
          <AccordionItem
            key={cat.label}
            value={`cat-${ci}`}
            className="border rounded-xl bg-card shadow-sm"
          >
            <AccordionTrigger className="px-5 py-4 hover:no-underline gap-3">
              <div className="flex items-center gap-3 flex-1 text-left">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <cat.icon className="w-[18px] h-[18px] text-primary" />
                </div>
                <div>
                  <span className="font-semibold text-foreground text-[15px]">{cat.label}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-4 pt-0">
              <div className="grid gap-1">
                {cat.items.map((item) => (
                  <Collapsible key={item.path}>
                    <div className="rounded-lg hover:bg-accent/50 transition-colors">
                      <CollapsibleTrigger className="flex items-start gap-3 p-3 w-full text-left group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                            {item.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 transition-transform group-data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-3 pb-3 space-y-3">
                          {/* Steps */}
                          {item.steps && item.steps.length > 0 && (
                            <div className="bg-accent/30 rounded-lg p-3">
                              <p className="text-xs font-semibold text-foreground mb-2">Steg-för-steg</p>
                              <ol className="space-y-1.5">
                                {item.steps.map((step, si) => (
                                  <li key={si} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                                      {si + 1}
                                    </span>
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                          {/* Tips */}
                          {item.tips && item.tips.length > 0 && (
                            <div className="flex gap-2 p-2 rounded-lg bg-[#FAEEDA] dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
                              <Lightbulb className="h-3.5 w-3.5 text-[#7A5417] shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                {item.tips.map((tip, ti) => (
                                  <p key={ti} className="text-xs text-[#7A5417] dark:text-amber-300 leading-relaxed">{tip}</p>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Go to button */}
                          <button
                            onClick={() => navigate(item.path)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                          >
                            Gå till {item.title}
                            <ArrowRight className="h-3 w-3" />
                          </button>
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
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p>Inga funktioner matchade <strong>"{query}"</strong></p>
        </div>
      )}

      {/* FAQ */}
      {filteredFaq.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Vanliga frågor</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            {filteredFaq.map((f, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border rounded-lg bg-card"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline text-left text-sm font-medium">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 pt-0">
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
}
