interface Props {
  show: boolean;
  className?: string;
}

/**
 * Small muted tag rendered next to fields auto-filled from Bolagsverket.
 */
export const BolagsverketTag = ({ show, className }: Props) => {
  if (!show) return null;
  return (
    <span
      className={`text-[10px] text-muted-foreground italic ml-1 ${className ?? ""}`}
      title="Värde hämtat från Bolagsverket — du kan ändra det manuellt"
    >
      Från Bolagsverket
    </span>
  );
};
