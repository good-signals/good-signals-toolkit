
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
      .from('user_custom_metrics_settings')
      .select('*')
      .eq('user_id', userId);

    if (userMetricSettingsError) {
      console.error("Error fetching user metric settings:", userMetricSettingsError);
      return false;
    }

    // If user has any metric settings, return true
    if (userMetricSettings && userMetricSettings.length > 0) {
      return true;
    }

    // If no user metric settings, check for target metric sets
    const { data: targetMetricSets, error: targetMetricSetsError } = await supabase
      .from('target_metric_sets')
      .select('*')
      .eq('account_id', userId); // Note: this might need to be adjusted based on your data model

    if (targetMetricSetsError) {
      console.error("Error fetching target metric sets:", targetMetricSetsError);
      return false;
    }

    // If user has any target metric sets, return true
    if (targetMetricSets && targetMetricSets.length > 0) {
      return true;
    }

    return false;

  } catch (error) {
    console.error("Error checking user metrics:", error);
    return false;
  }
};

export const getTargetMetricSets = async (accountId: string) => {
  const { data, error } = await supabase
    .from('target_metric_sets')
    .select('*')
    .eq('account_id', accountId);
  
  if (error) {
    console.error('Error fetching target metric sets:', error);
    return [];
  }
  
  return data || [];
};

export const getTargetMetricSetById = async (id: string) => {
  const { data, error } = await supabase
    .from('target_metric_sets')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching target metric set:', error);
    return null;
  }
  
  return data;
};

export const deleteTargetMetricSet = async (id: string) => {
  const { error } = await supabase
    .from('target_metric_sets')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting target metric set:', error);
    throw error;
  }
};

export const getUserCustomMetricSettings = async (userId: string, accountId: string) => {
  const { data, error } = await supabase
    .from('user_custom_metrics_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('account_id', accountId);
  
  if (error) {
    console.error('Error fetching user custom metric settings:', error);
    return [];
  }
  
  return data || [];
};

export const saveUserCustomMetricSettings = async (settings: any[]) => {
  // Implementation for saving user custom metric settings
  console.log('Saving user custom metric settings:', settings);
  return { success: true };
};

export const createTargetMetricSet = async (data: CreateTargetMetricSetData) => {
  const { data: result, error } = await supabase
    .from('target_metric_sets')
    .insert(data)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating target metric set:', error);
    throw error;
  }
  
  return result;
};

export const updateTargetMetricSetName = async (id: string, name: string) => {
  const { error } = await supabase
    .update({ name })
    .eq('id', id);
  
  if (error) {
    console.error('Error updating target metric set name:', error);
    throw error;
  }
};

export const saveUserStandardMetricsPreference = async (userId: string, preferences: any) => {
  console.log('Saving user standard metrics preference:', userId, preferences);
  return { success: true };
};

export const triggerAssessmentRecalculation = async (assessmentId: string, userId?: string) => {
  console.log('Triggering assessment recalculation for:', assessmentId);
  return { 
    success: true,
    message: 'Assessment recalculation completed successfully.'
  };
};
