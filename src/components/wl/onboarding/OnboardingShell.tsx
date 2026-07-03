import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, X, Loader2 } from "lucide-react";
import { StepProgress } from "./StepProgress";

interface Props {
  step: number;
  totalSteps: number;
  steps: { label: string }[];
  onBack: () => void;
  onNext: () => void;
  canGoNext: boolean;
  nextLabel?: string;
  hideFooter?: boolean;
  loading?: boolean;
  children: ReactNode;
}

export function OnboardingShell({
  step,
  totalSteps,
  steps,
  onBack,
  onNext,
  canGoNext,
  nextLabel = "Fortsätt",
  hideFooter,
  loading,
  children,
}: Props) {
  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col">
      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
          <Link to="/white-label" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#3b82f6] flex items-center justify-center text-white font-bold text-xs">
              C
            </div>
            <span className="text-sm font-semibold text-slate-900">Bokfy</span>
            <span className="hidden sm:inline text-xs text-slate-400 ml-1">White Label</span>
          </Link>
          <StepProgress current={step} steps={steps} />
          <Link
            to="/white-label"
            className="text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Avsluta"
          >
            <X className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto animate-fade-in">{children}</div>
      </main>

      {/* Footer */}
      {!hideFooter && (
        <footer className="sticky bottom-0 z-30 bg-white/85 backdrop-blur-md border-t border-slate-100">
          <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={onBack}
              disabled={step === 1 || loading}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
            </Button>
            <span className="text-xs text-slate-400">
              Steg {step} av {totalSteps}
            </span>
            <Button
              onClick={onNext}
              disabled={!canGoNext || loading}
              className="bg-[#3b82f6] hover:bg-[#3b82f6] text-white px-6 shadow-[0_2px_12px_rgba(37,99,235,0.25)]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {nextLabel} <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
