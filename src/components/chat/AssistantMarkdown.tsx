import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  className?: string;
}

/**
 * Renders assistant chat text as markdown (bold, italic, lists, code, links).
 * Used by AI Ekonom & AI Bokförare chat surfaces so `**bold**`, `*` bullets
 * and numbered lists never appear as raw characters. User bubbles must NOT
 * use this — only assistant messages.
 */
export function AssistantMarkdown({ text, className }: Props) {
  return (
    <div
      className={cn(
        // Inherit text color / size from the parent bubble; only style block spacing.
        "prose prose-sm max-w-none text-inherit leading-relaxed",
        "prose-p:my-1 prose-p:text-inherit",
        "prose-strong:text-inherit prose-strong:font-semibold",
        "prose-em:text-inherit",
        "prose-ul:my-1.5 prose-ul:pl-5 prose-ul:list-disc",
        "prose-ol:my-1.5 prose-ol:pl-5 prose-ol:list-decimal",
        "prose-li:my-0.5 prose-li:text-inherit",
        "prose-headings:text-inherit prose-headings:font-semibold prose-headings:my-2",
        "prose-a:text-[hsl(var(--brand-primary,221_83%_53%))] prose-a:underline",
        "prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-slate-100 prose-code:text-[0.85em] prose-code:font-mono",
        "prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-pre:rounded-lg prose-pre:p-3 prose-pre:text-xs",
        "[&>:first-child]:mt-0 [&>:last-child]:mb-0",
        className,
      )}
    >
      <ReactMarkdown
        components={{
          // Open links safely in a new tab
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
