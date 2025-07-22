
import { supabase } from '@/integrations/supabase/client';

export interface GoogleMapsApiResponse {
  apiKey?: string;
  error?: string;
}

export const getGoogleMapsApiKey = async (): Promise<string | null> => {
  try {
    console.log('[GoogleMapsService] Fetching API key from Supabase edge function...');
    
    const { data, error } = await supabase.functions.invoke('get-google-maps-key', {
      method: 'GET'
    });

    if (error) {
      console.error('[GoogleMapsService] Supabase function error:', error);
      throw new Error(`Failed to fetch API key: ${error.message}`);
    }

    if (!data?.apiKey) {
      console.error('[GoogleMapsService] No API key returned from edge function');
      throw new Error('No API key returned from server');
    }

    console.log('[GoogleMapsService] Successfully fetched API key');
    return data.apiKey;
  } catch (error) {
    console.error('[GoogleMapsService] Error fetching Google Maps API key:', error);
    return null;
  }
};
