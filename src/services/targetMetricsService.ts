
import { supabase } from '@/integrations/supabase/client';
import { UserCustomMetricSetting, TargetMetricsFormData, VISITOR_PROFILE_CATEGORY } from '@/types/targetMetrics';
import { PostgrestResponse } from '@supabase/supabase-js';

const TABLE_NAME = 'user_custom_metrics_settings';

export async function getUserCustomMetricSettings(userId: string): Promise<UserCustomMetricSetting[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user custom metric settings:', error);
    throw error;
  }
  
  // Convert the data to ensure it matches our type
  const typedData: UserCustomMetricSetting[] = data?.map(item => ({
    id: item.id,
    user_id: item.user_id,
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
  formData: TargetMetricsFormData
): Promise<UserCustomMetricSetting[]> {
  const metricsToUpsert: UserCustomMetricSetting[] = [];

  // Prepare predefined metrics
  formData.predefined_metrics.forEach(metric => {
    metricsToUpsert.push({
      user_id: userId,
      metric_identifier: metric.metric_identifier,
      category: metric.category,
      label: metric.label,
      target_value: metric.target_value,
      higher_is_better: metric.higher_is_better,
      measurement_type: null, // Predefined metrics don't have measurement_type
    });
  });

  // Prepare visitor profile metrics
  formData.visitor_profile_metrics.forEach(metric => {
    metricsToUpsert.push({
      user_id: userId,
      // For new custom metrics, identifier might need to be generated or based on label slug
      // Assuming metric_identifier is pre-populated if editing, or needs generation if new.
      // For simplicity, if metric_identifier is empty (new), we'll create one.
      metric_identifier: metric.metric_identifier || `visitor_profile_${metric.label.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      category: VISITOR_PROFILE_CATEGORY,
      label: metric.label,
      target_value: metric.target_value,
      measurement_type: metric.measurement_type,
      higher_is_better: metric.higher_is_better,
    });
  });

  // We need to handle existing metrics (update) vs new metrics (insert).
  // Supabase upsert with `onConflict: 'user_id, metric_identifier'` is ideal here.
  // This requires `user_id` and `metric_identifier` to be part of the unique constraint, which it is.

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .upsert(metricsToUpsert, { onConflict: 'user_id, metric_identifier', defaultToNull: false })
    .select();

  if (error) {
    console.error('Error saving user custom metric settings:', error);
    throw error;
  }
  
  // Convert the returned data to ensure it matches our type
  const typedReturnedData: UserCustomMetricSetting[] = data?.map(item => ({
    id: item.id,
    user_id: item.user_id,
    metric_identifier: item.metric_identifier,
    category: item.category,
    label: item.label,
    target_value: item.target_value,
    measurement_type: item.measurement_type as UserCustomMetricSetting['measurement_type'],
    higher_is_better: item.higher_is_better,
    created_at: item.created_at,
    updated_at: item.updated_at,
  })) || [];
  
  return typedReturnedData;
}
