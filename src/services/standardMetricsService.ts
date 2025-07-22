
import { supabase } from '@/integrations/supabase/client';
import { 
  StandardTargetMetricSet, 
  StandardTargetMetricSetting,
  CreateStandardMetricSetData,
  StandardMetricsFormData 
} from '@/types/standardMetrics';

export const getStandardMetricSets = async (): Promise<StandardTargetMetricSet[]> => {
  const { data, error } = await supabase
    .from('standard_target_metric_sets')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching standard metric sets:', error);
    throw error;
  }
  
  return data || [];
};

export const getStandardMetricSetById = async (id: string): Promise<StandardTargetMetricSet | null> => {
  const { data, error } = await supabase
    .from('standard_target_metric_sets')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching standard metric set:', error);
    return null;
  }
  
  return data;
};

export const getStandardMetricSettings = async (metricSetId: string): Promise<StandardTargetMetricSetting[]> => {
  const { data, error } = await supabase
    .from('standard_target_metric_settings')
    .select('*')
    .eq('metric_set_id', metricSetId);
  
  if (error) {
    console.error('Error fetching standard metric settings:', error);
    return [];
  }
  
  return data || [];
};

// Helper function to save enabled optional sections for standard sets
const saveStandardEnabledOptionalSections = async (metricSetId: string, enabledSections: string[]) => {
  console.log('[saveStandardEnabledOptionalSections] Saving enabled sections for standard metric set:', metricSetId, enabledSections);
  
  // First delete existing enabled sections for this metric set
  const { error: deleteError } = await supabase
    .from('standard_target_metric_set_enabled_sections')
    .delete()
    .eq('metric_set_id', metricSetId);

  if (deleteError) {
    console.error('[saveStandardEnabledOptionalSections] Error deleting existing enabled sections:', deleteError);
    throw deleteError;
  }

  // Insert new enabled sections
  if (enabledSections.length > 0) {
    const sectionsToInsert = enabledSections.map(sectionName => ({
      metric_set_id: metricSetId,
      section_name: sectionName,
    }));

    const { error } = await supabase
      .from('standard_target_metric_set_enabled_sections')
      .insert(sectionsToInsert);

    if (error) {
      console.error('[saveStandardEnabledOptionalSections] Error saving enabled sections:', error);
      throw error;
    }
  }

  console.log('[saveStandardEnabledOptionalSections] Successfully saved enabled sections');
};

// Helper function to get enabled optional sections for standard sets
const getStandardEnabledOptionalSections = async (metricSetId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('standard_target_metric_set_enabled_sections')
    .select('section_name')
    .eq('metric_set_id', metricSetId);

  if (error) {
    console.error('[getStandardEnabledOptionalSections] Error fetching enabled sections:', error);
    return []; // Return empty array as fallback
  }

  return data?.map(row => row.section_name) || [];
};

// Helper function to infer enabled sections from existing metrics for standard sets
const inferStandardEnabledSectionsFromMetrics = (metrics: StandardTargetMetricSetting[]): string[] => {
  const categories = new Set<string>();
  
  // Extract unique categories from metrics
  metrics.forEach(metric => {
    if (metric.category) {
      categories.add(metric.category);
    }
  });

  return Array.from(categories);
};

export const getStandardMetricSetWithSettings = async (id: string): Promise<{
  metricSet: StandardTargetMetricSet | null;
  settings: StandardTargetMetricSetting[];
  enabledSections: string[];
}> => {
  console.log('[getStandardMetricSetWithSettings] Fetching standard metric set:', id);
  
  // Get the metric set
  const metricSet = await getStandardMetricSetById(id);
  
  if (!metricSet) {
    return { metricSet: null, settings: [], enabledSections: [] };
  }

  // Get the settings
  const settings = await getStandardMetricSettings(id);
  
  // Get enabled optional sections from database
  let enabledSections = await getStandardEnabledOptionalSections(id);
  
  // If no enabled sections found in database but we have metrics, infer from existing metrics
  if (enabledSections.length === 0 && settings.length > 0) {
    console.log('[getStandardMetricSetWithSettings] No enabled sections found, inferring from existing metrics');
    const inferredSections = inferStandardEnabledSectionsFromMetrics(settings);
    enabledSections = inferredSections;
    console.log('[getStandardMetricSetWithSettings] Inferred enabled sections:', inferredSections);
  }
  
  console.log('[getStandardMetricSetWithSettings] Retrieved standard metric set with settings:', {
    metricSetId: metricSet.id,
    metricSetName: metricSet.name,
    settingsCount: settings.length,
    enabledSections: enabledSections
  });

  return { metricSet, settings, enabledSections };
};

