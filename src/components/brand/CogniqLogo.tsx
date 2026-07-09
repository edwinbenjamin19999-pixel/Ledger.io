import { cn } from "@/lib/utils";

/**
 * Cogniq varumärke — enligt Cogniq Design System.
 * Sigill-C (tunn ring + C-skära) + blå punkt. Ink #14181F · Dot #0052FF.
 * Wordmark: "Cogniq." i Instrument Sans 650 med blå punkt.
 *
 * <CogniqMark>  — enbart symbolen (nav, favicon, app-ikon)
 * <CogniqLogo>  — symbol + wordmark (lockup)
 * reversed=true → ljus variant på mörk yta (charcoal/navy).
 */

interface MarkProps {
  /** Pixelstorlek på symbolens ruta. */
  size?: number;
  /** Ljus variant för mörka ytor. */
  reversed?: boolean;
  /** Dölj den yttre ringen (favicon ≤16px). */
  ringless?: boolean;
  className?: string;
}

export function CogniqMark({ size = 28, reversed = false, ringless = false, className }: MarkProps) {
  const ink = reversed ? "#FFFFFF" : "#14181F";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Cogniq"
    >
      {/* Yttre sigill-ring — försvinner vid små storlekar */}
      {!ringless && (
        <circle cx="20" cy="20" r="18.2" stroke={ink} strokeWidth="1.5" opacity="0.9" />
      )}
      {/* C-skära — öppen mot höger där punkten sitter */}
      <path
        d="M26.1 12.7 A 9.6 9.6 0 1 0 26.1 27.3"
        fill="none"
        stroke={ink}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      {/* Blå punkt */}
      <circle cx="20.6" cy="20" r="3.7" fill="#0052FF" />
    </svg>
  );
}

interface LogoProps {
  /** Symbolens storlek i px; wordmark skalas mot denna. */
  size?: number;
  reversed?: boolean;
  className?: string;
}

export function CogniqLogo({ size = 26, reversed = false, className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <CogniqMark size={size} reversed={reversed} />
      <span
        className="font-display leading-none tracking-[-0.03em]"
        style={{ fontWeight: 650, fontSize: size * 0.82, color: reversed ? "#FFFFFF" : "#14181F" }}
      >
        Cogniq<span style={{ color: "#0052FF" }}>.</span>
      </span>
    </span>
  );
}
