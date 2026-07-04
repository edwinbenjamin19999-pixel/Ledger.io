import { SectionLabel } from "./SectionLabel";
import receiptLedger from "@/assets/receipt-ledger.png";

/**
 * MINIMALIST MODERN — ljus sektion som visar själva produktvärdet i rörelse:
 * en Higgsfield-genererad 3D-loop där ett kvitto förvandlas till en bokförd
 * verifikationsrad. Konceptet blir en bild.
 */
export const ReceiptFlowSection = () => {
  return (
    <section className="relative overflow-hidden bg-white py-28 md:py-36">
      <div aria-hidden className="pointer-events-none absolute -left-[10%] top-0 h-[420px] w-[420px] rounded-full bg-[#0052FF] opacity-[0.04] blur-[140px]" />

      <div className="relative mx-auto max-w-5xl px-6 text-center">
        <div className="flex justify-center">
          <SectionLabel pulse>Från kvitto till bokfört</SectionLabel>
        </div>
        <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-[3.25rem]">
          Ett kvitto in. En{" "}
          <span className="text-[#0052FF]">bokförd verifikation</span> ut.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
          AI:n tolkar underlaget, konterar mot BAS och skapar en spårbar,
          revisionssäker post — på sekunder, utan att du rör en siffra.
        </p>

        {/* 3D-loop i upphöjd ram */}
        <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster={receiptLedger}
            className="block w-full rounded-xl"
            style={{ aspectRatio: "16 / 9" }}
          >
            <source src="/receipt-ledger.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </section>
  );
};
