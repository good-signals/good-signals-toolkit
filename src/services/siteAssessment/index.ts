// Enhanced site assessment service with validation and population features
export * from './crudOperations';
export * from './siteVisitRatings';
export * from './metricValues';
export * from './scoring';
export * from './summary';
export * from './types';
export * from './validationAndPopulation';

import { SiteAssessment, SiteAssessmentInsert, AssessmentMetricValueInsert, AssessmentSiteVisitRatingInsert } from '@/types/siteAssessmentTypes';
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

export const getAssessmentDetailsEnhanced = async (assessmentId: string): Promise<SiteAssessment> => {
  try {
    // Check authentication first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authentication required to fetch assessment details');
    }

    const assessment = await getSiteAssessmentFromDb(assessmentId);
    
    // Get metric values with targets if target metric set is available
    let metricValues;
    if (assessment.target_metric_set_id) {
      try {
        metricValues = await getAssessmentMetricValuesWithTargets(
          assessmentId, 
          assessment.target_metric_set_id, 
          user.id
        );
        console.log('[getAssessmentDetailsEnhanced] Using enhanced metric values with targets');
      } catch (error) {
        console.warn('[getAssessmentDetailsEnhanced] Failed to get enhanced metric values, falling back to basic:', error);
        metricValues = await getAssessmentMetricValues(assessmentId);
      }
    } else {
      metricValues = await getAssessmentMetricValues(assessmentId);
    }
    
    const siteVisitRatings = await getSiteVisitRatings(assessmentId);

    return {
      ...assessment,
      assessment_metric_values: metricValues,
      site_visit_ratings: siteVisitRatings,
    };
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