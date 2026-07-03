import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const ComparisonTable = () => { const features = [
    { category: "Grundfunktioner",
      items: [
        { name: "Bokföring & Verifikat", northledger: true, traditional: true },
        { name: "Fakturering", northledger: true, traditional: true },
        { name: "Bank integration (PSD2)", northledger: true, traditional: "Varierar" },
        { name: "E-faktura (PEPPOL)", northledger: true, traditional: "Tillval" },
        { name: "Export SIE4/SAF-T", northledger: true, traditional: true },
      ]
    },
    { category: "AI & Automation",
      items: [
        { name: "AI-driven bokföring", northledger: "Från Starter", traditional: false },
        { name: "Kvittoläsning (OCR)", northledger: "Från Starter", traditional: "Tillval" },
        { name: "AI Close Assistant", northledger: "Pro+", traditional: false },
        { name: "Automatisk kontering", northledger: "Alla planer", traditional: "Regler/Mallar" },
      ]
    },
    { category: "Lön & Personal",
      items: [
        { name: "Lön för ägare/1 person", northledger: "Alla planer", traditional: "Varierar" },
        { name: "Lön för anställda", northledger: "Pro+", traditional: "Tillval" },
        { name: "AGI-rapportering", northledger: "Pro+", traditional: "Tillval" },
        { name: "Utläggshantering", northledger: "Alla planer", traditional: "Alla planer" },
      ]
    },
    { category: "För Byråer & Koncerner",
      items: [
        { name: "Flera företag", northledger: "Pro (obegränsat)", traditional: "Tillval" },
        { name: "Fler användare/behörigheter", northledger: "Pro+", traditional: "Tillval" },
        { name: "Koncernkonsolidering", northledger: "Enterprise", traditional: false },
        { name: "White-label", northledger: "Pro+", traditional: false },
        { name: "API-integration", northledger: "Pro+", traditional: "Tillval" },
      ]
    },
    { category: "Support & Service",
      items: [
        { name: "Email support", northledger: true, traditional: true },
        { name: "Telefonsupport", northledger: "Starter+", traditional: "Tillval" },
        { name: "Bokföringssupport", northledger: "Pro+", traditional: "Tillval" },
        { name: "Account manager", northledger: "Enterprise", traditional: false },
      ]
    },
  ];

  const renderValue = (value: boolean | string) => { if (value === true) { return <Check className="w-5 h-5 text-[#085041] mx-auto" />;
    }
    if (value === false) { return <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />;
    }
    if (typeof value === "string") { return <span className="text-xs text-center block">{value}</span>;
    }
    return <Minus className="w-5 h-5 text-muted-foreground/30 mx-auto" />;
  };

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <Badge variant="outline" className="mb-4">Funktionsjämförelse</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              Jämför med <span className="text-primary">traditionella system</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Objektiv funktionsjämförelse - se skillnaderna själv
            </p>
          </div>

          {/* Comparison Table */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-semibold min-w-[200px]">Funktion</th>
                      <th className="text-center p-4 font-semibold min-w-[120px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-primary">NorthLedger</span>
                          <Badge variant="secondary" className="text-xs">Från 99 kr</Badge>
                        </div>
                      </th>
                      <th className="text-center p-4 font-semibold min-w-[120px]">
                        <div className="flex flex-col items-center gap-1">
                          <span>Traditionellt system</span>
                          <span className="text-xs text-muted-foreground">Typiskt pris</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {features.map((category, catIndex) => (
                      <React.Fragment key={`cat-${catIndex}`}>
                         <tr className="bg-muted/30">
                          <td colSpan={3} className="p-4 font-bold text-sm">
                            {category.category}
                          </td>
                        </tr>
                        {category.items.map((item, itemIndex) => (
                          <tr 
                            key={`item-${catIndex}-${itemIndex}`}
                            className="border-b hover:bg-muted/20 transition-colors"
                          >
                            <td className="p-4 text-sm">{item.name}</td>
                            <td className="p-4">{renderValue(item.northledger)}</td>
                            <td className="p-4">{renderValue(item.traditional)}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Note */}
          <p className="text-sm text-muted-foreground text-center">
            * Jämförelsen avser typiska funktioner hos traditionella bokföringssystem på den svenska marknaden.
          </p>
        </div>
      </div>
    </section>
  );
};
