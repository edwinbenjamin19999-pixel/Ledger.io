import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, ScanLine, Users2, Banknote, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: ScanLine,
    title: "1. Anslut kassaregister",
    body: "Caspeco, Zettle eller importera Z-rapporter manuellt. Dagskassor flödar in automatiskt.",
    cta: "Gå till kassaregister",
    href: "/kassaregister",
  },
  {
    icon: Users2,
    title: "2. Anslut personal",
    body: "Personalkollen-export eller manuell timdata. Vi räknar personalkostnad % automatiskt.",
    cta: "Personal & löner",
    href: "/hr",
  },
  {
    icon: Banknote,
    title: "3. Anslut bank",
    body: "PSD2-bank eller CAMT.054 import. Vi stämmer av POS mot bankinflöde nattligen.",
    cta: "Bankintegration",
    href: "/bankintegration",
  },
];

export default function HospitalityOnboardingPage() {
  return (
    <div>
      <PageHeader
        icon={Rocket}
        title="Kom igång — Restaurang OS"
        subtitle="Tre steg, ungefär 15 minuter. Sedan jobbar systemet automatiskt."
      />
      <div className="space-y-4 px-8 pb-12 max-w-3xl">
        {steps.map((s) => (
          <Card key={s.title}>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <s.icon className="h-5 w-5 text-primary" /> {s.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">{s.body}</p>
              <Button asChild size="sm" variant="outline">
                <Link to={s.href}>
                  {s.cta} <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
