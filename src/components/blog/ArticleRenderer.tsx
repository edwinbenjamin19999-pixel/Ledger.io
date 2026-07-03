import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { ContentBlock } from "@/data/blog/types";

export const ArticleRenderer = ({ blocks }: { blocks: ContentBlock[] }) => (
  <div className="space-y-6">
    {blocks.map((b, i) => {
      if (b.type === "heading") {
        const Tag = b.level === 2 ? "h2" : "h3";
        const cls = b.level === 2
          ? "text-2xl md:text-3xl font-bold text-[#0F1B2D] tracking-tight pt-6"
          : "text-xl font-semibold text-[#0F1B2D] tracking-tight pt-4";
        return <Tag key={i} className={cls}>{b.text}</Tag>;
      }
      if (b.type === "paragraph") {
        return <p key={i} className="text-[#334155] leading-[1.8] text-[17px]">{b.text}</p>;
      }
      if (b.type === "list") {
        const Tag = b.ordered ? "ol" : "ul";
        return (
          <Tag key={i} className={`${b.ordered ? "list-decimal" : "list-disc"} pl-6 space-y-2 text-[#334155] text-[17px] leading-[1.7] marker:text-[#3b82f6]`}>
            {b.items.map((item, j) => <li key={j}>{item}</li>)}
          </Tag>
        );
      }
      if (b.type === "quote") {
        return (
          <blockquote key={i} className="border-l-4 border-[#3b82f6] pl-5 py-2 italic text-[#475569]">
            "{b.text}"{b.cite && <footer className="not-italic text-sm text-[#94a3b8] mt-2">— {b.cite}</footer>}
          </blockquote>
        );
      }
      if (b.type === "cta") {
        return (
          <div key={i} className="my-10 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-50 border border-blue-100 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="text-lg font-semibold text-[#0F1B2D]">{b.title}</div>
            <Link to={b.href} className="inline-flex items-center gap-1.5 rounded-lg bg-[#3b82f6] text-white px-4 py-2 text-sm font-medium hover:bg-[#3b82f6] transition-colors">
              Kom igång <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        );
      }
      return null;
    })}
  </div>
);
