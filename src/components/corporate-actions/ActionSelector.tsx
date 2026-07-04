import { Card, CardContent } from "@/components/ui/card";
import { ActionType, ACTION_TEMPLATES, ACTION_CATEGORIES, ActionCategory } from "./types";
import { PiggyBank, Banknote, ArrowLeftRight, FileText, Users,
  TrendingUp, FileCheck, Sparkles, Search, ScrollText,
  Shield, UserCog, Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const iconMap: Record<string, React.ElementType> = { PiggyBank, Banknote, ArrowLeftRight, FileText, Users,
  TrendingUp, FileCheck, ScrollText, Shield, UserCog, Calculator,
};

const intentMappings: { patterns: string[]; type: ActionType }[] = [
  { patterns: ["sätta in pengar", "skjuta in", "tillskott", "tillföra kapital"], type: "unconditional_contribution" },
  { patterns: ["villkorat", "återbetalning"], type: "conditional_contribution" },
  { patterns: ["låna in", "lån till bolaget", "lån från ägare"], type: "shareholder_loan_in" },
  { patterns: ["låna ut", "lån från bolaget"], type: "shareholder_loan_out" },
  { patterns: ["utdelning", "dela ut vinst", "ta utdelning"], type: "dividend_agm" },
  { patterns: ["nyemission", "ge ut aktier", "nya aktier"], type: "new_share_issue" },
  { patterns: ["fondemission", "bonus issue"], type: "bonus_issue" },
  { patterns: ["styrelsebeslut", "styrelseprotokoll", "styrelsen besluta"], type: "board_resolution" },
  { patterns: ["årsstämma", "bolagsstämma", "ordinarie stämma"], type: "agm" },
  { patterns: ["extra stämma", "extraordinär"], type: "extra_meeting" },
  { patterns: ["byta styrelse", "ny ledamot", "styrelseändring"], type: "board_change" },
  { patterns: ["firmateckning", "teckningsrätt"], type: "signatory_change" },
  { patterns: ["skuldebrev", "revers"], type: "revers" },
  { patterns: ["avtal", "managementavtal", "konsultavtal"], type: "internal_agreement" },
  { patterns: ["återbetalning", "amortering", "betala tillbaka"], type: "loan_repayment" },
  { patterns: ["ränta", "ränteberäkning"], type: "loan_interest" },
];

interface ActionSelectorProps { onSelect: (type: ActionType) => void;
}

export const ActionSelector = ({ onSelect }: ActionSelectorProps) => { const [query, setQuery] = useState("");

  const matchedType = query.length > 2
    ? intentMappings.find(m => m.patterns.some(p => query.toLowerCase().includes(p)))?.type
    : undefined;

  const allActions = Object.values(ACTION_TEMPLATES);
  const filtered = query
    ? matchedType
      ? [ACTION_TEMPLATES[matchedType], ...allActions.filter(a => a.type !== matchedType && (
          a.label.toLowerCase().includes(query.toLowerCase()) ||
          a.description.toLowerCase().includes(query.toLowerCase()) ||
          a.simpleLabel.toLowerCase().includes(query.toLowerCase())
        ))]
      : allActions.filter(a =>
          a.label.toLowerCase().includes(query.toLowerCase()) ||
          a.description.toLowerCase().includes(query.toLowerCase()) ||
          a.simpleLabel.toLowerCase().includes(query.toLowerCase())
        )
    : [];

  const quickActions = [
    { label: "Sätt in pengar i bolaget", type: "unconditional_contribution" as ActionType },
    { label: "Ta utdelning", type: "dividend_agm" as ActionType },
    { label: "Låna in pengar till bolaget", type: "shareholder_loan_in" as ActionType },
    { label: "Fatta styrelsebeslut", type: "board_resolution" as ActionType },
    { label: "Håll årsstämma", type: "agm" as ActionType },
    { label: "Skapa skuldebrev", type: "revers" as ActionType },
  ];

  const groupedByCategory = ACTION_CATEGORIES.map(cat => ({ ...cat,
    actions: allActions.filter(a => a.category === cat.id),
  }));

  const renderActionCard = (template: typeof allActions[0], highlight = false) => { const Icon = iconMap[template.icon] || FileText;
    return (
      <Card
        key={template.type}
        className={cn(
          "cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group",
          highlight && "border-primary/40 ring-1 ring-primary/20"
        )}
        onClick={() => onSelect(template.type)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted flex-shrink-0">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                {template.label}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {template.simpleLabel}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {template.documents.slice(0, 2).map(doc => (
                  <span key={doc} className="text-[10px] px-1.5 py-0.5 bg-muted rounded">{doc}</span>
                ))}
                {template.accounts.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-[#1D9E75] rounded">
                    Bokföring
                  </span>
                )}
                {template.requiresSigning && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#EFF6FF] text-blue-700 dark:bg-blue-900/30 dark:text-[#1E3A5F] rounded">
                    BankID
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      {/* Intent input */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Vad vill du göra?</h3>
              <p className="text-xs text-muted-foreground">Beskriv din avsikt eller välj en åtgärd nedan</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="T.ex. 'Jag vill sätta in pengar i bolaget' eller 'Ta utdelning'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>
          {!query && (
            <div className="flex flex-wrap gap-2 mt-3">
              {quickActions.map(qa => (
                <button
                  key={qa.type}
                  onClick={() => onSelect(qa.type)}
                  className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  {qa.label}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search results */}
      {query && (
        <div className="space-y-3">
          {matchedType && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1 text-xs border-primary/30 text-primary">
                <Sparkles className="h-3 w-3" />
                AI-matchning
              </Badge>
              <span className="text-xs text-muted-foreground">
                Baserat på din beskrivning rekommenderar vi:
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((t, i) => renderActionCard(t, i === 0 && !!matchedType))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Ingen matchande bolagshändelse hittades.</p>
              <p className="text-sm mt-1">Prova att formulera om din fråga.</p>
            </div>
          )}
        </div>
      )}

      {/* Categorized grid when no search */}
      {!query && groupedByCategory.map(cat => (
        <div key={cat.id} className="space-y-3">
          <div>
            <h3 className="font-semibold text-sm">{cat.label}</h3>
            <p className="text-xs text-muted-foreground">{cat.description}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {cat.actions.map(t => renderActionCard(t))}
          </div>
        </div>
      ))}
    </div>
  );
};
