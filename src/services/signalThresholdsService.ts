
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
    // First try to update existing record
    const { data, error } = await supabase
      .from('account_signal_thresholds')
      .update(thresholds)
      .eq('account_id', accountId)
      .select()
      .maybeSingle();

    if (error && error.code === 'PGRST116') {
      // No existing record, create new one
      const { data: newData, error: insertError } = await supabase
        .from('account_signal_thresholds')
        .insert({
          account_id: accountId,
          ...thresholds
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating signal thresholds:', insertError);
        return null;
      }

      return newData;
    }

    if (error) {
      console.error('Error updating signal thresholds:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in updateAccountSignalThresholds:', error);
    return null;
  }
};
