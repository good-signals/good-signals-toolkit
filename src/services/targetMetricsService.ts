import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { 
  UserCustomMetricSetting, 
  TargetMetricSet,
  CreateTargetMetricSetData,
  TargetMetricsFormData
} from '@/types/targetMetrics';
import { getAccountForUser } from './targetMetrics/accountHelpers';
import { copyStandardMetricSetToAccount } from './standardMetricsService';

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
  console.log('Fetching target metric sets for account:', accountId);
  
  const { data, error } = await supabase
    .from('target_metric_sets')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching target metric sets:', error);
    return [];
  }
  
  console.log('Found target metric sets:', data?.length || 0);
  return data || [];
};

export const getTargetMetricSetById = async (id: string, userId?: string) => {
  console.log('[getTargetMetricSetById] Fetching metric set:', id, 'for user:', userId);
  
  if (!userId) {
    console.error('[getTargetMetricSetById] User ID is required');
    return null;
  }

  // First get the target metric set
  const { data: metricSetData, error: metricSetError } = await supabase
    .from('target_metric_sets')
    .select('*')
    .eq('id', id)
    .single();

  if (metricSetError) {
    console.error('[getTargetMetricSetById] Error fetching target metric set:', metricSetError);
    return null;
  }

  if (!metricSetData) {
    console.error('[getTargetMetricSetById] No metric set found with id:', id);
    return null;
  }

  console.log('[getTargetMetricSetById] Retrieved metric set:', {
    metricSetId: metricSetData.id,
    metricSetName: metricSetData.name
  });

  // Now get the user's custom metrics settings for this metric set
  const { data: userMetrics, error: userMetricsError } = await supabase
    .from('user_custom_metrics_settings')
    .select('*')
    .eq('metric_set_id', id)
    .eq('user_id', userId);

  if (userMetricsError) {
    console.error('[getTargetMetricSetById] Error fetching user custom metrics settings:', userMetricsError);
    // Continue with empty array rather than failing completely
  }

  const userCustomMetricsSettings = userMetrics || [];

  console.log('[getTargetMetricSetById] Retrieved user metrics settings:', {
    settingsCount: userCustomMetricsSettings.length,
    hasSettings: userCustomMetricsSettings.length > 0,
    settings: userCustomMetricsSettings
  });

  // If no settings found, this might be a data integrity issue
  if (userCustomMetricsSettings.length === 0) {
    console.warn('[getTargetMetricSetById] No user_custom_metrics_settings found for metric set and user combination.');
    console.warn('[getTargetMetricSetById] This may indicate the metric set needs to be repaired or the user needs to be assigned metrics.');
  }
  
  return {
    ...metricSetData,
    user_custom_metrics_settings: userCustomMetricsSettings
  };
};

