
import { supabase } from '@/integrations/supabase/client';

export interface SignalThresholds {
  id: string;
  account_id: string;
  good_threshold: number;
  bad_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface SignalThresholdsUpdate {
  good_threshold: number;
  bad_threshold: number;
}

export const getAccountSignalThresholds = async (accountId: string): Promise<SignalThresholds | null> => {
  try {
    const { data, error } = await supabase
      .from('account_signal_thresholds')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching signal thresholds:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getAccountSignalThresholds:', error);
    return null;
  }
};

export const updateAccountSignalThresholds = async (
  accountId: string,
  thresholds: SignalThresholdsUpdate
): Promise<SignalThresholds | null> => {
  try {
    console.log('Upserting signal thresholds for account:', accountId, 'with data:', thresholds);
    
    // Use upsert to either update existing record or create new one
    const { data, error } = await supabase
      .from('account_signal_thresholds')
      .upsert({
        account_id: accountId,
        good_threshold: thresholds.good_threshold,
        bad_threshold: thresholds.bad_threshold,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'account_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting signal thresholds:', error);
      return null;
    }

    console.log('Successfully upserted signal thresholds:', data);
    return data;
  } catch (error) {
    console.error('Error in updateAccountSignalThresholds:', error);
    return null;
  }
};
