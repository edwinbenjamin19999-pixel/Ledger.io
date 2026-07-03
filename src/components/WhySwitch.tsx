import { Card, CardContent } from "@/components/ui/card";
import { Brain, Zap, Users, BarChart3, ArrowRight, XCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const WhySwitch = () => { const advantages = [
    { icon: Brain,
      title: "AI som grund — inte tillägg",
      description: "Traditionella system byggdes med manuella flöden och AI adderat efteråt. Ledger.io är designat med AI som kärnan — bokföringen sker automatiskt, inte manuellt.",
      highlight: "Automatisk bokföring"
    },
    { icon: Zap,
      title: "Eliminera manuellt arbete",
      description: "AI:n tolkar kvitton, klassificerar banktransaktioner och skapar verifikat. Systemet lär sig från dina korrigeringar och blir bättre över tid.",
      highlight: "Spara 10h/månad"
    },
    { icon: BarChart3,
      title: "AI-finansrådgivare",
      description: "Inte bara rapporter — proaktiva insikter. Systemet identifierar ovanliga kostnader, likviditetsrisker och marginalförändringar automatiskt.",
      highlight: "Proaktiva insikter"
    },
    { icon: Users,
      title: "Enkel migrering",
      description: "Importera kontoplan, kunder, leverantörer och bokföringshistorik från ditt nuvarande system. Fortsätt där du slutade utan dubbelarbete.",
      highlight: "5 min migrering"
    },
  ];

  const comparisons = [
    { feature: "Automatisk verifikatsskapande från kvitton", northledger: true, legacy: false },
    { feature: "AI-klassificering av transaktioner", northledger: true, legacy: false },
    { feature: "Proaktiva finansiella insikter", northledger: true, legacy: false },
    { feature: "Naturligt språk-interaktion", northledger: true, legacy: false },
    { feature: "BAS-kontoplan & momshantering", northledger: true, legacy: true },
    { feature: "Fakturahantering", northledger: true, legacy: true },
    { feature: "Bankintegration", northledger: true, legacy: true },
  ];

  return (
    <section className="py-20 relative overflow-hidden bg-muted/30">
      <div className="absolute inset-0 bg-[image:var(--gradient-subtle)] opacity-50" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto space-y-16">
          {/* Header */}
          <div className="text-center space-y-4">
            <Badge variant="outline" className="mb-4">Varför Ledger.io?</Badge>
            
            <h2 className="text-4xl md:text-5xl font-bold">
              Nästa generation{" "}
              <span className="bg-clip-text text-transparent bg-[image:var(--gradient-accent)]">
                bokföring
              </span>
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Traditionella system adderar AI ovanpå legacy-arkitektur. Vi byggde plattformen med AI som grund.
            </p>
          </div>

          {/* Advantages Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {advantages.map((advantage, index) => { const Icon = advantage.icon;
              return (
                <Card key={index} className="group hover:shadow-[var(--shadow-elegant)] transition-all duration-300 border-border/50">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <h3 className="text-xl font-bold">{advantage.title}</h3>
                        <p className="text-muted-foreground">{advantage.description}</p>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 text-secondary text-sm font-medium">
                          {advantage.highlight}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Comparison table */}
          <div className="max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-center mb-8">Ledger.io vs traditionella system</h3>
            <Card className="border-border/50 overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] text-sm">
                <div className="p-3 font-semibold bg-muted/50 border-b border-border/50">Funktion</div>
                <div className="p-3 font-semibold bg-muted/50 border-b border-border/50 text-center w-24">Ledger.io</div>
                <div className="p-3 font-semibold bg-muted/50 border-b border-border/50 text-center w-24">Legacy</div>
                {comparisons.map((row, i) => (
                  <div key={i} className="contents">
                    <div className="p-3 border-b border-border/30">{row.feature}</div>
                    <div className="p-3 border-b border-border/30 flex justify-center">
                      <CheckCircle2 className="w-5 h-5 text-secondary" />
                    </div>
                    <div className="p-3 border-b border-border/30 flex justify-center">
                      {row.legacy ? (
                        <CheckCircle2 className="w-5 h-5 text-muted-foreground/50" />
                      ) : (
                        <XCircle className="w-5 h-5 text-muted-foreground/30" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* CTA */}
          <div className="text-center space-y-4">
            <p className="text-lg font-medium">
              Redo att testa framtidens bokföring?
            </p>
            <Button size="lg" onClick={() => window.location.href = '/auth'} className="group bg-white text-[#050d1a] hover:bg-white/90 font-semibold">
              Kom igång gratis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-sm text-muted-foreground">
              14 dagar gratis • Migrera från ditt nuvarande system på minuter • Support på svenska
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
