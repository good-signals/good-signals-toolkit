
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { 
  StandardTargetMetricSet, 
  StandardTargetMetricSetting,
  StandardTargetMetricSetSchema,
  StandardTargetMetricSettingSchema,
  CreateStandardMetricSetData
} from '@/types/standardMetrics';
import { TargetMetricsFormData } from '@/types/targetMetrics';

// Get all standard metric sets (visible to all users)
export async function getStandardTargetMetricSets(): Promise<StandardTargetMetricSet[]> {
  const { data, error } = await supabase
    .from('standard_target_metric_sets')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching standard target metric sets:', error);
    throw error;
  }
  
  return z.array(StandardTargetMetricSetSchema).parse(data || []);
}

// Get a specific standard metric set with its settings
export async function getStandardTargetMetricSetById(setId: string): Promise<StandardTargetMetricSet & { settings: StandardTargetMetricSetting[] }> {
  const { data: setData, error: setError } = await supabase
    .from('standard_target_metric_sets')
    .select('*')
    .eq('id', setId)
    .single();

  if (setError) {
    console.error('Error fetching standard metric set:', setError);
    throw setError;
  }

  const { data: settingsData, error: settingsError } = await supabase
    .from('standard_target_metric_settings')
    .select('*')
    .eq('standard_set_id', setId);

  if (settingsError) {
    console.error('Error fetching standard metric settings:', settingsError);
    throw settingsError;
  }

  const parsedSet = StandardTargetMetricSetSchema.parse(setData);
  const parsedSettings = z.array(StandardTargetMetricSettingSchema).parse(settingsData || []);

  return {
    ...parsedSet,
    settings: parsedSettings,
  };
}

// Create a new standard metric set (super admin only)
export async function createStandardTargetMetricSet(userId: string, data: CreateStandardMetricSetData): Promise<StandardTargetMetricSet> {
  const { data: newSet, error } = await supabase
    .from('standard_target_metric_sets')
    .insert({
      name: data.name,
      description: data.description,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating standard target metric set:', error);
    throw error;
  }

  return StandardTargetMetricSetSchema.parse(newSet);
}

// Save standard metric settings (super admin only)
export async function saveStandardTargetMetricSettings(
  userId: string,
  standardSetId: string,
  formData: TargetMetricsFormData
): Promise<StandardTargetMetricSetting[]> {
  const settingsToUpsert = [];

  // Handle predefined metrics
  formData.predefined_metrics.forEach(metric => {
    settingsToUpsert.push({
      standard_set_id: standardSetId,
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
    settingsToUpsert.push({
      standard_set_id: standardSetId,
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
    settingsToUpsert.push({
      standard_set_id: standardSetId,
      metric_identifier: metric.metric_identifier || `vp_${metric.label.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      category: metric.category,
      label: metric.label,
      target_value: metric.target_value,
      measurement_type: metric.measurement_type,
      higher_is_better: metric.higher_is_better,
    });
  });

  const { data, error } = await supabase
    .from('standard_target_metric_settings')
    .upsert(settingsToUpsert, { 
      onConflict: 'standard_set_id, metric_identifier', 
      defaultToNull: false 
    })
    .select();

  if (error) {
    console.error('Error saving standard target metric settings:', error);
    throw error;
  }

  return z.array(StandardTargetMetricSettingSchema).parse(data || []);
}

// Delete a standard metric set (super admin only)
export async function deleteStandardTargetMetricSet(setId: string): Promise<void> {
  const { error } = await supabase
    .from('standard_target_metric_sets')
    .delete()
    .eq('id', setId);

  if (error) {
    console.error('Error deleting standard target metric set:', error);
    throw error;
  }
}

// Clone a standard metric set to user's account
export async function cloneStandardMetricSet(
  userId: string, 
  standardSetId: string, 
  newName: string
): Promise<{ success: boolean; userMetricSetId?: string }> {
  try {
    // Get the standard set and its settings
    const standardSet = await getStandardTargetMetricSetById(standardSetId);
    
    // Import the necessary functions from existing services
    const { createTargetMetricSet, saveUserCustomMetricSettings } = await import('@/services/targetMetricsService');
    
    // Create a new user metric set
    const newUserSet = await createTargetMetricSet(userId, newName);
    
    // Convert standard settings to user metric format
    const formData = {
      metric_set_id: newUserSet.id,
      metric_set_name: newName,
      predefined_metrics: standardSet.settings
        .filter(s => s.category !== 'Visitor Profile')
        .map(setting => ({
          metric_identifier: setting.metric_identifier,
          label: setting.label,
          category: setting.category,
          target_value: setting.target_value,
          higher_is_better: setting.higher_is_better,
        })),
      custom_metrics: [],
      visitor_profile_metrics: standardSet.settings
        .filter(s => s.category === 'Visitor Profile')
        .map(setting => ({
          metric_identifier: setting.metric_identifier,
          label: setting.label,
          category: setting.category,
          target_value: setting.target_value,
          measurement_type: setting.measurement_type || 'Index',
          higher_is_better: setting.higher_is_better,
        })),
    };
    
    // Save the settings to the user's metric set
    await saveUserCustomMetricSettings(userId, newUserSet.id, formData);
    
    return { success: true, userMetricSetId: newUserSet.id };
  } catch (error) {
    console.error('Error cloning standard metric set:', error);
    return { success: false };
  }
}
