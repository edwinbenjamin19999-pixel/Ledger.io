import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionType } from "./types";
import { ActionSelector } from "./ActionSelector";
import { ActionWizard } from "./ActionWizard";
import { OverviewTab } from "./tabs/OverviewTab";
import { OwnershipTab } from "./tabs/OwnershipTab";
import { SimulationsTab } from "./tabs/SimulationsTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { GovernanceTab } from "./tabs/GovernanceTab";
import { TimelineTab } from "./tabs/TimelineTab";
import { LayoutDashboard, Plus, PieChart, FlaskConical,
  FileText, Gavel, GitBranch,
} from "lucide-react";

export const CorporateActionsModule = () => { const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const handleActionComplete = () => { setSelectedAction(null);
    setActiveTab("overview");
  };

  if (selectedAction) { return (
      <ActionWizard
        actionType={selectedAction}
        onCancel={() => setSelectedAction(null)}
        onComplete={handleActionComplete}
      />
    );
  }

  const tabs = [
    { id: "overview", label: "Översikt", icon: LayoutDashboard },
    { id: "new", label: "Ny händelse", icon: Plus },
    { id: "ownership", label: "Ägarstruktur", icon: PieChart },
    { id: "simulations", label: "Simuleringar", icon: FlaskConical },
    { id: "documents", label: "Avtal & dokument", icon: FileText },
    { id: "governance", label: "Styrelse & beslut", icon: Gavel },
    { id: "timeline", label: "Tidslinje", icon: GitBranch },
  ];

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {tabs.map((tab) => { const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 text-xs sm:text-sm">
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab
            onNewEvent={() => setActiveTab("new")}
            onViewTimeline={() => setActiveTab("timeline")}
          />
        </TabsContent>

        <TabsContent value="new" className="mt-6">
          <ActionSelector onSelect={setSelectedAction} />
        </TabsContent>

        <TabsContent value="ownership" className="mt-6">
          <OwnershipTab onSimulate={() => setActiveTab("simulations")} />
        </TabsContent>

        <TabsContent value="simulations" className="mt-6">
          <SimulationsTab />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsTab />
        </TabsContent>

        <TabsContent value="governance" className="mt-6">
          <GovernanceTab />
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <TimelineTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
