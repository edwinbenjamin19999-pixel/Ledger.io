import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { ConversationStream } from "@/components/ai-ekonom/ConversationStream";
import { PrimaryInput } from "@/components/ai-ekonom/PrimaryInput";
import { useAIEkonom } from "@/hooks/useAIEkonom";

interface Props { companyId: string | null; }

export function SecondaryChatDrawer({ companyId }: Props) {
  const [open, setOpen] = useState(false);
  const { turns, send, loading } = useAIEkonom(companyId);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[#0F1F3D] text-white shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:scale-105 transition-transform z-40 flex items-center justify-center"
        title="Fråga AI"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md h-full bg-[#0a1428] border-l border-white/10 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">Fråga AI Ekonom</h3>
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50">
              <ConversationStream
                turns={turns}
                loading={loading}
                onPickAction={send}
                onOpenVoucher={() => {}}
              />
            </div>
            <PrimaryInput onSend={send} onFiles={async () => {}} loading={loading} />
          </div>
        </div>
      )}
    </>
  );
}
