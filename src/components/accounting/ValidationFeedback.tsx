import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, Lightbulb, BookOpen, ChevronDown } from "lucide-react";
import { useState } from "react";

interface ValidationFeedbackProps { validation: { valid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  };
}

export const ValidationFeedback = ({ validation }: ValidationFeedbackProps) => { const [showDetails, setShowDetails] = useState(false);

  if (!validation) return null;

  const hasExplanation = validation.suggestions.some(s => s.startsWith("📖"));
  const explanation = validation.suggestions.find(s => s.startsWith("📖"))?.replace("📖 ", "");
  const otherSuggestions = validation.suggestions.filter(s => !s.startsWith("📖"));

  return (
    <div className="space-y-3">
      {/* Compact status bar */}
      <div className={`rounded-[12px] border-[0.5px] px-[14px] py-[10px] ${
        validation.valid
          ? "bg-[#E1F5EE] border-[#BFE6D6]"
          : "bg-[#FCE8E8] border-[#F4C8C8]"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {validation.valid ? (
              <CheckCircle className="h-4 w-4 text-[#1D9E75]" />
            ) : (
              <XCircle className="h-4 w-4 text-[#B43A3A]" />
            )}
            <span className={`text-[12px] font-medium ${validation.valid ? "text-[#085041]" : "text-[#7A1F1E]"}`}>
              {validation.valid
                ? "Verifikationen är korrekt"
                : `${validation.errors.length} fel att åtgärda`}
            </span>
          </div>
          {(validation.errors.length > 0 || validation.warnings.length > 0 || otherSuggestions.length > 0) && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-[11px] text-[#64748B] hover:text-[#0F172A] flex items-center gap-1"
            >
              {showDetails ? "Dölj" : "Visa"} detaljer
              <ChevronDown className={`h-3 w-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Errors - always visible if present */}
      {validation.errors.length > 0 && (
        <ul className="space-y-1.5 pl-1">
          {validation.errors.map((error, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[12px] text-[#7A1F1E]">
              <XCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>{error.replace("🚨 ", "").replace("⚠️ ", "")}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Expandable details */}
      {showDetails && (
        <div className="space-y-3">
          {/* Pedagogical explanation */}
          {hasExplanation && explanation && (
            <div className="rounded-[12px] border-[0.5px] border-[#C8DDF5] bg-[#EFF6FF] p-[14px]">
              <div className="flex items-start gap-2">
                <BookOpen className="h-4 w-4 text-[#1E3A5F] mt-0.5 flex-shrink-0" />
                <p className="text-[12px] text-[#1E3A5F]">{explanation}</p>
              </div>
            </div>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <ul className="space-y-1.5 pl-1">
              {validation.warnings.map((warning, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[12px] text-[#7A5417]">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-[#C28A2B]" />
                  <span>{warning.replace("⚠️ ", "")}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Suggestions */}
          {otherSuggestions.length > 0 && (
            <ul className="space-y-1.5 pl-1">
              {otherSuggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[12px] text-[#475569]">
                  <Lightbulb className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-[#1E3A5F]" />
                  <span>{suggestion.replace("💡 ", "")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
