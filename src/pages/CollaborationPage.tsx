import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, ClipboardList, Activity, AtSign, Users2 } from "lucide-react";
import { CommentThread } from "@/components/collaboration/CommentThread";
import { TaskBoard } from "@/components/collaboration/TaskBoard";
import { ActivityFeed } from "@/components/collaboration/ActivityFeed";
import { MentionsList } from "@/components/collaboration/MentionsList";
import { PageHeader } from "@/components/layout/PageHeader";

const CollaborationPage = () => { return (
    <div>
      <PageHeader
        icon={Users2}
        title="Samarbete"
        subtitle="Kommunicera, tilldela uppgifter och följ aktivitet — allt på ett ställe"
      />
      <div className="px-8">
        <Tabs defaultValue="tasks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Uppgifter
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" /> Aktivitet
            </TabsTrigger>
            <TabsTrigger value="discussions" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Diskussioner
            </TabsTrigger>
            <TabsTrigger value="mentions" className="flex items-center gap-2">
              <AtSign className="h-4 w-4" /> Omnämningar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks"><TaskBoard /></TabsContent>
          <TabsContent value="activity"><ActivityFeed /></TabsContent>
          <TabsContent value="discussions"><CommentThread showEntityFilter /></TabsContent>
          <TabsContent value="mentions"><MentionsList /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CollaborationPage;
