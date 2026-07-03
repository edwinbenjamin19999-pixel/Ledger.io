import { Card, CardContent } from "@/components/ui/card";
import { Target, Users, Zap, Award } from "lucide-react";

const values = [
  { icon: Target,
    title: "Vår Mission",
    description: "Att göra avancerad ekonomihantering tillgänglig för alla tillväxtföretag i Norden genom AI-automatisering och smart teknologi.",
  },
  { icon: Users,
    title: "För Vem?",
    description: "Små och medelstora företag, redovisningsbyråer och tillväxtbolag som vill ersätta manuellt arbete med en modern, skalbar AI-lösning.",
  },
  { icon: Zap,
    title: "Varför NorthLedger?",
    description: "Vi kombinerar 98% automatisering via AI med koncernkonsolidering och PEPPOL/PSD2-integrationer – allt under ett tak.",
  },
  { icon: Award,
    title: "Beta-Version Live",
    description: "Vi är i beta och aktivt förbättrar plattformen med feedback från våra första användare. Var med och forma framtiden!",
  },
];

export const About = () => { return (
    <section id="about" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Om NorthLedger
          </h2>
          <p className="text-xl text-muted-foreground">
            Nästa generations bokföringssystem byggt för Nordens tillväxtföretag
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {values.map((value, index) => (
            <Card 
              key={index}
              className="border-border bg-[image:var(--gradient-card)] shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-glow)] transition-[all,transform] hover:scale-105"
            >
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[image:var(--gradient-accent)] flex items-center justify-center flex-shrink-0">
                    <value.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                    <p className="text-muted-foreground">{value.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="max-w-4xl mx-auto mt-16 text-center">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-[var(--shadow-soft)]">
            <h3 className="text-2xl font-bold mb-4">Beta-Programmet</h3>
            <p className="text-lg text-muted-foreground mb-6">
              NorthLedger är i beta-fas vilket betyder att du får tillgång till alla funktioner helt gratis under testperioden. 
              Din feedback hjälper oss att bygga den bästa bokföringslösningen för svenska företag.
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-secondary mb-2">14 dagar</div>
                <div className="text-sm text-muted-foreground">Gratis testperiod</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-secondary mb-2">98%</div>
                <div className="text-sm text-muted-foreground">AI-noggrannhet</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-secondary mb-2">5 min</div>
                <div className="text-sm text-muted-foreground">Migrering från ditt system</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
