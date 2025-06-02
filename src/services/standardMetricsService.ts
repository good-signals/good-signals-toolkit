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

  // Get the standard metric set
  const standardSet = await getStandardMetricSetById(standardSetId);
  if (!standardSet) {
    throw new Error('Standard metric set not found');
  }

  console.log('[copyStandardMetricSetToAccount] Found standard set:', standardSet.name);

  // Get the standard metric settings
  const standardSettings = await getStandardMetricSettings(standardSetId);
  console.log('[copyStandardMetricSetToAccount] Found standard settings:', standardSettings.length);

  if (standardSettings.length === 0) {
    throw new Error('No standard metric settings found for this set');
  }

  // Create a new target metric set for the account
  const { data: newTargetSet, error: createError } = await supabase
    .from('target_metric_sets')
    .insert({
      name: newName || `${standardSet.name} (Copy)`,
      account_id: accountId,
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating target metric set from standard:', createError);
    throw createError;
  }

  console.log('[copyStandardMetricSetToAccount] Created new target set:', newTargetSet.id);

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

  console.log(`[copyStandardMetricSetToAccount] Successfully copied ${userSettingsToInsert.length} metrics from standard set "${standardSet.name}" to user account`);
  
  // Return the new target set with a properly typed structure
  return {
    ...newTargetSet,
    user_custom_metrics_settings: userSettingsToInsert.map(setting => ({
      ...setting,
      id: '', // Will be generated by DB
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
  };
};
