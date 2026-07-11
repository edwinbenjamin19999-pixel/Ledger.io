import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic } from "lucide-react";
import { toast } from "sonner";

interface MobileVoiceOverlayProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (text: string) => void;
}

export const MobileVoiceOverlay = ({ open, onClose, onConfirm }: MobileVoiceOverlayProps) => {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const startY = useRef(0);

  const stop = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    setListening(false);
  }, []);

  useEffect(() => {
    if (!open) { stop(); setTranscript(""); return; }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Röstinmatning stöds inte i denna webbläsare");
      onClose();
      return;
    }

    const recognition = new SR();
    recognition.lang = "sv-SE";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onresult = (e: any) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setTranscript(text);
    };

    recognition.onerror = (e: any) => {
      if (e.error !== "aborted") toast.error("Röstfel: " + e.error);
      stop();
    };

    recognition.onend = () => setListening(false);

    try {
      recognition.start();
      setListening(true);
    } catch {
      toast.error("Kunde inte starta mikrofonen");
      onClose();
    }

    return () => { try { recognition.stop(); } catch {} };
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    stop();
    if (transcript.trim()) onConfirm(transcript.trim());
    else onClose();
  };

  const handleTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches[0].clientY - startY.current > 100) { stop(); onClose(); }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-[#0052FF]/95 flex flex-col items-center justify-center"
      onClick={handleConfirm}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); stop(); onClose(); }}
        className="absolute top-4 right-4 text-white/60 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
        style={{ marginTop: "env(safe-area-inset-top)" }}
      >
        <X className="h-6 w-6" />
      </button>

      {/* Label */}
      <p className="text-white/70 text-sm font-medium mb-8 tracking-wide">
        {listening ? "Lyssnar..." : "Startar..."}
      </p>

      {/* Animated pulse rings */}
      <div className="relative w-40 h-40 flex items-center justify-center mb-10">
        {listening && (
          <>
            <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" style={{ animationDuration: "2s" }} />
            <div className="absolute inset-4 rounded-full bg-white/25 animate-ping" style={{ animationDuration: "1.5s", animationDelay: "0.3s" }} />
            <div className="absolute inset-8 rounded-full bg-white/30 animate-ping" style={{ animationDuration: "1s", animationDelay: "0.6s" }} />
          </>
        )}
        <div className="relative bg-white rounded-full p-6 shadow-lg shadow-black/20">
          <Mic className="h-10 w-10 text-[#0052FF]" />
        </div>
      </div>

      {/* Live transcript */}
      <div className="px-8 text-center max-w-sm min-h-[60px]">
        <p className="text-white text-xl font-medium leading-relaxed">
          {transcript || <span className="text-white/40">Säg något...</span>}
        </p>
      </div>

      {/* Hints */}
      <div className="absolute bottom-12 flex flex-col items-center gap-1" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <p className="text-white/40 text-xs">Tryck för att bekräfta</p>
        <p className="text-white/30 text-xs">Svep ner för att avbryta</p>
      </div>
    </div>
  );
};
