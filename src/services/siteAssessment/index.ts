// Enhanced site assessment service with validation and population features
export * from './crudOperations';
export * from './siteVisitRatings';
export * from './metricValues';
export * from './scoring';
export * from './summary';
export * from './types';
export * from './validationAndPopulation';

import { SiteAssessment, SiteAssessmentInsert, AssessmentMetricValueInsert, AssessmentSiteVisitRatingInsert, SiteAssessmentWithTargets, AssessmentMetricValueWithTargets } from '@/types/siteAssessmentTypes';
import { 
  createSiteAssessmentInDb, 
  updateSiteAssessmentInDb, 
  deleteSiteAssessmentFromDb, 
  getSiteAssessmentFromDb, 
  getSiteAssessmentsFromDb,
  updateSiteStatusInDb
} from './crudOperations';
import { saveAssessmentMetricValues, getAssessmentMetricValues, getAssessmentMetricValuesWithTargets } from './metricValues';
import { saveSiteVisitRatings, getSiteVisitRatings } from './siteVisitRatings';
import { updateAssessmentScores as updateScores } from './scoring';
import { generateExecutiveSummaryForAssessment, updateSiteAssessmentSummary } from './summary';
import { ensureAllMetricsPopulated, repairAssessmentDataIntegrity } from './validationAndPopulation';
import { supabase } from '@/integrations/supabase/client';

export const createSiteAssessmentEnhanced = async (
  assessmentData: Omit<SiteAssessmentInsert, 'user_id' | 'account_id' | 'target_metric_set_id'>,
  userId: string,
  targetMetricSetId?: string
): Promise<SiteAssessment> => {
  try {
    const assessment = await createSiteAssessmentInDb(assessmentData, userId);
    
    // If a target metric set is provided, ensure all metrics are populated
    if (targetMetricSetId) {
      console.log('[createSiteAssessmentEnhanced] Populating metrics for new assessment');
      await ensureAllMetricsPopulated(assessment.id, targetMetricSetId, userId);
    }
    
    return assessment;
  } catch (error) {
    console.error('Error creating enhanced site assessment:', error);
    throw error;
  }
};

export const getAssessmentDetailsEnhanced = async (assessmentId: string): Promise<SiteAssessmentWithTargets> => {
  try {
    // Check authentication first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authentication required to fetch assessment details');
    }

    const assessment = await getSiteAssessmentFromDb(assessmentId);
    
    // Get enhanced metric values with targets merged
    let enhancedMetricValues: AssessmentMetricValueWithTargets[] = [];
    
    if (assessment.target_metric_set_id) {
      console.log('[getAssessmentDetailsEnhanced] Merging target values for metric set:', assessment.target_metric_set_id);
      
      // Get existing metric values
      const existingValues = await getAssessmentMetricValues(assessmentId);
      
      // Get target settings
      const { getUserCustomMetricSettings } = await import('@/services/targetMetricsService');
      const targetSettings = await getUserCustomMetricSettings(assessment.target_metric_set_id);
      
      // Create map of target data
      const targetMap = new Map();
      targetSettings.forEach(setting => {
        targetMap.set(setting.metric_identifier, {
          target_value: setting.target_value,
          higher_is_better: setting.higher_is_better,
          measurement_type: setting.measurement_type
        });
      });
      
      // Merge existing values with target data
      enhancedMetricValues = existingValues.map(value => {
        const targetData = targetMap.get(value.metric_identifier);
        return {
          ...value,
          target_value: targetData?.target_value,
          higher_is_better: targetData?.higher_is_better,
          measurement_type: targetData?.measurement_type || value.measurement_type
        };
      });
      
      console.log('[getAssessmentDetailsEnhanced] Enhanced metric values with targets:', {
        existingCount: existingValues.length,
        targetCount: targetSettings.length,
        enhancedCount: enhancedMetricValues.length,
        hasTargetValues: enhancedMetricValues.some(m => m.target_value !== undefined)
      });
    } else {
      // Just get regular metric values if no target set
      const regularValues = await getAssessmentMetricValues(assessmentId);
      enhancedMetricValues = regularValues.map(value => ({
        ...value,
        target_value: undefined,
        higher_is_better: undefined
      }));
    }
    
    const siteVisitRatings = await getSiteVisitRatings(assessmentId);

    const result: SiteAssessmentWithTargets = {
      ...assessment,
      assessment_metric_values: enhancedMetricValues,
      site_visit_ratings: siteVisitRatings,
    };

    console.log('[getAssessmentDetailsEnhanced] Enhanced assessment prepared:', {
      assessmentId,
      metricValuesCount: enhancedMetricValues.length,
      siteVisitRatingsCount: siteVisitRatings.length,
      hasTargetValues: enhancedMetricValues.some(m => m.target_value !== undefined)
    });

    return result;
  } catch (error) {
    console.error('Error getting enhanced assessment details:', error);
    throw error;
  }
};

// Export enhanced functions alongside existing ones
export { 
  ensureAllMetricsPopulated, 
  repairAssessmentDataIntegrity,
  getAssessmentMetricValuesWithTargets
};