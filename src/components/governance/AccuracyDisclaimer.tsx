interface AccuracyDisclaimerProps { /** If provided, shown as data source attribution */
  dataSource?: string;
  className?: string;
}

/** Standard accuracy disclaimer shown below all AI-prepared Category B summaries. */
export const AccuracyDisclaimer = ({ dataSource, className = "" }: AccuracyDisclaimerProps) => (
  <div className={`space-y-0.5 ${className}`}>
    <p className="text-[10px] text-muted-foreground/70 italic">
      AI-beräknat — Målet är 99,9% träffsäkerhet — Granska alltid innan signering
    </p>
    {dataSource && (
      <p className="text-[10px] text-muted-foreground/50">
        Hämtat från: {dataSource}
      </p>
    )}
  </div>
);
