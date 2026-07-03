import { ReactNode, useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface SortableWidgetWrapperProps {
  id: string;
  label?: string;
  observeRef?: (node: HTMLElement | null) => void;
  children: ReactNode;
}

export function SortableWidgetWrapper({ id, label, observeRef, children }: SortableWidgetWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const innerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (observeRef) observeRef(innerRef.current);
  }, [observeRef]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 180ms cubic-bezier(0.2, 0, 0, 1)",
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        innerRef.current = node;
      }}
      style={style}
      className={[
        "group relative rounded-2xl",
        "transition-[box-shadow,transform] duration-200",
        isDragging
          ? "shadow-[0_24px_64px_-12px_rgba(15,23,42,0.28)] scale-[1.02] outline outline-1 outline-[hsl(var(--brand-primary)/0.5)] outline-offset-4"
          : "hover:shadow-md hover:-translate-y-0.5",
      ].join(" ")}
      data-widget-id={id}
    >
      {/* Drag handle — top-right, fades in on hover */}
      <button
        type="button"
        aria-label={`Flytta widget ${label ?? id}`}
        className={[
          "absolute top-2 right-2 z-20 flex items-center gap-1 rounded-md",
          "bg-white/90 backdrop-blur px-1.5 py-1 text-slate-500 shadow-sm border border-slate-200",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "cursor-grab active:cursor-grabbing hover:text-slate-900",
          isDragging ? "opacity-100" : "",
        ].join(" ")}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {children}
    </div>
  );
}
