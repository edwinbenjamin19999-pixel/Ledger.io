import { AlertTriangle } from "lucide-react";

export function countWords(s: string): number {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
}

export function WordCount({
  text,
  recommendedMin = 100,
}: { text: string; recommendedMin?: number }) {
  const w = countWords(text);
  const below = w > 0 && w < recommendedMin;
  return (
    <div className={`text-[10px] flex items-center gap-1 tabular-nums ${below ? "text-[#7A5417]" : "text-[#94A3B8]"}`}>
      {below && <AlertTriangle className="w-2.5 h-2.5 text-[#EF9F27]" />}
      <span>{w} ord</span>
      {below && <span>· rek. min {recommendedMin}</span>}
    </div>
  );
}
