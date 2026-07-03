import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Download, CheckCircle2, Sparkles,
  ChevronDown, Lock, ArrowUpRight, ArrowDownRight, Pencil, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { VATFinding } from "@/lib/vat/vatReviewEngine";

interface VATData {
  box05: number; box06: number; box07: number; box08: number;
  box10: number; box11: number; box12: number;
  box20: number; box21: number; box22: number; box23: number; box24: number;
  box30: number; box31: number; box32: number;
  box35: number; box36: number; box37: number; box38: number; box39: number; box40: number; box41: number; box42: number;
  box50: number;
  box60: number; box61: number; box62: number;
  box48: number; box49: number;
}

interface VATHorizontalDeclarationProps {
  vatData: VATData;
  periodLabel: string;
  companyName: string;
  orgNumber?: string;
  onDrillDown?: (boxId: string) => void;
  onReviewAI?: () => void;
  /** Persisted override values (numeric, by box) */
  overrideValues?: Record<string, number>;
  /** Save handler — wired to vat_box_overrides table */
  onSaveOverride?: (box: string, originalValue: number, overrideValue: number) => void;
  /** Remove handler */
  onRemoveOverride?: (box: string) => void;
  /** Reset all */
  onResetOverrides?: () => void;
  /** AI findings — drives row-level status indicators */
  findings?: VATFinding[];
}

const fmt = (n: number) => n.toLocaleString("sv-SE");

const SECTION_COLORS: Record<string, { border: string; badge: string; badgeText: string }> = {
  A: { border: "border-l-[#0F1F3D]", badge: "bg-[#0F1F3D]", badgeText: "text-white" },
  B: { border: "border-l-[#1E3A5F]", badge: "bg-[#1E3A5F]", badgeText: "text-white" },
  C: { border: "border-l-[#1D9E75]", badge: "bg-[#1D9E75]", badgeText: "text-white" },
  D: { border: "border-l-[#C28A2B]", badge: "bg-[#C28A2B]", badgeText: "text-white" },
  E: { border: "border-l-[#475569]", badge: "bg-[#475569]", badgeText: "text-white" },
  F: { border: "border-l-[#C73838]", badge: "bg-[#C73838]", badgeText: "text-white" },
  H: { border: "border-l-[#1E3A5F]", badge: "bg-[#1E3A5F]", badgeText: "text-white" },
  I: { border: "border-l-[#0F1F3D]", badge: "bg-[#0F1F3D]", badgeText: "text-white" },
};

const RUTA_LABELS: Record<string, string> = {
  "05": "Momspliktig försäljning 25%",
  "06": "Momspliktig försäljning 12%",
  "07": "Momspliktig försäljning 6%",
  "08": "Momspliktig försäljning 0%",
  "10": "Utgående moms 25%",
  "11": "Utgående moms 12%",
  "12": "Utgående moms 6%",
  "20": "Inköp varor annat EU-land",
  "21": "Inköp tjänster annat EU-land",
  "22": "Inköp varor i Sverige, omvänd skattskyldighet",
  "23": "Inköp tjänster i Sverige, omvänd skattskyldighet",
  "24": "Övriga inköp, omvänd skattskyldighet",
  "30": "Utgående moms 25% på inköp (ruta 20–24)",
  "31": "Utgående moms 12% på inköp (ruta 20–24)",
  "32": "Utgående moms 6% på inköp (ruta 20–24)",
  "35": "Försäljning varor till annat EU-land",
  "36": "Försäljning varor utanför EU",
  "37": "Mellanmans inköp vid trepartshandel",
  "38": "Mellanmans försäljning vid trepartshandel",
  "39": "Försäljning tjänster annat EU-land (huvudregeln)",
  "40": "Övrig försäljning utanför Sverige",
  "41": "Försäljning undantagen moms",
  "42": "Försäljning med marginalbeskattning",
  "48": "Avdragsgill ingående moms",
  "49": "Moms att betala eller återfå",
  "50": "Import",
  "60": "Utgående moms 25% på import",
  "61": "Utgående moms 12% på import",
  "62": "Utgående moms 6% på import",
};

