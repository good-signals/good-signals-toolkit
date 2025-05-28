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
import { upsertMetricValues, getMetricValuesForAssessment } from './siteAssessment/metricValues';
import { upsertSiteVisitRatings, getSiteVisitRatingsForAssessment } from './siteAssessment/siteVisitRatings';
import { updateAssessmentScoresInDb } from './siteAssessment/scoring';
import { generateExecutiveSummaryForAssessment, updateSiteAssessmentSummary } from './siteAssessment/summary';

// ... keep existing code (createSiteAssessment, updateSiteAssessment, deleteSiteAssessment, getSiteAssessmentsForUser, getAssessmentDetails functions) the same ...
export const createSiteAssessment = async (
  assessmentData: Omit<SiteAssessmentInsert, 'user_id' | 'account_id' | 'target_metric_set_id'>,
  userId: string
): Promise<SiteAssessment> => {
  return createSiteAssessmentInDb(assessmentData, userId);
};

export const updateSiteAssessment = async (
  assessmentId: string,
  targetMetricSetId: string,
  userId: string
): Promise<SiteAssessment> => {
  return updateSiteAssessmentInDb(assessmentId, { target_metric_set_id: targetMetricSetId }, userId);
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
  
  const [metricValues, siteVisitRatings] = await Promise.all([
    getMetricValuesForAssessment(assessmentId),
    getSiteVisitRatingsForAssessment(assessmentId)
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
  return upsertMetricValues(assessmentId, metricValues);
};

export const saveSiteVisitRatingsForAssessment = async (
  assessmentId: string,
  siteVisitRatings: AssessmentSiteVisitRatingInsert[]
): Promise<void> => {
  return upsertSiteVisitRatings(assessmentId, siteVisitRatings);
};

export const updateAssessmentScores = async (
  assessmentId: string,
  overallSiteSignalScore: number | null,
  completionPercentage: number | null
): Promise<void> => {
  return updateAssessmentScoresInDb(assessmentId, overallSiteSignalScore, completionPercentage);
};

// New function to update site status
export const updateSiteStatus = async (
  assessmentId: string,
  siteStatus: string,
  userId: string
): Promise<SiteAssessment> => {
  return updateSiteStatusInDb(assessmentId, siteStatus, userId);
};

export { generateExecutiveSummaryForAssessment, updateSiteAssessmentSummary };
