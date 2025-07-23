import { supabase } from '@/integrations/supabase/client';
import { TargetMetricSet, CreateTargetMetricSetData, TargetMetricsFormData, OPTIONAL_METRIC_CATEGORIES, VISITOR_PROFILE_CATEGORY } from '@/types/targetMetrics';
import { getAccountForUser } from './accountHelpers';

const saveUserCustomMetricSettings = async (userId: string, metricSetId: string, formData: TargetMetricsFormData) => {
  console.log('[saveUserCustomMetricSettings] Saving metrics for user:', userId, 'metric set:', metricSetId);
  
  // First delete existing settings for this metric set
  const { error: deleteError } = await supabase
    .from('user_custom_metrics_settings')
    .delete()
    .eq('user_id', userId)
    .eq('metric_set_id', metricSetId);

  if (deleteError) {
    console.error('[saveUserCustomMetricSettings] Error deleting existing settings:', deleteError);
    throw deleteError;
  }

  // Save enabled optional sections
  await saveEnabledOptionalSections(metricSetId, formData.enabled_optional_sections || []);

  // Get account for user
  const accountId = await getAccountForUser(userId);
  if (!accountId) {
    throw new Error('No account found for user');
  }

  // Prepare all metrics to insert
  const metricsToInsert = [];

  // Add predefined metrics
  if (formData.predefined_metrics && formData.predefined_metrics.length > 0) {
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
  }

  // Add custom metrics
  if (formData.custom_metrics && formData.custom_metrics.length > 0) {
    console.log('[saveUserCustomMetricSettings] Saving custom metrics:', formData.custom_metrics.length);
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
        measurement_type: metric.units || null // Store units in measurement_type for custom metrics
      });
    });
  }

  // Add visitor profile metrics
  if (formData.visitor_profile_metrics && formData.visitor_profile_metrics.length > 0) {
    console.log('[saveUserCustomMetricSettings] Saving visitor profile metrics:', formData.visitor_profile_metrics.length);
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
  }

  // Insert all metrics
  if (metricsToInsert.length > 0) {
    console.log('[saveUserCustomMetricSettings] Inserting metrics:', metricsToInsert.length);
    const { error } = await supabase
      .from('user_custom_metrics_settings')
      .insert(metricsToInsert);

    if (error) {
      console.error('[saveUserCustomMetricSettings] Error saving user custom metric settings:', error);
      throw error;
    }
  }

  console.log('[saveUserCustomMetricSettings] Successfully saved all metrics');
  return { success: true };
};

// Helper function to save enabled optional sections
const saveEnabledOptionalSections = async (metricSetId: string, enabledSections: string[]) => {
  console.log('[saveEnabledOptionalSections] Saving enabled sections for metric set:', metricSetId, enabledSections);
  
  // First delete existing enabled sections for this metric set
  const { error: deleteError } = await supabase
    .from('target_metric_set_enabled_sections')
    .delete()
    .eq('metric_set_id', metricSetId);

  if (deleteError) {
    console.error('[saveEnabledOptionalSections] Error deleting existing enabled sections:', deleteError);
    throw deleteError;
  }

  // Insert new enabled sections
  if (enabledSections.length > 0) {
    const sectionsToInsert = enabledSections.map(sectionName => ({
      metric_set_id: metricSetId,
      section_name: sectionName,
    }));

    const { error } = await supabase
      .from('target_metric_set_enabled_sections')
      .insert(sectionsToInsert);

    if (error) {
      console.error('[saveEnabledOptionalSections] Error saving enabled sections:', error);
      throw error;
    }
  }

  console.log('[saveEnabledOptionalSections] Successfully saved enabled sections');
};