const RUTA_DESCRIPTIONS: Record<string, string> = {
  "05": "Nettoförsäljning 25% moms (BAS 3001-3099).",
  "06": "Nettoförsäljning 12% moms.",
  "07": "Nettoförsäljning 6% moms.",
  "08": "Momspliktig försäljning 0%.",
  "10": "Utgående moms 25% (auto från ruta 05).",
  "11": "Utgående moms 12% (auto från ruta 06).",
  "12": "Utgående moms 6% (auto från ruta 07).",
  "20": "Inköp varor från annat EU-land.",
  "21": "Inköp tjänster från annat EU-land.",
  "22": "Inköp varor i Sverige, omvänd skattskyldighet.",
  "23": "Inköp tjänster i Sverige, omvänd skattskyldighet.",
  "24": "Övriga inköp, omvänd skattskyldighet.",
  "30": "Utgående moms 25% på inköp (ruta 20–24).",
  "31": "Utgående moms 12% på inköp (ruta 20–24).",
  "32": "Utgående moms 6% på inköp (ruta 20–24).",
  "35": "Försäljning varor annat EU-land.",
  "36": "Försäljning varor utanför EU (export).",
  "39": "Försäljning tjänster EU (huvudregeln).",
  "40": "Övrig försäljning utanför Sverige.",
  "41": "Försäljning undantagen från moms.",
  "42": "Vinstmarginalbeskattning.",
  "48": "Avdragsgill ingående moms (BAS 264x).",
  "49": "Moms att betala/återfå = utgående − ingående.",
  "50": "Beskattningsunderlag vid import.",
  "60": "Utgående moms 25% på import.",
  "61": "Utgående moms 12% på import.",
  "62": "Utgående moms 6% på import.",
};

type DotSeverity = "critical" | "high" | "medium" | "info" | null;

function dotForBox(box: string, findings?: VATFinding[]): DotSeverity {
  if (!findings || findings.length === 0) return null;
  const order = { critical: 0, high: 1, medium: 2, info: 3 } as const;
  const matching = findings.filter(f => f.affectedBox === box);
  if (matching.length === 0) return null;
  matching.sort((a, b) => order[a.severity] - order[b.severity]);
  return matching[0].severity;
}

interface RutaRowProps {
  box: string;
  value: number;
  onClick?: () => void;
  isCalculated?: boolean;
  isHighlighted?: boolean;
  isEditing?: boolean;
  override?: number | undefined;
  onCommitOverride?: (box: string, original: number, value: number | undefined) => void;
  statusDot?: DotSeverity;
}

