/**
 * Flatten ar_sections + ar_blocks into a payload that the existing
 * AnnualReportPDF renderer can consume.
 */
import type { AnnualReportSection } from "@/hooks/useAnnualReportSections";

export interface ARBlock {
  id: string;
  section_id: string;
  block_type: string;
  sort_order: number;
  content: Record<string, unknown>;
  is_locked: boolean;
}

export interface SerializedAR {
  sections: Array<{
    id: string;
    label: string;
    type: string;
    parent_id: string | null;
    blocks: ARBlock[];
  }>;
}

export function serialize(sections: AnnualReportSection[], blocks: ARBlock[]): SerializedAR {
  const blocksBySection = new Map<string, ARBlock[]>();
  for (const b of blocks) {
    const list = blocksBySection.get(b.section_id) ?? [];
    list.push(b);
    blocksBySection.set(b.section_id, list);
  }
  for (const list of blocksBySection.values()) list.sort((a, b) => a.sort_order - b.sort_order);

  return {
    sections: [...sections]
      .sort((a, b) => a.order_index - b.order_index)
      .map((s) => ({
        id: s.id,
        label: s.label,
        type: s.section_type,
        parent_id: s.parent_id,
        blocks: blocksBySection.get(s.id) ?? [],
      })),
  };
}
