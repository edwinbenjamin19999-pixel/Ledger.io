import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { KOMMUN_NAMES, KOMMUN_SKATT_2026 } from "@/lib/kommunSkatt";

interface KommunComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export function KommunCombobox({ value, onChange }: KommunComboboxProps) {
  const [open, setOpen] = useState(false);

  const displayValue = useMemo(() => {
    if (!value) return "";
    const match = KOMMUN_NAMES.find(k => k.toLowerCase() === value.toLowerCase());
    return match || value;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          {displayValue || "Välj kommun..."}
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Sök kommun..." />
          <CommandList>
            <CommandEmpty>Ingen kommun hittad</CommandEmpty>
            <CommandGroup className="max-h-[250px] overflow-auto">
              {KOMMUN_NAMES.map(name => {
                const info = KOMMUN_SKATT_2026[name];
                return (
                  <CommandItem
                    key={name}
                    value={name}
                    onSelect={() => { onChange(name); setOpen(false); }}
                  >
                    <Check className={cn("mr-2 h-3.5 w-3.5", value?.toLowerCase() === name.toLowerCase() ? "opacity-100" : "opacity-0")} />
                    <span className="flex-1">{name}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">Tabell {info.skattetabell}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
