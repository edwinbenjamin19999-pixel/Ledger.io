import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Building2, FileSpreadsheet, Zap, Shield, Globe } from "lucide-react";

const features = [
  { icon: Brain,
    title: "AI-Autokontering",
    description: "Ladda upp kvitton och fakturor – AI tolkar, klassificerar och bokför automatiskt med 98% noggrannhet.",
  },
  { icon: Zap,
    title: "AI Close Assistant",
    description: "Systemet guidar dig genom månads- och årsbokslut. Föreslår periodiseringar och stänger konton automatiskt.",
  },
  { icon: Building2,
    title: "Koncernkonsolidering",
    description: "Hantera flera bolag under ett konto. Automatisk eliminering av mellanhavanden och koncernbokslut enligt K3.",
  },
  { icon: FileSpreadsheet,
    title: "Real-time Rapporter",
    description: "Dashboard med KPI:er, resultat, balans och kassaflöde. Export till PDF, Excel, SIE4 och SAF-T.",
  },
  { icon: Shield,
    title: "Bank & PEPPOL Integration",
    description: "PSD2-bankintegration och e-faktura via PEPPOL BIS 3. Automatisk matchning mot transaktioner.",
  },
  { icon: Globe,
    title: "1-Klick Migration",
    description: "Importera från ditt nuvarande system på 5 minuter. AI stämmer av all data automatiskt.",
  },
];

export const Features = () => { return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Allt du behöver för modern ekonomi
          </h2>
          <p className="text-xl text-muted-foreground">
            Från bokföring till koncernrapporter – automatiserat med AI
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="border-border bg-[image:var(--gradient-card)] shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-glow)] transition-[all,transform] hover:scale-105 hover:border-secondary/50"
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-[image:var(--gradient-accent)] flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
