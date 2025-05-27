import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { 
  UserCustomMetricSetting, 
  TargetMetricsFormData, 
  VISITOR_PROFILE_CATEGORY,
  TargetMetricSet,
  TargetMetricSetSchema,
  UserCustomMetricSettingSchema,
  MeasurementType
} from '@/types/targetMetrics';
import { Database } from '@/integrations/supabase/types';

const USER_METRICS_TABLE_NAME = 'user_custom_metrics_settings';
const METRIC_SETS_TABLE_NAME = 'target_metric_sets';

// Type for inserting/upserting metrics
type MetricForUpsert = Database['public']['Tables']['user_custom_metrics_settings']['Insert'];

// --- Target Metric Set Functions ---

export async function createTargetMetricSet(userId: string, name: string): Promise<TargetMetricSet> {
  const { data, error } = await supabase
    .from(METRIC_SETS_TABLE_NAME)
    .insert({ user_id: userId, name: name })
    .select()
    .single();

  if (error) {
    console.error('Error creating target metric set:', error);
    throw error;
  }
  return TargetMetricSetSchema.parse(data);
}

export async function getTargetMetricSets(userId: string): Promise<TargetMetricSet[]> {
  const { data, error } = await supabase
    .from(METRIC_SETS_TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching target metric sets:', error);
    throw error;
  }
  return z.array(TargetMetricSetSchema).parse(data || []);
}

export async function getTargetMetricSetById(metricSetId: string, userId: string): Promise<TargetMetricSet | null> {
  const { data, error } = await supabase
    .from(METRIC_SETS_TABLE_NAME)
    .select('*')
    .eq('id', metricSetId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching target metric set by ID:', error);
    throw error;
  }
  return data ? TargetMetricSetSchema.parse(data) : null;
}

export async function updateTargetMetricSetName(metricSetId: string, userId: string, newName: string): Promise<TargetMetricSet> {
  const { data, error } = await supabase
    .from(METRIC_SETS_TABLE_NAME)
    .update({ name: newName, updated_at: new Date().toISOString() })
    .eq('id', metricSetId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating target metric set name:', error);
    throw error;
  }
  return TargetMetricSetSchema.parse(data);
}

export async function deleteTargetMetricSet(metricSetId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from(METRIC_SETS_TABLE_NAME)
    .delete()
    .eq('id', metricSetId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting target metric set:', error);
    throw error;
  }
}


// --- User Custom Metric Settings Functions (now associated with a set) ---

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
  formData: TargetMetricsFormData
): Promise<UserCustomMetricSetting[]> {

  const metricsToUpsert: MetricForUpsert[] = [];

  formData.predefined_metrics.forEach(metric => {
    metricsToUpsert.push({
      metric_set_id: metricSetId,
      user_id: userId, 
      metric_identifier: metric.metric_identifier,
      category: metric.category,
      label: metric.label,
      target_value: metric.target_value,
      higher_is_better: metric.higher_is_better,
      measurement_type: null,
    });
  });

  formData.visitor_profile_metrics.forEach(metric => {
    metricsToUpsert.push({
      metric_set_id: metricSetId,
      user_id: userId,
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
    // To ensure consistency, if no metrics are provided, perhaps existing metrics for the set should be deleted.
    // This is a "sync" operation. Current logic is "upsert only".
    // For now, if `metricsToUpsert` is empty, Supabase `upsert` with an empty array will do nothing, which is fine.
    // We will return the result of the `select()` call, which would be empty if nothing was upserted and the table was empty.
    // Or, we could fetch and return existing metrics if no upsert happened.
    // Let's stick to returning what was upserted, which is an empty array if metricsToUpsert is empty.
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
  
  return z.array(UserCustomMetricSettingSchema).parse(data || []);
}

// Updated function to check if a user has any target metric sets
export async function hasUserSetAnyMetrics(userId: string): Promise<boolean> {
  const { count: setCounts, error: setError } = await supabase
    .from(METRIC_SETS_TABLE_NAME)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (setError) {
    console.error('Error checking for metric sets:', setError);
    throw setError;
  }
  if (setCounts !== null && setCounts > 0) {
    return true;
  }
  return false; 
}

// Function to save preference for using standard metrics (conceptual)
// To make 'hasUserSetAnyMetrics' fully robust for standard metrics,
// this function should actually create a record or set a flag.
export async function saveUserStandardMetricsPreference(userId: string): Promise<void> {
  console.log(`User ${userId} has chosen to use standard metrics. Consider saving this preference.`);
  return;
}
