/**
 * ColumnPicker — categorised multi-select with drag-to-reorder for grids that
 * present comparable columns (Actual / Budget / Forecast / YoY etc.). Powered
 * by @dnd-kit/sortable.
 *
 * Pure presentational + state-only; the parent owns the visible columns array.
 */
import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Columns3, GripVertical } from "lucide-react";

export interface ColumnDef {
  key: string;
  label: string;
  category: string;
}

export interface ColumnPickerPreset {
  name: string;
  keys: string[];
}

interface Props {
  columns: ColumnDef[];
  visibleKeys: string[];
  onChange: (next: string[]) => void;
  presets?: ColumnPickerPreset[];
}

export function ColumnPicker({ columns, visibleKeys, onChange, presets }: Props) {
  const [open, setOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const grouped = columns.reduce<Record<string, ColumnDef[]>>((acc, c) => {
    (acc[c.category] ??= []).push(c);
    return acc;
  }, {});

  const visible = visibleKeys
    .map((k) => columns.find((c) => c.key === k))
    .filter(Boolean) as ColumnDef[];

  const toggle = (key: string) => {
    if (visibleKeys.includes(key)) onChange(visibleKeys.filter((k) => k !== key));
    else onChange([...visibleKeys, key]);
  };

  const handleDragEnd = (event: { active: { id: string }; over: { id: string } | null }) => {
    if (!event.over || event.active.id === event.over.id) return;
    const oldIndex = visibleKeys.indexOf(event.active.id);
    const newIndex = visibleKeys.indexOf(event.over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(visibleKeys, oldIndex, newIndex));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Columns3 className="h-3.5 w-3.5" />
          Kolumner ({visibleKeys.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-h-[60vh] overflow-y-auto p-3 space-y-3">
        {presets && presets.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Förinställningar
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => onChange(p.keys)}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:bg-muted"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Synliga</div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd as never}
          >
            <SortableContext items={visibleKeys} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {visible.map((c) => (
                  <SortableRow key={c.key} id={c.key} label={c.label} onRemove={() => toggle(c.key)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="space-y-2">
          {Object.entries(grouped).map(([cat, list]) => (
            <div key={cat} className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{cat}</div>
              {list.map((c) => (
                <label
                  key={c.key}
                  className="flex items-center gap-2 text-sm rounded-md px-1.5 py-1 hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={visibleKeys.includes(c.key)}
                    onCheckedChange={() => toggle(c.key)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SortableRow({
  id,
  label,
  onRemove,
}: {
  id: string;
  label: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
        aria-label="Drag för att flytta"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span className="flex-1 truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-xs text-muted-foreground hover:text-destructive"
      >
        Ta bort
      </button>
    </div>
  );
}