// Helper function to get enabled optional sections
const getEnabledOptionalSections = async (metricSetId: string): Promise<string[]> => {
  console.log('[getEnabledOptionalSections] Fetching enabled sections for metric set:', metricSetId);
  
  const { data, error } = await supabase
    .from('target_metric_set_enabled_sections')
    .select('section_name')
    .eq('metric_set_id', metricSetId);

  if (error) {
    console.error('[getEnabledOptionalSections] Error fetching enabled sections:', error);
    return []; // Return empty array as fallback
  }

  const sections = data?.map(row => row.section_name) || [];
  console.log('[getEnabledOptionalSections] Found enabled sections:', sections);
  return sections;
};

// Helper function to infer enabled sections from metrics (for legacy metric sets)
const inferEnabledSectionsFromMetrics = (metrics: any[]): string[] => {
  const categoriesInMetrics = [...new Set(metrics.map(metric => metric.category))];
  const enabledSections: string[] = [];
  
  // Check which optional categories have metrics
  OPTIONAL_METRIC_CATEGORIES.forEach(category => {
    if (categoriesInMetrics.includes(category)) {
      enabledSections.push(category);
    }
  });
  
  // Always include visitor profile if there are visitor profile metrics
  if (categoriesInMetrics.includes(VISITOR_PROFILE_CATEGORY)) {
    enabledSections.push(VISITOR_PROFILE_CATEGORY);
  }
  
  console.log('[inferEnabledSectionsFromMetrics] Inferred sections:', enabledSections);
  return enabledSections;
};

