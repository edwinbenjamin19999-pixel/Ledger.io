import { Camera, Paperclip, Calculator, BarChart3, FileText } from "lucide-react";

interface Props {
  onPick: (query: string) => void;
  onFile?: () => void;
  onCamera?: () => void;
}

const chips = [
  { icon: Camera,     label: "Fota kvitto",     query: "__camera__"   },
  { icon: Paperclip,  label: "Ladda upp underlag", query: "__upload__" },
  { icon: Calculator, label: "Beräkna moms",    query: "Hur mycket moms ska jag betala denna period?" },
  { icon: BarChart3,  label: "Analysera ekonomi", query: "Hur går det för mitt bolag den här månaden?" },
  { icon: FileText,   label: "Skapa faktura",   query: "Jag vill skapa en ny faktura" },
];

export const SmartActionChips = ({ onPick, onFile, onCamera }: Props) => (
  <div className="flex flex-wrap gap-2 justify-center">
    {chips.map(c => {
      const Icon = c.icon;
      return (
        <button
          key={c.label}
          onClick={() => {
            if (c.query === "__camera__") onCamera?.();
            else if (c.query === "__upload__") onFile?.();
            else onPick(c.query);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-[hsl(var(--brand-primary)/0.4)] hover:bg-[hsl(var(--brand-primary)/0.06)] hover:text-[hsl(var(--brand-primary))] transition-colors shadow-sm"
        >
          <Icon className="w-3.5 h-3.5" />
          {c.label}
        </button>
      );
    })}
  </div>
);
