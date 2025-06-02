
import { supabase } from '@/integrations/supabase/client';
import { copyStandardMetricSetToAccount, getStandardMetricSets, getStandardMetricSettings } from '../standardMetricsService';
import { getTargetMetricSetById } from '../targetMetricsService';

/**
 * Repairs a target metric set that has no associated user_custom_metrics_settings
 * by attempting to import from the most recent standard metric set
 */
export const repairTargetMetricSet = async (
  targetMetricSetId: string, 
  userId: string, 
  accountId: string
) => {
  console.log('[repairTargetMetricSet] Starting repair for metric set:', targetMetricSetId);

  // First, verify the metric set actually needs repair
  const existingMetricSet = await getTargetMetricSetById(targetMetricSetId, userId);
  if (!existingMetricSet) {
    throw new Error('Target metric set not found');
  }

  if (existingMetricSet.user_custom_metrics_settings && existingMetricSet.user_custom_metrics_settings.length > 0) {
    console.log('[repairTargetMetricSet] Metric set already has settings, no repair needed');
    return existingMetricSet;
  }

  console.log('[repairTargetMetricSet] Metric set has no settings, attempting repair');

  // Get the most recent standard metric set
  const standardSets = await getStandardMetricSets();
  if (!standardSets || standardSets.length === 0) {
    throw new Error('No standard metric sets available for repair');
  }

  const defaultStandardSet = standardSets[0];
  console.log('[repairTargetMetricSet] Using standard set for repair:', defaultStandardSet.name);

  // Get the standard metric settings
  const standardSettings = await getStandardMetricSettings(defaultStandardSet.id);
  if (standardSettings.length === 0) {
    throw new Error('Selected standard metric set has no settings');
  }

  console.log('[repairTargetMetricSet] Found standard settings to copy:', standardSettings.length);

  // Copy the settings to user_custom_metrics_settings for this metric set
  const userSettingsToInsert = standardSettings.map(setting => ({
    user_id: userId,
    account_id: accountId,
    metric_set_id: targetMetricSetId,
    metric_identifier: setting.metric_identifier,
    label: setting.label,
    category: setting.category,
    target_value: setting.target_value,
    higher_is_better: setting.higher_is_better,
    measurement_type: setting.measurement_type,
  }));

  const { error: insertError } = await supabase
    .from('user_custom_metrics_settings')
    .insert(userSettingsToInsert);

  if (insertError) {
    console.error('[repairTargetMetricSet] Error inserting repair settings:', insertError);
    throw insertError;
  }

  console.log('[repairTargetMetricSet] Successfully repaired metric set with', userSettingsToInsert.length, 'settings');

  // Fetch and return the repaired metric set
  const repairedMetricSet = await getTargetMetricSetById(targetMetricSetId, userId);
  return repairedMetricSet;
};

/**
 * Checks if a target metric set needs repair (has no user_custom_metrics_settings)
 */
export const checkIfMetricSetNeedsRepair = async (targetMetricSetId: string, userId: string) => {
  const metricSet = await getTargetMetricSetById(targetMetricSetId, userId);
  return metricSet && (!metricSet.user_custom_metrics_settings || metricSet.user_custom_metrics_settings.length === 0);
};