export const createStandardMetricSet = async (data: CreateStandardMetricSetData): Promise<StandardTargetMetricSet> => {
  const { data: result, error } = await supabase
    .from('standard_target_metric_sets')
    .insert({
      name: data.name,
      description: data.description,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating standard metric set:', error);
    throw error;
  }

  return result;
};

export const updateStandardMetricSetName = async (setId: string, name: string, description?: string) => {
  const updateData: any = { name };
  if (description !== undefined) {
    updateData.description = description;
  }

  const { data, error } = await supabase
    .from('standard_target_metric_sets')
    .update(updateData)
    .eq('id', setId)
    .select()
    .single();

  if (error) {
    console.error('Error updating standard metric set:', error);
    throw error;
  }

  return data;
};

export const deleteStandardMetricSet = async (setId: string) => {
  const { error } = await supabase
    .from('standard_target_metric_sets')
    .delete()
    .eq('id', setId);

  if (error) {
    console.error('Error deleting standard metric set:', error);
    throw error;
  }

  return true;
};

export const saveStandardMetricSettings = async (metricSetId: string, formData: StandardMetricsFormData) => {
  // First delete existing settings for this metric set
  await supabase
    .from('standard_target_metric_settings')
    .delete()
    .eq('metric_set_id', metricSetId);

  // Save enabled optional sections
  await saveStandardEnabledOptionalSections(metricSetId, formData.enabled_optional_sections || []);

  // Prepare all metrics to insert
  const metricsToInsert = [];

  // Add predefined metrics
  formData.predefined_metrics.forEach(metric => {
    metricsToInsert.push({
      metric_set_id: metricSetId,
      metric_identifier: metric.metric_identifier,
      label: metric.label,
      category: metric.category,
      target_value: metric.target_value,
      higher_is_better: metric.higher_is_better,
      is_custom: false,
    });
  });

  // Add custom metrics
  formData.custom_metrics.forEach(metric => {
    metricsToInsert.push({
      metric_set_id: metricSetId,
      metric_identifier: metric.metric_identifier,
      label: metric.label,
      category: metric.category,
      target_value: metric.target_value,
      higher_is_better: metric.higher_is_better,
      units: metric.units,
      is_custom: true,
    });
  });

  // Add visitor profile metrics
  formData.visitor_profile_metrics.forEach(metric => {
    metricsToInsert.push({
      metric_set_id: metricSetId,
      metric_identifier: metric.metric_identifier,
      label: metric.label,
      category: metric.category,
      target_value: metric.target_value,
      higher_is_better: metric.higher_is_better,
      measurement_type: metric.measurement_type,
      is_custom: false,
    });
  });

  // Insert all metrics
  if (metricsToInsert.length > 0) {
    const { error } = await supabase
      .from('standard_target_metric_settings')
      .insert(metricsToInsert);

    if (error) {
      console.error('Error saving standard metric settings:', error);
      throw error;
    }
  }

  return { success: true };
};

// Enhanced function to copy a standard metric set to an account's target metric sets
export const copyStandardMetricSetToAccount = async (
  standardSetId: string, 
  accountId: string, 
  userId: string,
  newName?: string
) => {
  console.log('[copyStandardMetricSetToAccount] Starting copy process:', {
    standardSetId,
    accountId,
    userId,
    newName
  });

  // Get the standard metric set with settings and enabled sections
  const { metricSet: standardSet, settings: standardSettings, enabledSections } = await getStandardMetricSetWithSettings(standardSetId);
  
  if (!standardSet) {
    throw new Error('Standard metric set not found');
  }

  console.log('[copyStandardMetricSetToAccount] Found standard set:', standardSet.name);
  console.log('[copyStandardMetricSetToAccount] Found standard settings:', standardSettings.length);
  console.log('[copyStandardMetricSetToAccount] Found enabled sections:', enabledSections);

  if (standardSettings.length === 0) {
    throw new Error('No standard metric settings found for this set');
  }

  // Create a new target metric set for the account
  const { data: newTargetSet, error: createError } = await supabase
    .from('target_metric_sets')
    .insert({
      name: newName || `${standardSet.name} (Copy)`,
      account_id: accountId,
      has_enabled_sections_data: true, // Copied sets have explicit section data
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating target metric set from standard:', createError);
    throw createError;
  }

  console.log('[copyStandardMetricSetToAccount] Created new target set:', newTargetSet.id);

  // Copy the enabled sections to target_metric_set_enabled_sections
  if (enabledSections.length > 0) {
    const sectionsToInsert = enabledSections.map(sectionName => ({
      metric_set_id: newTargetSet.id,
      section_name: sectionName,
    }));

    const { error: sectionsError } = await supabase
      .from('target_metric_set_enabled_sections')
      .insert(sectionsToInsert);

    if (sectionsError) {
      console.error('Error copying enabled sections:', sectionsError);
      // Clean up the target set if sections insert fails
      await supabase
        .from('target_metric_sets')
        .delete()
        .eq('id', newTargetSet.id);
      throw sectionsError;
    }
  }

  // Copy the settings to user_custom_metrics_settings
  const userSettingsToInsert = standardSettings.map(setting => ({
    user_id: userId,
    account_id: accountId,
    metric_set_id: newTargetSet.id,
    metric_identifier: setting.metric_identifier,
    label: setting.label,
    category: setting.category,
    target_value: setting.target_value,
    higher_is_better: setting.higher_is_better,
    measurement_type: setting.measurement_type,
  }));

  console.log('[copyStandardMetricSetToAccount] Inserting user settings:', userSettingsToInsert.length);

  if (userSettingsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('user_custom_metrics_settings')
      .insert(userSettingsToInsert);

    if (insertError) {
      console.error('Error copying standard settings to user settings:', insertError);
      // If user settings insert fails, clean up the target set
      await supabase
        .from('target_metric_sets')
        .delete()
        .eq('id', newTargetSet.id);
      throw insertError;
    }
  }

  console.log(`[copyStandardMetricSetToAccount] Successfully copied ${userSettingsToInsert.length} metrics and ${enabledSections.length} enabled sections from standard set "${standardSet.name}" to user account`);
  
  // Return the new target set with a properly typed structure
  return {
    ...newTargetSet,
    user_custom_metrics_settings: userSettingsToInsert.map(setting => ({
      ...setting,
      id: '', // Will be generated by DB
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })),
    enabled_optional_sections: enabledSections
  };
};
