// useAIWriting — generate / rewrite / explain AI block text via edge functions.
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type WriteKind = "forvaltning" | "note" | "risk" | "outlook" | "result_commentary";
export type Tone = "formal" | "simplified";
export type Length = "short" | "medium" | "long";
export type RewriteInstruction = "formal" | "simple" | "shorter" | "longer" | "reuse_prior";

export function useAIWriting() {
  const generate = useMutation({
    mutationFn: async (input: {
      annualReportId: string;
      blockId?: string;
      kind: WriteKind;
      tone?: Tone;
      length?: Length;
      sourceContext?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.functions.invoke("ar-write-text", { body: input });
      if (error) throw error;
      return data as { html: string; rationale: string; citations: Array<{ source: string; ref: string }> };
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rewrite = useMutation({
    mutationFn: async (input: { blockId: string; instruction: RewriteInstruction }) => {
      const { data, error } = await supabase.functions.invoke("ar-rewrite-text", { body: input });
      if (error) throw error;
      return data as { html: string; rationale: string };
    },
    onSuccess: () => toast.success("Texten skrevs om"),
    onError: (e: Error) => toast.error(e.message),
  });

  return { generate, rewrite };
}
