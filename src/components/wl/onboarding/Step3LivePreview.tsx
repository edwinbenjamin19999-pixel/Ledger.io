import { Eye } from "lucide-react";
import { OnboardingDraft } from "@/hooks/useOnboardingDraft";
import { PreviewMockup } from "./PreviewMockup";

interface Props {
  draft: OnboardingDraft;
}

export function Step3LivePreview({ draft }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EFF6FF] border border-cyan-100 text-[10px] font-semibold text-[#3b82f6] uppercase tracking-wider mb-3">
          <Eye className="h-3 w-3" /> Steg 3 · Preview av din plattform
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
          Så här kommer dina klienter se den
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Detta är exakt vad som möter dina klienter när de loggar in. Allt går att anpassa senare.
        </p>
      </div>

      <div className="max-w-6xl mx-auto">
        <PreviewMockup draft={draft} />
      </div>

      <p className="text-[11px] text-slate-400 text-center max-w-md mx-auto">
        Sample-data visas i preview. Den faktiska datan börjar fyllas i så fort din första klient kopplar
        bank, importerar SIE eller skapar sin första faktura.
      </p>
    </div>
  );
}
