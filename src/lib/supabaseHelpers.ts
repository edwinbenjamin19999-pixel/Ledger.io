import { supabase } from '@/integrations/supabase/client';
import type { UserPreferences } from '@/types/database-extensions';

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as UserPreferences | null;
}

export async function upsertUserPreferences(
  userId: string,
  preferences: Record<string, unknown>
): Promise<void> {
  const payload = { user_id: userId, ...preferences, updated_at: new Date().toISOString() };
  const { error } = await supabase
    .from('user_preferences')
    .upsert(payload as any, { onConflict: 'user_id' });

  if (error) throw error;
}
