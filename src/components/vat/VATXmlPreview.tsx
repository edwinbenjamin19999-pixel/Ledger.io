/**
 * Preview the generated eSKDUpload XML in a monospace block.
 */
import { ScrollArea } from "@/components/ui/scroll-area";

interface VATXmlPreviewProps {
  xml: string;
}

export function VATXmlPreview({ xml }: VATXmlPreviewProps) {
  return (
    <div className="rounded-lg border border-border bg-slate-950 dark:bg-black overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-800 bg-slate-900 text-[11px] uppercase tracking-wider font-mono text-slate-400 flex items-center justify-between">
        <span>eSKDUpload v6.0 · ISO-8859-1</span>
        <span>{xml.split("\n").length} rader</span>
      </div>
      <ScrollArea className="h-[360px]">
        <pre className="text-[12px] leading-relaxed font-mono text-emerald-300 p-4 whitespace-pre">
{xml}
        </pre>
      </ScrollArea>
    </div>
  );
}
