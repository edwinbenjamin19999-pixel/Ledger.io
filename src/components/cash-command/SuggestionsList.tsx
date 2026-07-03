import { useNavigate } from "react-router-dom";
import { ActionRow } from "@/components/shared/ActionRow";
import { generateCashflowActions } from "@/lib/ai-actions/generateCashflowActions";
import type { MonthlyCapitalNeed } from "@/hooks/useMonthlyCapitalNeed";

interface Props { data: MonthlyCapitalNeed; companyId?: string | null; }

export function SuggestionsList({ data, companyId }: Props) {
  const navigate = useNavigate();
  const actions = generateCashflowActions({ data, onNavigate: navigate });

  return (
    <ActionRow
      actions={actions}
      companyId={companyId}
      title="AI-förslag"
      maxCols={2}
    />
  );
}
