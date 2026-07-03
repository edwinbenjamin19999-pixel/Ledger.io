import { PageHeader } from "@/components/layout/PageHeader";
import { UtensilsCrossed } from "lucide-react";
import { useIndustry } from "@/contexts/IndustryContext";
import { Navigate } from "react-router-dom";
import { DailyCashWidget } from "@/components/workspace/hospitality/DailyCashWidget";
import { PurchasesWidget } from "@/components/workspace/hospitality/PurchasesWidget";
import { StaffCostKPI } from "@/components/workspace/hospitality/StaffCostKPI";
import { IntegrationStatusWidget } from "@/components/workspace/hospitality/IntegrationStatusWidget";
import { RestaurantAIInsights } from "@/components/workspace/hospitality/RestaurantAIInsights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Calendar, FileText, Users2, ArrowRight } from "lucide-react";

const HospitalityWorkspace = () => {
  const { industry, isLoading } = useIndustry();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // If industry isn't hospitality, send to standard dashboard
  if (industry !== "restaurant" && industry !== "hotel") {
    return <Navigate to="/dashboard" replace />;
  }

  const label = industry === "hotel" ? "Hotell" : "Restaurang";

  return (
    <div>
      <PageHeader
        icon={UtensilsCrossed}
        title={`${label}-översikt`}
        subtitle="Allt som driver din verksamhet — försäljning, inköp, personal, deklarationer"
      />
      <div className="space-y-6 px-8 pb-12">
        {/* Row 1: KPI + Daily cash + Purchases */}
        <div className="grid gap-4 md:grid-cols-3">
          <StaffCostKPI />
          <DailyCashWidget />
          <PurchasesWidget />
        </div>

        {/* Row 2: AI-insights + Integrations side-by-side */}
        <div className="grid gap-4 md:grid-cols-2">
          <RestaurantAIInsights />
          <IntegrationStatusWidget />
        </div>

        {/* Row 3: Quick links to core modules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Snabbåtkomst</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <Link to="/hr" className="group rounded-lg border p-4 transition hover:border-primary hover:bg-accent/30">
              <Users2 className="mb-2 h-5 w-5 text-muted-foreground group-hover:text-primary" />
              <p className="text-sm font-medium">Löner</p>
              <p className="text-xs text-muted-foreground">Nästa körning + AGI</p>
            </Link>
            <Link to="/calendar" className="group rounded-lg border p-4 transition hover:border-primary hover:bg-accent/30">
              <Calendar className="mb-2 h-5 w-5 text-muted-foreground group-hover:text-primary" />
              <p className="text-sm font-medium">Deklarationer</p>
              <p className="text-xs text-muted-foreground">Moms + AGI denna månad</p>
            </Link>
            <Link to="/cfo" className="group rounded-lg border p-4 transition hover:border-primary hover:bg-accent/30">
              <FileText className="mb-2 h-5 w-5 text-muted-foreground group-hover:text-primary" />
              <p className="text-sm font-medium">RR / BR</p>
              <p className="text-xs text-muted-foreground">Månadsrapport</p>
            </Link>
            <Link to="/closing" className="group rounded-lg border p-4 transition hover:border-primary hover:bg-accent/30">
              <ArrowRight className="mb-2 h-5 w-5 text-muted-foreground group-hover:text-primary" />
              <p className="text-sm font-medium">Bokslut</p>
              <p className="text-xs text-muted-foreground">Stäng månaden</p>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HospitalityWorkspace;
