import { useState } from "react";
import { useProjects, Project } from "@/hooks/useProjects";
import { ProjectListView, AIDiscoveryItem } from "@/components/projects/ProjectListView";
import { ProjectDetailView } from "@/components/projects/ProjectDetailView";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";
import { ProjectPortfolioTab } from "@/components/projects/tabs/ProjectPortfolioTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderKanban, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const ProjectAccounting = () => { const { projects, isLoading, createProject } = useProjects();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [mainTab, setMainTab] = useState("projekt");

  if (selectedProject) { return (
      <ProjectDetailView
        project={selectedProject}
        onBack={() => setSelectedProject(null)}
      />
    );
  }

  const handleCreateFromDiscovery = (customers: AIDiscoveryItem[]) => { customers.forEach((c) => { createProject.mutate({ name: c.name,
        client_name: c.name,
        start_date: format(new Date(), "yyyy-MM-dd"),
        project_type: "consulting",
      });
    });
    toast.success(`${customers.length} projekt skapade från kunddata`);
  };

  return (
    <div className="space-y-6">
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="projekt" className="gap-1.5">
            <FolderKanban className="h-3.5 w-3.5" />
            Projekt
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Portfolio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projekt">
          <ProjectListView
            projects={projects}
            isLoading={isLoading}
            onSelect={setSelectedProject}
            onNew={() => setShowNew(true)}
            onCreateFromDiscovery={handleCreateFromDiscovery}
          />
        </TabsContent>

        <TabsContent value="portfolio">
          <ProjectPortfolioTab projects={projects} />
        </TabsContent>
      </Tabs>

      <NewProjectDialog
        open={showNew}
        onOpenChange={setShowNew}
        onCreate={(data) => { createProject.mutate(data, { onSuccess: () => setShowNew(false) });
        }}
        isLoading={createProject.isPending}
      />
    </div>
  );
};

export default ProjectAccounting;
