
import { supabase } from '@/integrations/supabase/client';

export interface TreasureMapSettings {
  id: string;
  account_id: string;
  map_type: 'arcgis' | 'google_my_maps';
  map_url?: string;
  embed_code?: string;
  created_at: string;
  updated_at: string;
}

export const getTreasureMapSettings = async (accountId: string): Promise<TreasureMapSettings | null> => {
  const { data, error } = await supabase
    .from('treasure_map_settings')
    .select('*')
    .eq('account_id', accountId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching treasure map settings:', error);
    throw error;
  }

  return data;
};

export const saveTreasureMapSettings = async (settings: Omit<TreasureMapSettings, 'id' | 'created_at' | 'updated_at'>): Promise<TreasureMapSettings> => {
  const { data, error } = await supabase
    .from('treasure_map_settings')
    .upsert(settings, { onConflict: 'account_id' })
    .select()
    .single();

  if (error) {
    console.error('Error saving treasure map settings:', error);
    throw error;
  }

  return data;
};
