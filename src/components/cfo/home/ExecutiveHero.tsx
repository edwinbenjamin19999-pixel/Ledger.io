import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, ArrowRight, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { drilldown } from "./DrilldownRouter";
import { cn } from "@/lib/utils";

interface Props {
  loading?: boolean;
  headline?: string;
  bullets?: string[];
  recommendation?: string;
  confidence?: number | null;
  tone?: "strong" | "watch" | "risk" | "neutral";
}

const TONE_CFG = {
  strong: { ring: "from-emerald-400/30 to-[#3b82f6]/20", chip: "bg-[#E1F5EE] text-[#085041] dark:text-emerald-300", Icon: TrendingUp },
  watch: { ring: "from-amber-400/30 to-orange-400/20", chip: "bg-[#FAEEDA] text-[#7A5417] dark:text-amber-300", Icon: AlertTriangle },
  risk: { ring: "from-rose-400/30 to-orange-400/20", chip: "bg-[#FCE8E8] text-[#7A1A1A] dark:text-rose-300", Icon: TrendingDown },
  neutral: { ring: "from-[#3b82f6]/30 to-indigo-400/20", chip: "bg-[#EFF6FF] text-[#3b82f6] dark:text-[#3b82f6]", Icon: Sparkles },
} as const;

export function ExecutiveHero({ loading, headline, bullets = [], recommendation, confidence, tone = "neutral" }: Props) {
  const navigate = useNavigate();
  const cfg = TONE_CFG[tone];
  const Icon = cfg.Icon;

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
      <style>{`
        @keyframes ai-label-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .ai-exec-label {
          background-image: linear-gradient(
            90deg,
            rgba(0,82,255,0.18) 0%,
            rgba(0,82,255,0.32) 25%,
            rgba(0,82,255,0.55) 50%,
            rgba(0,82,255,0.32) 75%,
            rgba(0,82,255,0.18) 100%
          );
          background-size: 200% 100%;
          animation: ai-label-shimmer 3s linear infinite;
        }
      `}</style>
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-40 dark:opacity-25 pointer-events-none", cfg.ring)} />
      <div className="relative p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <div
            className={cn(
              "ai-exec-label inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider text-[#0D7A8A]"
            )}
          >
            <Icon className="h-3 w-3" />
            AI Executive Summary
          </div>
          {typeof confidence === "number" && (
            <span
              className="inline-flex items-center tabular-nums"
              style={{
                background: "rgba(0,82,255,0.1)",
                color: "#0D7A8A",
                border: "1px solid rgba(0,82,255,0.2)",
                borderRadius: 100,
                padding: "3px 10px",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Konfidens {Math.round(confidence)}%
            </span>
          )}
        </div>

        <h2
          className="tracking-tight max-w-3xl text-[#0F172A] dark:text-foreground"
          style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.3 }}
        >
          {headline || "Analysen byggs upp — kontrollera bokförd data."}
        </h2>

        {bullets.length > 0 && (
          <ul className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-2.5" style={{ maxWidth: 720 }}>
            {bullets.slice(0, 4).map((b, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 animate-fade-in"
                style={{ animationDelay: `${i * 60}ms`, fontSize: 15, lineHeight: 1.8, color: "#1F2937" }}
              >
                <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-[#3b82f6] shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}

        {recommendation && (
          <div className="mt-5 p-3.5 rounded-xl bg-muted/60 border border-border" style={{ maxWidth: 720 }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Rekommendation</div>
            <p className="font-medium" style={{ fontSize: 15, lineHeight: 1.8, color: "#1F2937" }}>{recommendation}</p>
          </div>
        )}

        <div className="mt-6 flex items-center gap-2 flex-wrap">
          <Button size="sm" className="gap-1.5" onClick={() => drilldown(navigate, { kind: "summary" })}>
            <Sparkles className="h-4 w-4" /> Diskutera med AI CFO
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/board")}>
            Öppna styrelsevy
          </Button>
        </div>
      </div>
    </div>
  );
}
