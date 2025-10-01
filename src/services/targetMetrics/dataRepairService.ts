import { supabase } from '@/integrations/supabase/client';
import { predefinedMetricsConfig } from '@/config/targetMetricsConfig';
import { recalculateAssessmentScoresForMetricSet } from '../assessmentRecalculationService';

/**
 * One-time repair function to fix misaligned target values in a metric set
 * Corrects the traffic metrics for the Seattle - Direct Competitor Proxy set
 */
export async function repairSeattleMetricSetTargetValues(
  metricSetId: string = 'f62105e6-7082-4d30-a453-0d3fb4bdf226',
  userId: string
): Promise<{ success: boolean; message: string }> {
  console.log('[repairSeattleMetricSetTargetValues] Starting repair for metric set:', metricSetId);

  try {
    // Correct target values for traffic metrics
    const correctTargetValues = [
      { metric_identifier: 'traffic_unique_visitors', target_value: 1700000 },
      { metric_identifier: 'traffic_visit_frequency', target_value: 6.11 },
      { metric_identifier: 'traffic_dwell_time', target_value: 139 },
    ];

    // Update each metric's target value
    for (const correction of correctTargetValues) {
      const { error } = await supabase
        .from('user_custom_metrics_settings')
        .update({ target_value: correction.target_value })
        .eq('metric_set_id', metricSetId)
        .eq('user_id', userId)
        .eq('metric_identifier', correction.metric_identifier);

      if (error) {
        console.error(`[repairSeattleMetricSetTargetValues] Error updating ${correction.metric_identifier}:`, error);
        throw error;
      }

      console.log(`[repairSeattleMetricSetTargetValues] Updated ${correction.metric_identifier} to ${correction.target_value}`);
    }

    // Trigger assessment recalculation
    console.log('[repairSeattleMetricSetTargetValues] Triggering assessment recalculation');
    const recalcResult = await recalculateAssessmentScoresForMetricSet(metricSetId, userId);

    console.log('[repairSeattleMetricSetTargetValues] Repair complete:', recalcResult);

    return {
      success: true,
      message: `Repaired ${correctTargetValues.length} metrics and recalculated ${recalcResult.updated} assessments`,
    };
  } catch (error) {
    console.error('[repairSeattleMetricSetTargetValues] Repair failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error during repair',
    };
  }
}

/**
 * Sort predefined metrics according to their canonical order in predefinedMetricsConfig
 * This ensures consistent ordering when saving to prevent value misalignment
 */
export function sortPredefinedMetricsByCanonicalOrder<T extends { metric_identifier: string }>(
  metrics: T[]
): T[] {
  return [...metrics].sort((a, b) => {
    const indexA = predefinedMetricsConfig.findIndex(c => c.metric_identifier === a.metric_identifier);
    const indexB = predefinedMetricsConfig.findIndex(c => c.metric_identifier === b.metric_identifier);
    
    // If a metric isn't found in config, put it at the end
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    
    return indexA - indexB;
  });
}
