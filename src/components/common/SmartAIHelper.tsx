import { useLocation } from "react-router-dom";
import { ContextualAIHelper } from "./ContextualAIHelper";
import { getModuleContext } from "@/config/moduleContexts";
import { useTenant } from "@/contexts/TenantContext";

interface SmartAIHelperProps { companyId?: string;
}

/**
 * Route-aware AI assistant wrapper.
 * Automatically applies module-specific context, suggestions, greeting,
 * and visual styling based on the current route. When a tenant is active,
 * the AI identity is replaced with the tenant's configured AI name.
 */
export const SmartAIHelper = ({ companyId }: SmartAIHelperProps) => { const location = useLocation();
  const { tenant } = useTenant();
  const ctx = getModuleContext(location.pathname);

  // When a tenant is active, override the helper title with the tenant's AI name
  // so the assistant feels like part of their private platform.
  const title = tenant?.ai?.ai_name
    ? `${tenant.ai.ai_name} · ${ctx.title}`
    : ctx.title;

  const greeting = tenant?.ai?.ai_name
    ? `Hej, jag är ${tenant.ai.ai_name}. ${ctx.greeting ?? "Ställ en fråga om det du jobbar med just nu."}`
    : ctx.greeting;

  return (
    <ContextualAIHelper
      companyId={companyId}
      context={ctx.systemContext}
      title={title}
      suggestions={ctx.suggestions}
      greeting={greeting}
      headerClass={ctx.headerClass}
      buttonClass={ctx.buttonClass}
    />
  );
};
