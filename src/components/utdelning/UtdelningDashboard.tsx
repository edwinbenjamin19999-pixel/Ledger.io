import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalaryDividendComparison } from "./SalaryDividendComparison";
import { GransbeloppsCalculator } from "./GransbeloppsCalculator";
import { K10Helper } from "./K10Helper";
import { DividendHistory } from "./DividendHistory";
import { DividendExecution } from "./DividendExecution";

export function UtdelningDashboard() { return (
    <Tabs defaultValue="calculator" className="space-y-6">
      <TabsList className="grid grid-cols-3 sm:grid-cols-5 w-full">
        <TabsTrigger value="calculator" className="text-xs sm:text-sm">Kalkylator</TabsTrigger>
        <TabsTrigger value="gransbelopp" className="text-xs sm:text-sm">Gränsbelopp</TabsTrigger>
        <TabsTrigger value="k10" className="text-xs sm:text-sm">K10-hjälpen</TabsTrigger>
        <TabsTrigger value="history" className="text-xs sm:text-sm">Historik</TabsTrigger>
        <TabsTrigger value="execute" className="text-xs sm:text-sm">Ta utdelning</TabsTrigger>
      </TabsList>

      <TabsContent value="calculator">
        <SalaryDividendComparison />
      </TabsContent>
      <TabsContent value="gransbelopp">
        <GransbeloppsCalculator />
      </TabsContent>
      <TabsContent value="k10">
        <K10Helper />
      </TabsContent>
      <TabsContent value="history">
        <DividendHistory />
      </TabsContent>
      <TabsContent value="execute">
        <DividendExecution />
      </TabsContent>
    </Tabs>
  );
}
