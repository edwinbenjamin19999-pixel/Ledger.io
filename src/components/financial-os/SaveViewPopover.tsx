/**
 * SaveViewPopover — capture the current route + payload as a Saved View.
 *
 * Opens from a trigger button (typically inside <SavedViewChips>). Lets the
 * user name the view, pick a Lucide icon hint, choose privacy scope and
 * optionally mark it as default for the current route.
 */
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, Save, LineChart, Activity, GitBranch, PiggyBank, Wallet, BarChart3, Sparkles } from "lucide-react";
import { useCreateSavedView } from "@/hooks/useSavedViews";
import { useFinancialOS } from "@/contexts/FinancialOSContext";

const ICON_OPTIONS = [
  { value: "Star", label: "Star" },
  { value: "Sparkles", label: "Sparkles" },
  { value: "LineChart", label: "LineChart" },
  { value: "Activity", label: "Activity" },
  { value: "GitBranch", label: "GitBranch" },
  { value: "PiggyBank", label: "PiggyBank" },
  { value: "Wallet", label: "Wallet" },
  { value: "BarChart3", label: "BarChart" },
];

const ICON_MAP: Record<string, typeof Star> = {
  Star,
  Sparkles,
  LineChart,
  Activity,
  GitBranch,
  PiggyBank,
  Wallet,
  BarChart3,
};

interface Props {
  trigger?: React.ReactNode;
  defaultName?: string;
}

export function SaveViewPopover({ trigger, defaultName }: Props) {
  const location = useLocation();
  const fos = useFinancialOS();
  const create = useCreateSavedView();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName ?? "");
  const [icon, setIcon] = useState<string>("Star");
  const [scope, setScope] = useState<"private" | "team">("private");
  const [isDefault, setIsDefault] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const params = new URLSearchParams(location.search);
    const payload: Record<string, unknown> = {
      period: fos.period,
      versions: fos.versions,
      dimension: fos.dimension,
      density: fos.density,
      mode: fos.mode,
      focus: fos.focus,
      query: Object.fromEntries(params.entries()),
    };
    await create.mutateAsync({
      name: trimmed,
      icon,
      scope,
      is_default: isDefault,
      route: location.pathname,
      payload,
    });
    setOpen(false);
    setName("");
    setIcon("Star");
    setScope("private");
    setIsDefault(false);
  };

  const SelectedIcon = ICON_MAP[icon] ?? Star;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            Spara vy
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-foreground">Spara denna vy</div>
          <div className="text-xs text-muted-foreground">
            Sparas på {location.pathname}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="view-name" className="text-xs">Namn</Label>
          <Input
            id="view-name"
            placeholder="t.ex. CFO månadsstängning"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Ikon</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger className="h-9">
                <SelectValue>
                  <span className="inline-flex items-center gap-1.5">
                    <SelectedIcon className="h-3.5 w-3.5" />
                    {icon}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map((o) => {
                  const I = ICON_MAP[o.value];
                  return (
                    <SelectItem key={o.value} value={o.value}>
                      <span className="inline-flex items-center gap-1.5">
                        <I className="h-3.5 w-3.5" />
                        {o.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Synlighet</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as "private" | "team")}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Privat</SelectItem>
                <SelectItem value="team">Team</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(v === true)} />
          Sätt som standardvy för {location.pathname}
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Avbryt
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim() || create.isPending}>
            {create.isPending ? "Sparar…" : "Spara"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
