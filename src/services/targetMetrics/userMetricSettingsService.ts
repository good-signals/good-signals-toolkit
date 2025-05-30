
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { 
  UserCustomMetricSetting, 
  TargetMetricsFormData, 
  VISITOR_PROFILE_CATEGORY,
  UserCustomMetricSettingSchema,
  MeasurementType
} from '@/types/targetMetrics';
import { Database } from '@/integrations/supabase/types';
import { getSuperAdminAwareAccountId } from './accountHelpers';
import { Account } from '@/services/accountService';

const USER_METRICS_TABLE_NAME = 'user_custom_metrics_settings';

// Type for inserting/upserting metrics
type MetricForUpsert = Database['public']['Tables']['user_custom_metrics_settings']['Insert'];

export async function getUserCustomMetricSettings(metricSetId: string): Promise<UserCustomMetricSetting[]> {
  const { data, error } = await supabase
    .from(USER_METRICS_TABLE_NAME)
    .select('*')
    .eq('metric_set_id', metricSetId);

  if (error) {
    console.error('Error fetching user custom metric settings for set:', error);
    throw error;
  }
  
  const typedData: UserCustomMetricSetting[] = data?.map(item => ({
    id: item.id,
    user_id: item.user_id,
    account_id: item.account_id,
    metric_set_id: item.metric_set_id,
    metric_identifier: item.metric_identifier,
    category: item.category,
    label: item.label,
    target_value: item.target_value,
    measurement_type: item.measurement_type as UserCustomMetricSetting['measurement_type'],
    higher_is_better: item.higher_is_better,
    created_at: item.created_at,
    updated_at: item.updated_at,
  })) || [];
  
  return typedData;
}

export async function saveUserCustomMetricSettings(
  userId: string,
  metricSetId: string,
  formData: TargetMetricsFormData,
  activeAccount?: Account | null
): Promise<UserCustomMetricSetting[]> {
  const accountId = await getSuperAdminAwareAccountId(userId, activeAccount);
  if (!accountId) {
    throw new Error('User must be an account admin to save metric settings');
  }

  const metricsToUpsert: MetricForUpsert[] = [];

  // Handle predefined metrics
  formData.predefined_metrics.forEach(metric => {
    metricsToUpsert.push({
      metric_set_id: metricSetId,
      user_id: userId, 
      account_id: accountId,
      metric_identifier: metric.metric_identifier,
      category: metric.category,
      label: metric.label,
      target_value: metric.target_value,
      higher_is_better: metric.higher_is_better,
      measurement_type: null,
    });
  });

  // Handle custom metrics
  formData.custom_metrics?.forEach(metric => {
    metricsToUpsert.push({
      metric_set_id: metricSetId,
      user_id: userId,
      account_id: accountId,
      metric_identifier: metric.metric_identifier,
      category: metric.category,
      label: metric.label,
      target_value: metric.target_value,
      higher_is_better: metric.higher_is_better,
      measurement_type: null,
    });
  });

  // Handle visitor profile metrics
  formData.visitor_profile_metrics.forEach(metric => {
    metricsToUpsert.push({
      metric_set_id: metricSetId,
      user_id: userId,
      account_id: accountId,
      metric_identifier: metric.metric_identifier || `vp_${metric.label.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      category: VISITOR_PROFILE_CATEGORY,
      label: metric.label,
      target_value: metric.target_value,
      measurement_type: metric.measurement_type as MeasurementType,
      higher_is_better: metric.higher_is_better,
    });
  });
  
  if (metricsToUpsert.length === 0) {
    console.log("No metrics to upsert for set:", metricSetId);
  }

  const { data, error } = await supabase
    .from(USER_METRICS_TABLE_NAME)
    .upsert(metricsToUpsert, { 
      onConflict: 'metric_set_id, metric_identifier', 
      defaultToNull: false 
    })
    .select();

  if (error) {
    console.error('Error saving user custom metric settings for set:', error);
    throw error;
  }

  // Update the metric set's updated_at timestamp to trigger cache invalidation
  await supabase
    .from('target_metric_sets')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', metricSetId);
  
  console.log('Updated metric set timestamp for cache invalidation');
  
  return z.array(UserCustomMetricSettingSchema).parse(data || []);
}

// Function to save preference for using standard metrics (conceptual)
export async function saveUserStandardMetricsPreference(userId: string): Promise<void> {
  console.log(`User ${userId} has chosen to use standard metrics. Consider saving this preference.`);
  return;
}
