import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import {
  Brain,
  ScanLine,
  UserCog,
  Banknote,
  Landmark,
  Zap,
  Bot,
  type LucideIcon,
} from "lucide-react";
import { AgentLayout } from "@/components/agent-layout";
import type {
  AgentLayoutProps,
  AgentSettingsValue,
} from "@/components/agent-layout/types";
import NotFound from "@/pages/NotFound";

type AgentSlug =
  | "bokforing"
  | "kvitto"
  | "lon"
  | "ar"
  | "skatt"
  | "autofix"
  | "automatiseringar"
  | "beslutsmotor";

interface AgentDefinition {
  slug: AgentSlug;
  icon: LucideIcon;
  name: string;
  description: string;
}

const AGENT_REGISTRY: Record<AgentSlug, AgentDefinition> = {
  bokforing: {
    slug: "bokforing",
    icon: Brain,
    name: "Bokföringsagent",
    description: "Konterar transaktioner och underlag automatiskt.",
  },
  kvitto: {
    slug: "kvitto",
    icon: ScanLine,
    name: "Kvittoagent",
    description: "Skannar, tolkar och bokför kvitton.",
  },
  lon: {
    slug: "lon",
    icon: UserCog,
    name: "Löneagent",
    description: "Beräknar löner och förbereder arbetsgivardeklaration.",
  },
  ar: {
    slug: "ar",
    icon: Banknote,
    name: "AR-agent",
    description: "Följer upp kundfordringar och påminnelser.",
  },
  skatt: {
    slug: "skatt",
    icon: Landmark,
    name: "Skatteagent",
    description: "Förbereder och granskar skattedeklarationer.",
  },
  autofix: {
    slug: "autofix",
    icon: Zap,
    name: "Autofix",
    description: "Hittar och rättar avvikelser i bokföringen.",
  },
  automatiseringar: {
    slug: "automatiseringar",
    icon: Bot,
    name: "Automatiseringar",
    description: "Övervakar och kör dina automationsregler.",
  },
  beslutsmotor: {
    slug: "beslutsmotor",
    icon: Brain,
    name: "Beslutsmotor",
    description: "Föreslår finansiella beslut baserat på din data.",
  },
};

export const AGENT_SLUGS = Object.keys(AGENT_REGISTRY) as AgentSlug[];

export default function AgentRoute() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const def = slug ? AGENT_REGISTRY[slug as AgentSlug] : undefined;

  // Hooks must run before any conditional return
  const [isActive, setIsActive] = useState(true);
  const [settings, setSettings] = useState<AgentSettingsValue>({
    autonomy: "suggest",
    confidenceThreshold: 85,
  });

  if (!def) return <NotFound />;

  // Default scaffolding — each agent (CNT-36..CNT-43) replaces these
  // with real data from its own hooks.
  const props: AgentLayoutProps = {
    icon: def.icon,
    name: def.name,
    description: def.description,
    isActive,
    isPaused: !isActive,
    onToggleActive: setIsActive,
    statusNow: isActive
      ? {
          state: "idle",
          lastRunAt: new Date(Date.now() - 1000 * 60 * 23),
          nextRunAt: new Date(Date.now() + 1000 * 60 * 60),
        }
      : { state: "paused" },
    kpis: [],
    activity: [],
    settings,
    onSettingsChange: setSettings,
    manualActions: {
      onRunNow: () => {},
      onOpenFullLog: () => navigate("/agent"),
      onTrainAgent: () => navigate("/ai-settings"),
    },
  };

  return <AgentLayout {...props} />;
}
