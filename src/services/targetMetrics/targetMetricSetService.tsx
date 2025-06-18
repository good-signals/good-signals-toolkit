
import { supabase } from '@/integrations/supabase/client';
import { TargetMetricSet, CreateTargetMetricSetData, TargetMetricsFormData } from '@/types/targetMetrics';
import { getAccountForUser } from './accountHelpers';
import { saveUserCustomMetricSettings } from '../targetMetricsService';

export const getTargetMetricSetById = async (id: string, userId: string): Promise<TargetMetricSet | null> => {
  console.log('[getTargetMetricSetById] Fetching metric set:', id, 'for user:', userId);
  
  const { data, error } = await supabase
    .from('target_metric_sets')
    .select(`
      *,
      user_custom_metrics_settings (*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('[getTargetMetricSetById] Error fetching target metric set:', error);
    return null;
  }

  console.log('[getTargetMetricSetById] Retrieved metric set with settings:', {
    metricSetId: data?.id,
    metricSetName: data?.name,
    settingsCount: data?.user_custom_metrics_settings?.length || 0,
    hasSettings: !!data?.user_custom_metrics_settings,
    settings: data?.user_custom_metrics_settings
  });

  // If no settings found and we have a user ID, this might be a data integrity issue
  if ((!data?.user_custom_metrics_settings || data.user_custom_metrics_settings.length === 0) && userId) {
    console.warn('[getTargetMetricSetById] No user_custom_metrics_settings found for metric set. This may indicate a data integrity issue.');
    console.warn('[getTargetMetricSetById] Metric set was likely created without proper standard metrics import.');
  }

  return {
    id: data.id,
    account_id: data.account_id,
    name: data.name,
    created_at: data.created_at,
    updated_at: data.updated_at,
    user_custom_metrics_settings: data.user_custom_metrics_settings || []
  };
};

export const getTargetMetricSets = async (accountId: string): Promise<TargetMetricSet[]> => {
  console.log('[getTargetMetricSets] Fetching target metric sets for account:', accountId);
  
  const { data, error } = await supabase
    .from('target_metric_sets')
    .select(`
      *,
      user_custom_metrics_settings (*)
    `)
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getTargetMetricSets] Error fetching target metric sets:', error);
    throw error;
  }

  console.log('[getTargetMetricSets] Found target metric sets:', data?.length || 0);
  return data || [];
};

export const deleteTargetMetricSet = async (id: string, accountId: string) => {
  console.log('[deleteTargetMetricSet] Deleting target metric set:', id, 'for account:', accountId);
  
  // First delete related user_custom_metrics_settings
  const { error: settingsError } = await supabase
    .from('user_custom_metrics_settings')
    .delete()
    .eq('metric_set_id', id);

  if (settingsError) {
    console.error('[deleteTargetMetricSet] Error deleting user custom metric settings:', settingsError);
    throw settingsError;
  }

  // Then delete the target metric set
  const { error } = await supabase
    .from('target_metric_sets')
    .delete()
    .eq('id', id)
    .eq('account_id', accountId);

  if (error) {
    console.error('[deleteTargetMetricSet] Error deleting target metric set:', error);
    throw error;
  }

  console.log('[deleteTargetMetricSet] Successfully deleted target metric set');
  return true;
};

export const createTargetMetricSet = async (data: TargetMetricsFormData, userId: string, accountId: string) => {
  console.log('[createTargetMetricSet] Creating target metric set for user:', userId, 'account:', accountId);
  
  const { data: result, error } = await supabase
    .from('target_metric_sets')
    .insert({
      name: data.metric_set_name,
      account_id: accountId,
    })
    .select()
    .single();

  if (error) {
    console.error('[createTargetMetricSet] Error creating target metric set:', error);
    throw error;
  }

  console.log('[createTargetMetricSet] Created target metric set:', result.id);

  // Save the metric settings
  if (result?.id) {
    await saveUserCustomMetricSettings(userId, result.id, data);
    console.log('[createTargetMetricSet] Saved metric settings for new target metric set');
  }

  return result;
};

export const updateTargetMetricSet = async (id: string, data: TargetMetricsFormData, userId: string, accountId: string) => {
  console.log('[updateTargetMetricSet] Updating target metric set:', id, 'for user:', userId);
  
  const { data: result, error } = await supabase
    .from('target_metric_sets')
    .update({
      name: data.metric_set_name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('account_id', accountId)
    .select()
    .single();

  if (error) {
    console.error('[updateTargetMetricSet] Error updating target metric set:', error);
    throw error;
  }

  console.log('[updateTargetMetricSet] Updated target metric set:', result.id);

  // Update the metric settings
  await saveUserCustomMetricSettings(userId, id, data);
  console.log('[updateTargetMetricSet] Updated metric settings for target metric set');

  return result;
};
