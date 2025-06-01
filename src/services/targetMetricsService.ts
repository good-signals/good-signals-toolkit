import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { 
  UserMetricSettings, 
  CreateUserMetricSettingsData,
  TargetMetricSet,
  CreateTargetMetricSetData 
} from '@/types/targetMetrics';
import { getAccountForUser } from './targetMetrics/accountHelpers';

// Function to check if a user has set any target metrics
export const hasUserSetAnyMetrics = async (userId: string): Promise<boolean> => {
  try {
    // Fetch user metric settings for the user
    const { data: userMetricSettings, error: userMetricSettingsError } = await supabase
      .from('user_metric_settings')
      .select('*')
      .eq('user_id', userId);

    if (userMetricSettingsError) {
      console.error("Error fetching user metric settings:", userMetricSettingsError);
      return false; // Return false in case of an error
    }

    // If user has any metric settings, return true
    if (userMetricSettings && userMetricSettings.length > 0) {
      return true;
    }

    // If no user metric settings, check for target metric sets
    const { data: targetMetricSets, error: targetMetricSetsError } = await supabase
      .from('target_metric_sets')
      .select('*')
      .eq('user_id', userId);

    if (targetMetricSetsError) {
      console.error("Error fetching target metric sets:", targetMetricSetsError);
      return false; // Return false in case of an error
    }

    // If user has any target metric sets, return true
    if (targetMetricSets && targetMetricSets.length > 0) {
      return true;
    }

    // If no user metric settings or target metric sets, return false
    return false;

  } catch (error) {
    console.error("Error checking user metrics:", error);
    return false; // Return false in case of an error
  }
};
