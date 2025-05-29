
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

export const createSiteAssessment = async (
  assessmentData: Omit<SiteAssessmentInsert, 'user_id' | 'account_id' | 'target_metric_set_id'>,
  userId: string
): Promise<SiteAssessment> => {
  return createSiteAssessmentInDb(assessmentData, userId);
};

export const updateSiteAssessment = async (
  assessmentId: string,
  updates: { target_metric_set_id?: string; site_status?: string },
  userId: string
): Promise<SiteAssessment> => {
  return updateSiteAssessmentInDb(assessmentId, updates, userId);
};

export const deleteSiteAssessment = async (
  assessmentId: string,
  userId: string
): Promise<void> => {
  return deleteSiteAssessmentFromDb(assessmentId, userId);
};

export const getSiteAssessmentsForUser = async (userId: string): Promise<SiteAssessment[]> => {
  return getSiteAssessmentsFromDb(userId);
};

export const getAssessmentDetails = async (assessmentId: string): Promise<SiteAssessment> => {
  const assessment = await getSiteAssessmentFromDb(assessmentId);
  
  // Import the functions we need
  const { getAssessmentMetricValues } = await import('./siteAssessment/metricValues');
  const { getSiteVisitRatings } = await import('./siteAssessment/siteVisitRatings');
  
  const [metricValues, siteVisitRatings] = await Promise.all([
    getAssessmentMetricValues(assessmentId),
    getSiteVisitRatings(assessmentId)
  ]);

  return {
    ...assessment,
    assessment_metric_values: metricValues,
    site_visit_ratings: siteVisitRatings,
  };
};

export const saveMetricValuesForAssessment = async (
  assessmentId: string,
  metricValues: AssessmentMetricValueInsert[]
): Promise<void> => {
  const { saveAssessmentMetricValues } = await import('./siteAssessment/metricValues');
  await saveAssessmentMetricValues(assessmentId, metricValues);
};

export const saveSiteVisitRatingsForAssessment = async (
  assessmentId: string,
  siteVisitRatings: AssessmentSiteVisitRatingInsert[]
): Promise<void> => {
  const { saveSiteVisitRatings } = await import('./siteAssessment/siteVisitRatings');
  await saveSiteVisitRatings(assessmentId, siteVisitRatings);
};

export const updateAssessmentScores = async (
  assessmentId: string,
  overallSiteSignalScore: number | null,
  completionPercentage: number | null
): Promise<SiteAssessment> => {
  const { updateAssessmentScores: updateScores } = await import('./siteAssessment/scoring');
  return await updateScores(assessmentId, overallSiteSignalScore, completionPercentage);
};

// New function to update site status
export const updateSiteStatus = async (
  assessmentId: string,
  siteStatus: string,
  userId: string
): Promise<SiteAssessment> => {
  return updateSiteStatusInDb(assessmentId, siteStatus, userId);
};

export { generateExecutiveSummaryForAssessment, updateSiteAssessmentSummary } from './siteAssessment/summary';
