import { useState, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { getUrgencyBuckets } from "@/hooks/useClientIssues";
import { AdvisorTopBar } from "./AdvisorTopBar";
import { AdvisorMobileNavBar, type AdvisorTab } from "./AdvisorMobileNavBar";
import { AdvisorFloatingActionBar } from "./AdvisorFloatingActionBar";
import { AdvisorHome } from "./tabs/AdvisorHome";
import { AdvisorClients } from "./tabs/AdvisorClients";
import { AdvisorTasks } from "./tabs/AdvisorTasks";
import { AdvisorApprovals } from "./tabs/AdvisorApprovals";
import { AdvisorAI } from "./tabs/AdvisorAI";
import { toast } from "sonner";

interface AdvisorMobileAppProps {
  user: User;
  signOut: () => Promise<void>;
}

export const AdvisorMobileApp = ({ user }: AdvisorMobileAppProps) => {
  const [tab, setTab] = useState<AdvisorTab>("home");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { firmName, firmLogo, clients } = useAdvisorContext();
  const buckets = getUrgencyBuckets(clients);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleAction = (action: "approve" | "comment" | "flag" | "ai") => {
    const labels = {
      approve: "Markerade som granskade",
      comment: "Kommentarsläge — kommer snart",
      flag: "Flaggade för uppföljning",
      ai: "AI analyserar urvalet…",
    } as const;
    toast.success(`${labels[action]} (${selectedIds.size} klienter)`);
    setSelectedIds(new Set());
  };

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: "#F8FAFC" }}
    >
      <AdvisorTopBar user={user} firmName={firmName} firmLogo={firmLogo} criticalCount={buckets.critical} />
      <main className="flex-1 overflow-y-auto pb-32">
        {tab === "home" && (
          <AdvisorHome
            selectedIds={selectedIds}
            toggleSelected={toggleSelected}
            onNavigate={(t) => setTab(t)}
          />
        )}
        {tab === "clients" && <AdvisorClients />}
        {tab === "tasks" && <AdvisorTasks />}
        {tab === "approvals" && <AdvisorApprovals />}
        {tab === "ai" && <AdvisorAI />}
      </main>
      <AdvisorFloatingActionBar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onAction={handleAction}
      />
      <AdvisorMobileNavBar active={tab} onChange={setTab} />
    </div>
  );
};