export const getTargetMetricSetById = async (id: string, userId: string): Promise<TargetMetricSet | null> => {
  console.log('=== ENHANCED DEBUG: getTargetMetricSetById ===');
  console.log('[getTargetMetricSetById] Starting enhanced fetch - ID:', id, 'User ID:', userId);
  
  // First get the target metric set
  const { data: metricSetData, error: metricSetError } = await supabase
    .from('target_metric_sets')
    .select('*')
    .eq('id', id)
    .single();

  if (metricSetError) {
    console.error('[getTargetMetricSetById] Error fetching target metric set:', metricSetError);
    console.error('[getTargetMetricSetById] Error details:', {
      message: metricSetError.message,
      details: metricSetError.details,
      hint: metricSetError.hint,
      code: metricSetError.code
    });
    return null;
  }

  if (!metricSetData) {
    console.error('[getTargetMetricSetById] No metric set found with id:', id);
    return null;
  }

  console.log('[getTargetMetricSetById] Retrieved metric set:', {
    metricSetId: metricSetData.id,
    metricSetName: metricSetData.name,
    accountId: metricSetData.account_id,
    hasEnabledSectionsData: metricSetData.has_enabled_sections_data,
    createdAt: metricSetData.created_at,
    updatedAt: metricSetData.updated_at
  });

  // Now get the user's custom metrics settings for this metric set
  console.log('[getTargetMetricSetById] Querying user_custom_metrics_settings with:', {
    metric_set_id: id,
    user_id: userId
  });

  const { data: userMetrics, error: userMetricsError } = await supabase
    .from('user_custom_metrics_settings')
    .select('*')
    .eq('metric_set_id', id)
    .eq('user_id', userId);

  if (userMetricsError) {
    console.error('[getTargetMetricSetById] Error fetching user custom metrics settings:', userMetricsError);
    console.error('[getTargetMetricSetById] Error details:', {
      message: userMetricsError.message,
      details: userMetricsError.details,
      hint: userMetricsError.hint,
      code: userMetricsError.code
    });
    // Continue with empty array rather than failing completely
  }

  const userCustomMetricsSettings = userMetrics || [];

  console.log('[getTargetMetricSetById] User metrics query result:', {
    settingsCount: userCustomMetricsSettings.length,
    hasSettings: userCustomMetricsSettings.length > 0,
    queryParams: { metric_set_id: id, user_id: userId }
  });

  // Log detailed information about each metric setting
  if (userCustomMetricsSettings.length > 0) {
    console.log('[getTargetMetricSetById] Detailed metrics analysis:');
    userCustomMetricsSettings.forEach((setting, index) => {
      console.log(`  Metric ${index + 1}:`, {
        id: setting.id,
        metric_identifier: setting.metric_identifier,
        label: setting.label,
        category: setting.category,
        target_value: setting.target_value,
        higher_is_better: setting.higher_is_better,
        measurement_type: setting.measurement_type,
        user_id: setting.user_id,
        account_id: setting.account_id,
        metric_set_id: setting.metric_set_id,
        created_at: setting.created_at,
        updated_at: setting.updated_at
      });
    });
  } else {
    console.warn('[getTargetMetricSetById] No user_custom_metrics_settings found for metric set and user combination.');
    console.warn('[getTargetMetricSetById] This may indicate:');
    console.warn('  1. The metric set needs to be repaired');
    console.warn('  2. The user needs to be assigned metrics');
    console.warn('  3. There\'s a data integrity issue');
    
    // Let's also check if there are ANY metrics for this metric set with any user
    const { data: anyMetrics, error: anyMetricsError } = await supabase
      .from('user_custom_metrics_settings')
      .select('user_id, metric_identifier, label, category')
      .eq('metric_set_id', id)
      .limit(10);
    
    console.log('[getTargetMetricSetById] Any metrics for this metric set:', {
      found: anyMetrics?.length || 0,
      data: anyMetrics,
      error: anyMetricsError
    });

    // Check if there are metrics for this user but different metric set
    const { data: userMetricsOtherSets, error: userMetricsOtherSetsError } = await supabase
      .from('user_custom_metrics_settings')
      .select('metric_set_id, metric_identifier, label, category')
      .eq('user_id', userId)
      .limit(10);
    
    console.log('[getTargetMetricSetById] User metrics in other sets:', {
      found: userMetricsOtherSets?.length || 0,
      data: userMetricsOtherSets,
      error: userMetricsOtherSetsError
    });
  }

  // Get enabled optional sections
  let enabledSections = await getEnabledOptionalSections(metricSetData.id);
  
  // For legacy metric sets (has_enabled_sections_data = false), infer sections from metrics if no explicit sections are stored
  if (!metricSetData.has_enabled_sections_data && enabledSections.length === 0 && userCustomMetricsSettings.length > 0) {
    console.log('[getTargetMetricSetById] Legacy metric set - inferring enabled sections from metrics');
    const inferredSections = inferEnabledSectionsFromMetrics(userCustomMetricsSettings);
    enabledSections = inferredSections;
  }

  const finalResult = {
    id: metricSetData.id,
    account_id: metricSetData.account_id,
    name: metricSetData.name,
    created_at: metricSetData.created_at,
    updated_at: metricSetData.updated_at,
    has_enabled_sections_data: metricSetData.has_enabled_sections_data,
    user_custom_metrics_settings: userCustomMetricsSettings,
    enabled_optional_sections: enabledSections
  };

  console.log('[getTargetMetricSetById] Final result being returned:', {
    id: finalResult.id,
    name: finalResult.name,
    settingsCount: finalResult.user_custom_metrics_settings.length,
    enabledSectionsCount: finalResult.enabled_optional_sections.length,
    enabledSections: finalResult.enabled_optional_sections,
    hasEnabledSectionsData: finalResult.has_enabled_sections_data,
    firstFewSettings: finalResult.user_custom_metrics_settings.slice(0, 3).map(s => ({
      id: s.id,
      metric_identifier: s.metric_identifier,
      label: s.label,
      category: s.category
    }))
  });
  
  return finalResult;
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
  
  // Process each metric set to include the has_enabled_sections_data field
  return (data || []).map(metricSet => ({
    ...metricSet,
    has_enabled_sections_data: metricSet.has_enabled_sections_data ?? false, // Default to false for backward compatibility
  }));
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
      has_enabled_sections_data: true, // New metric sets have explicit section data
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
