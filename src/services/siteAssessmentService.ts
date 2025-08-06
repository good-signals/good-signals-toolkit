
// Main service file that re-exports all functionality for backward compatibility
export * from './siteAssessment/crudOperations';
export * from './siteAssessment/siteVisitRatings';
export * from './siteAssessment/metricValues';
export * from './siteAssessment/scoring';
export * from './siteAssessment/summary';
export * from './siteAssessment/types';

import { SiteAssessment, SiteAssessmentInsert, AssessmentMetricValueInsert, AssessmentSiteVisitRatingInsert } from '@/types/siteAssessmentTypes';
import { 
  createSiteAssessmentInDb, 
  updateSiteAssessmentInDb, 
  deleteSiteAssessmentFromDb, 
  getSiteAssessmentFromDb, 
  getSiteAssessmentsFromDb,
  updateSiteStatusInDb
} from './siteAssessment/crudOperations';
import { saveAssessmentMetricValues, getAssessmentMetricValues } from './siteAssessment/metricValues';
import { saveSiteVisitRatings, getSiteVisitRatings } from './siteAssessment/siteVisitRatings';
import { updateAssessmentScores as updateScores } from './siteAssessment/scoring';
import { generateExecutiveSummaryForAssessment, updateSiteAssessmentSummary } from './siteAssessment/summary';
import { supabase } from '@/integrations/supabase/client';

export const createSiteAssessment = async (
  assessmentData: Omit<SiteAssessmentInsert, 'user_id' | 'account_id' | 'target_metric_set_id'>,
  userId: string
): Promise<SiteAssessment> => {
  try {
    return await createSiteAssessmentInDb(assessmentData, userId);
  } catch (error) {
    console.error('Error creating site assessment:', error);
    throw error;
  }
};

export const updateSiteAssessment = async (
  assessmentId: string,
  updates: { target_metric_set_id?: string; site_status?: string },
  userId: string
): Promise<SiteAssessment> => {
  try {
    return await updateSiteAssessmentInDb(assessmentId, updates, userId);
  } catch (error) {
    console.error('Error updating site assessment:', error);
    throw error;
  }
};

export const deleteSiteAssessment = async (
  assessmentId: string,
  userId: string
): Promise<void> => {
  try {
    return await deleteSiteAssessmentFromDb(assessmentId, userId);
  } catch (error) {
    console.error('Error deleting site assessment:', error);
    throw error;
  }
};

export const getSiteAssessmentsForUser = async (userId: string): Promise<SiteAssessment[]> => {
  try {
    return await getSiteAssessmentsFromDb(userId);
  } catch (error) {
    console.error('Error getting site assessments for user:', error);
    throw error;
  }
};

export const getAssessmentDetails = async (assessmentId: string): Promise<SiteAssessment> => {
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
        const { getAssessmentMetricValuesWithTargets } = await import('./siteAssessment/metricValues');
        metricValues = await getAssessmentMetricValuesWithTargets(
          assessmentId, 
          assessment.target_metric_set_id, 
          user.id
        );
        console.log('[getAssessmentDetails] Using enhanced metric values with targets');
      } catch (error) {
        console.warn('[getAssessmentDetails] Failed to get enhanced metric values, falling back to basic:', error);
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
    console.error('Error getting assessment details:', error);
    throw error;
  }
};

export const saveMetricValuesForAssessment = async (
  assessmentId: string,
  metricValues: AssessmentMetricValueInsert[]
): Promise<void> => {
  try {
    await saveAssessmentMetricValues(assessmentId, metricValues);
  } catch (error) {
    console.error('Error saving metric values:', error);
    throw error;
  }
};

export const saveSiteVisitRatingsForAssessment = async (
  assessmentId: string,
  siteVisitRatings: AssessmentSiteVisitRatingInsert[]
): Promise<void> => {
  try {
    await saveSiteVisitRatings(assessmentId, siteVisitRatings);
  } catch (error) {
    console.error('Error saving site visit ratings:', error);
    throw error;
  }
};

export const updateAssessmentScores = async (
  assessmentId: string,
  overallSiteSignalScore: number | null,
  completionPercentage: number | null
): Promise<SiteAssessment> => {
  try {
    return await updateScores(assessmentId, overallSiteSignalScore, completionPercentage);
  } catch (error) {
    console.error('Error updating assessment scores:', error);
    throw error;
  }
};

// Function to update site status
export const updateSiteStatus = async (
  assessmentId: string,
  siteStatus: string,
  userId: string
): Promise<SiteAssessment> => {
  try {
    return await updateSiteStatusInDb(assessmentId, siteStatus, userId);
  } catch (error) {
    console.error('Error updating site status:', error);
    throw error;
  }
};

// Export the summary functions with error handling
export { generateExecutiveSummaryForAssessment, updateSiteAssessmentSummary };
