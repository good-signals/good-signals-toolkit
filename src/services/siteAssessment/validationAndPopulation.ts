import { supabase } from '@/integrations/supabase/client';
import { 
  AssessmentMetricValue,
  AssessmentMetricValueInsert,
  SiteAssessment
} from '@/types/siteAssessmentTypes';
import { saveAssessmentMetricValues } from './metricValues';

/**
 * Ensures all target metrics have corresponding assessment metric values
 * Creates placeholder entries for missing metrics
 */
export const ensureAllMetricsPopulated = async (
  assessmentId: string,
  targetMetricSetId: string,
  userId: string
): Promise<void> => {
  console.log('[ensureAllMetricsPopulated] Starting population check for assessment:', assessmentId);

  try {
    // Get target metric set configuration
    const { getUserCustomMetricSettings } = await import('@/services/targetMetricsService');
    const targetSettings = await getUserCustomMetricSettings(targetMetricSetId);

    // Get existing assessment metric values
    const { getAssessmentMetricValues } = await import('./metricValues');
    const existingValues = await getAssessmentMetricValues(assessmentId);

    // Create map of existing metrics by identifier
    const existingMetricsMap = new Map<string, AssessmentMetricValue>();
    existingValues.forEach(metric => {
      existingMetricsMap.set(metric.metric_identifier, metric);
    });

    // Find missing metrics
    const missingMetrics: AssessmentMetricValueInsert[] = [];
    targetSettings.forEach(setting => {
      if (!existingMetricsMap.has(setting.metric_identifier)) {
        missingMetrics.push({
          assessment_id: assessmentId,
          metric_identifier: setting.metric_identifier,
          category: setting.category,
          label: setting.label,
          entered_value: null,
          notes: null,
          measurement_type: setting.measurement_type || null,
          image_url: null
        });
      }
    });

    if (missingMetrics.length > 0) {
      console.log('[ensureAllMetricsPopulated] Creating placeholder entries for', missingMetrics.length, 'missing metrics');
      await saveAssessmentMetricValues(assessmentId, missingMetrics);
      console.log('[ensureAllMetricsPopulated] Successfully created placeholder metric entries');
    } else {
      console.log('[ensureAllMetricsPopulated] All metrics already have entries');
    }
  } catch (error) {
    console.error('[ensureAllMetricsPopulated] Error ensuring metrics populated:', error);
    // Don't throw - this is a helper function that shouldn't break the main flow
  }
};

/**
 * Validates that a site assessment has the required data for proper display
 */
export const validateAssessmentCompleteness = (assessment: SiteAssessment): {
  hasTargetMetricSet: boolean;
  hasMetricValues: boolean;
  hasSiteVisitRatings: boolean;
  missingRequiredData: string[];
} => {
  const validation = {
    hasTargetMetricSet: !!assessment.target_metric_set_id,
    hasMetricValues: !!(assessment.assessment_metric_values && assessment.assessment_metric_values.length > 0),
    hasSiteVisitRatings: !!(assessment.site_visit_ratings && assessment.site_visit_ratings.length > 0),
    missingRequiredData: [] as string[]
  };

  if (!validation.hasTargetMetricSet) {
    validation.missingRequiredData.push('Target Metric Set');
  }
  
  if (!validation.hasMetricValues) {
    validation.missingRequiredData.push('Metric Values');
  }

  return validation;
};

/**
 * Repairs assessment data integrity by ensuring all required data is present
 */
export const repairAssessmentDataIntegrity = async (
  assessmentId: string,
  userId: string
): Promise<{ success: boolean; repairsApplied: string[] }> => {
  console.log('[repairAssessmentDataIntegrity] Starting integrity repair for assessment:', assessmentId);
  
  const repairsApplied: string[] = [];

  try {
    // Get the assessment
    const { getSiteAssessmentFromDb } = await import('./crudOperations');
    const assessment = await getSiteAssessmentFromDb(assessmentId);

    if (!assessment.target_metric_set_id) {
      console.log('[repairAssessmentDataIntegrity] Cannot repair - no target metric set assigned');
      return { success: false, repairsApplied };
    }

    // Ensure all metrics are populated
    await ensureAllMetricsPopulated(assessmentId, assessment.target_metric_set_id, userId);
    repairsApplied.push('Populated missing metric entries');

    console.log('[repairAssessmentDataIntegrity] Repairs completed:', repairsApplied);
    return { success: true, repairsApplied };

  } catch (error) {
    console.error('[repairAssessmentDataIntegrity] Error during repair:', error);
    return { success: false, repairsApplied };
  }
};