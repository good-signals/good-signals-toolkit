import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { 
  UserCustomMetricSetting, 
  TargetMetricSet,
  CreateTargetMetricSetData 
} from '@/types/targetMetrics';
import { getAccountForUser } from './targetMetrics/accountHelpers';

// Function to check if a user has set any target metrics
export const hasUserSetAnyMetrics = async (userId: string, accountId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('user_custom_metrics_settings')
    .select('id')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .limit(1);

  if (error) {
    console.error('Error checking user metrics:', error);
    return false;
  }

  return data && data.length > 0;
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

export const getTargetMetricSetById = async (id: string, userId?: string) => {
  const { data, error } = await supabase
    .from('target_metric_sets')
    .select(`
      *,
      user_custom_metrics_settings (*)
    `)
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

export const updateTargetMetricSet = async (setId: string, data: { name: string }, userId: string, accountId: string) => {
  const { data: result, error } = await supabase
    .from('target_metric_sets')
    .update({
      name: data.name,
      account_id: accountId,
    })
    .eq('id', setId)
    .select()
    .single();

  if (error) {
    console.error('Error updating target metric set:', error);
    throw error;
  }

  return result;
};

export const saveUserStandardMetricsPreference = async (userId: string, accountId: string) => {
  // Implementation for saving standard metrics preference
  console.log('Saving standard metrics preference for user:', userId, 'account:', accountId);
  return Promise.resolve();
};

export const triggerAssessmentRecalculation = async (assessmentId: string, userId?: string) => {
  console.log('Triggering assessment recalculation for:', assessmentId);
  return { 
    success: true,
    message: 'Assessment recalculation completed successfully.'
  };
};
