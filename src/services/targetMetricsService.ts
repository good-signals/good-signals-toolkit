import { supabase } from '@/integrations/supabase/client';
import { 
  UserCustomMetricSetting, 
  TargetMetricsFormData, 
  VISITOR_PROFILE_CATEGORY,
  TargetMetricSet,
  TargetMetricSetSchema
} from '@/types/targetMetrics';
import { PostgrestResponse } from '@supabase/supabase-js';

const USER_METRICS_TABLE_NAME = 'user_custom_metrics_settings';
const METRIC_SETS_TABLE_NAME = 'target_metric_sets';

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
  return TargetMetricSetSchema.parse(data); // Validate and type the response
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
  return z.array(TargetMetricSetSchema).parse(data || []); // Validate and type the response
}

export async function getTargetMetricSetById(metricSetId: string, userId: string): Promise<TargetMetricSet | null> {
  const { data, error } = await supabase
    .from(METRIC_SETS_TABLE_NAME)
    .select('*')
    .eq('id', metricSetId)
    .eq('user_id', userId) // Ensure user owns the set
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // PostgREST error for "Missing row"
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
    .eq('user_id', userId) // Ensure user owns the set
    .select()
    .single();

  if (error) {
    console.error('Error updating target metric set name:', error);
    throw error;
  }
  return TargetMetricSetSchema.parse(data);
}

export async function deleteTargetMetricSet(metricSetId: string, userId: string): Promise<void> {
  // Deleting a set should also delete its associated metrics due to CASCADE constraint
  const { error } = await supabase
    .from(METRIC_SETS_TABLE_NAME)
    .delete()
    .eq('id', metricSetId)
    .eq('user_id', userId); // Ensure user owns the set

  if (error) {
    console.error('Error deleting target metric set:', error);
    throw error;
  }
}


// --- User Custom Metric Settings Functions (now associated with a set) ---

export async function getUserCustomMetricSettings(metricSetId: string): Promise<UserCustomMetricSetting[]> {
  // Assuming RLS on user_custom_metrics_settings correctly ensures user can only access metrics
  // from sets they own. The metricSetId is the primary filter here.
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
    user_id: item.user_id, // Still useful for context, though ownership is via set
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
  userId: string, // Kept for potential checks, though metricSetId implies ownership
  metricSetId: string,
  formData: TargetMetricsFormData // This formData should contain the metrics, not set name/id
): Promise<UserCustomMetricSetting[]> {

  const metricsToUpsert: Array<{
    metric_set_id: string; // All metrics will belong to this set
    user_id: string; // Denormalized, but good for RLS if needed directly on this table
    metric_identifier: string;
    category: string;
    label: string;
    target_value: number;
    higher_is_better: boolean;
    measurement_type: string | null;
  }> = [];

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
      metric_identifier: metric.metric_identifier || `visitor_profile_${metric.label.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      category: VISITOR_PROFILE_CATEGORY,
      label: metric.label,
      target_value: metric.target_value,
      measurement_type: metric.measurement_type,
      higher_is_better: metric.higher_is_better,
    });
  });

  const { data, error } = await supabase
    .from(USER_METRICS_TABLE_NAME)
    .upsert(metricsToUpsert, { onConflict: 'metric_set_id, metric_identifier', defaultToNull: false })
    .select();

  if (error) {
    console.error('Error saving user custom metric settings for set:', error);
    throw error;
  }
  
  const typedReturnedData: UserCustomMetricSetting[] = data?.map(item => ({
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
  
  return typedReturnedData;
}

// Updated function to check if a user has any target metric sets
export async function hasUserSetAnyMetrics(userId: string): Promise<boolean> {
  // Option 1: Check if user has any metric sets.
  const { count: setCounts, error: setError } = await supabase
    .from(METRIC_SETS_TABLE_NAME)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (setError) {
    console.error('Error checking for metric sets:', setError);
    // Fallback or throw, depending on desired behavior. Let's throw for now.
    throw setError;
  }
  if (setCounts !== null && setCounts > 0) {
    return true;
  }

  // Option 2: Check if user has opted for standard metrics (if we have a flag for this)
  // This requires a preference to be stored, e.g., in 'user_profiles' or 'user_preferences'
  // For now, we'll assume if saveUserStandardMetricsPreference was called, something was done.
  // A more robust check here would query that preference.
  // Current saveUserStandardMetricsPreference only logs, so this check is conceptual for now.
  // const { data: preference, error: prefError } = await supabase
  //   .from('user_preferences') // Assuming a table for preferences
  //   .select('preference_value')
  //   .eq('user_id', userId)
  //   .eq('preference_key', 'use_standard_metrics')
  //   .single();
  // if (preference && preference.preference_value === 'true') return true;
  
  return false; // No custom sets and no explicit standard preference found (based on current impl)
}

// Function to save preference for using standard metrics (conceptual)
// To make 'hasUserSetAnyMetrics' fully robust for standard metrics,
// this function should actually create a record or set a flag.
export async function saveUserStandardMetricsPreference(userId: string): Promise<void> {
  console.log(`User ${userId} has chosen to use standard metrics. Consider saving this preference.`);
  // Example: Create a default, non-editable metric set named "Standard Metrics" for the user.
  // Or, set a flag on their user_profile.
  // const { error } = await supabase
  //  .from('user_preferences')
  //  .upsert({ user_id: userId, preference_key: 'use_standard_metrics', preference_value: 'true' }, { onConflict: 'user_id, preference_key' });
  // if (error) {
  //   console.error('Error saving standard metrics preference:', error);
  //   throw error;
  // }
  return;
}
