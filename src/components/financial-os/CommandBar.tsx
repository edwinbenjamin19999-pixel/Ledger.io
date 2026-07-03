/**
 * CommandBar — global ⌘K command palette for the Financial OS layer.
 *
 * Pipes the typed query through the heuristic `queryParser`. When parsing
 * succeeds, navigates instantly to the resolved route + querystring. When
 * heuristics miss, falls back to the `financial-os-parse` edge function for
 * an AI-assisted interpretation.
 *
 * Pure UX glue — all routing state lives in <FinancialOSProvider>; the bar
 * just emits navigation intents.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { LineChart, PiggyBank, Activity, GitBranch, BarChart3, Wallet, Sparkles, ArrowRight } from "lucide-react";
import { parseQuery, buildUrl, type ParsedQuery } from "@/lib/financial-os/queryParser";
import { supabase } from "@/integrations/supabase/client";

interface QuickRoute {
  label: string;
  hint: string;
  route: string;
  icon: typeof LineChart;
}

const QUICK_ROUTES: QuickRoute[] = [
  { label: "Budget", hint: "Drivers + plan", route: "/budget", icon: PiggyBank },
  { label: "Prognos", hint: "P1–P4 versioner", route: "/forecast", icon: LineChart },
  { label: "Uppföljning", hint: "Live · Forecast · Månad", route: "/follow-up", icon: Activity },
  { label: "Scenarier", hint: "Monte Carlo + simulering", route: "/scenarios", icon: GitBranch },
  { label: "Finansiell analys", hint: "Utfall vs Budget vs Forecast", route: "/financial-analysis", icon: BarChart3 },
  { label: "Cash Command", hint: "Likviditet + runway", route: "/cashflow-forecast", icon: Wallet },
];

const EXAMPLES = [
  "P2 vs budget Q2",
  "compare forecast vs actual ytd",
  "show biggest cost deviations",
  "runway",
];

export function CommandBar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [aiPending, setAiPending] = useState(false);

  // ⌘K / Ctrl+K toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const parsed = useMemo<ParsedQuery | null>(() => parseQuery(value), [value]);

  const go = (url: string) => {
    setOpen(false);
    setValue("");
    setAiPending(false);
    navigate(url);
  };

  const runAiFallback = async () => {
    if (!value.trim() || aiPending) return;
    setAiPending(true);
    try {
      const { data, error } = await supabase.functions.invoke("financial-os-parse", {
        body: { query: value },
      });
      if (error) throw error;
      const route = (data?.route as string) || "/financial-analysis";
      const params: Record<string, string> = {};
      if (data?.versions?.length) params.compare = data.versions.join(",");
      if (data?.period) params.period = String(data.period).toLowerCase();
      if (data?.mode) params.mode = String(data.mode);
      if (data?.focus) params.focus = String(data.focus);
      if (data?.dimension) params.dimension = String(data.dimension);
      const qs = new URLSearchParams(params).toString();
      go(qs ? `${route}?${qs}` : route);
    } catch {
      // Soft-fail: just navigate to default analysis page
      go("/financial-analysis");
    } finally {
      setAiPending(false);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Sök eller skriv kommando — t.ex. ”P2 vs budget Q2”"
        value={value}
        onValueChange={setValue}
      />
      <CommandList>
        <CommandEmpty>
          <div className="px-2 py-3 text-sm text-muted-foreground">
            Ingen direkt match. Tryck Enter för AI-tolkning.
          </div>
        </CommandEmpty>

        {parsed && (
          <CommandGroup heading="Tolkat kommando">
            <CommandItem
              value={`__parsed__${value}`}
              onSelect={() => go(buildUrl(parsed))}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium">{parsed.route}</span>
              {Object.keys(parsed.params).length > 0 && (
                <span className="text-xs text-muted-foreground truncate">
                  {new URLSearchParams(parsed.params).toString()}
                </span>
              )}
              <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                {Math.round(parsed.confidence * 100)}%
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </CommandItem>
          </CommandGroup>
        )}

        {!parsed && value.trim().length > 2 && (
          <CommandGroup heading="AI-tolkning">
            <CommandItem
              value={`__ai__${value}`}
              onSelect={runAiFallback}
              className="gap-2"
              disabled={aiPending}
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span>{aiPending ? "Tolkar…" : `Tolka ”${value}” med AI`}</span>
              <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
            </CommandItem>
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Navigera">
          {QUICK_ROUTES.map((r) => {
            const Icon = r.icon;
            return (
              <CommandItem
                key={r.route}
                value={`${r.label} ${r.hint} ${r.route}`}
                onSelect={() => go(r.route)}
                className="gap-2"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{r.label}</span>
                <span className="text-xs text-muted-foreground truncate">{r.hint}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Exempel">
          {EXAMPLES.map((ex) => (
            <CommandItem
              key={ex}
              value={`example ${ex}`}
              onSelect={() => setValue(ex)}
              className="gap-2 text-sm text-muted-foreground"
            >
              <span className="text-xs uppercase">→</span>
              {ex}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
