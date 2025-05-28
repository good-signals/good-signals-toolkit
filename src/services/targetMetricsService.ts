
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

// Helper function to get user's account ID (assumes user is admin of first account)
async function getUserAccountId(userId: string): Promise<string | null> {
  console.log('Getting account ID for user:', userId);
  
  const { data, error } = await supabase
    .from('account_memberships')
    .select('account_id')
    .eq('user_id', userId)
    .eq('role', 'account_admin')
    .single();

  if (error) {
    console.error('Error fetching user account:', error);
    return null;
  }
  
  console.log('Found account ID:', data?.account_id);
  return data?.account_id || null;
}

// --- Target Metric Set Functions ---

export async function createTargetMetricSet(userId: string, name: string): Promise<TargetMetricSet> {
  console.log('Creating target metric set for user:', userId, 'with name:', name);
  
  const accountId = await getUserAccountId(userId);
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

export async function getTargetMetricSets(userId: string): Promise<TargetMetricSet[]> {
  console.log('Getting target metric sets for user:', userId);
  
  const accountId = await getUserAccountId(userId);
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

export async function getTargetMetricSetById(metricSetId: string, userId: string): Promise<TargetMetricSet | null> {
  console.log('Getting target metric set by ID:', metricSetId, 'for user:', userId);
  
  const accountId = await getUserAccountId(userId);
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
    .from(USER_METRICS_TABLE_NAME)
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
  const placeholderSettings: UserCustomMetricSetting[] = missingCustomMetrics.map(customMetric => ({
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

export async function updateTargetMetricSetName(metricSetId: string, userId: string, newName: string): Promise<TargetMetricSet> {
  const accountId = await getUserAccountId(userId);
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

export async function deleteTargetMetricSet(metricSetId: string, userId: string): Promise<void> {
  const accountId = await getUserAccountId(userId);
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
  formData: TargetMetricsFormData
): Promise<UserCustomMetricSetting[]> {
  const accountId = await getUserAccountId(userId);
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
    .from(METRIC_SETS_TABLE_NAME)
    .update({ updated_at: new Date().toISOString() })
    .eq('id', metricSetId);
  
  console.log('Updated metric set timestamp for cache invalidation');
  
  return z.array(UserCustomMetricSettingSchema).parse(data || []);
}

// Updated function to check if a user has any target metric sets
export async function hasUserSetAnyMetrics(userId: string): Promise<boolean> {
  const accountId = await getUserAccountId(userId);
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

// Function to save preference for using standard metrics (conceptual)
export async function saveUserStandardMetricsPreference(userId: string): Promise<void> {
  console.log(`User ${userId} has chosen to use standard metrics. Consider saving this preference.`);
  return;
}

// New function to trigger assessment recalculation
export async function triggerAssessmentRecalculation(
  metricSetId: string, 
  userId: string
): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    // Import the recalculation service
    const { recalculateAssessmentScoresForMetricSet } = await import('./assessmentRecalculationService');
    
    const result = await recalculateAssessmentScoresForMetricSet(metricSetId, userId);
    
    if (result.errors.length > 0) {
      console.warn('Recalculation completed with errors:', result.errors);
      return {
        success: true,
        message: `Updated ${result.updated} assessments with ${result.errors.length} errors`,
        details: result
      };
    }
    
    return {
      success: true,
      message: `Successfully updated ${result.updated} assessments`,
      details: result
    };
  } catch (error) {
    console.error('Failed to trigger assessment recalculation:', error);
    return {
      success: false,
      message: 'Failed to recalculate assessment scores',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}
