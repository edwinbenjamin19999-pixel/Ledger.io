import { useState } from "react";
import { X, Check, ChevronDown } from "lucide-react";

const skipItems = [
  "Bokföra manuellt",
  "Räkna moms",
  "Jaga fakturor",
  "Bygga rapporter",
  "Tolka siffror",
];

const mobileSkipPrimary = ["Slipp bokföra", "Slipp moms", "Slipp jaga fakturor"];
const mobileSkipExtra = ["Slipp bygga rapporter", "Slipp tolka siffror"];

const aiItems = [
  "Bokför",
  "Skickar",
  "Analyserar",
  "Rekommenderar",
  "Agerar",
];

export const SkipSection = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-[#0B1D2A] to-[#0F172A]">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14">
          <h2
            className="font-[800] text-white mb-3"
            style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-1.5px" }}
          >
            Slipp detta
          </h2>
        </div>

        {/* Mobile: minimal list, max 3 visible */}
        <div className="sm:hidden max-w-sm mx-auto">
          <div className="space-y-3">
            {mobileSkipPrimary.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#3b82f6] flex-shrink-0" />
                <span className="text-[16px] text-white/85 font-medium">{item}</span>
              </div>
            ))}
            {expanded &&
              mobileSkipExtra.map((item) => (
                <div key={item} className="flex items-center gap-3 animate-fade-in">
                  <Check className="w-4 h-4 text-[#3b82f6] flex-shrink-0" />
                  <span className="text-[16px] text-white/85 font-medium">{item}</span>
                </div>
              ))}
          </div>
          {!expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="mt-6 flex items-center gap-1 text-[14px] text-[#3b82f6] mx-auto"
            >
              Visa mer <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}

          <p
            className="mt-10 font-[800] leading-[1.15] bg-gradient-to-r from-[#3b82f6] to-[#3b82f6] bg-clip-text text-transparent text-center"
            style={{ fontSize: "26px", letterSpacing: "-1px" }}
          >
            AI gör det åt dig
          </p>
        </div>

        {/* Desktop: original two-column */}
        <div className="hidden sm:flex flex-row items-center justify-center gap-20 max-w-3xl mx-auto">
          <div className="space-y-4">
            {skipItems.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <X className="w-3.5 h-3.5 text-red-400" />
                </div>
                <span className="text-[15px] text-white/50 line-through decoration-white/20">{item}</span>
              </div>
            ))}
          </div>

          <div className="w-px h-40 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

          <div className="text-left">
            <p
              className="font-[800] leading-[1.1] bg-gradient-to-r from-[#3b82f6] to-[#3b82f6] bg-clip-text text-transparent mb-6"
              style={{ fontSize: "clamp(24px, 3.5vw, 36px)", letterSpacing: "-1px" }}
            >
              AI gör det åt dig
              <br />
              istället
            </p>
            <div className="space-y-3">
              {aiItems.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-[#3b82f6] flex-shrink-0" />
                  <span className="text-[15px] text-white/80 font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