const RutaRow = ({ box, value, onClick, isCalculated, isHighlighted, isEditing, override, onCommitOverride, statusDot }: RutaRowProps) => {
  const displayValue = override !== undefined ? override : value;
  const populated = displayValue !== 0;
  const isOverridden = override !== undefined;
  const label = RUTA_LABELS[box] || `Ruta ${box}`;
  const description = RUTA_DESCRIPTIONS[box];

  const dotColor =
    statusDot === "critical" ? "bg-[#C73838]"
    : statusDot === "high" ? "bg-[#C28A2B]"
    : statusDot === "medium" ? "bg-[#C28A2B]"
    : statusDot === "info" ? "bg-[#1E3A5F]"
    : populated ? "bg-[#1D9E75]"
    : "bg-[#CBD5E1]";

  const dotLabel =
    statusDot === "critical" ? "Kritiskt fynd från AI-granskning"
    : statusDot === "high" ? "Hög varning från AI-granskning"
    : statusDot === "medium" ? "Granskning rekommenderas"
    : statusDot === "info" ? "AI-tips för denna ruta"
    : "Inga AI-fynd för denna ruta";

  return (
    <div
      className={cn(
        "flex items-center justify-between py-2.5 px-4 transition-colors group cursor-default",
        "hover:bg-[#F8FAFC]",
        isHighlighted && "bg-[#FAEEDA]/40",
        isOverridden && "bg-[#EFF6FF]"
      )}
      onClick={!isEditing ? onClick : undefined}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  dotColor,
                  statusDot && "ring-2 ring-offset-1 ring-offset-white",
                  statusDot === "critical" && "ring-[#F4C8C8]",
                  statusDot === "high" && "ring-[#F0DDB7]",
                  statusDot === "medium" && "ring-[#F0DDB7]",
                  statusDot === "info" && "ring-[#C8DDF5]",
                )}
                onClick={(e) => e.stopPropagation()}
                aria-label={dotLabel}
              />
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <div className="text-xs font-semibold mb-0.5">{dotLabel}</div>
              {description && <div className="text-[11px] text-muted-foreground leading-snug">Så här beräknas detta värde: {description}</div>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span className={cn(
          "w-8 h-6 rounded-[6px] text-xs font-mono font-semibold flex items-center justify-center shrink-0",
          isOverridden
            ? "bg-[#EFF6FF] text-[#1E3A5F] border-[0.5px] border-[#C8DDF5]"
            : populated
              ? "bg-[#0F1F3D]/10 text-[#0F1F3D] border-[0.5px] border-[#0F1F3D]/20"
              : "bg-[#F1F5F9] text-[#94A3B8]"
        )}>
          {box}
        </span>
        <span className="text-sm text-[#0F1F3D] truncate" title={label}>
          {label}
        </span>
        {isOverridden && (
          <span className="inline-flex items-center rounded-full border-[0.5px] px-1.5 h-[16px] text-[10px] bg-[#EFF6FF] text-[#1E3A5F] border-[#C8DDF5]">
            Justerad
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        {isEditing ? (
          <div className="flex items-center gap-1">
            {isOverridden && (
              <button
                onClick={(e) => { e.stopPropagation(); onCommitOverride?.(box, value, undefined); }}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Återställ till beräknat värde"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
            <Input
              type="number"
              defaultValue={displayValue || ""}
              placeholder="0"
              className="w-28 h-7 text-right font-mono text-sm"
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => {
                const val = e.target.value === "" ? undefined : Math.round(Number(e.target.value));
                if (val === undefined || val === value) {
                  onCommitOverride?.(box, value, undefined);
                } else {
                  onCommitOverride?.(box, value, val);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />
          </div>
        ) : (
          <>
            {isCalculated && !isOverridden && (
              <Lock className="w-3 h-3 text-[#94A3B8]" />
            )}
            {populated && !isCalculated && !isOverridden && (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1D9E75]" />
            )}
            <span className={cn(
              "font-mono text-sm min-w-[100px] text-right",
              isOverridden
                ? "text-[#1E3A5F] font-semibold"
                : populated
                  ? isCalculated
                    ? "text-[#64748B] italic"
                    : "text-[#0F1F3D] font-semibold"
                  : "text-[#CBD5E1]"
            )}>
              {populated ? `${fmt(displayValue)} kr` : "—"}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

interface SectionCardProps {
  letter: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const SectionCard = ({ letter, title, children, defaultOpen = true }: SectionCardProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const colors = SECTION_COLORS[letter] || SECTION_COLORS.A;

  return (
    <div className="bg-white rounded-[12px] border-[0.5px] border-[#E2E8F0] overflow-hidden">
      <div className={cn("border-l-4", colors.border)}>
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex items-center gap-3 w-full px-4 py-3 hover:bg-[#F8FAFC] transition-colors">
            <span className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
              colors.badge, colors.badgeText
            )}>
              {letter}
            </span>
            <span className="text-sm font-semibold text-[#0F1F3D] flex-1 text-left">{title}</span>
            <ChevronDown className={cn("w-4 h-4 text-[#64748B] transition-transform", !open && "-rotate-90")} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="divide-y divide-[#E2E8F0]/50">
              {children}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

export const VATHorizontalDeclaration = ({
  vatData, periodLabel, companyName, orgNumber, onDrillDown,
  onReviewAI,
  overrideValues = {},
  onSaveOverride, onRemoveOverride, onResetOverrides,
  findings,
}: VATHorizontalDeclarationProps) => {
  const [manualMode, setManualMode] = useState(false);
  const dot = (b: string) => dotForBox(b, findings);

  const handleCommit = (box: string, original: number, value: number | undefined) => {
    if (value === undefined) {
      onRemoveOverride?.(box);
    } else {
      onSaveOverride?.(box, original, value);
    }
  };

  const getVal = (box: string, original: number) =>
    overrideValues[box] !== undefined ? overrideValues[box] : original;
  const overrideCount = Object.keys(overrideValues).length;

  const effectiveData = {
    box05: getVal("05", vatData.box05), box06: getVal("06", vatData.box06),
    box07: getVal("07", vatData.box07), box08: getVal("08", vatData.box08),
    box10: getVal("10", vatData.box10), box11: getVal("11", vatData.box11),
    box12: getVal("12", vatData.box12),
    box20: getVal("20", vatData.box20), box21: getVal("21", vatData.box21),
    box22: getVal("22", vatData.box22), box23: getVal("23", vatData.box23),
    box24: getVal("24", vatData.box24),
    box30: getVal("30", vatData.box30), box31: getVal("31", vatData.box31),
    box32: getVal("32", vatData.box32),
    box35: getVal("35", vatData.box35), box36: getVal("36", vatData.box36),
    box39: getVal("39", vatData.box39), box40: getVal("40", vatData.box40),
    box41: getVal("41", vatData.box41), box42: getVal("42", vatData.box42),
    box48: getVal("48", vatData.box48), box49: getVal("49", vatData.box49),
    box50: getVal("50", vatData.box50),
    box60: getVal("60", vatData.box60), box61: getVal("61", vatData.box61),
    box62: getVal("62", vatData.box62),
  };
  const totalOutput = effectiveData.box10 + effectiveData.box11 + effectiveData.box12 + effectiveData.box30 + effectiveData.box31 + effectiveData.box32 + effectiveData.box60 + effectiveData.box61 + effectiveData.box62;
  const vatToPay = overrideCount > 0
    ? totalOutput - effectiveData.box48
    : vatData.box49;
  const isOwing = vatToPay >= 0;

  const exportSRU = () => {
    const orgNr = orgNumber || "0000000000";
    const infoContent = `#DATABESKRIVNING\n#ORGNR ${orgNr}\n#UPPGJORD ${new Date().toISOString().split("T")[0]}\n#PROGRAM Ledger.io\n#FILNAMN BLANKETTER.SRU\n`;
    const d = effectiveData;
    const blankettContent = `#BLANKETT SKV4700\n#IDENTITET ${orgNr} ${periodLabel}\n#UPPGIFT 7011 05 ${d.box05}\n#UPPGIFT 7011 06 ${d.box06}\n#UPPGIFT 7011 07 ${d.box07}\n#UPPGIFT 7011 08 ${d.box08}\n#UPPGIFT 7011 10 ${d.box10}\n#UPPGIFT 7011 11 ${d.box11}\n#UPPGIFT 7011 12 ${d.box12}\n#UPPGIFT 7011 20 ${d.box20}\n#UPPGIFT 7011 21 ${d.box21}\n#UPPGIFT 7011 22 ${d.box22}\n#UPPGIFT 7011 23 ${d.box23}\n#UPPGIFT 7011 24 ${d.box24}\n#UPPGIFT 7011 30 ${d.box30}\n#UPPGIFT 7011 31 ${d.box31}\n#UPPGIFT 7011 32 ${d.box32}\n#UPPGIFT 7011 48 ${d.box48}\n#UPPGIFT 7011 49 ${vatToPay}\n#BLANKETTSLUT\n#FIL_SLUT`;
    const a1 = document.createElement("a");
    a1.href = URL.createObjectURL(new Blob([infoContent], { type: "text/plain" }));
    a1.download = "INFO.SRU"; a1.click();
    setTimeout(() => {
      const a2 = document.createElement("a");
      a2.href = URL.createObjectURL(new Blob([blankettContent], { type: "text/plain" }));
      a2.download = "BLANKETTER.SRU"; a2.click();
    }, 500);
    toast.success("SRU-filer exporterade!");
  };

  const exportXML = () => {
    const orgNr = orgNumber || "0000000000";
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Skattedeklaration xmlns="urn:skatteverket:se:moms:deklaration">\n  <Deklarationsomrade>Mervardesskatt</Deklarationsomrade>\n  <Period>${periodLabel}</Period>\n  <Organisationsnummer>${orgNr}</Organisationsnummer>\n  <MomspliktForslj25>${effectiveData.box05}</MomspliktForslj25>\n  <MomspliktForslj12>${effectiveData.box06}</MomspliktForslj12>\n  <MomspliktForslj6>${effectiveData.box07}</MomspliktForslj6>\n  <MomspliktForslj0>${effectiveData.box08}</MomspliktForslj0>\n  <UtgMoms25>${effectiveData.box10}</UtgMoms25>\n  <UtgMoms12>${effectiveData.box11}</UtgMoms12>\n  <UtgMoms6>${effectiveData.box12}</UtgMoms6>\n  <IngMoms>${effectiveData.box48}</IngMoms>\n  <MomsAttBetala>${vatToPay}</MomsAttBetala>\n</Skattedeklaration>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([xml], { type: "application/xml" }));
    a.download = `momsdeklaration_${periodLabel}.xml`;
    a.click();
    toast.success("XML-fil exporterad!");
  };

  return (
    <div className="space-y-6">
      {/* Action toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {onReviewAI && (
          <Button
            size="sm"
            onClick={onReviewAI}
            className="gap-1.5 h-[34px] rounded-[8px] bg-[#0F1F3D] hover:bg-[#0F1F3D]/90 text-white"
          >
            <Sparkles className="w-4 h-4" />
            Granska med AI
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={exportSRU} className="gap-1.5">
          <Download className="w-4 h-4" /> SRU
        </Button>
        <Button size="sm" variant="outline" onClick={exportXML} className="gap-1.5">
          <Download className="w-4 h-4" /> XML
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={manualMode ? "default" : "outline"}
            size="sm"
            className={cn("gap-1.5 h-[34px] rounded-[8px]", manualMode && "bg-[#0F1F3D] hover:bg-[#0F1F3D]/90 text-white")}
            onClick={() => {
              if (manualMode && overrideCount > 0) {
                toast.success(`${overrideCount} manuella justeringar sparade`);
              }
              setManualMode(!manualMode);
            }}
          >
            <Pencil className="w-4 h-4" />
            {manualMode ? "Avsluta justering" : "Manuell justering"}
          </Button>
          {overrideCount > 0 && !manualMode && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => onResetOverrides?.()}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Återställ ({overrideCount})
            </Button>
          )}
        </div>
      </div>

      {/* Ruta Grid — Two columns */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          <SectionCard letter="A" title="Momspliktig försäljning (exkl. moms)">
            <RutaRow box="05" value={vatData.box05} onClick={() => onDrillDown?.("05")} isEditing={manualMode} override={overrideValues["05"]} onCommitOverride={handleCommit} />
            <RutaRow box="06" value={vatData.box06} onClick={() => onDrillDown?.("06")} isEditing={manualMode} override={overrideValues["06"]} onCommitOverride={handleCommit} />
            <RutaRow box="07" value={vatData.box07} onClick={() => onDrillDown?.("07")} isEditing={manualMode} override={overrideValues["07"]} onCommitOverride={handleCommit} />
            <RutaRow box="08" value={vatData.box08} onClick={() => onDrillDown?.("08")} isEditing={manualMode} override={overrideValues["08"]} onCommitOverride={handleCommit} />
          </SectionCard>

          <SectionCard letter="C" title="Inköp omvänd skattskyldighet" defaultOpen={vatData.box20 > 0 || vatData.box21 > 0}>
            <RutaRow box="20" value={vatData.box20} onClick={() => onDrillDown?.("20")} isEditing={manualMode} override={overrideValues["20"]} onCommitOverride={handleCommit} />
            <RutaRow box="21" value={vatData.box21} onClick={() => onDrillDown?.("21")} isEditing={manualMode} override={overrideValues["21"]} onCommitOverride={handleCommit} />
            <RutaRow box="22" value={vatData.box22} onClick={() => onDrillDown?.("22")} isEditing={manualMode} override={overrideValues["22"]} onCommitOverride={handleCommit} />
            <RutaRow box="23" value={vatData.box23} onClick={() => onDrillDown?.("23")} isEditing={manualMode} override={overrideValues["23"]} onCommitOverride={handleCommit} />
            <RutaRow box="24" value={vatData.box24} onClick={() => onDrillDown?.("24")} isEditing={manualMode} override={overrideValues["24"]} onCommitOverride={handleCommit} />
          </SectionCard>

          <SectionCard letter="H" title="Import" defaultOpen={vatData.box50 > 0}>
            <RutaRow box="50" value={vatData.box50} onClick={() => onDrillDown?.("50")} isHighlighted isEditing={manualMode} override={overrideValues["50"]} onCommitOverride={handleCommit} />
          </SectionCard>

          <SectionCard letter="E" title="Försäljning undantagen moms" defaultOpen={vatData.box35 > 0 || vatData.box36 > 0}>
            <RutaRow box="35" value={vatData.box35} onClick={() => onDrillDown?.("35")} isEditing={manualMode} override={overrideValues["35"]} onCommitOverride={handleCommit} />
            <RutaRow box="36" value={vatData.box36} onClick={() => onDrillDown?.("36")} isEditing={manualMode} override={overrideValues["36"]} onCommitOverride={handleCommit} />
            <RutaRow box="39" value={vatData.box39} onClick={() => onDrillDown?.("39")} isEditing={manualMode} override={overrideValues["39"]} onCommitOverride={handleCommit} />
            <RutaRow box="40" value={vatData.box40} onClick={() => onDrillDown?.("40")} isEditing={manualMode} override={overrideValues["40"]} onCommitOverride={handleCommit} />
            <RutaRow box="41" value={vatData.box41} onClick={() => onDrillDown?.("41")} isEditing={manualMode} override={overrideValues["41"]} onCommitOverride={handleCommit} />
            <RutaRow box="42" value={vatData.box42} onClick={() => onDrillDown?.("42")} isEditing={manualMode} override={overrideValues["42"]} onCommitOverride={handleCommit} />
          </SectionCard>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          <SectionCard letter="B" title="Utgående moms försäljning">
            <RutaRow box="10" value={vatData.box10} onClick={() => onDrillDown?.("10")} isCalculated isEditing={manualMode} override={overrideValues["10"]} onCommitOverride={handleCommit} />
            <RutaRow box="11" value={vatData.box11} onClick={() => onDrillDown?.("11")} isCalculated isEditing={manualMode} override={overrideValues["11"]} onCommitOverride={handleCommit} />
            <RutaRow box="12" value={vatData.box12} onClick={() => onDrillDown?.("12")} isCalculated isEditing={manualMode} override={overrideValues["12"]} onCommitOverride={handleCommit} />
          </SectionCard>

          <SectionCard letter="D" title="Utgående moms inköp (omvänd skattskyldighet)" defaultOpen={vatData.box30 > 0}>
            <RutaRow box="30" value={vatData.box30} onClick={() => onDrillDown?.("30")} isCalculated isEditing={manualMode} override={overrideValues["30"]} onCommitOverride={handleCommit} />
            <RutaRow box="31" value={vatData.box31} onClick={() => onDrillDown?.("31")} isCalculated isEditing={manualMode} override={overrideValues["31"]} onCommitOverride={handleCommit} />
            <RutaRow box="32" value={vatData.box32} onClick={() => onDrillDown?.("32")} isCalculated isEditing={manualMode} override={overrideValues["32"]} onCommitOverride={handleCommit} />
          </SectionCard>

          <SectionCard letter="I" title="Moms import" defaultOpen={vatData.box60 > 0}>
            <RutaRow box="60" value={vatData.box60} onClick={() => onDrillDown?.("60")} isCalculated isEditing={manualMode} override={overrideValues["60"]} onCommitOverride={handleCommit} />
            <RutaRow box="61" value={vatData.box61} onClick={() => onDrillDown?.("61")} isCalculated isEditing={manualMode} override={overrideValues["61"]} onCommitOverride={handleCommit} />
            <RutaRow box="62" value={vatData.box62} onClick={() => onDrillDown?.("62")} isCalculated isEditing={manualMode} override={overrideValues["62"]} onCommitOverride={handleCommit} />
          </SectionCard>

          <SectionCard letter="F" title="Ingående moms">
            <RutaRow box="48" value={vatData.box48} onClick={() => onDrillDown?.("48")} isHighlighted isEditing={manualMode} override={overrideValues["48"]} onCommitOverride={handleCommit} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
};
