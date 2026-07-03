/**
 * Klient-side hjälpare för att skicka PDF-årsbesked till edge function
 * `securities-pdf-parser` som använder Gemini Vision.
 */
import { supabase } from '@/integrations/supabase/client';

export interface PdfParseResult {
  success: boolean;
  statement_id?: string;
  extracted_count?: number;
  confidence?: number;
  error?: string;
}

export async function parseStatementPdf(params: {
  statement_id: string;
  storage_path: string;
  broker_hint?: 'nordnet' | 'avanza' | 'seb' | 'handelsbanken' | 'swedbank' | 'nordea' | 'other';
}): Promise<PdfParseResult> {
  const { data, error } = await supabase.functions.invoke('securities-pdf-parser', {
    body: params,
  });
  if (error) return { success: false, error: error.message };
  return data as PdfParseResult;
}