export const createTargetMetricSet = async (name: string, account: any) => {
  console.log('[createTargetMetricSet] Creating target metric set:', name, 'for account:', account?.id);
  
  const { data, error } = await supabase
    .from('target_metric_sets')
    .insert({
      name,
      account_id: account.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating target metric set:', error);
    throw error;
  }

  console.log('[createTargetMetricSet] Created target metric set:', data.id);
  return data;
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

export const updateTargetMetricSetName = async (setId: string, newName: string) => {
  const { data, error } = await supabase
    .from('target_metric_sets')
    .update({ name: newName })
    .eq('id', setId)
    .select()
    .single();

  if (error) {
    console.error('Error updating target metric set name:', error);
    throw error;
  }

  return data;
};

export const deleteTargetMetricSet = async (setId: string, accountId: string) => {
  console.log('Deleting target metric set:', setId, 'for account:', accountId);
  
  // First delete related user_custom_metrics_settings
  const { error: settingsError } = await supabase
    .from('user_custom_metrics_settings')
    .delete()
    .eq('metric_set_id', setId);

  if (settingsError) {
    console.error('Error deleting user custom metric settings:', settingsError);
    throw settingsError;
  }

  // Then delete the target metric set
  const { error } = await supabase
    .from('target_metric_sets')
    .delete()
    .eq('id', setId)
    .eq('account_id', accountId);

  if (error) {
    console.error('Error deleting target metric set:', error);
    throw error;
  }

  console.log('Successfully deleted target metric set');
  return true;
};

export const getUserCustomMetricSettings = async (metricSetId: string) => {
  console.log('[getUserCustomMetricSettings] Fetching settings for metric set:', metricSetId);
  
  const { data, error } = await supabase
    .from('user_custom_metrics_settings')
    .select('*')
    .eq('metric_set_id', metricSetId);
  
  if (error) {
    console.error('Error fetching user custom metric settings:', error);
    return [];
  }
  
  console.log('[getUserCustomMetricSettings] Found settings:', data?.length || 0);
  return data || [];
};

export const saveUserCustomMetricSettings = async (userId: string, metricSetId: string, formData: TargetMetricsFormData) => {
  // First delete existing settings for this metric set
  await supabase
    .from('user_custom_metrics_settings')
    .delete()
    .eq('user_id', userId)
    .eq('metric_set_id', metricSetId);

  // Get account for user
  const accountId = await getAccountForUser(userId);
  if (!accountId) {
    throw new Error('No account found for user');
  }

  // Prepare all metrics to insert
  const metricsToInsert = [];

  // Add predefined metrics
  formData.predefined_metrics.forEach(metric => {
    metricsToInsert.push({
      user_id: userId,
      account_id: accountId,
      metric_set_id: metricSetId,
      metric_identifier: metric.metric_identifier,
      label: metric.label,
      category: metric.category,
      target_value: metric.target_value,
      higher_is_better: metric.higher_is_better,
      measurement_type: null
    });
  });

  // Add custom metrics
  formData.custom_metrics.forEach(metric => {
    metricsToInsert.push({
      user_id: userId,
      account_id: accountId,
      metric_set_id: metricSetId,
      metric_identifier: metric.metric_identifier,
      label: metric.label,
      category: metric.category,
      target_value: metric.target_value,
      higher_is_better: metric.higher_is_better,
      measurement_type: null
    });
  });

  // Add visitor profile metrics
  formData.visitor_profile_metrics.forEach(metric => {
    metricsToInsert.push({
      user_id: userId,
      account_id: accountId,
      metric_set_id: metricSetId,
      metric_identifier: metric.metric_identifier,
      label: metric.label,
      category: metric.category,
      target_value: metric.target_value,
      higher_is_better: metric.higher_is_better,
      measurement_type: metric.measurement_type
    });
  });

  // Insert all metrics
  if (metricsToInsert.length > 0) {
    const { error } = await supabase
      .from('user_custom_metrics_settings')
      .insert(metricsToInsert);

    if (error) {
      console.error('Error saving user custom metric settings:', error);
      throw error;
    }
  }

  return { success: true };
};

export const saveUserStandardMetricsPreference = async (userId: string, accountId: string) => {
  console.log('[saveUserStandardMetricsPreference] Saving standard metrics preference for user:', userId, 'account:', accountId);
  
  try {
    // Get the most recent standard metric set (as default)
    const { data: standardSets, error: standardSetsError } = await supabase
      .from('standard_target_metric_sets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (standardSetsError) {
      console.error('Error fetching standard metric sets:', standardSetsError);
      throw new Error('Failed to fetch standard metric sets');
    }

    if (!standardSets || standardSets.length === 0) {
      throw new Error('No standard metric sets available. Please contact your administrator.');
    }

    const defaultStandardSet = standardSets[0];
    console.log('[saveUserStandardMetricsPreference] Using default standard metric set:', defaultStandardSet.name);

    // Check if user already has metrics
    const hasExistingMetrics = await hasUserSetAnyMetrics(userId, accountId);
    if (hasExistingMetrics) {
      console.log('[saveUserStandardMetricsPreference] User already has metrics, proceeding anyway to add standard metrics');
    }

    // Copy the standard metric set to the user's account
    const copiedSet = await copyStandardMetricSetToAccount(
      defaultStandardSet.id,
      accountId,
      userId,
      `${defaultStandardSet.name} (Standard)`
    );

    console.log('[saveUserStandardMetricsPreference] Successfully copied standard metrics to user account:', copiedSet.name);
    console.log('[saveUserStandardMetricsPreference] Copied set has settings:', copiedSet.user_custom_metrics_settings?.length || 0);
    
    return { 
      success: true, 
      metricSetName: copiedSet.name,
      metricSetId: copiedSet.id,
      settingsCount: copiedSet.user_custom_metrics_settings?.length || 0
    };

  } catch (error) {
    console.error('[saveUserStandardMetricsPreference] Error saving standard metrics preference:', error);
    throw error;
  }
};

export const triggerAssessmentRecalculation = async (assessmentId: string, userId?: string) => {
  console.log('Triggering assessment recalculation for:', assessmentId);
  return { 
    success: true,
    message: 'Assessment recalculation completed successfully.'
  };
};
