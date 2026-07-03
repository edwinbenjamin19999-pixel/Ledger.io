import { Button } from "@/components/ui/button";
import { Save, GitCompare, Sparkles, FileDown } from "lucide-react";
import { PRESETS } from "@/lib/scenarios/aiPresets";

interface Props {
  activeKey: string;
  onSelectPreset: (key: string) => void;
  savedScenarios: { id: string; name: string }[];
  onSelectSaved: (id: string) => void;
  activeSavedId: string | null;
  onSave: () => void;
  onCompare: () => void;
  onAIGenerate: () => void;
  onExportPdf: () => void;
  saving?: boolean;
  generating?: boolean;
}

export function ScenarioTopBar({
  activeKey, onSelectPreset, savedScenarios, onSelectSaved, activeSavedId,
  onSave, onCompare, onAIGenerate, onExportPdf, saving, generating,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {PRESETS.map((p) => {
          const active = activeKey === p.key && !activeSavedId;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onSelectPreset(p.key)}
              className={`text-xs font-medium px-3 h-8 rounded-full border transition-colors ${
                active
                  ? "bg-[#3b82f6] text-white border-cyan-600"
                  : "bg-white text-slate-700 border-slate-200 hover:border-[#3b82f6] hover:text-[#3b82f6]"
              }`}
            >
              {p.name}
            </button>
          );
        })}
        {savedScenarios.length > 0 && <div className="h-6 w-px bg-slate-200 mx-1" />}
        {savedScenarios.map((s) => {
          const active = s.id === activeSavedId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectSaved(s.id)}
              className={`text-xs font-medium px-3 h-8 rounded-full border transition-colors ${
                active
                  ? "bg-[#3b82f6] text-white border-cyan-600"
                  : "bg-white text-slate-700 border-slate-200 hover:border-[#3b82f6] hover:text-[#3b82f6]"
              }`}
            >
              {s.name}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="default" onClick={onSave} disabled={saving} className="h-8">
          <Save className="h-3.5 w-3.5" />
          {saving ? "Sparar…" : "Spara strategi"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCompare} className="h-8">
          <GitCompare className="h-3.5 w-3.5" /> Jämför
        </Button>
        <Button size="sm" variant="outline" onClick={onAIGenerate} disabled={generating} className="h-8">
          <Sparkles className="h-3.5 w-3.5" />
          {generating ? "Genererar…" : "AI-generera"}
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={onExportPdf} className="h-8 text-slate-700">
          <FileDown className="h-3.5 w-3.5" /> Exportera PDF
        </Button>
      </div>
    </div>
  );
}
