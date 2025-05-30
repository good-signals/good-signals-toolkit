
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { TargetMetricSet, TargetMetricSetSchema, UserCustomMetricSettingSchema } from '@/types/targetMetrics';
import { getSuperAdminAwareAccountId } from './accountHelpers';
import { Account } from '@/services/accountService';

const METRIC_SETS_TABLE_NAME = 'target_metric_sets';

export async function createTargetMetricSet(userId: string, name: string, activeAccount?: Account | null): Promise<TargetMetricSet> {
  console.log('Creating target metric set for user:', userId, 'with name:', name);
  
  const accountId = await getSuperAdminAwareAccountId(userId, activeAccount);
  if (!accountId) {
    throw new Error('User must be an account admin to create metric sets');
  }

  const { data, error } = await supabase
    .from(METRIC_SETS_TABLE_NAME)
    .insert({ account_id: accountId, name: name })
    .select()
    .single();

  if (error) {
    console.error('Error creating target metric set:', error);
    throw error;
  }
  
  console.log('Created target metric set:', data);
  return TargetMetricSetSchema.parse(data);
}

export async function getTargetMetricSets(userId: string, activeAccount?: Account | null): Promise<TargetMetricSet[]> {
  console.log('Getting target metric sets for user:', userId);
  
  const accountId = await getSuperAdminAwareAccountId(userId, activeAccount);
  if (!accountId) {
    console.log('No account ID found for user, returning empty array');
    return [];
  }

  console.log('Querying metric sets for account:', accountId);
  
  const { data, error } = await supabase
    .from(METRIC_SETS_TABLE_NAME)
    .select('*')
    .eq('account_id', accountId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching target metric sets:', error);
    throw error;
  }
  
  console.log('Found metric sets:', data?.length || 0);
  return z.array(TargetMetricSetSchema).parse(data || []);
}

export async function getTargetMetricSetById(metricSetId: string, userId: string, activeAccount?: Account | null): Promise<TargetMetricSet | null> {
  console.log('Getting target metric set by ID:', metricSetId, 'for user:', userId);
  
  const accountId = await getSuperAdminAwareAccountId(userId, activeAccount);
  if (!accountId) {
    console.log('No account ID found for user');
    return null;
  }

  const { data: metricSetData, error: metricSetError } = await supabase
    .from(METRIC_SETS_TABLE_NAME)
    .select('*')
    .eq('id', metricSetId)
    .eq('account_id', accountId)
    .single();

  if (metricSetError) {
    if (metricSetError.code === 'PGRST116') { // Not found
      console.log('Metric set not found');
      return null;
    }
    console.error('Error fetching target metric set by ID:', metricSetError);
    throw metricSetError;
  }

  if (!metricSetData) {
    return null;
  }

  // Fetch associated user custom metrics settings
  const { data: userMetricsData, error: userMetricsError } = await supabase
    .from('user_custom_metrics_settings')
    .select('*')
    .eq('metric_set_id', metricSetId);

  if (userMetricsError) {
    console.error('Error fetching user custom metric settings for set:', userMetricsError);
  }

  // Fetch account custom metrics to ensure all custom metrics are available
  const { data: accountCustomMetrics, error: accountCustomMetricsError } = await supabase
    .from('account_custom_metrics')
    .select('*')
    .eq('account_id', accountId);

  if (accountCustomMetricsError) {
    console.error('Error fetching account custom metrics:', accountCustomMetricsError);
  }

  // Convert account custom metrics to user metric settings format for any that don't have settings yet
  const existingMetricIdentifiers = new Set((userMetricsData || []).map(m => m.metric_identifier));
  const missingCustomMetrics = (accountCustomMetrics || []).filter(
    customMetric => !existingMetricIdentifiers.has(customMetric.metric_identifier)
  );

  // Create placeholder settings for custom metrics that don't have settings yet
  const placeholderSettings = missingCustomMetrics.map(customMetric => ({
    id: undefined,
    user_id: userId,
    account_id: accountId,
    metric_set_id: metricSetId,
    metric_identifier: customMetric.metric_identifier,
    category: customMetric.category,
    label: customMetric.name,
    target_value: customMetric.default_target_value || 0,
    measurement_type: null,
    higher_is_better: customMetric.higher_is_better,
    created_at: undefined,
    updated_at: undefined,
  }));

  const allMetricsSettings = [
    ...(userMetricsData ? z.array(UserCustomMetricSettingSchema).parse(userMetricsData) : []),
    ...placeholderSettings
  ];
  
  const parsedMetricSet = TargetMetricSetSchema.parse(metricSetData);
  
  return {
    ...parsedMetricSet,
    user_custom_metrics_settings: allMetricsSettings,
  };
}

export async function updateTargetMetricSetName(metricSetId: string, userId: string, newName: string, activeAccount?: Account | null): Promise<TargetMetricSet> {
  const accountId = await getSuperAdminAwareAccountId(userId, activeAccount);
  if (!accountId) {
    throw new Error('User must be an account admin to update metric sets');
  }

  const { data, error } = await supabase
    .from(METRIC_SETS_TABLE_NAME)
    .update({ name: newName, updated_at: new Date().toISOString() })
    .eq('id', metricSetId)
    .eq('account_id', accountId)
    .select()
    .single();

  if (error) {
    console.error('Error updating target metric set name:', error);
    throw error;
  }
  return TargetMetricSetSchema.parse(data);
}

export async function deleteTargetMetricSet(metricSetId: string, userId: string, activeAccount?: Account | null): Promise<void> {
  const accountId = await getSuperAdminAwareAccountId(userId, activeAccount);
  if (!accountId) {
    throw new Error('User must be an account admin to delete metric sets');
  }

  const { error } = await supabase
    .from(METRIC_SETS_TABLE_NAME)
    .delete()
    .eq('id', metricSetId)
    .eq('account_id', accountId);

  if (error) {
    console.error('Error deleting target metric set:', error);
    throw error;
  }
}

// Updated function to check if a user has any target metric sets
export async function hasUserSetAnyMetrics(userId: string, activeAccount?: Account | null): Promise<boolean> {
  const accountId = await getSuperAdminAwareAccountId(userId, activeAccount);
  if (!accountId) {
    return false;
  }

  const { count: setCounts, error: setError } = await supabase
    .from(METRIC_SETS_TABLE_NAME)
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId);

  if (setError) {
    console.error('Error checking for metric sets:', setError);
    throw setError;
  }
  if (setCounts !== null && setCounts > 0) {
    return true;
  }
  return false; 
}
