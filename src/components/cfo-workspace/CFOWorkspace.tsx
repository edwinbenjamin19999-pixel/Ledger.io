import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContextHeader } from "./ContextHeader";
import { ConversationThread } from "./ConversationThread";
import { ContextPanel } from "./ContextPanel";
import { ConversationSidebar } from "./ConversationSidebar";
import { useCFOContext } from "@/hooks/useCFOContext";

interface Props { companyId: string; }

export const CFOWorkspace = ({ companyId }: Props) => {
  const { context, conversationId } = useCFOContext();
  const [activeConv, setActiveConv] = useState<string | null>(conversationId);
  const navigate = useNavigate();

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-100 dark:bg-slate-950">
      {/* Sidebar */}
      <div className="w-64 shrink-0 hidden lg:block">
        <ConversationSidebar companyId={companyId} activeId={activeConv} />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <ContextHeader context={context} onNewConversation={() => { setActiveConv(null); navigate("/cfo/workspace"); }} />
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 min-w-0">
            <ConversationThread
              companyId={companyId}
              conversationId={activeConv}
              context={context}
              onConversationCreated={(id) => setActiveConv(id)}
            />
          </div>
          <div className="w-80 shrink-0 hidden xl:block">
            <ContextPanel companyId={companyId} context={context} />
          </div>
        </div>
      </div>
    </div>
  );
};
