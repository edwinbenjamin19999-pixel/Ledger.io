import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface AccountOption {
  id: string;
  account_number: string;
  account_name: string;
}

interface Props {
  accounts: AccountOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** AI suggestion to display below the field (optional). */
  suggestion?: { account_number: string; confidence?: number } | null;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  triggerClassName?: string;
}

export function AccountCombobox({
  accounts,
  value,
  onChange,
  suggestion,
  placeholder = "Välj konto…",
  invalid,
  disabled,
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => accounts.find((a) => a.id === value) || null, [accounts, value]);

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal",
              !selected && "text-muted-foreground",
              invalid && "border-destructive",
              triggerClassName,
            )}
          >
            <span className="truncate">
              {selected ? `${selected.account_number} – ${selected.account_name}` : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command
            filter={(val, search) => {
              if (!search) return 1;
              return val.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
            }}
          >
            <CommandInput placeholder="Sök konto eller nummer…" />
            <CommandList>
              <CommandEmpty>Inga konton hittades.</CommandEmpty>
              <CommandGroup>
                {accounts.map((a) => {
                  const label = `${a.account_number} ${a.account_name}`;
                  return (
                    <CommandItem
                      key={a.id}
                      value={label}
                      onSelect={() => {
                        onChange(a.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          a.id === value ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="font-mono text-xs mr-2">{a.account_number}</span>
                      <span className="truncate">{a.account_name}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {suggestion && (!selected || selected.account_number !== suggestion.account_number) && (() => {
        const conf = (suggestion.confidence ?? 0) > 1 ? (suggestion.confidence ?? 0) / 100 : (suggestion.confidence ?? 0);
        const tier = conf >= 0.9 ? "done" : conf >= 0.6 ? "review" : "input_needed";
        const tone =
          tier === "done" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : tier === "review" ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-rose-50 text-rose-700 border-rose-200";
        return (
          <button
            type="button"
            onClick={() => {
              const match = accounts.find((a) => a.account_number === suggestion.account_number);
              if (match) onChange(match.id);
            }}
            className={cn("inline-flex items-center gap-1 self-start rounded-full border-[0.5px] px-2 py-0.5 text-[10px] font-medium hover:opacity-80", tone)}
            title="Klicka för att använda AI-förslaget"
          >
            <Sparkles className="h-3 w-3" />
            Föreslagen: {suggestion.account_number} · {Math.round(conf * 100)}%
          </button>
        );
      })()}
    </div>
  );
}
