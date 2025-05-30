
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getUserAccountId } from '@/services/targetMetrics/accountHelpers';
import { toast } from '@/hooks/use-toast';

interface TreasureMapSettings {
  map_type: 'arcgis' | 'google_my_maps';
  map_url?: string;
  embed_code?: string;
}

export const useTreasureMapSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<TreasureMapSettings>({
    map_type: 'arcgis',
    map_url: '',
    embed_code: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const accountId = await getUserAccountId(user.id);
      if (!accountId) {
        toast({
          title: "Error",
          description: "Could not find account information.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('treasure_map_settings')
        .select('*')
        .eq('account_id', accountId)
        .maybeSingle();

      if (error) {
        console.error('Error loading treasure map settings:', error);
        toast({
          title: "Error",
          description: "Failed to load map settings.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (data) {
        const loadedSettings: TreasureMapSettings = {
          map_type: data.map_type as 'arcgis' | 'google_my_maps',
          map_url: data.map_url || '',
          embed_code: data.embed_code || ''
        };
        setSettings(loadedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Failed to load map settings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (settingsToSave: TreasureMapSettings) => {
    if (!user) return false;

    try {
      const accountId = await getUserAccountId(user.id);
      if (!accountId) {
        toast({
          title: "Error",
          description: "Could not find account information.",
          variant: "destructive",
        });
        return false;
      }

      const dataToSave = {
        account_id: accountId,
        map_type: settingsToSave.map_type,
        map_url: settingsToSave.map_type === 'arcgis' ? settingsToSave.map_url : null,
        embed_code: settingsToSave.map_type === 'google_my_maps' ? settingsToSave.embed_code : null,
      };

      const { error } = await supabase
        .from('treasure_map_settings')
        .upsert(dataToSave, { onConflict: 'account_id' });

      if (error) {
        console.error('Error saving treasure map settings:', error);
        toast({
          title: "Error",
          description: "Failed to save map settings.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Map uploaded successfully!",
      });
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save map settings.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    settings,
    setSettings,
    isLoading,
    loadSettings,
    saveSettings
  };
};
