
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types/auth';

export const fetchProfileById = async (userId: string): Promise<{ data: UserProfile | null; error: Error | null }> => {
  try {
    const { data, error, status } = await supabase
      .from('profiles')
      .select(`id, full_name, avatar_url, updated_at`)
      .eq('id', userId)
      .single();

    if (error && status !== 406) {
      console.error('Error fetching profile in service:', error);
      return { data: null, error };
    }
    return { data: data as UserProfile, error: null };
  } catch (error: any) {
    console.error('Catch Error fetching profile in service:', error);
    return { data: null, error };
  }
};

export const updateProfileService = async (userId: string, updates: { full_name?: string; avatar_url?: string }): Promise<{ data: UserProfile | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile in service:', error);
      return { data: null, error };
    }
    return { data: data as UserProfile, error: null };
  } catch (error: any) {
    console.error('Catch error updating profile in service:', error);
    return { data: null, error };
  }
};
